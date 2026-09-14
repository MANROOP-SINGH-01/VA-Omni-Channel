"""
setup_and_load_postgres.py
Automated PostgreSQL Database Ingestion & Analytical Setup Pipeline
Omni-Channel Retail Intelligence Platform
"""

import os
import sys
import psycopg2
from psycopg2 import sql

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'postgres',
    'password': 'nigga',
    'dbname': 'retail_intelligence'
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(BASE_DIR)
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

def create_database_if_not_exists():
    print("[1/5] Connecting to PostgreSQL cluster...")
    conn = psycopg2.connect(
        host=DB_CONFIG['host'],
        port=DB_CONFIG['port'],
        user=DB_CONFIG['user'],
        password=DB_CONFIG['password'],
        dbname='postgres'
    )
    conn.autocommit = True
    cur = conn.cursor()
    
    cur.execute("SELECT 1 FROM pg_database WHERE datname = %s;", (DB_CONFIG['dbname'],))
    exists = cur.fetchone()
    if not exists:
        print(f"Creating database '{DB_CONFIG['dbname']}'...")
        cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_CONFIG['dbname'])))
        print(f"Database '{DB_CONFIG['dbname']}' created successfully.")
    else:
        print(f"Database '{DB_CONFIG['dbname']}' already exists.")
        
    cur.close()
    conn.close()

def apply_schema_and_views(conn):
    print("[2/5] Creating tables, constraints, indexes & analytical views...")
    schema_file = os.path.join(BASE_DIR, '01_postgres_schema_and_views.sql')
    with open(schema_file, 'r', encoding='utf-8') as f:
        ddl = f.read()
        
    cur = conn.cursor()
    cur.execute(ddl)
    conn.commit()
    cur.close()
    print("Schema and views applied successfully.")

def bulk_load_csv(conn):
    print("[3/5] Ingesting CSV datasets into PostgreSQL...")
    cur = conn.cursor()
    
    # 1. Customers
    cust_path = os.path.join(DATA_DIR, 'customers.csv')
    if not os.path.exists(cust_path):
        cust_path = os.path.join(PROJECT_DIR, '..', 'customers.csv')
    print(f"Loading customers from {cust_path}...")
    with open(cust_path, 'r', encoding='utf-8') as f:
        cur.copy_expert("COPY customers(CustomerID, CustomerName, Location, JoinDate, LoyaltyPoints, Year, Month) FROM STDIN WITH (FORMAT csv, HEADER true)", f)
    conn.commit()
    
    # 2. Products
    prod_path = os.path.join(DATA_DIR, 'products.csv')
    if not os.path.exists(prod_path):
        prod_path = os.path.join(PROJECT_DIR, '..', 'products.csv')
    print(f"Loading products from {prod_path}...")
    with open(prod_path, 'r', encoding='utf-8') as f:
        cur.copy_expert("COPY products(ProductID, ProductName, Category, UnitPrice) FROM STDIN WITH (FORMAT csv, HEADER true)", f)
    conn.commit()
    
    # 3. Orders
    orders_path = os.path.join(DATA_DIR, 'orders.csv')
    if not os.path.exists(orders_path):
        orders_path = os.path.join(PROJECT_DIR, '..', 'orders.csv')
    print(f"Loading orders (50,000 rows) from {orders_path}...")
    with open(orders_path, 'r', encoding='utf-8') as f:
        cur.copy_expert("COPY orders(OrderID, CustomerID, ProductID, OrderDate, Quantity, UnitPrice, Discount, TotalAmount, SalesChannel, PaymentMethod) FROM STDIN WITH (FORMAT csv, HEADER true)", f)
    conn.commit()
    
    cur.close()
    print("All datasets loaded successfully.")

def verify_pipeline(conn):
    print("[4/5] Verifying row counts & data integrity...")
    cur = conn.cursor()
    
    for table in ['customers', 'products', 'orders']:
        cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(table)))
        cnt = cur.fetchone()[0]
        print(f"  - Table '{table}': {cnt:,} records")
        
    print("[5/5] Executing test query against 'vw_executive_kpis'...")
    cur.execute("""
        SELECT 
            Total_Orders,
            Total_Units,
            Net_Revenue,
            Gross_Revenue,
            Total_Discount,
            Discount_Impact_Pct,
            Revenue_Realization_Rate_Pct,
            Active_Customers,
            Average_Order_Value
        FROM vw_executive_kpis;
    """)
    row = cur.fetchone()
    print("\n" + "="*70)
    print("POSTGRESQL ANALYTICAL KPI VERIFICATION:")
    print("="*70)
    print(f"  • Fulfilled Orders            : {row[0]:,}")
    print(f"  • Physical Units Sold         : {row[1]:,}")
    print(f"  • Net Realized Revenue        : INR {float(row[2]):,.2f}  (~INR {float(row[2])/1e6:.2f}M)")
    print(f"  • Gross Revenue (Before Disc) : INR {float(row[3]):,.2f}  (~INR {float(row[3])/1e6:.2f}M)")
    print(f"  • Total Promotional Discounts : INR {float(row[4]):,.2f}  (~INR {float(row[4])/1e6:.2f}M)")
    print(f"  • Discount Impact %           : {row[5]}%")
    print(f"  • Realization Efficiency %    : {row[6]}%")
    print(f"  • Active Customer Accounts    : {row[7]:,}")
    print(f"  • Average Order Value (AOV)   : INR {float(row[8]):,.2f}")
    print("="*70 + "\n")
    cur.close()

def main():
    try:
        create_database_if_not_exists()
        conn = psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            dbname=DB_CONFIG['dbname']
        )
        apply_schema_and_views(conn)
        bulk_load_csv(conn)
        verify_pipeline(conn)
        conn.close()
        print("🎉 SUCCESS: PostgreSQL Database 'retail_intelligence' is fully populated and ready!")
    except Exception as e:
        print(f"❌ Pipeline Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
