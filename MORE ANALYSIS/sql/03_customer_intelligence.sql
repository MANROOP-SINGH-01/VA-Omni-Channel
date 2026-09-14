-- ==============================================================================
-- 03_customer_intelligence.sql
-- Module: Customer Repeat Dynamics, Frequency Distribution & CLV Modeling
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Repeat vs One-Time Customer Breakdown
WITH customer_order_counts AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        COUNT(o.OrderID) AS Total_Orders,
        SUM(o.TotalAmount) AS Total_Spend
    FROM customers c
    LEFT JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.CustomerName
)
SELECT 
    CASE WHEN Total_Orders > 1 THEN 'Repeat Customers' ELSE 'One-Time Customers' END AS Customer_Type,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(COUNT(CustomerID) * 100.0 / (SELECT COUNT(*) FROM customer_order_counts), 2) AS Customer_Share_Pct,
    ROUND(SUM(Total_Spend), 2) AS Total_Revenue,
    ROUND(SUM(Total_Spend) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct,
    ROUND(AVG(Total_Spend), 2) AS Avg_Revenue_Per_Customer,
    ROUND(AVG(Total_Orders), 2) AS Avg_Orders_Per_Customer
FROM customer_order_counts
GROUP BY Customer_Type;

-- 2. Customer Order Frequency Histogram (Distribution of order counts)
WITH customer_freq AS (
    SELECT 
        CustomerID, 
        COUNT(OrderID) AS Order_Count
    FROM orders
    GROUP BY CustomerID
)
SELECT 
    CASE 
        WHEN Order_Count = 1 THEN '1 Order (One-Time)'
        WHEN Order_Count BETWEEN 2 AND 5 THEN '2 - 5 Orders'
        WHEN Order_Count BETWEEN 6 AND 10 THEN '6 - 10 Orders'
        WHEN Order_Count BETWEEN 11 AND 15 THEN '11 - 15 Orders'
        ELSE '16+ Orders (Power Buyers)'
    END AS Frequency_Tier,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(COUNT(CustomerID) * 100.0 / (SELECT COUNT(*) FROM customer_freq), 2) AS Pct_Of_Customers
FROM customer_freq
GROUP BY Frequency_Tier
ORDER BY MIN(Order_Count);

-- 3. Customer Lifetime Value (CLV) Estimation
-- Formula: CLV = Average Order Value (AOV) * Annual Purchase Frequency * Estimated Lifespan (3 Years)
WITH customer_aggregates AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        c.Location AS City,
        c.JoinDate,
        DATEDIFF('2025-01-01', c.JoinDate) / 365.25 AS Tenure_Years,
        COUNT(o.OrderID) AS Total_Orders,
        SUM(o.TotalAmount) AS Total_Spent,
        MAX(o.OrderDate) AS Last_Order_Date,
        DATEDIFF('2025-01-01', MAX(o.OrderDate)) AS Recency_Days,
        AVG(o.TotalAmount) AS AOV
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.CustomerName, c.Location, c.JoinDate
),
clv_calculated AS (
    SELECT 
        CustomerID,
        CustomerName,
        City,
        Total_Orders,
        Total_Spent,
        AOV,
        Recency_Days,
        ROUND((Total_Orders / 3.0) * AOV * 3.0, 2) AS Estimated_CLV_3Yr,
        NTILE(4) OVER (ORDER BY Total_Spent DESC) AS CLV_Quartile
    FROM customer_aggregates
)
SELECT 
    CustomerID,
    CustomerName,
    City,
    Total_Orders,
    ROUND(Total_Spent, 2) AS Historical_Spend,
    ROUND(AOV, 2) AS Average_Order_Value,
    Estimated_CLV_3Yr,
    CASE 
        WHEN CLV_Quartile = 1 THEN 'Tier 1: Very High CLV'
        WHEN CLV_Quartile = 2 THEN 'Tier 2: High CLV'
        WHEN CLV_Quartile = 3 THEN 'Tier 3: Moderate CLV'
        ELSE 'Tier 4: Low CLV'
    END AS CLV_Segment,
    Recency_Days
FROM clv_calculated
ORDER BY Historical_Spend DESC
LIMIT 20;

-- 4. Dormant High-Value Customers (Retention Risk Trigger)
-- High CLV customers (Tier 1/2) who have not placed an order in over 180 days
WITH customer_risk AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        c.Location,
        SUM(o.TotalAmount) AS Total_Spend,
        COUNT(o.OrderID) AS Total_Orders,
        MAX(o.OrderDate) AS Last_Order_Date,
        DATEDIFF('2025-01-01', MAX(o.OrderDate)) AS Inactive_Days
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.CustomerName, c.Location
)
SELECT 
    CustomerID,
    CustomerName,
    Location,
    Total_Orders,
    ROUND(Total_Spend, 2) AS Total_Spend,
    Last_Order_Date,
    Inactive_Days,
    'URGENT RETENTION OUTREACH' AS Action_Trigger
FROM customer_risk
WHERE Total_Spend > 75000 AND Inactive_Days > 180
ORDER BY Total_Spend DESC;
