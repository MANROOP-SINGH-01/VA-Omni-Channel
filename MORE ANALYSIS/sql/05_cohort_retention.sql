-- ==============================================================================
-- 05_cohort_retention.sql
-- Module: Customer Acquisition Cohort Analysis & Retention Matrix
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Base Customer Cohort Assignment (First Purchase Month)
DROP VIEW IF EXISTS vw_customer_cohort_base;
CREATE VIEW vw_customer_cohort_base AS
WITH customer_first_order AS (
    SELECT 
        CustomerID,
        DATE_FORMAT(MIN(OrderDate), '%Y-%m') AS Cohort_Month,
        MIN(OrderDate) AS First_Order_Date
    FROM orders
    GROUP BY CustomerID
)
SELECT 
    o.OrderID,
    o.CustomerID,
    o.OrderDate,
    DATE_FORMAT(o.OrderDate, '%Y-%m') AS Order_Month,
    cfo.Cohort_Month,
    TIMESTAMPDIFF(MONTH, STR_TO_DATE(CONCAT(cfo.Cohort_Month, '-01'), '%Y-%m-%d'), STR_TO_DATE(CONCAT(DATE_FORMAT(o.OrderDate, '%Y-%m'), '-01'), '%Y-%m-%d')) AS Cohort_Index,
    o.TotalAmount
FROM orders o
JOIN customer_first_order cfo ON o.CustomerID = cfo.CustomerID;

-- 2. Cohort Size & Monthly Active Customers
DROP VIEW IF EXISTS vw_cohort_retention_counts;
CREATE VIEW vw_cohort_retention_counts AS
SELECT 
    Cohort_Month,
    Cohort_Index,
    COUNT(DISTINCT CustomerID) AS Active_Customers,
    SUM(TotalAmount) AS Cohort_Monthly_Revenue
FROM vw_customer_cohort_base
GROUP BY Cohort_Month, Cohort_Index;

-- 3. Formatted Cohort Retention Matrix (Month 0 to Month 6 Retention %)
WITH cohort_sizes AS (
    SELECT 
        Cohort_Month, 
        Active_Customers AS Cohort_Initial_Size
    FROM vw_cohort_retention_counts
    WHERE Cohort_Index = 0
)
SELECT 
    c.Cohort_Month,
    s.Cohort_Initial_Size AS Month_0_Users,
    '100.0%' AS M00_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 1 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M01_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 2 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M02_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 3 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M03_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 4 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M04_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 5 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M05_Retention,
    CONCAT(ROUND(MAX(CASE WHEN c.Cohort_Index = 6 THEN c.Active_Customers ELSE 0 END) * 100.0 / s.Cohort_Initial_Size, 1), '%') AS M06_Retention
FROM vw_cohort_retention_counts c
JOIN cohort_sizes s ON c.Cohort_Month = s.Cohort_Month
GROUP BY c.Cohort_Month, s.Cohort_Initial_Size
ORDER BY c.Cohort_Month
LIMIT 12;

-- 4. Benchmark Long-Term Retention Stability
-- Calculates average retention rate across all cohorts at each month offset
WITH cohort_sizes AS (
    SELECT Cohort_Month, Active_Customers AS Initial_Size
    FROM vw_cohort_retention_counts
    WHERE Cohort_Index = 0
)
SELECT 
    c.Cohort_Index AS Months_After_First_Purchase,
    COUNT(DISTINCT c.Cohort_Month) AS Number_Of_Cohorts_Observed,
    ROUND(AVG(c.Active_Customers * 100.0 / s.Initial_Size), 2) AS Avg_Retention_Rate_Pct
FROM vw_cohort_retention_counts c
JOIN cohort_sizes s ON c.Cohort_Month = s.Cohort_Month
WHERE c.Cohort_Index <= 12
GROUP BY c.Cohort_Index
ORDER BY c.Cohort_Index;
