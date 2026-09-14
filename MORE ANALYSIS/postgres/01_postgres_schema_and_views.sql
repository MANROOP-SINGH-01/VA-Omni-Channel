-- ==============================================================================
-- 01_postgres_schema_and_views.sql
-- PostgreSQL 18 Production Schema, Indexes & Analytical Views
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

-- 1. Customers Dimension Table
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;

CREATE TABLE customers (
    CustomerID VARCHAR(20) PRIMARY KEY,
    CustomerName VARCHAR(100) NOT NULL,
    Location VARCHAR(50) NOT NULL,
    JoinDate DATE NOT NULL,
    LoyaltyPoints INT NOT NULL DEFAULT 0,
    Year INT NOT NULL,
    Month VARCHAR(20) NOT NULL
);

CREATE INDEX idx_cust_location ON customers (Location);
CREATE INDEX idx_cust_joindate ON customers (JoinDate);

-- 2. Products Dimension Table
CREATE TABLE products (
    ProductID VARCHAR(20) PRIMARY KEY,
    ProductName VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    UnitPrice NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_prod_category ON products (Category);
CREATE INDEX idx_prod_unitprice ON products (UnitPrice);

-- 3. Orders Fact Table
CREATE TABLE orders (
    OrderID VARCHAR(20) PRIMARY KEY,
    CustomerID VARCHAR(20) NOT NULL REFERENCES customers(CustomerID),
    ProductID VARCHAR(20) NOT NULL REFERENCES products(ProductID),
    OrderDate DATE NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice NUMERIC(10,2) NOT NULL,
    Discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    TotalAmount NUMERIC(10,2) NOT NULL,
    SalesChannel VARCHAR(50) NOT NULL,
    PaymentMethod VARCHAR(50) NOT NULL
);

CREATE INDEX idx_orders_customer ON orders (CustomerID);
CREATE INDEX idx_orders_product ON orders (ProductID);
CREATE INDEX idx_orders_date ON orders (OrderDate);
CREATE INDEX idx_orders_channel ON orders (SalesChannel);
CREATE INDEX idx_orders_payment ON orders (PaymentMethod);

-- ==============================================================================
-- ANALYTICAL VIEWS
-- ==============================================================================

-- View 1: Unified Denormalized Sales View
CREATE OR REPLACE VIEW vw_sales_unified AS
SELECT 
    o.OrderID,
    o.OrderDate,
    EXTRACT(YEAR FROM o.OrderDate)::INT AS OrderYear,
    EXTRACT(MONTH FROM o.OrderDate)::INT AS OrderMonthNum,
    TO_CHAR(o.OrderDate, 'YYYY-MM') AS OrderYearMonth,
    TO_CHAR(o.OrderDate, 'Day') AS OrderDayOfWeek,
    o.SalesChannel,
    o.PaymentMethod,
    o.Quantity,
    o.UnitPrice,
    o.Discount,
    o.TotalAmount,
    (o.Quantity * o.UnitPrice) AS GrossAmount,
    ROUND((o.Discount / NULLIF((o.Quantity * o.UnitPrice), 0)) * 100, 2) AS DiscountPercentage,
    c.CustomerID,
    c.CustomerName,
    c.Location AS City,
    c.JoinDate,
    c.LoyaltyPoints,
    p.ProductID,
    p.ProductName,
    p.Category
FROM orders o
INNER JOIN customers c ON o.CustomerID = c.CustomerID
INNER JOIN products p ON o.ProductID = p.ProductID;

-- View 2: Executive Summary KPIs
CREATE OR REPLACE VIEW vw_executive_kpis AS
SELECT 
    COUNT(OrderID) AS Total_Orders,
    SUM(Quantity) AS Total_Units,
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(Quantity * UnitPrice), 2) AS Gross_Revenue,
    ROUND(SUM(Discount), 2) AS Total_Discount,
    ROUND((SUM(Discount) / NULLIF(SUM(Quantity * UnitPrice), 0)) * 100, 2) AS Discount_Impact_Pct,
    ROUND((SUM(TotalAmount) / NULLIF(SUM(Quantity * UnitPrice), 0)) * 100, 2) AS Revenue_Realization_Rate_Pct,
    COUNT(DISTINCT CustomerID) AS Active_Customers,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value,
    ROUND(SUM(TotalAmount) / NULLIF(COUNT(DISTINCT CustomerID), 0), 2) AS Revenue_Per_Customer
FROM orders;

-- View 3: Channel Performance Scorecard
CREATE OR REPLACE VIEW vw_channel_scorecard AS
SELECT 
    SalesChannel,
    COUNT(OrderID) AS Total_Orders,
    SUM(Quantity) AS Units_Sold,
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND((SUM(TotalAmount) * 100.0 / NULLIF((SELECT SUM(TotalAmount) FROM orders), 0)), 2) AS Revenue_Share_Pct,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value,
    ROUND(AVG(Quantity), 2) AS Units_Per_Basket,
    ROUND((SUM(Discount) * 100.0 / NULLIF(SUM(Quantity * UnitPrice), 0)), 2) AS Discount_Rate_Pct,
    COUNT(DISTINCT CustomerID) AS Unique_Customers
FROM orders
GROUP BY SalesChannel
ORDER BY Net_Revenue DESC;

-- View 4: Customer RFM Quintile Scoring
CREATE OR REPLACE VIEW vw_customer_rfm_scores AS
WITH customer_rfm_raw AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        c.Location AS City,
        c.LoyaltyPoints,
        ('2025-01-01'::DATE - MAX(o.OrderDate)::DATE) AS Recency,
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
        NTILE(5) OVER (ORDER BY Recency DESC) AS R_Score,
        NTILE(5) OVER (ORDER BY Frequency ASC) AS F_Score,
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

-- View 5: RFM Segment Summary Distribution
CREATE OR REPLACE VIEW vw_rfm_segment_summary AS
SELECT 
    RFM_Segment,
    COUNT(CustomerID) AS Customer_Count,
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

-- View 6: Geographic Metro Performance Rankings
CREATE OR REPLACE VIEW vw_city_market_rankings AS
SELECT 
    c.Location AS City,
    COUNT(o.OrderID) AS Total_Orders,
    SUM(o.Quantity) AS Units_Sold,
    ROUND(SUM(o.TotalAmount), 2) AS Total_Revenue,
    ROUND(SUM(o.TotalAmount) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct,
    COUNT(DISTINCT c.CustomerID) AS Unique_Customers,
    ROUND(AVG(o.TotalAmount), 2) AS Average_Order_Value,
    ROUND(SUM(o.TotalAmount) / COUNT(DISTINCT c.CustomerID), 2) AS Revenue_Per_Customer
FROM orders o
JOIN customers c ON o.CustomerID = c.CustomerID
GROUP BY c.Location
ORDER BY Total_Revenue DESC;

-- View 7: Omnichannel Adoption Tiers (Channel Depth Multiplier)
CREATE OR REPLACE VIEW vw_omnichannel_adoption_tiers AS
WITH customer_channel_tiers AS (
    SELECT 
        c.CustomerID,
        c.CustomerName,
        c.LoyaltyPoints,
        COUNT(DISTINCT o.SalesChannel) AS Channels_Used,
        COUNT(o.OrderID) AS Lifetime_Orders,
        SUM(o.Quantity) AS Lifetime_Units,
        SUM(o.TotalAmount) AS Lifetime_Spend,
        AVG(o.TotalAmount) AS Customer_AOV
    FROM customers c
    JOIN orders o ON c.CustomerID = o.CustomerID
    GROUP BY c.CustomerID, c.CustomerName, c.LoyaltyPoints
)
SELECT 
    Channels_Used,
    COUNT(CustomerID) AS Customer_Count,
    ROUND(COUNT(CustomerID) * 100.0 / (SELECT COUNT(*) FROM customer_channel_tiers), 2) AS Customer_Share_Pct,
    ROUND(SUM(Lifetime_Spend), 2) AS Tier_Total_Revenue,
    ROUND(SUM(Lifetime_Spend) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct,
    ROUND(AVG(Lifetime_Spend), 2) AS Avg_Customer_Spend,
    ROUND(AVG(Lifetime_Orders), 2) AS Avg_Orders_Per_Customer,
    ROUND(AVG(Customer_AOV), 2) AS Avg_Order_Value,
    ROUND(AVG(LoyaltyPoints), 0) AS Avg_Loyalty_Points
FROM customer_channel_tiers
GROUP BY Channels_Used
ORDER BY Channels_Used ASC;
