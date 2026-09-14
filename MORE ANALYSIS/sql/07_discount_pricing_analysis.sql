-- ==============================================================================
-- 07_discount_pricing_analysis.sql
-- Module: Discount Elasticity, Diminishing Returns & Channel Dependency
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Discount Depth Buckets & Demand Elasticity
WITH order_discount_tiers AS (
    SELECT 
        OrderID,
        Quantity,
        UnitPrice,
        Discount,
        TotalAmount,
        (Quantity * UnitPrice) AS GrossAmount,
        ROUND((Discount / NULLIF(Quantity * UnitPrice, 0)) * 100, 2) AS Discount_Pct
    FROM orders
)
SELECT 
    CASE 
        WHEN Discount_Pct = 0 THEN '0% (Full Price)'
        WHEN Discount_Pct <= 5.0 THEN '1% - 5% (Low Discount)'
        WHEN Discount_Pct <= 10.0 THEN '5% - 10% (Moderate Discount)'
        WHEN Discount_Pct <= 20.0 THEN '10% - 20% (High Discount)'
        ELSE '20%+ (Deep Clearance)'
    END AS Discount_Bracket,
    COUNT(OrderID) AS Order_Volume,
    SUM(Quantity) AS Total_Units_Moved,
    ROUND(SUM(GrossAmount), 2) AS Gross_Value,
    ROUND(SUM(Discount), 2) AS Total_Discount_Sacrificed,
    ROUND(SUM(TotalAmount), 2) AS Net_Realized_Revenue,
    ROUND(AVG(Discount_Pct), 2) AS Avg_Discount_Given_Pct,
    ROUND(AVG(TotalAmount), 2) AS Realized_AOV
FROM order_discount_tiers
GROUP BY Discount_Bracket
ORDER BY MIN(Discount_Pct);

-- 2. Channel Discount Dependency Scorecard
SELECT 
    SalesChannel,
    COUNT(OrderID) AS Total_Orders,
    COUNT(CASE WHEN Discount > 0 THEN 1 END) AS Discounted_Orders,
    ROUND(COUNT(CASE WHEN Discount > 0 THEN 1 END) * 100.0 / COUNT(OrderID), 2) AS Discount_Order_Dependency_Pct,
    ROUND(SUM(Quantity * UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(Discount), 2) AS Discount_Amount,
    ROUND(SUM(Discount) * 100.0 / SUM(Quantity * UnitPrice), 2) AS Discount_Revenue_Share_Pct,
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND(AVG(Discount), 2) AS Avg_Discount_Per_Order
FROM orders
GROUP BY SalesChannel
ORDER BY Discount_Revenue_Share_Pct DESC;

-- 3. Product Category Discount Dependency & Margin Erosion
SELECT 
    p.Category,
    COUNT(o.OrderID) AS Orders,
    ROUND(SUM(o.Quantity * o.UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(o.Discount), 2) AS Total_Discount_Amount,
    ROUND(SUM(o.Discount) * 100.0 / SUM(o.Quantity * o.UnitPrice), 2) AS Discount_Erosion_Pct,
    ROUND(SUM(o.TotalAmount), 2) AS Net_Realized_Revenue
FROM orders o
JOIN products p ON o.ProductID = p.ProductID
GROUP BY p.Category
ORDER BY Discount_Erosion_Pct DESC;

-- 4. Problem Product Detection: Deep Discount + Low Sales Velocity
-- Products with > 18% realized discount rate but below-average units sold
WITH prod_stats AS (
    SELECT 
        p.ProductID,
        p.ProductName,
        p.Category,
        p.UnitPrice,
        SUM(o.Quantity) AS Units_Sold,
        SUM(o.TotalAmount) AS Net_Revenue,
        SUM(o.Discount) AS Total_Discount,
        ROUND(SUM(o.Discount) * 100.0 / SUM(o.Quantity * o.UnitPrice), 2) AS Discount_Pct
    FROM products p
    JOIN orders o ON p.ProductID = o.ProductID
    GROUP BY p.ProductID, p.ProductName, p.Category, p.UnitPrice
)
SELECT 
    ProductID,
    ProductName,
    Category,
    UnitPrice,
    Units_Sold,
    Discount_Pct,
    ROUND(Net_Revenue, 2) AS Net_Revenue,
    'DISCOUNT DRAG / MARGIN RISK' AS Evaluation
FROM prod_stats
WHERE Discount_Pct > 18.0 AND Units_Sold < 650
ORDER BY Discount_Pct DESC
LIMIT 15;
