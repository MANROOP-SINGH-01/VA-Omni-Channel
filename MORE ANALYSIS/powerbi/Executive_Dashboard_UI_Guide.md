# Power BI 4-Page SaaS Executive Dashboard UI Guide
**Design System & Layout Architecture**

---

## 1. Visual Design Tokens (SaaS Dark Mode Standard)

| Design Element | Token Value | Usage |
| :--- | :--- | :--- |
| **Canvas Background** | `#0B0F19` (Near Black / Dark Navy) | Full dashboard canvas background |
| **Card / Panel Surface** | `#111827` (Deep Charcoal Slate) | Visual containers, KPI cards, chart tiles |
| **Panel Border** | `#1F2937` (Subtle 1px border) | Clean definition without visual clutter |
| **Primary Accent** | `#38BDF8` (Vibrant Cyan) | Primary trend lines, active tab highlights, key KPIs |
| **Secondary Accent** | `#6366F1` (Indigo Neon) | Channel distributions, secondary bars |
| **Success / Growth** | `#10B981` (Emerald Green) | Positive MoM/YoY growth indicators, Champions segment |
| **Warning / Moderate** | `#F59E0B` (Warm Amber) | Moderate risk, volume drivers |
| **Risk / Churn** | `#EF4444` (Coral Red) | Negative growth, Lost customers, Margin erosion |
| **Text Primary** | `#F9FAFB` (95% White) | Large metric callouts, primary headings |
| **Text Secondary** | `#9CA3AF` (Muted Gray) | Subtitles, axis labels, field definitions |
| **Font Family** | `Segoe UI` or `Inter` | 100% consistent across all visual elements |

---

## 2. Universal Global Header & Top Navigation

On every page, implement a sticky top bar:
- **Left**: `RETAIL INTELLIGENCE PLATFORM` logo badge + Live Data Status (`50,000 Verified Orders`).
- **Center Navigation Buttons**:
  - `[01 Overview]` | `[02 Customers]` | `[03 Products & Pricing]` | `[04 Omnichannel & Geo]`
  - Page navigation action bound to each button. Active button styled with Cyan underline glow (`#38BDF8`).
- **Right Slicer Bar (Drop-down filter row)**:
  - `Year` (All, 2022, 2023, 2024)
  - `Channel` (All, Physical Store, Amazon, Flipkart, Website, Mobile App)
  - `City` (All, Ahmedabad, Kolkata, Bangalore, Chennai, Mumbai, Delhi, Hyderabad, Pune)
  - `Category` (All, Sports & Fitness, Fashion, Electronics, Home & Kitchen, Beauty)

---

## 3. Page Layout Blueprints

### Page 1 — Executive Overview
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL HEADER: Overview | Customers | Products | Omnichannel & Geo       [Filters]     │
├───────────────┬───────────────┬───────────────┬───────────────┬───────────────┬────────┤
│ REVENUE       │ ORDERS        │ UNITS SOLD    │ AOV           │ REPEAT RATE   │ YoY %  │
│ ₹306.84M      │ 50,000        │ 150,220       │ ₹6,136.81     │ 99.96%        │ +1.06% │
│ ↑ 8.4% MoM    │ ↑ 5.2% MoM    │ ↑ 4.8% MoM    │ ↓ 0.4% MoM    │ Stable        │ High   │
├───────────────┴───────────────┴───────────────┴───────────────┴───────────────┴────────┤
│ MAIN VISUAL: Multi-Year Revenue Trend Line with YoY Comparison (Actual vs Previous Yr) │
│ Field: DateTable[YearMonth] on X-axis, [Total Revenue] & [Revenue Previous Year]       │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ CHANNEL REVENUE CONTRIBUTION           │ CATEGORY REVENUE & DISCOUNT IMPACT            │
│ Stacked Bar: Channel vs [Total Revenue]│ Clustered Bar: Category vs [Total Revenue]    │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ TOP 10 SKUs BY REVENUE                 │ TOP 10 METROS BY REVENUE                      │
│ Ranked horizontal bar chart            │ Horizontal bar chart with revenue tooltips    │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Page 2 — Customer Intelligence & RFM Segmentation
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP ROW KPIs: Unique Customers (5,000) | Repeat Cust (4,998) | CLV (₹61.37K) | RFM Core│
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ RFM SEGMENT REVENUE SHARE (Donut/Bar)  │ CUSTOMER VALUE SCATTER PLOT                   │
│ Champions (23.8%), Loyal (25.4%),      │ X-axis: Order Frequency (1 to 23)             │
│ Big Spenders (16.6%), Potential (9.4%),│ Y-axis: Customer Spend (₹2K to ₹161K)         │
│ Lost (10.2%), At Risk (5.2%)           │ Size: AOV | Color: RFM Segment                │
├────────────────────────────────────────┴───────────────────────────────────────────────┤
│ COHORT RETENTION HEATMAP (Matrix Visual)                                               │
│ Rows: Cohort Month (2022-01 to 2024-12) | Columns: Month 0 to Month 12                │
│ Values: % Customer Retention Rate (Conditional gradient fill: Dark Navy to Neon Cyan) │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ RETENTION FUNNEL                       │ DORMANT HIGH-VALUE RETENTION LIST             │
│ 1st Order (100%) -> 2nd Order (99.9%)  │ Table: Top spenders with >180 days inactivity │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Page 3 — Product & Pricing Intelligence
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP ROW KPIs: Active SKUs (200) | Volume (150.2K) | Avg Discount (15.0%) | Top SKU     │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ BCG PORTFOLIO MATRIX (Scatter Visual)  │ 80/20 PARETO CURVE (Line & Clustered Column)  │
│ X-axis: Units Sold (300 to 1,000)      │ Columns: Product Revenue (Ranked descending)  │
│ Y-axis: Net Revenue (₹500K to ₹3.6M)   │ Line: Cumulative Revenue Share % (80% cutoff) │
│ Quadrant lines at medians              │                                               │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ PRICE BAND DEMAND DISTRIBUTION         │ DISCOUNT ELASTICITY & SACRIFICE               │
│ Column Chart: <1K, 1-2K, 2-3K, 3-4K, 4K│ Area Chart: Discount Brackets vs Net Revenue  │
│ Tooltip: Orders, Units, Realized AOV   │ & Gross Revenue sacrificed                    │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### Page 4 — Omnichannel & Geographic Dynamics
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TOP ROW KPIs: Channels (5) | Cities (8) | 5-Channel Spend Multiplier (6.26x) | Core Mkt│
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ THE OMNICHANNEL MULTIPLIER (Bar Chart) │ CHANNEL CROSSOVER JOURNEY FLOW                │
│ X: Number of Channels Used (1, 2, 3, 4,│ Matrix/Sankey: Acquisition Channel vs         │
│    5 Channels)                         │ Subsequent Orders placed across channels      │
│ Y: Average Lifetime Spend (₹11K -> 71K)│                                               │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ STRATEGIC CITY PERFORMANCE MATRIX      │ CITY × CATEGORY HEATMAP                       │
│ Scatter: Customers vs Revenue per City │ Matrix: City (Rows) × Category (Columns)      │
│ Quadrants: Core, High Value, Growth    │ Values: Total Revenue (Cell color intensity)  │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 4. Advanced Tooltip & Drill-Through Setup

1. **Product Hover Tooltip Page**:
   - Canvas size: 320px × 240px.
   - Shows: Product Name, Category, Realized Price, Units Sold, Discount Rate, Top Channel for this product.
2. **Customer Drill-Through Page**:
   - Right-click any customer in scatter or table -> Drill-Through -> `Customer 360 Profile`.
   - Displays: Customer join date, tenure, total orders, preferred channel, payment preference, order history list.
