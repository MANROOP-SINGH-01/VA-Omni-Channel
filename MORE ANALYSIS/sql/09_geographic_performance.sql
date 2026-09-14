-- ==============================================================================
-- 09_geographic_performance.sql
-- Module: Geographic Scorecard, Strategic City Classification & City × Category Matrix
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. City Performance Scorecard Base View
DROP VIEW IF EXISTS vw_city_performance;
CREATE VIEW vw_city_performance AS
SELECT 
    c.Location AS City,
    COUNT(DISTINCT c.CustomerID) AS Total_Customers,
    COUNT(o.OrderID) AS Total_Orders,
    SUM(o.Quantity) AS Total_Units_Sold,
    ROUND(SUM(o.TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(o.Quantity * o.UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(o.Discount), 2) AS Total_Discount_Given,
    ROUND(AVG(o.TotalAmount), 2) AS Average_Order_Value,
    ROUND(SUM(o.TotalAmount) / COUNT(DISTINCT c.CustomerID), 2) AS Revenue_Per_Customer,
    ROUND(SUM(o.Discount) * 100.0 / SUM(o.Quantity * o.UnitPrice), 2) AS Discount_Rate_Pct
FROM customers c
JOIN orders o ON c.CustomerID = o.CustomerID
GROUP BY c.Location;

-- 2. Strategic City Classification Matrix
WITH city_averages AS (
    SELECT 
        AVG(Net_Revenue) AS Avg_City_Revenue,
        AVG(Total_Customers) AS Avg_City_Customers,
        AVG(Average_Order_Value) AS Avg_City_AOV
    FROM vw_city_performance
)
SELECT 
    cp.City,
    cp.Total_Customers,
    cp.Total_Orders,
    cp.Net_Revenue,
    cp.Average_Order_Value,
    cp.Revenue_Per_Customer,
    cp.Discount_Rate_Pct,
    CASE 
        WHEN cp.Net_Revenue >= ca.Avg_City_Revenue AND cp.Total_Customers >= ca.Avg_City_Customers THEN 'Core Markets (High Rev, High Scale)'
        WHEN cp.Net_Revenue >= ca.Avg_City_Revenue AND cp.Total_Customers < ca.Avg_City_Customers THEN 'High Value Markets (High Rev, Premium Density)'
        WHEN cp.Net_Revenue < ca.Avg_City_Revenue AND cp.Total_Customers >= ca.Avg_City_Customers THEN 'Growth Opportunities (Scale Ready, Upsell Potential)'
        ELSE 'Under-Penetrated / Niche'
    END AS Strategic_Classification
FROM vw_city_performance cp
CROSS JOIN city_averages ca
ORDER BY cp.Net_Revenue DESC;

-- 3. City × Category Revenue Matrix
SELECT 
    c.Location AS City,
    p.Category,
    COUNT(o.OrderID) AS Order_Count,
    SUM(o.Quantity) AS Units_Sold,
    ROUND(SUM(o.TotalAmount), 2) AS Category_Revenue,
    ROUND(AVG(o.TotalAmount), 2) AS Category_AOV
FROM orders o
JOIN customers c ON o.CustomerID = c.CustomerID
JOIN products p ON o.ProductID = p.ProductID
GROUP BY c.Location, p.Category
ORDER BY c.Location, Category_Revenue DESC;
