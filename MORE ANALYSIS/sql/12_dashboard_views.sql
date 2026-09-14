-- ==============================================================================
-- 12_dashboard_views.sql
-- Module: Reusable Analytical Views for Direct Power BI & Web BI Ingestion
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- View 1: Executive KPI Summary Header
DROP VIEW IF EXISTS bi_executive_kpis;
CREATE VIEW bi_executive_kpis AS
SELECT 
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(Quantity * UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(Discount), 2) AS Total_Discount,
    COUNT(OrderID) AS Total_Orders,
    SUM(Quantity) AS Total_Units_Sold,
    COUNT(DISTINCT CustomerID) AS Total_Customers,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value,
    ROUND(SUM(TotalAmount) / COUNT(DISTINCT CustomerID), 2) AS Revenue_Per_Customer,
    ROUND(SUM(Discount) * 100.0 / SUM(Quantity * UnitPrice), 2) AS Overall_Discount_Rate_Pct
FROM orders;

-- View 2: Customer RFM Profiles
DROP VIEW IF EXISTS bi_customer_rfm;
CREATE VIEW bi_customer_rfm AS
SELECT 
    CustomerID,
    CustomerName,
    City,
    LoyaltyPoints,
    Recency,
    Frequency,
    Monetary,
    AOV,
    R_Score,
    F_Score,
    M_Score,
    RFM_Segment
FROM vw_customer_rfm_scores;

-- View 3: Product Portfolio BCG Matrix
DROP VIEW IF EXISTS bi_product_bcg;
CREATE VIEW bi_product_bcg AS
SELECT 
    ProductID,
    ProductName,
    Category,
    UnitPrice,
    Total_Orders,
    Total_Units_Sold,
    Net_Revenue,
    Average_Order_Value,
    Realized_Discount_Rate,
    CASE 
        WHEN Net_Revenue >= 1534203 AND Total_Units_Sold >= 751 THEN 'Stars'
        WHEN Net_Revenue >= 1534203 AND Total_Units_Sold < 751 THEN 'Premium Drivers'
        WHEN Net_Revenue < 1534203 AND Total_Units_Sold >= 751 THEN 'Volume Drivers'
        ELSE 'Underperformers'
    END AS BCG_Quadrant
FROM vw_product_performance;

-- View 4: Omnichannel Customer Multiplier
DROP VIEW IF EXISTS bi_omnichannel_adoption;
CREATE VIEW bi_omnichannel_adoption AS
WITH customer_channel_tiers AS (
    SELECT 
        c.CustomerID,
        COUNT(DISTINCT o.SalesChannel) AS Channels_Used,
        COUNT(o.OrderID) AS Lifetime_Orders,
        SUM(o.TotalAmount) AS Lifetime_Spend,
        AVG(o.TotalAmount) AS Customer_AOV,
        c.LoyaltyPoints
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.LoyaltyPoints
)
SELECT 
    Channels_Used,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(SUM(Lifetime_Spend), 2) AS Tier_Revenue,
    ROUND(AVG(Lifetime_Spend), 2) AS Avg_Customer_Spend,
    ROUND(AVG(Lifetime_Orders), 2) AS Avg_Orders,
    ROUND(AVG(Customer_AOV), 2) AS Avg_AOV,
    ROUND(AVG(LoyaltyPoints), 0) AS Avg_Loyalty_Points
FROM customer_channel_tiers
GROUP BY Channels_Used;

-- View 5: Monthly Growth & Momentum
DROP VIEW IF EXISTS bi_monthly_growth;
CREATE VIEW bi_monthly_growth AS
WITH monthly AS (
    SELECT 
        DATE_FORMAT(OrderDate, '%Y-%m') AS Year_Month,
        YEAR(OrderDate) AS Sales_Year,
        MONTH(OrderDate) AS Sales_Month,
        ROUND(SUM(TotalAmount), 2) AS Revenue,
        COUNT(OrderID) AS Orders,
        SUM(Quantity) AS Units,
        COUNT(DISTINCT CustomerID) AS Customers,
        ROUND(AVG(TotalAmount), 2) AS AOV
    FROM orders
    GROUP BY Year_Month, Sales_Year, Sales_Month
)
SELECT 
    Year_Month,
    Sales_Year,
    Sales_Month,
    Revenue,
    LAG(Revenue) OVER (ORDER BY Year_Month) AS Prev_Revenue,
    ROUND((Revenue - LAG(Revenue) OVER (ORDER BY Year_Month)) * 100.0 / NULLIF(LAG(Revenue) OVER (ORDER BY Year_Month), 0), 2) AS Revenue_MoM_Pct,
    Orders,
    Units,
    Customers,
    AOV
FROM monthly;
