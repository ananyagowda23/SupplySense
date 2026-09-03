from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database.db import init_db
from routes import (
    activity,
    analytics,
    demand_history,
    forecast,
    inventory,
    orders,
    products,
    recommendations,
    settings,
    simulation,
    suppliers,
)

# Create database tables on application startup safely
init_db()

app = FastAPI(
    title="Smart Inventory Backend API",
    description="FastAPI Backend for Smart Inventory & Supply Chain Management System",
    version="1.4.0",
)

# Configure CORS Middleware allowing requests from Expo frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register entity routers
app.include_router(products.router)
app.include_router(suppliers.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(demand_history.router)
app.include_router(forecast.router)

# Register ML, Analytics, AI & Simulation routers
app.include_router(analytics.router)
app.include_router(recommendations.router)
app.include_router(simulation.router)
app.include_router(activity.router)
app.include_router(settings.router)


@app.get("/", tags=["health"])
def read_root():
    return {
        "status": "healthy",
        "message": "Welcome to Smart Inventory Backend API",
        "docs": "/docs",
    }
