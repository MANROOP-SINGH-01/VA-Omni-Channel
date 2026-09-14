# Enterprise Power BI Data Model & DAX Measures Catalog
**Omni-Channel Retail Intelligence System**

---

## 1. Relational Star Schema Architecture

To optimize analytical performance, avoid bi-directional cross-filtering bottlenecks, and enable clean time intelligence, structure your Power BI semantic model as a **pure Star Schema**:

```
                       ┌──────────────────────┐
                       │      DateTable       │
                       │──────────────────────│
                       │ Date (PK)            │
                       │ Year                 │
                       │ MonthName            │
                       │ MonthNum             │
                       │ YearMonth            │
                       │ DayOfWeek            │
                       │ IsWeekend            │
                       └──────────┬───────────┘
                                  │ 1
                                  │
                                  │ * (OrderDate)
┌──────────────────────┐       ┌──▼───────────────────┐       ┌──────────────────────┐
│      Customers       │       │        Orders        │       │       Products       │
│──────────────────────│       │──────────────────────│       │──────────────────────│
│ CustomerID (PK)      │1     *│ OrderID (PK)         │*     1│ ProductID (PK)       │
│ CustomerName         ├───────┤ CustomerID (FK)      ├───────┤ ProductName          │
│ Location (City)      │       │ ProductID (FK)       │       │ Category             │
│ JoinDate             │       │ OrderDate (FK)       │       │ UnitPrice            │
│ LoyaltyPoints        │       │ Quantity             │       └──────────────────────┘
└──────────────────────┘       │ UnitPrice            │
                               │ Discount             │
                               │ TotalAmount          │
                               │ SalesChannel         │
                               │ PaymentMethod        │
                               └──────────────────────┘
```

### Relationship Configurations:
1. `Customers[CustomerID]` (1) ───< `Orders[CustomerID]` (*) | Single Direction
2. `Products[ProductID]` (1) ───< `Orders[ProductID]` (*) | Single Direction
3. `DateTable[Date]` (1) ───< `Orders[OrderDate]` (*) | Single Direction

---

## 2. Core Financial & Sales Measures

```dax
// 1. Total Net Revenue
Total Revenue = 
SUM(Orders[TotalAmount])

// 2. Gross Revenue (Before Discount)
Gross Revenue = 
SUMX(Orders, Orders[Quantity] * Orders[UnitPrice])

// 3. Total Discount Sacrificed
Total Discount = 
SUM(Orders[Discount])

// 4. Overall Discount Rate %
Discount Rate % = 
DIVIDE([Total Discount], [Gross Revenue], 0)

// 5. Total Order Volume
Total Orders = 
DISTINCTCOUNT(Orders[OrderID])

// 6. Total Units Sold (Corrected)
Total Units Sold = 
SUM(Orders[Quantity])

// 7. Average Order Value (AOV)
Average Order Value = 
DIVIDE([Total Revenue], [Total Orders], 0)

// 8. Units Per Order
Units Per Order = 
DIVIDE([Total Units Sold], [Total Orders], 0)
```

---

## 3. Time Intelligence, MoM & YoY Growth Measures

```dax
// 9. Prior Year Revenue (YoY Base)
Revenue Previous Year = 
CALCULATE([Total Revenue], SAMEPERIODLASTYEAR(DateTable[Date]))

// 10. Revenue YoY Growth Amount
Revenue YoY Growth = 
[Total Revenue] - [Revenue Previous Year]

// 11. Revenue YoY Growth %
Revenue YoY % = 
DIVIDE([Revenue YoY Growth], [Revenue Previous Year], 0)

// 12. Prior Month Revenue (MoM Base)
Revenue Previous Month = 
CALCULATE([Total Revenue], DATEADD(DateTable[Date], -1, MONTH))

// 13. Revenue MoM Growth %
Revenue MoM % = 
DIVIDE([Total Revenue] - [Revenue Previous Month], [Revenue Previous Month], 0)

// 14. Orders YoY Growth %
Orders Previous Year = 
CALCULATE([Total Orders], SAMEPERIODLASTYEAR(DateTable[Date]))

Orders YoY % = 
DIVIDE([Total Orders] - [Orders Previous Year], [Orders Previous Year], 0)
```

---

## 4. Customer Intelligence, Repeat & CLV Measures

```dax
// 15. Total Unique Active Customers
Total Customers = 
DISTINCTCOUNT(Orders[CustomerID])

// 16. Revenue Per Customer
Revenue Per Customer = 
DIVIDE([Total Revenue], [Total Customers], 0)

// 17. Repeat Customers Count
Repeat Customers Count = 
COUNTROWS(
    FILTER(
        VALUES(Orders[CustomerID]),
        CALCULATE(DISTINCTCOUNT(Orders[OrderID])) > 1
    )
)

// 18. Repeat Customer Rate %
Repeat Customer Rate % = 
DIVIDE([Repeat Customers Count], [Total Customers], 0)

// 19. Customer Lifetime Value (CLV Analytical Estimate)
Customer Lifetime Value = 
VAR AvgBasket = [Average Order Value]
VAR AnnualOrders = DIVIDE([Total Orders], 3, 0) // Over 3 active years (2022-2024)
VAR ExpectedLifespanYears = 3
RETURN
AvgBasket * AnnualOrders * ExpectedLifespanYears

// 20. High CLV Flag (Top Quartile Spending)
Is High Value Customer = 
IF([Total Revenue] >= 75000, "High Value VIP", "Standard")
```

---

## 5. Omnichannel Multiplier & Crossover Measures

```dax
// 21. Channels Used Per Customer
Channels Used Per Customer = 
CALCULATE(DISTINCTCOUNT(Orders[SalesChannel]))

// 22. Multichannel Customer Flag
Is Omnichannel Customer = 
IF([Channels Used Per Customer] >= 2, "Multichannel Buyer", "Single Channel Buyer")

// 23. Multichannel Revenue Share %
Multichannel Revenue Share % = 
VAR MultiRev = 
    CALCULATE(
        [Total Revenue],
        FILTER(
            VALUES(Customers[CustomerID]),
            CALCULATE(DISTINCTCOUNT(Orders[SalesChannel])) >= 2
        )
    )
RETURN
DIVIDE(MultiRev, [Total Revenue], 0)
```

---

## 6. Product Portfolio & Pricing Elasticity Measures

```dax
// 24. Average Catalog Price
Average Catalog Price = 
AVERAGE(Products[UnitPrice])

// 25. Realized Price Per Unit
Realized Price Per Unit = 
DIVIDE([Total Revenue], [Total Units Sold], 0)

// 26. Discount Dependency % (Discounted Orders / Total Orders)
Discount Dependency % = 
VAR DiscountedOrders = 
    CALCULATE(
        [Total Orders],
        Orders[Discount] > 0
    )
RETURN
DIVIDE(DiscountedOrders, [Total Orders], 0)

// 27. Product BCG Classification (Calculated Column in Products table)
BCG Quadrant = 
VAR MedRev = 1534203
VAR MedVol = 751
VAR ProdRev = CALCULATE(SUM(Orders[TotalAmount]))
VAR ProdVol = CALCULATE(SUM(Orders[Quantity]))
RETURN
SWITCH(
    TRUE(),
    ProdRev >= MedRev && ProdVol >= MedVol, "Star",
    ProdRev >= MedRev && ProdVol < MedVol, "Premium Driver",
    ProdRev < MedRev && ProdVol >= MedVol, "Volume Driver",
    "Underperformer"
)
```

---

## 7. Dynamic Title DAX Measures

```dax
// 28. Interactive Revenue Trend Title
Dynamic Revenue Title = 
VAR SelectedChannel = SELECTEDVALUE(Orders[SalesChannel], "All Channels")
VAR SelectedCity = SELECTEDVALUE(Customers[Location], "All Metros")
RETURN
"Revenue Momentum & Trend (" & SelectedChannel & " | " & SelectedCity & ")"

// 29. Selected Period Summary KPI Subtitle
Dynamic Period Subtitle = 
VAR SelectedYr = SELECTEDVALUE(DateTable[Year], "2022 - 2024")
RETURN
"Performance Baseline for Year: " & SelectedYr & " vs Prior Periods"
```
