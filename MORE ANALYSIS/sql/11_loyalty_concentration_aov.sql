-- ==============================================================================
-- 11_loyalty_concentration_aov.sql
-- Module: Loyalty Tier Analytics, Revenue Concentration & Multi-Dimensional AOV
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Loyalty Points Tier Analysis
WITH customer_loyalty_stats AS (
    SELECT 
        c.CustomerID,
        c.LoyaltyPoints,
        CASE 
            WHEN c.LoyaltyPoints < 1500 THEN 'Bronze (0 - 1,499 pts)'
            WHEN c.LoyaltyPoints BETWEEN 1500 AND 3499 THEN 'Silver (1,500 - 3,499 pts)'
            ELSE 'Gold (3,500+ pts)'
        END AS Loyalty_Tier,
        COUNT(o.OrderID) AS Orders_Count,
        SUM(o.TotalAmount) AS Total_Spend,
        AVG(o.TotalAmount) AS AOV
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.LoyaltyPoints
)
SELECT 
    Loyalty_Tier,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(COUNT(CustomerID) * 100.0 / (SELECT COUNT(*) FROM customer_loyalty_stats), 2) AS Customer_Share_Pct,
    ROUND(SUM(Total_Spend), 2) AS Tier_Revenue,
    ROUND(SUM(Total_Spend) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct,
    ROUND(AVG(Total_Spend), 2) AS Avg_Customer_Lifetime_Spend,
    ROUND(AVG(AOV), 2) AS Avg_Order_Value,
    ROUND(AVG(Orders_Count), 2) AS Avg_Orders_Per_Customer,
    'FINDING: Spend is uniform across tiers (~₹61K), revealing program currently rewards tenure rather than spend thresholds.' AS Strategic_Diagnostic
FROM customer_loyalty_stats
GROUP BY Loyalty_Tier
ORDER BY MIN(LoyaltyPoints);

-- 2. Strategic Revenue Concentration Metrics (Dependency Risk Analysis)
WITH top_10_cust AS (
    SELECT SUM(Total_Spend) AS Rev_Top10_Cust
    FROM (
        SELECT SUM(TotalAmount) AS Total_Spend
        FROM orders
        GROUP BY CustomerID
        ORDER BY Total_Spend DESC
        LIMIT 10
    ) sub
),
top_10_prod AS (
    SELECT SUM(Total_Spend) AS Rev_Top10_Prod
    FROM (
        SELECT SUM(TotalAmount) AS Total_Spend
        FROM orders
        GROUP BY ProductID
        ORDER BY Total_Spend DESC
        LIMIT 10
    ) sub
),
top_3_cities AS (
    SELECT SUM(Total_Spend) AS Rev_Top3_Cities
    FROM (
        SELECT SUM(o.TotalAmount) AS Total_Spend
        FROM orders o
        JOIN customers c ON o.CustomerID = c.CustomerID
        GROUP BY c.Location
        ORDER BY Total_Spend DESC
        LIMIT 3
    ) sub
),
total_rev AS (
    SELECT SUM(TotalAmount) AS Total_Revenue FROM orders
)
SELECT 
    'Top 10 Customers' AS Concentration_Dimension,
    ROUND(c.Rev_Top10_Cust, 2) AS Concentrated_Revenue,
    ROUND(c.Rev_Top10_Cust * 100.0 / t.Total_Revenue, 2) AS Revenue_Share_Pct,
    'Low Risk (Well Diversified Customer Base)' AS Risk_Evaluation
FROM top_10_cust c, total_rev t
UNION ALL
SELECT 
    'Top 10 Products (SKUs)' AS Concentration_Dimension,
    ROUND(p.Rev_Top10_Prod, 2) AS Concentrated_Revenue,
    ROUND(p.Rev_Top10_Prod * 100.0 / t.Total_Revenue, 2) AS Revenue_Share_Pct,
    'Moderate Risk (Top 5% SKUs drive 11.5% revenue)' AS Risk_Evaluation
FROM top_10_prod p, total_rev t
UNION ALL
SELECT 
    'Top 3 Cities (Ahmedabad, Kolkata, Bangalore)' AS Concentration_Dimension,
    ROUND(ci.Rev_Top3_Cities, 2) AS Concentrated_Revenue,
    ROUND(ci.Rev_Top3_Cities * 100.0 / t.Total_Revenue, 2) AS Revenue_Share_Pct,
    'Balanced (38.6% across top 3 metros)' AS Risk_Evaluation
FROM top_3_cities ci, total_rev t;

-- 3. Multi-Dimensional AOV Comparison (Where are baskets largest?)
SELECT 
    'Channel' AS Dimension_Type,
    SalesChannel AS Dimension_Value,
    COUNT(OrderID) AS Orders,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value
FROM orders
GROUP BY SalesChannel
UNION ALL
SELECT 
    'Payment Method' AS Dimension_Type,
    PaymentMethod AS Dimension_Value,
    COUNT(OrderID) AS Orders,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value
FROM orders
GROUP BY PaymentMethod
UNION ALL
SELECT 
    'Category' AS Dimension_Type,
    p.Category AS Dimension_Value,
    COUNT(o.OrderID) AS Orders,
    ROUND(AVG(o.TotalAmount), 2) AS Average_Order_Value
FROM orders o
JOIN products p ON o.ProductID = p.ProductID
GROUP BY p.Category
ORDER BY Dimension_Type, Average_Order_Value DESC;
