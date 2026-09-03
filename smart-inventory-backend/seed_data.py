import math
import random
import sys
from datetime import date, timedelta
from database.db import SessionLocal, init_db
from database.models import DemandHistory, InventoryRecord, Order, Product, Supplier


def seed_database(reset: bool = True):
    """Seed the database idempotently.
    
    If reset is True, tables are re-created cleanly to guarantee exact seed counts.
    """
    print("Initializing database schema...")
    init_db(reset=reset)

    db = SessionLocal()
    try:
        print("Seeding Suppliers...")
        suppliers_data = [
            {
                "name": "Apex Component Solutions",
                "location": "Bangalore",
                "lead_time_days": 5,
                "reliability_score": 0.95,
            },
            {
                "name": "Nexus Electronics Trade",
                "location": "Hyderabad",
                "lead_time_days": 7,
                "reliability_score": 0.92,
            },
            {
                "name": "Global Appliance Logistics",
                "location": "Mumbai",
                "lead_time_days": 4,
                "reliability_score": 0.98,
            },
            {
                "name": "Orion Technology Suppliers",
                "location": "Chennai",
                "lead_time_days": 6,
                "reliability_score": 0.89,
            },
            {
                "name": "Zenith Mobility & Accessories",
                "location": "Bangalore",
                "lead_time_days": 3,
                "reliability_score": 0.94,
            },
        ]

        supplier_map = {}
        for s_info in suppliers_data:
            existing = (
                db.query(Supplier).filter(Supplier.name == s_info["name"]).first()
            )
            if existing:
                for k, v in s_info.items():
                    setattr(existing, k, v)
                supplier_map[s_info["name"]] = existing
            else:
                supplier = Supplier(**s_info)
                db.add(supplier)
                db.flush()
                supplier_map[s_info["name"]] = supplier

        db.commit()
        print(f"-> Seeded {len(supplier_map)} suppliers.")

        print("Seeding Products...")
        products_data = [
            # Category 1: Electronics
            {
                "name": "Wireless Noise-Canceling Headphones",
                "sku": "ELEC-001",
                "category": "Electronics",
                "unit_price": 199.99,
            },
            {
                "name": "Smart Home Hub",
                "sku": "ELEC-002",
                "category": "Electronics",
                "unit_price": 129.50,
            },
            {
                "name": "Bluetooth Portable Speaker",
                "sku": "ELEC-003",
                "category": "Electronics",
                "unit_price": 79.99,
            },
            {
                "name": "4K Ultra HD Streaming Stick",
                "sku": "ELEC-004",
                "category": "Electronics",
                "unit_price": 49.99,
            },
            # Category 2: Home Appliances
            {
                "name": "Robotic Vacuum Cleaner",
                "sku": "APPL-001",
                "category": "Home Appliances",
                "unit_price": 299.00,
            },
            {
                "name": "Digital Air Fryer 5L",
                "sku": "APPL-002",
                "category": "Home Appliances",
                "unit_price": 89.99,
            },
            {
                "name": "Electric Programmable Pressure Cooker",
                "sku": "APPL-003",
                "category": "Home Appliances",
                "unit_price": 119.50,
            },
            {
                "name": "HEPA Air Purifier",
                "sku": "APPL-004",
                "category": "Home Appliances",
                "unit_price": 159.00,
            },
            # Category 3: Accessories
            {
                "name": "Ergonomic Wireless Mouse",
                "sku": "ACCS-001",
                "category": "Accessories",
                "unit_price": 34.99,
            },
            {
                "name": "Mechanical RGB Keyboard",
                "sku": "ACCS-002",
                "category": "Accessories",
                "unit_price": 89.99,
            },
            {
                "name": "USB-C Multi-Port Docking Station",
                "sku": "ACCS-003",
                "category": "Accessories",
                "unit_price": 64.50,
            },
            {
                "name": "Adjustable Aluminium Laptop Stand",
                "sku": "ACCS-004",
                "category": "Accessories",
                "unit_price": 29.99,
            },
            # Category 4: Computing
            {
                "name": "Ultra-Slim 15-inch Laptop",
                "sku": "COMP-001",
                "category": "Computing",
                "unit_price": 899.99,
            },
            {
                "name": "27-inch IPS 4K Monitor",
                "sku": "COMP-002",
                "category": "Computing",
                "unit_price": 349.00,
            },
            {
                "name": "1TB NVMe M.2 SSD",
                "sku": "COMP-003",
                "category": "Computing",
                "unit_price": 109.99,
            },
            {
                "name": "High-Speed Wi-Fi 6 Router",
                "sku": "COMP-004",
                "category": "Computing",
                "unit_price": 139.95,
            },
            # Category 5: Mobile Devices
            {
                "name": "Flagship Smartphone 128GB",
                "sku": "MOBL-001",
                "category": "Mobile Devices",
                "unit_price": 749.99,
            },
            {
                "name": "10.5-inch Retina Tablet",
                "sku": "MOBL-002",
                "category": "Mobile Devices",
                "unit_price": 449.00,
            },
            {
                "name": "Fitness Smartwatch",
                "sku": "MOBL-003",
                "category": "Mobile Devices",
                "unit_price": 179.99,
            },
            {
                "name": "Active Earbuds with Wireless Charging",
                "sku": "MOBL-004",
                "category": "Mobile Devices",
                "unit_price": 119.00,
            },
        ]

        product_map = {}
        for p_info in products_data:
            existing = (
                db.query(Product).filter(Product.sku == p_info["sku"]).first()
            )
            if existing:
                for k, v in p_info.items():
                    setattr(existing, k, v)
                product_map[p_info["sku"]] = existing
            else:
                product = Product(**p_info)
                db.add(product)
                db.flush()
                product_map[p_info["sku"]] = product

        db.commit()
        print(f"-> Seeded {len(product_map)} products.")

        print("Seeding Inventory Records...")
        locations = ["Hyderabad", "Bangalore", "Chennai", "Mumbai"]
        
        # Distribution pattern of inventory records connecting products to locations
        inventory_records_count = 0
        for i, (sku, product) in enumerate(product_map.items()):
            # Each product gets 2 locations assigned predictably
            loc1 = locations[i % len(locations)]
            loc2 = locations[(i + 1) % len(locations)]
            
            records_to_create = [
                {
                    "product_id": product.id,
                    "location": loc1,
                    "quantity": 100 + (i * 7) % 150,
                    "reorder_point": 25 + (i * 3) % 20,
                    "safety_stock": 10 + (i * 2) % 15,
                },
                {
                    "product_id": product.id,
                    "location": loc2,
                    "quantity": 60 + (i * 11) % 120,
                    "reorder_point": 20 + (i * 4) % 15,
                    "safety_stock": 8 + (i * 3) % 10,
                },
            ]
            
            for inv_info in records_to_create:
                existing = (
                    db.query(InventoryRecord)
                    .filter(
                        InventoryRecord.product_id == inv_info["product_id"],
                        InventoryRecord.location == inv_info["location"],
                    )
                    .first()
                )
                if existing:
                    for k, v in inv_info.items():
                        setattr(existing, k, v)
                else:
                    db.add(InventoryRecord(**inv_info))
                inventory_records_count += 1

        db.commit()
        print(f"-> Seeded {inventory_records_count} inventory records.")

        print("Seeding Orders...")
        # Map categories to primary suppliers
        category_supplier_map = {
            "Electronics": "Nexus Electronics Trade",
            "Home Appliances": "Global Appliance Logistics",
            "Accessories": "Zenith Mobility & Accessories",
            "Computing": "Apex Component Solutions",
            "Mobile Devices": "Orion Technology Suppliers",
        }

        orders_count = 0
        base_date = date(2026, 8, 1)

        for i, (sku, product) in enumerate(product_map.items()):
            primary_sup_name = category_supplier_map.get(
                product.category, "Apex Component Solutions"
            )
            supplier = supplier_map[primary_sup_name]

            # Alternate order statuses across products
            statuses = ["DELIVERED", "SHIPPED", "PENDING"]
            status = statuses[i % len(statuses)]

            order_date = base_date + timedelta(days=i * 2)
            delivery_date = order_date + timedelta(days=supplier.lead_time_days)

            order_info = {
                "product_id": product.id,
                "supplier_id": supplier.id,
                "quantity": 50 + (i * 5) % 100,
                "status": status,
                "order_date": order_date,
                "expected_delivery_date": delivery_date,
            }

            existing = (
                db.query(Order)
                .filter(
                    Order.product_id == order_info["product_id"],
                    Order.supplier_id == order_info["supplier_id"],
                    Order.order_date == order_info["order_date"],
                )
                .first()
            )

            if existing:
                for k, v in order_info.items():
                    setattr(existing, k, v)
            else:
                db.add(Order(**order_info))
            orders_count += 1

        db.commit()
        print(f"-> Seeded {orders_count} purchase orders.")

        print("Seeding Demand History (365 days per product)...")
        # Fixed random seed for reproducible synthetic demand data
        random.seed(42)

        start_date = date(2025, 9, 1)
        total_days = 365

        # Query existing demand history records to maintain idempotency
        existing_records = {
            (r.product_id, r.date): r
            for r in db.query(DemandHistory).all()
        }

        new_demand_objects = []
        updated_count = 0

        for i, (sku, product) in enumerate(product_map.items()):
            pattern_type = i % 5  # 5 distinct demand archetypes

            for day_idx in range(total_days):
                curr_date = start_date + timedelta(days=day_idx)

                # Generate demand based on archetype
                if pattern_type == 0:
                    # 1. Stable Demand
                    base_val = 35.0
                    noise = random.gauss(0, 4.0)
                    raw_demand = base_val + noise

                elif pattern_type == 1:
                    # 2. Upward Trend
                    base_val = 15.0 + (day_idx / 365.0) * 45.0
                    noise = random.gauss(0, 5.0)
                    raw_demand = base_val + noise

                elif pattern_type == 2:
                    # 3. Downward Trend
                    base_val = 70.0 - (day_idx / 365.0) * 40.0
                    noise = random.gauss(0, 6.0)
                    raw_demand = base_val + noise

                elif pattern_type == 3:
                    # 4. Weekly Seasonality (weekend spikes)
                    weekday = curr_date.weekday()
                    multiplier = 1.4 if weekday in (5, 6) else 0.85
                    base_val = 30.0 * multiplier
                    noise = random.gauss(0, 4.0)
                    raw_demand = base_val + noise

                else:
                    # 5. Annual / Seasonal Cycle + Weekly Modulation
                    season_wave = 1.0 + 0.45 * math.sin(2.0 * math.pi * day_idx / 365.0)
                    base_val = 45.0 * season_wave
                    noise = random.gauss(0, 5.0)
                    raw_demand = base_val + noise

                # Ensure non-negative integer demand
                final_demand = max(0, int(round(raw_demand)))

                key = (product.id, curr_date)
                if key in existing_records:
                    existing_records[key].demand_quantity = final_demand
                    updated_count += 1
                else:
                    new_demand_objects.append(
                        DemandHistory(
                            product_id=product.id,
                            date=curr_date,
                            demand_quantity=final_demand,
                        )
                    )

        if new_demand_objects:
            db.bulk_save_objects(new_demand_objects)
        db.commit()

        total_demand_records = len(new_demand_objects) + updated_count
        print(f"-> Seeded {total_demand_records} demand history records (New: {len(new_demand_objects)}, Updated: {updated_count}).")

        print("Seed execution completed successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    reset_db = "--reset" in sys.argv or True
    seed_database(reset=reset_db)

