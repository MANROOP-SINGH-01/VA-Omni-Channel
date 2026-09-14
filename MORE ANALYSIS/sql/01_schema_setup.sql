-- ==============================================================================
-- 01_schema_setup.sql
-- Module: Database & Schema Definition, Constraints & Performance Indexing
-- Omni-Channel Retail Intelligence Platform
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS retail_intelligence;
USE retail_intelligence;

-- 1. Dimension: Customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    CustomerID VARCHAR(20) NOT NULL,
    CustomerName VARCHAR(100) NOT NULL,
    Location VARCHAR(50) NOT NULL,
    JoinDate DATE NOT NULL,
    LoyaltyPoints INT NOT NULL DEFAULT 0,
    Year INT NOT NULL,
    Month VARCHAR(20) NOT NULL,
    PRIMARY KEY (CustomerID),
    INDEX idx_cust_location (Location),
    INDEX idx_cust_joindate (JoinDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Dimension: Products
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    ProductID VARCHAR(20) NOT NULL,
    ProductName VARCHAR(100) NOT NULL,
    Category VARCHAR(50) NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (ProductID),
    INDEX idx_prod_category (Category),
    INDEX idx_prod_unitprice (UnitPrice)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Fact Table: Orders
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    OrderID VARCHAR(20) NOT NULL,
    CustomerID VARCHAR(20) NOT NULL,
    ProductID VARCHAR(20) NOT NULL,
    OrderDate DATE NOT NULL,
    Quantity INT NOT NULL,
    UnitPrice DECIMAL(10,2) NOT NULL,
    Discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    TotalAmount DECIMAL(10,2) NOT NULL,
    SalesChannel VARCHAR(50) NOT NULL,
    PaymentMethod VARCHAR(50) NOT NULL,
    PRIMARY KEY (OrderID),
    CONSTRAINT fk_orders_customer FOREIGN KEY (CustomerID) REFERENCES customers (CustomerID),
    CONSTRAINT fk_orders_product FOREIGN KEY (ProductID) REFERENCES products (ProductID),
    INDEX idx_orders_customer (CustomerID),
    INDEX idx_orders_product (ProductID),
    INDEX idx_orders_date (OrderDate),
    INDEX idx_orders_channel (SalesChannel),
    INDEX idx_orders_payment (PaymentMethod)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Unified Denormalized Base View
DROP VIEW IF EXISTS vw_sales_unified;
CREATE VIEW vw_sales_unified AS
SELECT 
    o.OrderID,
    o.OrderDate,
    YEAR(o.OrderDate) AS OrderYear,
    MONTH(o.OrderDate) AS OrderMonthNum,
    DATE_FORMAT(o.OrderDate, '%Y-%m') AS OrderYearMonth,
    DAYNAME(o.OrderDate) AS OrderDayOfWeek,
    o.SalesChannel,
    o.PaymentMethod,
    o.Quantity,
    o.UnitPrice,
    o.Discount,
    o.TotalAmount,
    (o.Quantity * o.UnitPrice) AS GrossAmount,
    ROUND(o.Discount / NULLIF((o.Quantity * o.UnitPrice), 0) * 100, 2) AS DiscountPercentage,
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
