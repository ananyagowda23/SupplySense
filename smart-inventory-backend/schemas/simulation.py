from typing import List, Optional
from pydantic import BaseModel, Field


class DailyAction(BaseModel):
    action: int = Field(
        0, ge=0, le=2, description="Action for this day: 0=NOOP, 1=ORDER, 2=EXPEDITE"
    )
    order_quantity: int = Field(
        0, ge=0, description="Order quantity if action is ORDER or EXPEDITE"
    )
    supplier_id: Optional[int] = Field(
        None, description="Optional supplier ID override for this action"
    )


class SimulationRequest(BaseModel):
    product_id: int = Field(..., description="ID of the product to simulate")
    initial_inventory: int = Field(
        50, ge=0, description="Starting inventory quantity for day 1"
    )
    simulation_days: int = Field(
        7, ge=1, le=365, description="Number of days to simulate"
    )
    action: Optional[int] = Field(
        None, ge=0, le=2, description="Legacy single action (0=NOOP, 1=ORDER, 2=EXPEDITE)"
    )
    order_quantity: Optional[int] = Field(
        0, ge=0, description="Legacy order quantity for single action"
    )
    supplier_id: Optional[int] = Field(
        None, description="Optional default supplier ID override"
    )
    actions: Optional[List[DailyAction]] = Field(
        None, description="Sequence of daily per-day actions (Day 1, Day 2, ...)"
    )
    repeat_policy: bool = Field(
        False,
        description="If True and single 'action' is provided, repeat it every day. If False (default), single action runs on Day 1 only.",
    )


class DailySimulationResult(BaseModel):
    day: int = Field(..., description="Simulated day index (1..N)")
    date: str = Field(..., description="Simulated date (YYYY-MM-DD)")
    starting_inventory: int = Field(..., description="Inventory at start of day")
    ending_inventory: int = Field(..., description="Inventory at end of day")
    daily_demand: float = Field(..., description="Demanded quantity for today")
    fulfilled_demand: float = Field(..., description="Quantity of demand fulfilled today")
    stockout_quantity: float = Field(..., description="Unfulfilled demand (stockout) today")
    action_taken: str = Field(..., description="Action taken today (NOOP / ORDER / EXPEDITE)")
    order_quantity_placed: int = Field(..., description="Quantity ordered today")
    pending_orders_count: int = Field(..., description="Number of pending orders in pipeline")
    revenue: float = Field(..., description="Sales revenue earned today")
    purchase_cost: float = Field(..., description="Cost of purchase orders placed today")
    holding_cost: float = Field(..., description="Inventory holding cost incurred today")
    shortage_cost: float = Field(..., description="Stockout penalty cost incurred today")
    expedite_cost: float = Field(..., description="Expedite fee incurred today")
    daily_profit: float = Field(..., description="Net daily profit (Revenue - Costs)")
    daily_reward: float = Field(..., description="Daily reward signal for RL agent")
    numerical_observation: List[float] = Field(
        ..., description="Flat numerical observation vector for RL agent"
    )


class SimulationResponse(BaseModel):
    product_id: int = Field(..., description="ID of the simulated product")
    product_name: str = Field(..., description="Name of the simulated product")
    simulation_days: int = Field(..., description="Duration of simulation in days")
    initial_inventory: int = Field(..., description="Initial starting inventory")
    final_inventory: int = Field(..., description="Final ending inventory after simulation")
    total_demand: float = Field(..., description="Cumulative total demand over simulation")
    total_fulfilled_demand: float = Field(..., description="Cumulative total demand fulfilled")
    total_stockout_units: float = Field(..., description="Cumulative unfulfilled stockout units")
    service_level_percentage: float = Field(..., description="Service level percentage (Fulfilled / Total * 100)")
    total_revenue: float = Field(..., description="Cumulative sales revenue")
    total_costs: float = Field(..., description="Cumulative total costs incurred")
    total_profit: float = Field(..., description="Cumulative net profit")
    cumulative_reward: float = Field(..., description="Cumulative reward signal")
    daily_results: List[DailySimulationResult] = Field(..., description="Day-by-day simulation breakdown")


class ScenarioComparisonRequest(BaseModel):
    scenarios: List[SimulationRequest] = Field(
        ..., min_items=1, max_items=10, description="List of simulation scenarios to compare"
    )


class ScenarioComparisonResponse(BaseModel):
    comparison: List[SimulationResponse] = Field(
        ..., description="List of simulation results corresponding to each scenario"
    )
