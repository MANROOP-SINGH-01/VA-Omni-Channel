create schema sales_data;

use sales_data;

# Create View

create view sales_combined as
select 
		c.CustomerID, 
        c.CustomerName, 
        c.Location, 
        c.JoinDate, 
        c.LoyaltyPoints, 
        c.Year, 
        c.Month,
		p.ProductID, 
        p.ProductName, 
        p.Category, 
        p.UnitPrice,
		o.OrderID, 
        o.OrderDate, 
        o.Quantity, 
        o.Discount, 
        o.TotalAmount, 
        o.SalesChannel, 
        o.PaymentMethod
from orders o
inner join customers c
on o.CustomerID = c.CustomerID
inner join products p
on p.ProductID = o.ProductID;

select * from sales_combined;

# A) Sales Overview

# 1) What is the total revenue, total number of orders, and average order value across all channels?

select round(sum(TotalAmount),2) as total_revenue,
count(OrderID) as total_orders,
round(avg(TotalAmount),2) as average_order_value
from orders;

# 2) Which sales channel generated the highest revenue, and by how much compared to others?

select SalesChannel,
round(sum(TotalAmount),2) as total_revenue
from orders
group by SalesChannel
order by total_revenue desc;

# 3) What is the monthly revenue trend over the last two years?

select date_format(OrderDate, '%Y-%m') as months,
round(sum(TotalAmount),2) as revenue
from orders
group by months
order by months;

# B) Product Performance

# 4) Which are the top 10 products by revenue?

select p.ProductID as prod_name,
round(sum(o.TotalAmount),2) as total_revenue
from products p
join orders o
on o.ProductID = p.ProductID
group by prod_name
order by total_revenue desc
limit 10;

# 5) Which are the top 10 products by units sold?
-- NOTE: Corrected bug: changed count(o.Quantity) to sum(o.Quantity) for actual units sold
select p.ProductID as prod_name,
sum(o.Quantity) as quantity
from products p
join orders o
on o.ProductID = p.ProductID
group by prod_name
order by quantity desc
limit 10;

# 6) How much revenue did each product category generate?

select p.Category as category,
round(sum(o.TotalAmount),2) as revenue
from products p
join orders o
on o.ProductID = p.ProductID
group by category;

# Customer Behavior

# 7) Who are the top 10 customers by total spending?

select c.CustomerName as name,
round(sum(TotalAmount),2) as total_spending
from customers c
join orders o
on o.CustomerID = c.CustomerID
group by name
order by total_spending desc
limit 10;

# 8) Which customers have placed the highest number of orders?

select c.CustomerName as name,
count(o.OrderID) as no_of_orders
from customers c
join orders o
on o.CustomerID = c.CustomerID
group by name
order by no_of_orders desc
limit 5;

# 9) How many new customers joined in each month?

select 
date_format(JoinDate, '%Y-%m') as month_joined,
count(CustomerID) as customer_count
from customers
group by month_joined
order by month_joined;

# D) Discount & Pricing Analysis

# 10) What is the average discount percentage given per sales channel?

select SalesChannel,
round(avg(Discount),2) as avg_discount
from orders
group by SalesChannel
order by avg_discount desc;

# 11) What is the total revenue lost due to discounts, and what would the revenue be without them?

select
round(sum(TotalAmount + Discount),2) as revenue_before_discount,
round(sum(Discount),2) as discount_given,
round(sum(TotalAmount),2) as revenue_after_discount
from orders;

# E) Time-Based Analysis

# 12) Which day of the week generates the highest sales?

select
dayname(OrderDate) as day_name,
round(sum(TotalAmount),2) as sales
from orders
group by day_name
order by sales desc;

# 13) At what time of day do we see the highest sales volume?

select
hour(OrderDate) as time_stamp,
round(sum(TotalAmount),2) as sales
from orders
group by time_stamp
order by sales desc;

# F) Location-Based Analysis

# 14) Which customer locations contribute the most to revenue?

SELECT 
    c.Location, 
    ROUND(SUM(o.TotalAmount), 2) AS LocationSales
FROM orders o
JOIN customers c ON o.CustomerID = c.CustomerID
GROUP BY c.Location
ORDER BY LocationSales DESC;

# 15) What is the top-selling category in each customer location?

select p.Category,
c.Location,
round(sum(o.TotalAmount),2) as revenue
from orders o
join products p
on o.ProductID = p.ProductID
join customers c
on c.CustomerID = o.CustomerID
group by p.Category, c.Location
order by p.Category, c.Location, revenue desc;