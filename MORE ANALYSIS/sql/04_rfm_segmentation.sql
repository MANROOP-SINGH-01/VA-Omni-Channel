-- ==============================================================================
-- 04_rfm_segmentation.sql
-- Module: Full RFM Quintile Scoring & Strategic Customer Segmentation
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. Base RFM Metrics per Customer
-- Note: '2025-01-01' is set as snapshot anchor date (1 day after max transaction date 2024-12-31)
DROP VIEW IF EXISTS vw_customer_rfm_scores;
CREATE VIEW vw_customer_rfm_scores AS
WITH customer_rfm_raw AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        c.Location AS City,
        c.LoyaltyPoints,
        DATEDIFF('2025-01-01', MAX(o.OrderDate)) AS Recency,
        COUNT(o.OrderID) AS Frequency,
        SUM(o.TotalAmount) AS Monetary,
        AVG(o.TotalAmount) AS AOV,
        MAX(o.OrderDate) AS LastOrderDate
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.CustomerName, c.Location, c.LoyaltyPoints
),
rfm_quintiles AS (
    SELECT 
        CustomerID,
        CustomerName,
        City,
        LoyaltyPoints,
        Recency,
        Frequency,
        Monetary,
        AOV,
        LastOrderDate,
        -- R Score: Lower recency days = higher score (5 is best)
        NTILE(5) OVER (ORDER BY Recency DESC) AS R_Score,
        -- F Score: Higher order count = higher score (5 is best)
        NTILE(5) OVER (ORDER BY Frequency ASC) AS F_Score,
        -- M Score: Higher spend = higher score (5 is best)
        NTILE(5) OVER (ORDER BY Monetary ASC) AS M_Score
    FROM customer_rfm_raw
)
SELECT 
    CustomerID,
    CustomerName,
    City,
    LoyaltyPoints,
    Recency,
    Frequency,
    ROUND(Monetary, 2) AS Monetary,
    ROUND(AOV, 2) AS AOV,
    LastOrderDate,
    R_Score,
    F_Score,
    M_Score,
    CONCAT(R_Score, F_Score, M_Score) AS RFM_Cell,
    ROUND((F_Score + M_Score) / 2.0, 1) AS FM_Score,
    CASE 
        WHEN R_Score >= 4 AND (F_Score + M_Score) / 2.0 >= 4.0 THEN 'Champions'
        WHEN R_Score >= 3 AND (F_Score + M_Score) / 2.0 >= 3.0 THEN 'Loyal Customers'
        WHEN M_Score >= 4 AND R_Score <= 3 THEN 'Big Spenders'
        WHEN R_Score >= 4 AND (F_Score + M_Score) / 2.0 < 3.0 THEN 'Potential Loyalists'
        WHEN R_Score = 3 AND (F_Score + M_Score) / 2.0 < 3.0 THEN 'Needs Attention'
        WHEN R_Score <= 2 AND (F_Score + M_Score) / 2.0 >= 3.0 THEN 'At Risk'
        WHEN R_Score <= 2 AND (F_Score + M_Score) / 2.0 <= 2.0 THEN 'Lost Customers'
        ELSE 'Recent / Casual Buyers'
    END AS RFM_Segment
FROM rfm_quintiles;

-- 2. Customer Segment Distribution & Value Contribution Summary
SELECT 
    RFM_Segment,
    COUNT(CustomerID) AS Total_Customers,
    ROUND(COUNT(CustomerID) * 100.0 / (SELECT COUNT(*) FROM vw_customer_rfm_scores), 2) AS Customer_Share_Pct,
    ROUND(SUM(Monetary), 2) AS Total_Segment_Revenue,
    ROUND(SUM(Monetary) * 100.0 / (SELECT SUM(Monetary) FROM vw_customer_rfm_scores), 2) AS Revenue_Share_Pct,
    ROUND(AVG(Monetary), 2) AS Avg_Customer_Spend,
    ROUND(AVG(AOV), 2) AS Avg_Basket_Size,
    ROUND(AVG(Frequency), 1) AS Avg_Orders_Per_Customer,
    ROUND(AVG(Recency), 0) AS Avg_Days_Since_Last_Order
FROM vw_customer_rfm_scores
GROUP BY RFM_Segment
ORDER BY Total_Segment_Revenue DESC;

-- 3. Top 10 Champions (VIP Customer Cohort)
SELECT 
    CustomerID,
    CustomerName,
    City,
    Recency AS Days_Inactive,
    Frequency AS Lifetime_Orders,
    Monetary AS Lifetime_Spend,
    AOV AS Avg_Order_Value,
    LoyaltyPoints,
    RFM_Segment
FROM vw_customer_rfm_scores
WHERE RFM_Segment = 'Champions'
ORDER BY Monetary DESC
LIMIT 10;
