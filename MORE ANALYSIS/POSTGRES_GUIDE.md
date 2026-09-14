# PostgreSQL 18 Data Engineering & Analytical Warehouse Guide

## 1. Architecture Overview

The **Omni-Channel Retail Intelligence Platform** runs on a dual-engine architecture:
- **Relational Analytical Warehouse**: Native **PostgreSQL 18.6** database (`retail_intelligence`) storing normalized dimension and fact tables with primary/foreign key constraints, B-tree indexes, and pre-computed analytical views.
- **RESTful Data Bridge**: Python backend (`server_postgres.py`) exposing high-performance JSON endpoints (`/api/status`, `/api/kpis`, `/api/channels`, `/api/rfm`, `/api/cities`, `/api/trends`).
- **Interactive UI**: HTML5 + Vanilla JS dashboard that queries live PostgreSQL when available and gracefully defaults to in-memory processing if hosted on static platforms like GitHub Pages.

---

## 2. Database Schema & Data Dictionary

| Object Name | Type | Record Count | Description |
| :--- | :--- | :--- | :--- |
| `customers` | Table (Dimension) | **5,000** | Customer profiles, locations (8 metros), join dates, loyalty points. |
| `products` | Table (Dimension) | **200** | Product catalog SKUs, categories, and unit pricing. |
| `orders` | Table (Fact) | **50,000** | Transaction-level sales records spanning 2022 to 2024 with quantities, discounts, net totals, sales channels, and payment methods. |
| `vw_sales_unified` | View (Master) | **50,000** | Denormalized join of orders, customers, and products with temporal extractions and computed discount percentages. |
| `vw_executive_kpis` | View (Aggregated) | **1** | Top-line executive metrics: Net Realized Revenue, Gross Revenue, Fulfilled Orders, Units, AOV, Realization Rate. |
| `vw_channel_scorecard`| View (Aggregated) | **5** | Performance breakdown across Amazon, Flipkart, Physical Store, Mobile App, and Website. |
| `vw_customer_rfm_scores`| View (Analytical) | **5,000** | Recency, Frequency, Monetary quintile scoring (NTILE 1-5) and customer segment classifications. |
| `vw_rfm_segment_summary`| View (Aggregated) | **8** | Strategic segment distribution (Champions, Loyal Customers, Big Spenders, Lost Customers, etc.). |
| `vw_city_market_rankings`| View (Spatial) | **8** | Metro performance ranked by realized revenue and unique customer penetration. |
| `vw_omnichannel_adoption_tiers` | View (Analytical) | **5** | Customer lifetime value progression by number of distinct channels used (1 to 5). |

---

## 3. How to Open & Inspect in pgAdmin 4

Your installation of **pgAdmin 4** is ready at:
```
C:\INFINTY\APPS\D A T A B A S E\POSTGRE SQL\pgAdmin 4\runtime\pgAdmin4.exe
```

### Steps to View in pgAdmin 4:
1. Open `pgAdmin4.exe`.
2. In the left browser panel, expand **Servers** -> **PostgreSQL 18**.
3. Enter your superuser password when prompted.
4. Expand **Databases** -> **`retail_intelligence`** -> **Schemas** -> **`public`**.
5. Click **Tables** to see `customers`, `products`, `orders`. Right-click any table and select **View/Edit Data** -> **First 100 Rows**.
6. Click **Views** to see `vw_executive_kpis`, `vw_channel_scorecard`, `vw_customer_rfm_scores`, etc.

---

## 4. Sample SQL Queries You Can Run in pgAdmin 4

Open the **Query Tool** (`Tools` -> `Query Tool`) in pgAdmin 4 and run any of these:

### Top 5 RFM Customer Segments by Revenue:
```sql
SELECT 
    rfm_segment,
    customer_count,
    customer_share_pct,
    total_segment_revenue,
    revenue_share_pct,
    avg_customer_spend,
    avg_orders_per_customer
FROM vw_rfm_segment_summary
ORDER BY total_segment_revenue DESC;
```

### Channel Revenue & Basket Size Breakdown:
```sql
SELECT 
    saleschannel,
    net_revenue,
    revenue_share_pct,
    total_orders,
    average_order_value,
    discount_rate_pct
FROM vw_channel_scorecard;
```

### Top 10 High-Value VIP Champions:
```sql
SELECT 
    customerid,
    customername,
    city,
    monetary AS total_spent,
    frequency AS total_orders,
    recency AS days_since_last_order,
    rfm_segment
FROM vw_customer_rfm_scores
WHERE rfm_segment = 'Champions'
ORDER BY monetary DESC
LIMIT 10;
```

---

## 5. How to Start the PostgreSQL Connected Server

To run the live platform connected to PostgreSQL:
```bash
python "MORE ANALYSIS/server_postgres.py" 8000
```

Once running, visit:
- **Interactive UI**: `http://localhost:8000/` (Displays `PostgreSQL Live (50k rows)` in header)
- **API Status**: `http://localhost:8000/api/status`
- **KPI Endpoint**: `http://localhost:8000/api/kpis`
- **Channels Endpoint**: `http://localhost:8000/api/channels`
- **RFM Endpoint**: `http://localhost:8000/api/rfm`
