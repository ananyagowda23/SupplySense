import sqlite3

conn = sqlite3.connect("inventory.db")
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = [
    t[0]
    for t in cursor.fetchall()
    if not t[0].startswith("sqlite_") and not t[0].startswith("alembic_")
]
print("--- INVENTORY.DB TABLE ROW COUNTS ---")
for t in sorted(tables):
    count = cursor.execute(f"SELECT COUNT(*) FROM '{t}'").fetchone()[0]
    print(f"{t}: {count}")
conn.close()
