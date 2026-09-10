import numpy as np
import gymnasium as gym
from gymnasium import spaces
from typing import Optional, Tuple, Dict, Any, List
from sqlalchemy.orm import Session

from database.models import InventoryRecord, Order, Product, Supplier
from services.forecasting_service import generate_forecast


class SupplyChainEnv(gym.Env):
    """True native sequential Gymnasium supply-chain reinforcement learning environment.
    
    Executes O(1) single-day state transitions (Day t -> step(action) -> Day t+1)
    without re-running simulations from Day 1.
    
    Zero database mutations are performed.
    """

    metadata = {"render_modes": []}

    def __init__(
        self,
        db: Session,
        product_id: int = 1,
        initial_inventory: int = 50,
        max_steps: int = 30,
        fixed_order_quantity: int = 50,
        supplier_id: Optional[int] = None,
        preloaded_entities: Optional[Dict[str, Any]] = None,
        organization_id: Optional[str] = None,
    ):
        super().__init__()

        self.db = db
        self.product_id = product_id
        self.initial_inventory = initial_inventory
        self.max_steps = max_steps
        self.fixed_order_quantity = fixed_order_quantity
        self.supplier_id = supplier_id
        self.preloaded_entities = preloaded_entities
        self.organization_id = str(organization_id) if organization_id else None

        # Action Space: 0 = NOOP, 1 = ORDER, 2 = EXPEDITE
        self.action_space = spaces.Discrete(3)

        # Observation Space: 9-element numerical vector (dtype np.float32)
        # [starting_inv, daily_demand, pending_qty_sum, min_days_until_del, supplier_reliability, supplier_lead_time, avg_forecast_demand, safety_stock, reorder_point]
        self.observation_space = spaces.Box(
            low=0.0, high=np.inf, shape=(9,), dtype=np.float32
        )

        # Internal persistent state initialized on reset()
        self.current_step: int = 0
        self.current_inventory: int = 0
        self.pending_orders: List[Dict[str, Any]] = []

        self.product: Optional[Product] = None
        self.supplier: Optional[Supplier] = None
        self.safety_stock: int = 10
        self.reorder_point: int = 20
        self.forecast_items: List[Dict[str, Any]] = []

        # Cost model parameters
        self.unit_selling_price: float = 0.0
        self.unit_purchase_cost: float = 0.0
        self.holding_cost_per_unit_day: float = 0.0
        self.shortage_cost_per_unit: float = 0.0
        self.expedite_fixed_fee: float = 50.0

        # Cumulative KPI trackers
        self.total_demand: float = 0.0
        self.total_fulfilled_demand: float = 0.0
        self.total_stockout_units: float = 0.0
        self.total_revenue: float = 0.0
        self.total_costs: float = 0.0
        self.total_profit: float = 0.0

    def _load_domain_entities(self):
        """Load and cache Product, Supplier, Inventory thresholds, and Forecast items."""
        if self.preloaded_entities:
            self.product = self.preloaded_entities.get("product")
            self.supplier = self.preloaded_entities.get("supplier")
            self.safety_stock = self.preloaded_entities.get("safety_stock", 10)
            self.reorder_point = self.preloaded_entities.get("reorder_point", 20)
            self.forecast_items = self.preloaded_entities.get("forecast_items", [])

        if not self.product:
            # 1. Fetch Product
            prod_query = self.db.query(Product).filter(Product.id == self.product_id)
            if self.organization_id:
                prod_query = prod_query.filter(Product.organization_id == self.organization_id)
            self.product = prod_query.first()
            if not self.product:
                raise ValueError(
                    f"Product with ID {self.product_id} not found in database for current organization"
                )

        if not self.supplier:
            # 2. Fetch Supplier
            if self.supplier_id:
                sup_query = self.db.query(Supplier).filter(Supplier.id == self.supplier_id)
                if self.organization_id:
                    sup_query = sup_query.filter(Supplier.organization_id == self.organization_id)
                self.supplier = sup_query.first()
            else:
                linked_query = (
                    self.db.query(Supplier)
                    .join(Order, Supplier.id == Order.supplier_id)
                    .filter(Order.product_id == self.product_id)
                )
                if self.organization_id:
                    linked_query = linked_query.filter(
                        Supplier.organization_id == self.organization_id,
                        Order.organization_id == self.organization_id,
                    )
                linked = linked_query.first()
                if linked:
                    self.supplier = linked
                else:
                    fallback_query = self.db.query(Supplier)
                    if self.organization_id:
                        fallback_query = fallback_query.filter(Supplier.organization_id == self.organization_id)
                    self.supplier = fallback_query.first()

            if not self.supplier:
                raise ValueError("No active supplier found in database for environment")

        if not self.preloaded_entities or "safety_stock" not in self.preloaded_entities:
            # 3. Fetch Inventory Record thresholds
            inv_query = self.db.query(InventoryRecord).filter(InventoryRecord.product_id == self.product_id)
            if self.organization_id:
                inv_query = inv_query.filter(InventoryRecord.organization_id == self.organization_id)
            inv_rec = inv_query.first()
            self.safety_stock = inv_rec.safety_stock if inv_rec else 10
            self.reorder_point = inv_rec.reorder_point if inv_rec else 20

        # 4. Configurable Cost Model Parameters
        self.unit_selling_price = float(self.product.unit_price)
        self.unit_purchase_cost = round(self.unit_selling_price * 0.6, 2)
        self.holding_cost_per_unit_day = round(self.unit_selling_price * 0.02, 2)
        self.shortage_cost_per_unit = round(self.unit_selling_price * 1.5, 2)

        # 5. Fetch Forecast items if not preloaded
        if not self.forecast_items:
            forecast_data = generate_forecast(
                db=self.db,
                product_id=self.product_id,
                days=self.max_steps + 1,
                organization_id=self.organization_id,
            )
            self.forecast_items = forecast_data["forecast"]

    def _build_observation(self, starting_inventory: int, step_idx: int) -> np.ndarray:
        """Construct the 9-element float32 observation vector for a given step_idx."""
        safe_idx = min(step_idx, len(self.forecast_items) - 1)
        daily_demand = float(self.forecast_items[safe_idx]["predicted_demand"])
        pending_qty_sum = sum(p["quantity"] for p in self.pending_orders)
        min_days_until_del = (
            min(p["days_remaining"] for p in self.pending_orders)
            if self.pending_orders
            else 0
        )
        avg_forecast_demand = round(
            sum(item["predicted_demand"] for item in self.forecast_items)
            / len(self.forecast_items),
            2,
        )

        obs = [
            float(starting_inventory),
            float(daily_demand),
            float(pending_qty_sum),
            float(min_days_until_del),
            float(self.supplier.reliability_score),
            float(self.supplier.lead_time_days),
            float(avg_forecast_demand),
            float(self.safety_stock),
            float(self.reorder_point),
        ]
        return np.array(obs, dtype=np.float32)

    def reset(
        self, *, seed: Optional[int] = None, options: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        super().reset(seed=seed)

        # 1. Reset step index and inventory state
        self.current_step = 0
        self.current_inventory = int(self.initial_inventory)
        self.pending_orders = []

        # 2. Reset cumulative KPIs
        self.total_demand = 0.0
        self.total_fulfilled_demand = 0.0
        self.total_stockout_units = 0.0
        self.total_revenue = 0.0
        self.total_costs = 0.0
        self.total_profit = 0.0

        # 3. Load domain entities and forecast items
        self._load_domain_entities()

        # 4. Construct Day 1 initial observation
        initial_obs = self._build_observation(
            starting_inventory=self.current_inventory, step_idx=0
        )

        info = {
            "product_id": self.product_id,
            "day": 1,
            "initial_inventory": self.initial_inventory,
            "max_steps": self.max_steps,
        }

        return initial_obs, info

    def _step_one_day(
        self, action: int
    ) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        """Advance the environment state by exactly ONE day in O(1) native time."""

        t = self.current_step
        day_num = t + 1
        forecast_item = self.forecast_items[t]
        sim_date = forecast_item["date"]
        daily_demand = float(forecast_item["predicted_demand"])

        # -------------------------------------------------------------
        # STEP 1: RECEIVE DELIVERIES (Morning)
        # -------------------------------------------------------------
        arrived_qty = 0
        remaining_pending = []
        for p_order in self.pending_orders:
            p_order["days_remaining"] -= 1
            if p_order["days_remaining"] <= 0:
                arrived_qty += p_order["quantity"]
            else:
                remaining_pending.append(p_order)
        self.pending_orders = remaining_pending

        # Starting inventory after morning deliveries arrive
        self.current_inventory += arrived_qty
        starting_inventory = self.current_inventory

        # -------------------------------------------------------------
        # STEP 2: APPLY TODAY'S ACTION
        # -------------------------------------------------------------
        action_names = {0: "NOOP", 1: "ORDER", 2: "EXPEDITE"}
        action_taken = action_names.get(action, "NOOP")
        purchase_cost = 0.0
        expedite_cost = 0.0
        order_qty_placed = 0

        if action == 1:  # ORDER
            if self.fixed_order_quantity > 0:
                order_qty_placed = int(self.fixed_order_quantity)
                lead_time = max(1, int(self.supplier.lead_time_days))
                self.pending_orders.append(
                    {
                        "quantity": order_qty_placed,
                        "days_remaining": lead_time,
                        "supplier_id": self.supplier.id,
                    }
                )
                purchase_cost = round(order_qty_placed * self.unit_purchase_cost, 2)

        elif action == 2:  # EXPEDITE
            if self.pending_orders:
                # Pending order exists: accelerate earliest order by reducing lead time by 2 days (min 1 day)
                expedite_cost = self.expedite_fixed_fee
                target_order = self.pending_orders[0]
                target_order["days_remaining"] = max(1, target_order["days_remaining"] - 2)
            else:
                # No pending order exists: DO NOT create a purchase order.
                expedite_cost = self.expedite_fixed_fee
                purchase_cost = 0.0
                order_qty_placed = 0

        # -------------------------------------------------------------
        # STEP 3: FULFILL DEMAND & UPDATE INVENTORY
        # -------------------------------------------------------------
        fulfilled_demand = min(float(starting_inventory), daily_demand)
        stockout_quantity = max(0.0, daily_demand - float(starting_inventory))
        ending_inventory = int(starting_inventory - fulfilled_demand)
        self.current_inventory = ending_inventory

        # -------------------------------------------------------------
        # STEP 4: CALCULATE COSTS, REVENUE & REWARD
        # -------------------------------------------------------------
        revenue = round(fulfilled_demand * self.unit_selling_price, 2)
        holding_cost = round(ending_inventory * self.holding_cost_per_unit_day, 2)
        shortage_cost = round(stockout_quantity * self.shortage_cost_per_unit, 2)
        daily_total_cost = round(
            purchase_cost + expedite_cost + holding_cost + shortage_cost, 2
        )

        daily_profit = round(revenue - daily_total_cost, 2)
        daily_reward = daily_profit  # Single-day reward for day t

        # -------------------------------------------------------------
        # STEP 5: UPDATE CUMULATIVE METRICS & ADVANCE STEP
        # -------------------------------------------------------------
        self.total_demand += daily_demand
        self.total_fulfilled_demand += fulfilled_demand
        self.total_stockout_units += stockout_quantity
        self.total_revenue += revenue
        self.total_costs += daily_total_cost
        self.total_profit += daily_profit

        self.current_step += 1
        terminated = self.current_step >= self.max_steps
        truncated = False

        # -------------------------------------------------------------
        # STEP 6: ASSEMBLE NEXT OBSERVATION (For step t+1)
        # -------------------------------------------------------------
        if not terminated:
            next_obs = self._build_observation(
                starting_inventory=self.current_inventory, step_idx=self.current_step
            )
        else:
            next_obs = self._build_observation(
                starting_inventory=self.current_inventory, step_idx=self.current_step - 1
            )

        service_level = (
            round((self.total_fulfilled_demand / self.total_demand) * 100.0, 2)
            if self.total_demand > 0
            else 100.0
        )

        info = {
            "day": day_num,
            "date": sim_date,
            "starting_inventory": starting_inventory,
            "ending_inventory": ending_inventory,
            "daily_demand": round(daily_demand, 2),
            "fulfilled_demand": round(fulfilled_demand, 2),
            "stockout_quantity": round(stockout_quantity, 2),
            "action_taken": action_taken,
            "order_quantity_placed": order_qty_placed,
            "pending_orders_count": len(self.pending_orders),
            "revenue": revenue,
            "purchase_cost": purchase_cost,
            "holding_cost": holding_cost,
            "shortage_cost": shortage_cost,
            "expedite_cost": expedite_cost,
            "daily_profit": daily_profit,
            "cumulative_profit": round(self.total_profit, 2),
            "service_level": service_level,
        }

        return next_obs, daily_reward, terminated, truncated, info

    def step(self, action: int) -> Tuple[np.ndarray, float, bool, bool, Dict[str, Any]]:
        action = int(action)
        if not self.action_space.contains(action):
            raise ValueError(
                f"Invalid action {action}. Action must be an integer in {self.action_space} (0=NOOP, 1=ORDER, 2=EXPEDITE)."
            )

        return self._step_one_day(action)
