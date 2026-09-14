-- ==============================================================================
-- 06_product_intelligence.sql
-- Module: BCG Matrix, 80/20 Pareto, Price vs Demand & Category Dynamics
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Product Performance Base View (With Bug Fix: SUM(Quantity) instead of COUNT(Quantity))
DROP VIEW IF EXISTS vw_product_performance;
CREATE VIEW vw_product_performance AS
SELECT 
    p.ProductID,
    p.ProductName,
    p.Category,
    p.UnitPrice,
    COUNT(o.OrderID) AS Total_Orders,
    SUM(o.Quantity) AS Total_Units_Sold,
    ROUND(SUM(o.TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(o.Quantity * o.UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(o.Discount), 2) AS Total_Discount_Given,
    ROUND(AVG(o.TotalAmount), 2) AS Average_Order_Value,
    ROUND(SUM(o.Discount) / NULLIF(SUM(o.Quantity * o.UnitPrice), 0) * 100, 2) AS Realized_Discount_Rate
FROM products p
JOIN orders o ON p.ProductID = o.ProductID
GROUP BY p.ProductID, p.ProductName, p.Category, p.UnitPrice;

-- 2. BCG Product Portfolio Matrix (Revenue vs Volume Quadrant)
-- Median Revenue = ₹1.46M, Median Units = 744
WITH medians AS (
    SELECT 
        AVG(Net_Revenue) AS Avg_Revenue,
        AVG(Total_Units_Sold) AS Avg_Units
    FROM vw_product_performance
)
SELECT 
    p.ProductID,
    p.ProductName,
    p.Category,
    p.UnitPrice,
    p.Total_Units_Sold,
    p.Net_Revenue,
    CASE 
        WHEN p.Net_Revenue >= m.Avg_Revenue AND p.Total_Units_Sold >= m.Avg_Units THEN 'Stars (High Rev, High Volume)'
        WHEN p.Net_Revenue >= m.Avg_Revenue AND p.Total_Units_Sold < m.Avg_Units THEN 'Premium Drivers (High Rev, Low Volume)'
        WHEN p.Net_Revenue < m.Avg_Revenue AND p.Total_Units_Sold >= m.Avg_Units THEN 'Volume Drivers (Low Rev, High Volume)'
        ELSE 'Underperformers (Low Rev, Low Volume)'
    END AS BCG_Quadrant,
    p.Realized_Discount_Rate
FROM vw_product_performance p
CROSS JOIN medians m
ORDER BY p.Net_Revenue DESC;

-- 3. Pareto 80/20 Analysis (Cumulative Revenue Share of Products)
WITH ranked_products AS (
    SELECT 
        ProductID,
        ProductName,
        Category,
        Net_Revenue,
        ROW_NUMBER() OVER (ORDER BY Net_Revenue DESC) AS Rev_Rank,
        SUM(Net_Revenue) OVER (ORDER BY Net_Revenue DESC) AS Cumulative_Revenue,
        (SELECT SUM(Net_Revenue) FROM vw_product_performance) AS Total_Catalog_Revenue,
        COUNT(*) OVER () AS Total_Product_Count
    FROM vw_product_performance
)
SELECT 
    ProductID,
    ProductName,
    Category,
    Net_Revenue,
    Rev_Rank,
    ROUND(Rev_Rank * 100.0 / Total_Product_Count, 2) AS Cumulative_Product_Pct,
    ROUND(Cumulative_Revenue * 100.0 / Total_Catalog_Revenue, 2) AS Cumulative_Revenue_Pct,
    CASE 
        WHEN (Cumulative_Revenue * 100.0 / Total_Catalog_Revenue) <= 80.0 THEN 'Core 80% Engine'
        ELSE 'Long Tail (Remaining 20%)'
    END AS Pareto_Classification
FROM ranked_products
ORDER BY Rev_Rank;

-- 4. Price vs Demand (Price Band Elasticity Analysis)
SELECT 
    CASE 
        WHEN UnitPrice < 1000 THEN '1. Under ₹1,000'
        WHEN UnitPrice BETWEEN 1000 AND 1999.99 THEN '2. ₹1,000 - ₹1,999'
        WHEN UnitPrice BETWEEN 2000 AND 2999.99 THEN '3. ₹2,000 - ₹2,999'
        WHEN UnitPrice BETWEEN 3000 AND 3999.99 THEN '4. ₹3,000 - ₹3,999'
        ELSE '5. ₹4,000 and Above'
    END AS Price_Band,
    COUNT(DISTINCT ProductID) AS Catalog_Products,
    SUM(Total_Orders) AS Total_Orders_Placed,
    SUM(Total_Units_Sold) AS Total_Units_Sold,
    ROUND(SUM(Net_Revenue), 2) AS Band_Total_Revenue,
    ROUND(SUM(Net_Revenue) * 100.0 / (SELECT SUM(Net_Revenue) FROM vw_product_performance), 2) AS Revenue_Share_Pct,
    ROUND(AVG(Average_Order_Value), 2) AS Avg_Order_Value
FROM vw_product_performance
GROUP BY Price_Band
ORDER BY Price_Band;

-- 5. Product Category Scorecard
SELECT 
    Category,
    COUNT(DISTINCT ProductID) AS Active_SKUs,
    SUM(Total_Orders) AS Orders_Count,
    SUM(Total_Units_Sold) AS Total_Units_Sold,
    ROUND(SUM(Net_Revenue), 2) AS Category_Revenue,
    ROUND(SUM(Net_Revenue) * 100.0 / (SELECT SUM(Net_Revenue) FROM vw_product_performance), 2) AS Revenue_Share_Pct,
    ROUND(AVG(UnitPrice), 2) AS Avg_Catalog_Price,
    ROUND(AVG(Realized_Discount_Rate), 2) AS Avg_Discount_Given_Pct
FROM vw_product_performance
GROUP BY Category
ORDER BY Category_Revenue DESC;
