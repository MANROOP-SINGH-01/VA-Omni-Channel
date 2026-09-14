-- ==============================================================================
-- master_analysis.sql
-- Master Execution Pipeline & Analytical Benchmark Findings
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Master Executive Scorecard
SELECT 
    '1. Executive Summary' AS Analysis_Section,
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(Quantity * UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(Discount), 2) AS Discount_Sacrificed,
    COUNT(OrderID) AS Total_Orders,
    SUM(Quantity) AS Total_Units_Sold,
    COUNT(DISTINCT CustomerID) AS Total_Customers,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value
FROM orders;

-- 2. Omnichannel Multiplier (1 vs 5 Channels)
WITH cust_channels AS (
    SELECT 
        c.CustomerID,
        COUNT(DISTINCT o.SalesChannel) AS Channels_Used,
        SUM(o.TotalAmount) AS Lifetime_Spend
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID
)
SELECT 
    Channels_Used,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(AVG(Lifetime_Spend), 2) AS Avg_Spend_Per_Customer,
    ROUND(SUM(Lifetime_Spend), 2) AS Total_Revenue,
    ROUND(SUM(Lifetime_Spend) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct
FROM cust_channels
GROUP BY Channels_Used
ORDER BY Channels_Used;

-- 3. Product BCG Quadrants Summary
WITH prod_perf AS (
    SELECT 
        p.ProductID,
        SUM(o.TotalAmount) AS Revenue,
        SUM(o.Quantity) AS Units
    FROM products p
    JOIN orders o ON p.ProductID = o.ProductID
    GROUP BY p.ProductID
),
quadrants AS (
    SELECT 
        ProductID,
        CASE 
            WHEN Revenue >= 1534203 AND Units >= 751 THEN 'Stars'
            WHEN Revenue >= 1534203 AND Units < 751 THEN 'Premium Drivers'
            WHEN Revenue < 1534203 AND Units >= 751 THEN 'Volume Drivers'
            ELSE 'Underperformers'
        END AS Quadrant
    FROM prod_perf
)
SELECT 
    Quadrant,
    COUNT(ProductID) AS SKU_Count,
    ROUND(COUNT(ProductID) * 100.0 / 200, 1) AS Pct_Of_Catalog
FROM quadrants
GROUP BY Quadrant
ORDER BY SKU_Count DESC;

-- 4. Customer Repeat Rate & Revenue Contribution
WITH cust_orders AS (
    SELECT CustomerID, COUNT(OrderID) AS Orders, SUM(TotalAmount) AS Spend
    FROM orders
    GROUP BY CustomerID
)
SELECT 
    CASE WHEN Orders > 1 THEN 'Repeat Buyers' ELSE 'One-Time Buyers' END AS Segment,
    COUNT(CustomerID) AS Customers,
    ROUND(COUNT(CustomerID) * 100.0 / 5000, 2) AS Customer_Pct,
    ROUND(SUM(Spend), 2) AS Total_Revenue,
    ROUND(SUM(Spend) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Pct
FROM cust_orders
GROUP BY Segment;
