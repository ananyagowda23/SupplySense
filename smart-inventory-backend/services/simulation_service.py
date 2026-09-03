from typing import List, Dict, Any, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from database.models import InventoryRecord, Order, Product, Supplier
from schemas.simulation import SimulationRequest, SimulationResponse, DailySimulationResult
from services.forecasting_service import generate_forecast


def run_simulation(db: Session, request: SimulationRequest) -> SimulationResponse:
    """Run an isolated in-memory supply-chain simulation supporting sequential per-day actions.
    
    Zero changes are written to the database.
    """
    # 1. Validate Product existence
    product = db.query(Product).filter(Product.id == request.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {request.product_id} not found",
        )

    # 2. Cache Supplier details for fast resolution
    all_suppliers = db.query(Supplier).all()
    if not all_suppliers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active suppliers found in database for simulation",
        )

    supplier_cache: Dict[int, Supplier] = {s.id: s for s in all_suppliers}

    # Resolve default supplier
    if request.supplier_id and request.supplier_id in supplier_cache:
        default_supplier = supplier_cache[request.supplier_id]
    else:
        linked_supplier = (
            db.query(Supplier)
            .join(Order, Supplier.id == Order.supplier_id)
            .filter(Order.product_id == request.product_id)
            .first()
        )
        default_supplier = linked_supplier if linked_supplier else all_suppliers[0]

    # 3. Retrieve Inventory parameters (safety_stock, reorder_point)
    inv_record = (
        db.query(InventoryRecord)
        .filter(InventoryRecord.product_id == request.product_id)
        .first()
    )
    safety_stock = inv_record.safety_stock if inv_record else 10
    reorder_point = inv_record.reorder_point if inv_record else 20

    # 4. Generate/Retrieve Demand Forecast for the simulation horizon
    forecast_data = generate_forecast(
        db=db, product_id=request.product_id, days=request.simulation_days
    )
    forecast_items = forecast_data["forecast"]

    # 5. Configurable Cost Model Parameters
    unit_selling_price = float(product.unit_price)
    unit_purchase_cost = round(unit_selling_price * 0.6, 2)
    holding_cost_per_unit_day = round(unit_selling_price * 0.02, 2)
    shortage_cost_per_unit = round(unit_selling_price * 1.5, 2)
    expedite_fixed_fee = 50.0

    # 6. Initialize In-Memory Simulation State
    current_inventory = int(request.initial_inventory)
    pending_orders: List[Dict[str, Any]] = []  # [{"quantity": int, "days_remaining": int, "supplier_id": int}]

    daily_results: List[DailySimulationResult] = []

    total_demand = 0.0
    total_fulfilled_demand = 0.0
    total_stockout_units = 0.0
    total_revenue = 0.0
    total_costs = 0.0
    total_profit = 0.0
    cumulative_reward = 0.0

    action_names = {0: "NOOP", 1: "ORDER", 2: "EXPEDITE"}

    # 7. Day-by-day Sequential Simulation Loop
    for t in range(request.simulation_days):
        day_num = t + 1
        forecast_item = forecast_items[t]
        sim_date = forecast_item["date"]
        daily_demand = float(forecast_item["predicted_demand"])

        # Determine action for today (t)
        if request.actions and t < len(request.actions):
            act_obj = request.actions[t]
            curr_action = act_obj.action
            curr_order_qty = act_obj.order_quantity
            curr_sup_id = act_obj.supplier_id or request.supplier_id
        elif request.action is not None:
            # Single action mode: runs on Day 1 only unless repeat_policy=True
            if t == 0 or request.repeat_policy:
                curr_action = request.action
                curr_order_qty = request.order_quantity or 0
                curr_sup_id = request.supplier_id
            else:
                curr_action = 0
                curr_order_qty = 0
                curr_sup_id = request.supplier_id
        else:
            curr_action = 0
            curr_order_qty = 0
            curr_sup_id = request.supplier_id

        # Resolve supplier for today's action
        act_supplier = (
            supplier_cache.get(curr_sup_id, default_supplier)
            if curr_sup_id
            else default_supplier
        )

        # -------------------------------------------------------------
        # STEP 1: RECEIVE DELIVERIES (Morning)
        # -------------------------------------------------------------
        arrived_qty = 0
        remaining_pending = []
        for p_order in pending_orders:
            p_order["days_remaining"] -= 1
            if p_order["days_remaining"] <= 0:
                arrived_qty += p_order["quantity"]
            else:
                remaining_pending.append(p_order)
        pending_orders = remaining_pending

        # Starting inventory after morning deliveries arrive
        current_inventory += arrived_qty
        starting_inventory = current_inventory

        # -------------------------------------------------------------
        # STEP 2: APPLY TODAY'S ACTION
        # -------------------------------------------------------------
        action_taken = action_names.get(curr_action, "NOOP")
        purchase_cost = 0.0
        expedite_cost = 0.0
        order_qty_placed = 0

        if curr_action == 1:  # ORDER
            if curr_order_qty > 0:
                order_qty_placed = int(curr_order_qty)
                lead_time = max(1, int(act_supplier.lead_time_days))
                pending_orders.append(
                    {
                        "quantity": order_qty_placed,
                        "days_remaining": lead_time,
                        "supplier_id": act_supplier.id,
                    }
                )
                purchase_cost = round(order_qty_placed * unit_purchase_cost, 2)

        elif curr_action == 2:  # EXPEDITE
            expedite_cost = expedite_fixed_fee
            if pending_orders:
                # Accelerate existing order by reducing days_remaining by 2 days (min 1 day)
                target_order = pending_orders[0]
                target_order["days_remaining"] = max(1, target_order["days_remaining"] - 2)
            else:
                # Place new order with expedited lead time
                if curr_order_qty > 0:
                    order_qty_placed = int(curr_order_qty)
                    expedited_lead_time = max(1, int(act_supplier.lead_time_days) - 2)
                    pending_orders.append(
                        {
                            "quantity": order_qty_placed,
                            "days_remaining": expedited_lead_time,
                            "supplier_id": act_supplier.id,
                        }
                    )
                    purchase_cost = round(order_qty_placed * unit_purchase_cost, 2)

        # -------------------------------------------------------------
        # STEP 3: FULFILL DEMAND & UPDATE INVENTORY
        # -------------------------------------------------------------
        fulfilled_demand = min(float(starting_inventory), daily_demand)
        stockout_quantity = max(0.0, daily_demand - float(starting_inventory))
        ending_inventory = int(starting_inventory - fulfilled_demand)
        current_inventory = ending_inventory

        # -------------------------------------------------------------
        # STEP 4: CALCULATE COSTS, REVENUE & REWARD
        # -------------------------------------------------------------
        revenue = round(fulfilled_demand * unit_selling_price, 2)
        holding_cost = round(ending_inventory * holding_cost_per_unit_day, 2)
        shortage_cost = round(stockout_quantity * shortage_cost_per_unit, 2)
        daily_total_cost = round(
            purchase_cost + expedite_cost + holding_cost + shortage_cost, 2
        )

        daily_profit = round(revenue - daily_total_cost, 2)
        daily_reward = daily_profit  # Reward signal for future RL policy

        # -------------------------------------------------------------
        # STEP 5: NUMERICAL OBSERVATION VECTOR
        # -------------------------------------------------------------
        pending_qty_sum = sum(p["quantity"] for p in pending_orders)
        min_days_until_del = (
            min(p["days_remaining"] for p in pending_orders) if pending_orders else 0
        )
        avg_forecast_demand = round(
            sum(item["predicted_demand"] for item in forecast_items)
            / len(forecast_items),
            2,
        )

        numerical_observation = [
            float(starting_inventory),
            float(daily_demand),
            float(pending_qty_sum),
            float(min_days_until_del),
            float(act_supplier.reliability_score),
            float(act_supplier.lead_time_days),
            float(avg_forecast_demand),
            float(safety_stock),
            float(reorder_point),
        ]

        # -------------------------------------------------------------
        # STEP 6: ACCUMULATE METRICS & RECORD DAILY RESULT
        # -------------------------------------------------------------
        total_demand += daily_demand
        total_fulfilled_demand += fulfilled_demand
        total_stockout_units += stockout_quantity
        total_revenue += revenue
        total_costs += daily_total_cost
        total_profit += daily_profit
        cumulative_reward += daily_reward

        daily_results.append(
            DailySimulationResult(
                day=day_num,
                date=sim_date,
                starting_inventory=starting_inventory,
                ending_inventory=ending_inventory,
                daily_demand=round(daily_demand, 2),
                fulfilled_demand=round(fulfilled_demand, 2),
                stockout_quantity=round(stockout_quantity, 2),
                action_taken=action_taken,
                order_quantity_placed=order_qty_placed,
                pending_orders_count=len(pending_orders),
                revenue=revenue,
                purchase_cost=purchase_cost,
                holding_cost=holding_cost,
                shortage_cost=shortage_cost,
                expedite_cost=expedite_cost,
                daily_profit=daily_profit,
                daily_reward=daily_reward,
                numerical_observation=numerical_observation,
            )
        )

    # 8. Compute Overall Simulation Summary
    service_level = (
        round((total_fulfilled_demand / total_demand) * 100.0, 2)
        if total_demand > 0
        else 100.0
    )

    return SimulationResponse(
        product_id=product.id,
        product_name=product.name,
        simulation_days=request.simulation_days,
        initial_inventory=request.initial_inventory,
        final_inventory=current_inventory,
        total_demand=round(total_demand, 2),
        total_fulfilled_demand=round(total_fulfilled_demand, 2),
        total_stockout_units=round(total_stockout_units, 2),
        service_level_percentage=service_level,
        total_revenue=round(total_revenue, 2),
        total_costs=round(total_costs, 2),
        total_profit=round(total_profit, 2),
        cumulative_reward=round(cumulative_reward, 2),
        daily_results=daily_results,
    )
