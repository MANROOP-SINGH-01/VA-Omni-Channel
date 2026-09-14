-- ==============================================================================
-- 10_time_seasonality_growth.sql
-- Module: MoM & YoY Growth Dynamics, Seasonality & Multi-Granularity Trends
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Month-over-Month (MoM) Growth Dynamics (Revenue, Orders, Customers, AOV)
WITH monthly_aggregates AS (
    SELECT 
        DATE_FORMAT(OrderDate, '%Y-%m') AS Year_Month,
        YEAR(OrderDate) AS Cal_Year,
        MONTH(OrderDate) AS Cal_Month,
        ROUND(SUM(TotalAmount), 2) AS Monthly_Revenue,
        COUNT(OrderID) AS Monthly_Orders,
        SUM(Quantity) AS Monthly_Units,
        COUNT(DISTINCT CustomerID) AS Active_Customers,
        ROUND(AVG(TotalAmount), 2) AS Monthly_AOV
    FROM orders
    GROUP BY Year_Month, Cal_Year, Cal_Month
),
monthly_mom_calc AS (
    SELECT 
        Year_Month,
        Monthly_Revenue,
        LAG(Monthly_Revenue) OVER (ORDER BY Year_Month) AS Prev_Month_Revenue,
        Monthly_Orders,
        LAG(Monthly_Orders) OVER (ORDER BY Year_Month) AS Prev_Month_Orders,
        Active_Customers,
        LAG(Active_Customers) OVER (ORDER BY Year_Month) AS Prev_Month_Customers,
        Monthly_AOV,
        LAG(Monthly_AOV) OVER (ORDER BY Year_Month) AS Prev_Month_AOV
    FROM monthly_aggregates
)
SELECT 
    Year_Month,
    Monthly_Revenue,
    ROUND((Monthly_Revenue - Prev_Month_Revenue) * 100.0 / NULLIF(Prev_Month_Revenue, 0), 2) AS Revenue_MoM_Growth_Pct,
    Monthly_Orders,
    ROUND((Monthly_Orders - Prev_Month_Orders) * 100.0 / NULLIF(Prev_Month_Orders, 0), 2) AS Orders_MoM_Growth_Pct,
    Active_Customers,
    ROUND((Active_Customers - Prev_Month_Customers) * 100.0 / NULLIF(Prev_Month_Customers, 0), 2) AS Customers_MoM_Growth_Pct,
    Monthly_AOV,
    ROUND((Monthly_AOV - Prev_Month_AOV) * 100.0 / NULLIF(Prev_Month_AOV, 0), 2) AS AOV_MoM_Growth_Pct
FROM monthly_mom_calc
ORDER BY Year_Month;

-- 2. Year-over-Year (YoY) Performance Comparison (2022 vs 2023 vs 2024)
WITH annual_totals AS (
    SELECT 
        YEAR(OrderDate) AS Sales_Year,
        ROUND(SUM(TotalAmount), 2) AS Annual_Revenue,
        COUNT(OrderID) AS Annual_Orders,
        SUM(Quantity) AS Annual_Units,
        COUNT(DISTINCT CustomerID) AS Annual_Unique_Customers,
        ROUND(AVG(TotalAmount), 2) AS Annual_AOV
    FROM orders
    GROUP BY Sales_Year
)
SELECT 
    Sales_Year,
    Annual_Revenue,
    ROUND((Annual_Revenue - LAG(Annual_Revenue) OVER (ORDER BY Sales_Year)) * 100.0 / NULLIF(LAG(Annual_Revenue) OVER (ORDER BY Sales_Year), 0), 2) AS Revenue_YoY_Growth_Pct,
    Annual_Orders,
    ROUND((Annual_Orders - LAG(Annual_Orders) OVER (ORDER BY Sales_Year)) * 100.0 / NULLIF(LAG(Annual_Orders) OVER (ORDER BY Sales_Year), 0), 2) AS Orders_YoY_Growth_Pct,
    Annual_Unique_Customers,
    Annual_AOV
FROM annual_totals
ORDER BY Sales_Year;

-- 3. Day-of-Week Seasonality (Shopping Behavior by Day)
SELECT 
    DAYNAME(OrderDate) AS Day_Of_Week,
    DAYOFWEEK(OrderDate) AS Day_Index,
    COUNT(OrderID) AS Order_Volume,
    ROUND(SUM(TotalAmount), 2) AS Day_Total_Revenue,
    ROUND(AVG(TotalAmount), 2) AS Day_AOV,
    ROUND(SUM(TotalAmount) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Day_Revenue_Share_Pct
FROM orders
GROUP BY Day_Of_Week, Day_Index
ORDER BY Day_Index;

-- 4. Multi-Year Month-of-Year Seasonality Matrix
SELECT 
    MONTHNAME(OrderDate) AS Month_Name,
    MONTH(OrderDate) AS Month_Num,
    ROUND(SUM(CASE WHEN YEAR(OrderDate) = 2022 THEN TotalAmount ELSE 0 END), 2) AS Rev_2022,
    ROUND(SUM(CASE WHEN YEAR(OrderDate) = 2023 THEN TotalAmount ELSE 0 END), 2) AS Rev_2023,
    ROUND(SUM(CASE WHEN YEAR(OrderDate) = 2024 THEN TotalAmount ELSE 0 END), 2) AS Rev_2024,
    ROUND(AVG(TotalAmount), 2) AS Overall_Month_AOV
FROM orders
GROUP BY Month_Name, Month_Num
ORDER BY Month_Num;
