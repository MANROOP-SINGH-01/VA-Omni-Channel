-- ==============================================================================
-- 08_omnichannel_channel_analysis.sql
-- Module: Channel Depth, Multichannel Customer Adoption & Journey Crossover
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

USE retail_intelligence;

-- 1. In-Depth Sales Channel Performance Scorecard
SELECT 
    SalesChannel,
    ROUND(SUM(TotalAmount), 2) AS Net_Revenue,
    ROUND(SUM(TotalAmount) * 100.0 / (SELECT SUM(TotalAmount) FROM orders), 2) AS Revenue_Share_Pct,
    COUNT(OrderID) AS Total_Orders,
    SUM(Quantity) AS Units_Sold,
    COUNT(DISTINCT CustomerID) AS Unique_Customers,
    ROUND(AVG(TotalAmount), 2) AS Average_Order_Value,
    ROUND(AVG(Quantity), 2) AS Units_Per_Order,
    ROUND(SUM(Discount) * 100.0 / SUM(Quantity * UnitPrice), 2) AS Avg_Discount_Rate_Pct,
    ROUND(SUM(TotalAmount) / COUNT(DISTINCT CustomerID), 2) AS Revenue_Per_Customer
FROM orders
GROUP BY SalesChannel
ORDER BY Net_Revenue DESC;

-- 2. The Omnichannel Customer Adoption Multiplier (Core Portfolio Finding)
-- Compares customer performance by the number of unique channels they use
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

-- 3. Channel Crossover Matrix (Customer Acquisition Channel -> Subsequent Channel Flow)
WITH first_customer_order AS (
    SELECT 
        CustomerID,
        SalesChannel AS Acquisition_Channel,
        ROW_NUMBER() OVER (PARTITION BY CustomerID ORDER BY OrderDate ASC, OrderID ASC) AS Order_Seq
    FROM orders
),
acquisition_lookup AS (
    SELECT CustomerID, Acquisition_Channel
    FROM first_customer_order
    WHERE Order_Seq = 1
)
SELECT 
    al.Acquisition_Channel,
    o.SalesChannel AS Subsequent_Channel,
    COUNT(DISTINCT o.CustomerID) AS Customer_Count,
    COUNT(o.OrderID) AS Orders_Generated,
    ROUND(SUM(o.TotalAmount), 2) AS Total_Cross_Channel_Revenue
FROM orders o
JOIN acquisition_lookup al ON o.CustomerID = al.CustomerID
GROUP BY al.Acquisition_Channel, o.SalesChannel
ORDER BY al.Acquisition_Channel, Total_Cross_Channel_Revenue DESC;

-- 4. Sales Channel × Payment Method Preferences
SELECT 
    SalesChannel,
    PaymentMethod,
    COUNT(OrderID) AS Transactions_Count,
    ROUND(SUM(TotalAmount), 2) AS Channel_Payment_Revenue,
    ROUND(AVG(TotalAmount), 2) AS Avg_Transaction_Value
FROM orders
GROUP BY SalesChannel, PaymentMethod
ORDER BY SalesChannel, Channel_Payment_Revenue DESC;
