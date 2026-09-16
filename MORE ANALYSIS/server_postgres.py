"""
server_postgres.py
Unified Full-Stack Server: PostgreSQL REST API + Static Frontend Delivery
Omni-Channel Retail Intelligence Platform
"""

import os
import sys
import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import psycopg2
from psycopg2.extras import RealDictCursor

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

DATABASE_URL = os.environ.get('DATABASE_URL')

DB_CONFIG = {
    'host': os.environ.get('DB_HOST', 'localhost'),
    'port': int(os.environ.get('DB_PORT', 5432)),
    'user': os.environ.get('DB_USER', 'postgres'),
    'password': os.environ.get('DB_PASSWORD', 'nigga'),
    'dbname': os.environ.get('DB_NAME', 'retail_intelligence')
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_db_connection():
    try:
        if DATABASE_URL:
            return psycopg2.connect(DATABASE_URL, connect_timeout=10)
        return psycopg2.connect(
            host=DB_CONFIG['host'],
            port=DB_CONFIG['port'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            dbname=DB_CONFIG['dbname'],
            connect_timeout=10
        )
    except Exception as e:
        print(f"PostgreSQL connection error: {e}", file=sys.stderr)
        return None

class RetailIntelligenceHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        if path.startswith('/api/'):
            self.handle_api(path, query)
        else:
            super().do_GET()

    def send_json(self, data, status_code=200):
        body = json.dumps(data, default=str).encode('utf-8')
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def handle_api(self, path, query):
        if path == '/api/health':
            self.send_json({
                'status': 'healthy',
                'service': 'retail-intelligence-api',
                'engine': 'Python 3 / PostgreSQL 18'
            }, 200)
            return

        conn = get_db_connection()
        if not conn:
            self.send_json({
                'error': 'Could not connect to PostgreSQL database',
                'database': DB_CONFIG['dbname'],
                'connected': False
            }, 503)
            return

        cur = conn.cursor(cursor_factory=RealDictCursor)

        try:
            if path == '/api/status':
                cur.execute("SELECT COUNT(*) FROM customers;")
                cust_cnt = cur.fetchone()['count']
                cur.execute("SELECT COUNT(*) FROM products;")
                prod_cnt = cur.fetchone()['count']
                cur.execute("SELECT COUNT(*) FROM orders;")
                order_cnt = cur.fetchone()['count']
                
                self.send_json({
                    'connected': True,
                    'database': DB_CONFIG['dbname'],
                    'engine': 'PostgreSQL 18.6',
                    'counts': {
                        'customers': cust_cnt,
                        'products': prod_cnt,
                        'orders': order_cnt
                    }
                })

            elif path == '/api/kpis':
                cur.execute("""
                    SELECT 
                        total_orders,
                        total_units,
                        net_revenue,
                        gross_revenue,
                        total_discount,
                        discount_impact_pct,
                        revenue_realization_rate_pct,
                        active_customers,
                        average_order_value,
                        revenue_per_customer
                    FROM vw_executive_kpis;
                """)
                row = cur.fetchone()
                self.send_json(row)

            elif path == '/api/channels':
                cur.execute("""
                    SELECT 
                        saleschannel,
                        total_orders,
                        units_sold,
                        net_revenue,
                        revenue_share_pct,
                        average_order_value,
                        units_per_basket,
                        discount_rate_pct,
                        unique_customers
                    FROM vw_channel_scorecard;
                """)
                rows = cur.fetchall()
                self.send_json(rows)

            elif path == '/api/rfm':
                cur.execute("""
                    SELECT 
                        rfm_segment,
                        customer_count,
                        customer_share_pct,
                        total_segment_revenue,
                        revenue_share_pct,
                        avg_customer_spend,
                        avg_basket_size,
                        avg_orders_per_customer,
                        avg_days_since_last_order
                    FROM vw_rfm_segment_summary;
                """)
                rows = cur.fetchall()
                self.send_json(rows)

            elif path == '/api/cities':
                cur.execute("""
                    SELECT 
                        city,
                        total_orders,
                        units_sold,
                        total_revenue,
                        revenue_share_pct,
                        unique_customers,
                        average_order_value,
                        revenue_per_customer
                    FROM vw_city_market_rankings;
                """)
                rows = cur.fetchall()
                self.send_json(rows)

            elif path == '/api/trends':
                granularity = query.get('granularity', ['monthly'])[0]
                if granularity == 'yearly':
                    date_expr = "TO_CHAR(orderdate, 'YYYY')"
                elif granularity == 'quarterly':
                    date_expr = "CONCAT(TO_CHAR(orderdate, 'YYYY'), '-Q', EXTRACT(QUARTER FROM orderdate))"
                elif granularity == 'weekly':
                    date_expr = "TO_CHAR(orderdate, 'IYYY-\"W\"IW')"
                elif granularity == 'daily':
                    date_expr = "TO_CHAR(orderdate, 'YYYY-MM-DD')"
                else:
                    date_expr = "TO_CHAR(orderdate, 'YYYY-MM')"

                cur.execute(f"""
                    SELECT 
                        {date_expr} AS period,
                        ROUND(SUM(totalamount), 2) AS revenue,
                        COUNT(orderid) AS orders,
                        SUM(quantity) AS units,
                        ROUND(AVG(totalamount), 2) AS aov
                    FROM orders
                    GROUP BY 1
                    ORDER BY 1 ASC;
                """)
                rows = cur.fetchall()
                self.send_json(rows)

            else:
                self.send_json({'error': f'Endpoint {path} not found'}, 404)

        except Exception as e:
            self.send_json({'error': str(e)}, 500)
        finally:
            cur.close()
            conn.close()

def run(port=8000):
    server_address = ('', port)
    httpd = ThreadingHTTPServer(server_address, RetailIntelligenceHandler)
    print(f"\n" + "="*70)
    print(f"🚀 RETAIL INTELLIGENCE PLATFORM (PostgreSQL Full-Stack)")
    print(f"="*70)
    print(f"  • Frontend URL        : http://localhost:{port}/")
    print(f"  • PostgreSQL API      : http://localhost:{port}/api/status")
    print(f"  • Database            : {DB_CONFIG['dbname']} (PostgreSQL 18.6)")
    print(f"  • Data Ingestion      : 50,000 Transactions | 5,000 Customers | 200 SKUs")
    print(f"="*70 + "\n")
    httpd.serve_forever()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else 8000))
    run(port)
