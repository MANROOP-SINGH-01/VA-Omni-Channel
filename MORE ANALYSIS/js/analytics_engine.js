/**
 * analytics_engine.js
 * Comprehensive In-Memory Retail Intelligence Engine (All 29 Analytical Modules)
 * Zero AI / Pure Deterministic Computational Mathematics
 * Omni-Channel Retail Intelligence Platform
 */

const AnalyticsEngine = {
  // Snapshot reference anchor: 2025-01-01 (day after 2024-12-31 max order date)
  ANCHOR_DATE: new Date('2025-01-01T00:00:00Z'),

  // Cached full RFM dataset computed once on customerMap
  cachedRFM: null,

  // ============================================================================
  // CENTRAL METRIC DEFINITIONS (SINGLE SOURCE OF TRUTH)
  // ============================================================================
  METRIC_DEFINITIONS: [
    { name: 'Gross Sales', formula: 'SUM(Quantity × UnitPrice)', desc: 'Total transactional value at baseline catalog pricing before discounts.' },
    { name: 'Net Revenue', formula: 'SUM(TotalAmount)', desc: 'Actual realized revenue collected after promotional discount deductions.' },
    { name: 'Total Orders', formula: 'COUNT(DISTINCT OrderID)', desc: 'Total volume of unique customer transactions recorded.' },
    { name: 'Units Sold', formula: 'SUM(Quantity)', desc: 'Total physical product quantity moved across all transactions.' },
    { name: 'Average Order Value (AOV)', formula: 'Net Revenue / Total Orders', desc: 'Average realized revenue generated per transaction.' },
    { name: 'Customers', formula: 'COUNT(DISTINCT CustomerID)', desc: 'Number of distinct customer accounts transacting in the period.' },
    { name: 'Revenue Realization Rate', formula: '(Net Revenue / Gross Sales) × 100', desc: 'Percentage of gross catalog value realized as net revenue.' },
    { name: 'Discount Impact Rate', formula: '(Promotional Discounts / Gross Sales) × 100', desc: 'Percentage of gross catalog value eroded by discounts.' },
    { name: 'Repeat Customer Rate', formula: '(Customers with >1 order / Total Customers) × 100', desc: 'Proportion of customers with multiple purchases.' },
    { name: 'Revenue per Customer', formula: 'Net Revenue / Customers', desc: 'Average realized revenue generated per unique transacting customer.' }
  ],

  // ============================================================================
  // DATA VALIDATION GATE (PRE-RENDER INTEGRITY VERIFICATION)
  // ============================================================================
  validateDataset(orders, customers, products) {
    const report = {
      isValid: true,
      timestamp: new Date().toISOString(),
      counts: {
        orders: orders ? orders.length : 0,
        customers: customers ? customers.length : 0,
        products: products ? products.length : 0
      },
      checks: [],
      criticalErrors: 0,
      warnings: 0
    };

    // Check 1: Record presence
    const cOrder = Boolean(orders && orders.length > 0);
    report.checks.push({ name: 'Order Records Loaded', passed: cOrder, detail: `${report.counts.orders.toLocaleString()} orders` });
    if (!cOrder) { report.isValid = false; report.criticalErrors++; }

    const cCust = Boolean(customers && customers.length > 0);
    report.checks.push({ name: 'Customer Profiles Loaded', passed: cCust, detail: `${report.counts.customers.toLocaleString()} profiles` });
    if (!cCust) { report.isValid = false; report.criticalErrors++; }

    const cProd = Boolean(products && products.length > 0);
    report.checks.push({ name: 'Product Catalog Loaded', passed: cProd, detail: `${report.counts.products.toLocaleString()} SKUs` });
    if (!cProd) { report.isValid = false; report.criticalErrors++; }

    if (!cOrder || !cCust || !cProd) return report;

    // Check 2: Referential Integrity (No orphan customers or products)
    const custIdSet = new Set(customers.map(c => c.CustomerID));
    const prodIdSet = new Set(products.map(p => p.ProductID));
    let orphanCust = 0;
    let orphanProd = 0;
    let negativeValues = 0;
    let invalidMath = 0;

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!custIdSet.has(o.CustomerID)) orphanCust++;
      if (!prodIdSet.has(o.ProductID)) orphanProd++;
      if (o.TotalAmount < 0 || o.Quantity <= 0 || o.UnitPrice < 0 || o.Discount < 0) negativeValues++;
      
      const expectedTotal = (o.Quantity * o.UnitPrice) - o.Discount;
      if (Math.abs(o.TotalAmount - expectedTotal) > 0.05) invalidMath++;
    }

    report.checks.push({ name: 'Customer Foreign Key Integrity', passed: orphanCust === 0, detail: `${orphanCust} orphan customer IDs` });
    if (orphanCust > 0) { report.isValid = false; report.criticalErrors++; }

    report.checks.push({ name: 'Product Foreign Key Integrity', passed: orphanProd === 0, detail: `${orphanProd} orphan product IDs` });
    if (orphanProd > 0) { report.isValid = false; report.criticalErrors++; }

    report.checks.push({ name: 'Non-Negative Value Domain', passed: negativeValues === 0, detail: `${negativeValues} invalid values` });
    if (negativeValues > 0) { report.isValid = false; report.criticalErrors++; }

    report.checks.push({ name: 'Discount & Net Balance Math', passed: invalidMath === 0, detail: `${invalidMath} rounding discrepancies` });
    if (invalidMath > 0) { report.warnings++; }

    return report;
  },

  /**
   * Filter orders based on active global filter state
   */
  filterOrders(orders, filters = {}) {
    return orders.filter(o => {
      if (filters.year && filters.year !== 'ALL' && o.Year !== parseInt(filters.year, 10)) return false;
      if (filters.channel && filters.channel !== 'ALL' && o.SalesChannel !== filters.channel) return false;
      if (filters.city && filters.city !== 'ALL' && o.CustomerCity !== filters.city) return false;
      if (filters.category && filters.category !== 'ALL' && o.Category !== filters.category) return false;
      if (filters.segment && filters.segment !== 'ALL') {
        const rfm = this.getCustomerRFM(o.CustomerID);
        if (!rfm || rfm.segment !== filters.segment) return false;
      }
      return true;
    });
  },

  // ============================================================================
  // MODULE 1: EXECUTIVE KPIS & PERIOD DELTAS
  // ============================================================================
  getExecutiveKPIs(filteredOrders, prevOrders = null) {
    const totalOrders = filteredOrders.length;
    let netRevenue = 0;
    let grossRevenue = 0;
    let totalDiscount = 0;
    let totalUnits = 0;
    const customerSet = new Set();
    const custOrderCount = new Map();

    for (let i = 0; i < totalOrders; i++) {
      const o = filteredOrders[i];
      netRevenue += o.TotalAmount;
      grossRevenue += o.GrossAmount;
      totalDiscount += o.Discount;
      totalUnits += o.Quantity;
      customerSet.add(o.CustomerID);
      custOrderCount.set(o.CustomerID, (custOrderCount.get(o.CustomerID) || 0) + 1);
    }

    const uniqueCustomers = customerSet.size;
    const aov = totalOrders > 0 ? netRevenue / totalOrders : 0;
    const revPerCustomer = uniqueCustomers > 0 ? netRevenue / uniqueCustomers : 0;
    const discountImpactRate = grossRevenue > 0 ? (totalDiscount / grossRevenue) * 100 : 0;
    const realizationRate = grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;

    // Distinct cities in filtered slice
    const citySet = new Set();
    for (let i = 0; i < totalOrders; i++) {
      if (filteredOrders[i].CustomerCity) citySet.add(filteredOrders[i].CustomerCity);
    }
    const distinctCities = citySet.size;

    let repeatCustomers = 0;
    custOrderCount.forEach(count => {
      if (count > 1) repeatCustomers++;
    });
    const repeatRate = uniqueCustomers > 0 ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    // Previous period comparisons if available
    let revDelta = 0;
    let orderDelta = 0;
    let aovDelta = 0;
    if (prevOrders && prevOrders.length > 0) {
      let prevRev = 0;
      for (let i = 0; i < prevOrders.length; i++) prevRev += prevOrders[i].TotalAmount;
      revDelta = prevRev > 0 ? ((netRevenue - prevRev) / prevRev) * 100 : 0;
      orderDelta = ((totalOrders - prevOrders.length) / prevOrders.length) * 100;
      const prevAOV = prevRev / prevOrders.length;
      aovDelta = prevAOV > 0 ? ((aov - prevAOV) / prevAOV) * 100 : 0;
    }

    return {
      netRevenue,
      grossRevenue,
      totalDiscount,
      totalOrders,
      totalUnits, // SUM(Quantity)
      uniqueCustomers,
      distinctCities,
      aov,
      revPerCustomer,
      realizationRate,
      discountImpactRate,
      repeatRate,
      repeatCustomers,
      revDelta,
      orderDelta,
      aovDelta
    };
  },

  // ============================================================================
  // MODULE 1 & 2: MULTI-GRANULARITY TRENDS & GROWTH
  // ============================================================================
  getTrends(orders, granularity = 'monthly') {
    const buckets = new Map();

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      let key;
      if (granularity === 'daily') {
        key = o.OrderDate;
      } else if (granularity === 'weekly') {
        const d = new Date(o.OrderDate);
        const week = Math.ceil((d.getDate() - d.getDay()) / 7);
        key = `${o.Year}-W${String(Math.max(1, week)).padStart(2, '0')}`;
      } else if (granularity === 'quarterly') {
        const q = Math.ceil(o.MonthNum / 3);
        key = `${o.Year}-Q${q}`;
      } else if (granularity === 'yearly') {
        key = String(o.Year);
      } else {
        // default monthly
        key = o.YearMonth;
      }

      if (!buckets.has(key)) {
        buckets.set(key, { key, revenue: 0, grossRevenue: 0, discount: 0, orders: 0, units: 0, customers: new Set() });
      }
      const b = buckets.get(key);
      b.revenue += o.TotalAmount;
      b.grossRevenue += (o.Quantity * o.UnitPrice);
      b.discount += (o.DiscountAmount || 0);
      b.orders += 1;
      b.units += o.Quantity;
      b.customers.add(o.CustomerID);
    }

    const sortedKeys = Array.from(buckets.keys()).sort();
    const result = sortedKeys.map((k, idx) => {
      const item = buckets.get(k);
      const custCount = item.customers.size;
      const aov = item.orders > 0 ? item.revenue / item.orders : 0;
      const realizationRate = item.grossRevenue > 0 ? parseFloat(((item.revenue / item.grossRevenue) * 100).toFixed(2)) : 85.0;

      let momGrowth = 0;
      if (idx > 0) {
        const prev = buckets.get(sortedKeys[idx - 1]);
        momGrowth = prev.revenue > 0 ? ((item.revenue - prev.revenue) / prev.revenue) * 100 : 0;
      }

      return {
        period: k,
        revenue: Math.round(item.revenue),
        grossRevenue: Math.round(item.grossRevenue),
        discount: Math.round(item.discount),
        orders: item.orders,
        units: item.units,
        customers: custCount,
        aov: Math.round(aov),
        momGrowth: parseFloat(momGrowth.toFixed(1)),
        realizationRate
      };
    });

    return result;
  },

  // ============================================================================
  // MODULE 3, 4, 5: CHANNELS, MULTICHANNEL MULTIPLIER & CROSSOVER
  // ============================================================================
  getChannelScorecard(orders) {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!map.has(o.SalesChannel)) {
        map.set(o.SalesChannel, {
          channel: o.SalesChannel,
          revenue: 0,
          gross: 0,
          discount: 0,
          orders: 0,
          units: 0,
          customers: new Set()
        });
      }
      const c = map.get(o.SalesChannel);
      c.revenue += o.TotalAmount;
      c.gross += o.GrossAmount;
      c.discount += o.Discount;
      c.orders += 1;
      c.units += o.Quantity;
      c.customers.add(o.CustomerID);
    }

    const totalRev = Array.from(map.values()).reduce((acc, c) => acc + c.revenue, 0);

    return Array.from(map.values()).map(c => {
      const custCount = c.customers.size;
      return {
        channel: c.channel,
        revenue: Math.round(c.revenue),
        revenueSharePct: totalRev > 0 ? parseFloat(((c.revenue / totalRev) * 100).toFixed(1)) : 0,
        orders: c.orders,
        units: c.units,
        customers: custCount,
        aov: Math.round(c.orders > 0 ? c.revenue / c.orders : 0),
        discountRate: c.gross > 0 ? parseFloat(((c.discount / c.gross) * 100).toFixed(1)) : 0,
        unitsPerOrder: parseFloat((c.orders > 0 ? c.units / c.orders : 0).toFixed(2)),
        revPerCustomer: Math.round(custCount > 0 ? c.revenue / custCount : 0)
      };
    }).sort((a, b) => b.revenue - a.revenue);
  },

  getOmnichannelAdoption(orders) {
    // Group by customer in this order slice
    const custMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!custMap.has(o.CustomerID)) {
        custMap.set(o.CustomerID, {
          channels: new Set(),
          orders: 0,
          units: 0,
          spend: 0
        });
      }
      const c = custMap.get(o.CustomerID);
      c.channels.add(o.SalesChannel);
      c.orders += 1;
      c.units += o.Quantity;
      c.spend += o.TotalAmount;
    }

    const tierMap = new Map();
    for (let count = 1; count <= 5; count++) {
      tierMap.set(count, { tier: count, label: `${count} Channel${count > 1 ? 's' : ''}`, customers: 0, spend: 0, orders: 0, units: 0 });
    }

    custMap.forEach((val) => {
      const chCount = Math.min(5, Math.max(1, val.channels.size));
      const t = tierMap.get(chCount);
      t.customers += 1;
      t.spend += val.spend;
      t.orders += val.orders;
      t.units += val.units;
    });

    const totalSpend = Array.from(tierMap.values()).reduce((acc, t) => acc + t.spend, 0);

    return Array.from(tierMap.values()).map(t => ({
      tier: t.tier,
      label: t.label,
      customers: t.customers,
      totalSpend: Math.round(t.spend),
      revenueSharePct: totalSpend > 0 ? parseFloat(((t.spend / totalSpend) * 100).toFixed(1)) : 0,
      avgSpend: t.customers > 0 ? Math.round(t.spend / t.customers) : 0,
      avgOrders: t.customers > 0 ? parseFloat((t.orders / t.customers).toFixed(1)) : 0,
      aov: t.orders > 0 ? Math.round(t.spend / t.orders) : 0
    }));
  },

  getChannelCrossover(orders) {
    // Sort customer orders by date to find First Channel -> Next Channels
    const custOrders = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!custOrders.has(o.CustomerID)) custOrders.set(o.CustomerID, []);
      custOrders.get(o.CustomerID).push(o);
    }

    const flowCounts = new Map();

    custOrders.forEach((orderList) => {
      orderList.sort((a, b) => (a.OrderDate > b.OrderDate ? 1 : -1));
      const firstChannel = orderList[0].SalesChannel;
      const seenNext = new Set();
      for (let j = 1; j < orderList.length; j++) {
        const nextChannel = orderList[j].SalesChannel;
        const pair = `${firstChannel} ➔ ${nextChannel}`;
        if (!seenNext.has(pair)) {
          seenNext.add(pair);
          flowCounts.set(pair, (flowCounts.get(pair) || 0) + 1);
        }
      }
    });

    return Array.from(flowCounts.entries())
      .map(([flow, count]) => {
        const [source, target] = flow.split(' ➔ ');
        return { source, target, flow, count };
      })
      .sort((a, b) => b.count - a.count);
  },

  // ============================================================================
  // MODULE 7 & 8: RFM SCORING, SEGMENTS & CUSTOMER VALUE MATRIX
  // ============================================================================
  computeFullRFM() {
    if (this.cachedRFM) return this.cachedRFM;

    const customers = Array.from(DataLoader.customerMap.values());
    const rfmList = [];

    for (let i = 0; i < customers.length; i++) {
      const c = customers[i];
      if (!c.orders || c.orders.length === 0) continue;

      let lastDate = c.orders[0].OrderDate;
      let totalSpend = 0;
      let orderCount = c.orders.length;

      for (let j = 0; j < c.orders.length; j++) {
        const o = c.orders[j];
        if (o.OrderDate > lastDate) lastDate = o.OrderDate;
        totalSpend += o.TotalAmount;
      }

      const diffDays = Math.floor((this.ANCHOR_DATE - new Date(lastDate)) / (1000 * 60 * 60 * 24));
      rfmList.push({
        customerID: c.CustomerID,
        customerName: c.CustomerName,
        city: c.Location,
        loyaltyPoints: c.LoyaltyPoints,
        recency: Math.max(1, diffDays),
        frequency: orderCount,
        monetary: Math.round(totalSpend),
        aov: Math.round(totalSpend / orderCount),
        lastDate
      });
    }

    // Quintile scoring
    // R: lower recency is better => sort desc, divide by 5
    rfmList.sort((a, b) => b.recency - a.recency);
    const n = rfmList.length;
    for (let i = 0; i < n; i++) {
      rfmList[i].rScore = Math.min(5, Math.floor((i / n) * 5) + 1);
    }

    // F: higher frequency is better => sort asc
    rfmList.sort((a, b) => a.frequency - b.frequency);
    for (let i = 0; i < n; i++) {
      rfmList[i].fScore = Math.min(5, Math.floor((i / n) * 5) + 1);
    }

    // M: higher monetary is better => sort asc
    rfmList.sort((a, b) => a.monetary - b.monetary);
    for (let i = 0; i < n; i++) {
      rfmList[i].mScore = Math.min(5, Math.floor((i / n) * 5) + 1);
    }

    // Map segments
    const segmentLookup = new Map();
    for (let i = 0; i < n; i++) {
      const item = rfmList[i];
      const r = item.rScore;
      const f = item.fScore;
      const m = item.mScore;
      const fm = (f + m) / 2;

      let seg = 'Casual Buyers';
      if (r >= 4 && fm >= 4.0) seg = 'Champions';
      else if (r >= 3 && fm >= 3.0) seg = 'Loyal Customers';
      else if (m >= 4 && r <= 3) seg = 'Big Spenders';
      else if (r >= 4 && fm < 3.0) seg = 'Potential Loyalists';
      else if (r === 3 && fm < 3.0) seg = 'Needs Attention';
      else if (r <= 2 && fm >= 3.0) seg = 'At Risk';
      else if (r <= 2 && fm <= 2.0) seg = 'Lost Customers';

      item.segment = seg;
      segmentLookup.set(item.customerID, item);
    }

    this.cachedRFM = { list: rfmList, map: segmentLookup };
    return this.cachedRFM;
  },

  getCustomerRFM(customerID) {
    const rfm = this.computeFullRFM();
    return rfm.map.get(customerID);
  },

  getRFMSummary(filteredOrders) {
    const rfm = this.computeFullRFM();
    const activeCustIDs = new Set(filteredOrders.map(o => o.CustomerID));

    const segMap = new Map();
    const allSegments = ['Champions', 'Loyal Customers', 'Big Spenders', 'Potential Loyalists', 'Needs Attention', 'At Risk', 'Lost Customers'];
    allSegments.forEach(s => segMap.set(s, { segment: s, customers: 0, revenue: 0, orders: 0, aovSum: 0 }));

    rfm.list.forEach(c => {
      if (!activeCustIDs.has(c.customerID)) return;
      if (!segMap.has(c.segment)) {
        segMap.set(c.segment, { segment: c.segment, customers: 0, revenue: 0, orders: 0, aovSum: 0 });
      }
      const s = segMap.get(c.segment);
      s.customers += 1;
      s.revenue += c.monetary;
      s.orders += c.frequency;
      s.aovSum += c.aov;
    });

    const totalRev = Array.from(segMap.values()).reduce((acc, s) => acc + s.revenue, 0);

    return Array.from(segMap.values()).map(s => ({
      segment: s.segment,
      customers: s.customers,
      revenue: s.revenue,
      revenueSharePct: totalRev > 0 ? parseFloat(((s.revenue / totalRev) * 100).toFixed(1)) : 0,
      avgSpend: s.customers > 0 ? Math.round(s.revenue / s.customers) : 0,
      avgAov: s.customers > 0 ? Math.round(s.aovSum / s.customers) : 0,
      avgOrders: s.customers > 0 ? parseFloat((s.orders / s.customers).toFixed(1)) : 0
    })).sort((a, b) => b.revenue - a.revenue);
  },

  // ============================================================================
  // MODULE 10 & 11: COHORT RETENTION & CUSTOMER FUNNEL
  // ============================================================================
  getCohortRetentionMatrix(orders) {
    // Find customer's first purchase month in this dataset
    const custFirstMonth = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!custFirstMonth.has(o.CustomerID) || o.OrderDate < custFirstMonth.get(o.CustomerID)) {
        custFirstMonth.set(o.CustomerID, o.OrderDate);
      }
    }

    const cohortData = new Map();

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const firstDateStr = custFirstMonth.get(o.CustomerID);
      const firstParts = firstDateStr.split('-');
      const cohortMonth = `${firstParts[0]}-${firstParts[1]}`;

      const currParts = o.OrderDate.split('-');
      const cohortIndex = (parseInt(currParts[0], 10) - parseInt(firstParts[0], 10)) * 12 +
                          (parseInt(currParts[1], 10) - parseInt(firstParts[1], 10));

      if (!cohortData.has(cohortMonth)) {
        cohortData.set(cohortMonth, new Map());
      }
      const c = cohortData.get(cohortMonth);
      if (!c.has(cohortIndex)) {
        c.set(cohortIndex, new Set());
      }
      c.get(cohortIndex).add(o.CustomerID);
    }

    const sortedCohorts = Array.from(cohortData.keys()).sort().slice(0, 12);
    const matrix = [];

    sortedCohorts.forEach(cm => {
      const row = cohortData.get(cm);
      const initialSize = row.has(0) ? row.get(0).size : 0;
      const retentionPcts = [];

      for (let idx = 0; idx <= 6; idx++) {
        if (row.has(idx) && initialSize > 0) {
          const count = row.get(idx).size;
          retentionPcts.push(parseFloat(((count / initialSize) * 100).toFixed(1)));
        } else {
          retentionPcts.push(null);
        }
      }

      matrix.push({
        cohort: cm,
        initialSize,
        retention: retentionPcts
      });
    });

    return matrix;
  },

  getCustomerFunnel(orders) {
    const custOrderCount = new Map();
    for (let i = 0; i < orders.length; i++) {
      const cid = orders[i].CustomerID;
      custOrderCount.set(cid, (custOrderCount.get(cid) || 0) + 1);
    }

    const totalCust = custOrderCount.size;
    let ord1 = 0, ord2 = 0, ord3 = 0, ord4Plus = 0;

    custOrderCount.forEach(count => {
      if (count >= 1) ord1++;
      if (count >= 2) ord2++;
      if (count >= 3) ord3++;
      if (count >= 4) ord4Plus++;
    });

    return [
      { step: '1st Purchase', count: ord1, pct: 100 },
      { step: '2nd Purchase', count: ord2, pct: totalCust > 0 ? parseFloat(((ord2 / ord1) * 100).toFixed(1)) : 0 },
      { step: '3rd Purchase', count: ord3, pct: totalCust > 0 ? parseFloat(((ord3 / ord1) * 100).toFixed(1)) : 0 },
      { step: '4+ Purchases', count: ord4Plus, pct: totalCust > 0 ? parseFloat(((ord4Plus / ord1) * 100).toFixed(1)) : 0 }
    ];
  },

  // ============================================================================
  // MODULE 14, 15, 16, 17: BCG MATRIX, PARETO & PRICE BANDS
  // ============================================================================
  getProductBCGMatrix(orders) {
    const prodMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!prodMap.has(o.ProductID)) {
        prodMap.set(o.ProductID, {
          productID: o.ProductID,
          productName: o.ProductName,
          category: o.Category,
          unitPrice: o.UnitPrice,
          revenue: 0,
          units: 0,
          orders: 0
        });
      }
      const p = prodMap.get(o.ProductID);
      p.revenue += o.TotalAmount;
      p.units += o.Quantity;
      p.orders += 1;
    }

    const prods = Array.from(prodMap.values());
    if (prods.length === 0) return [];

    const avgRev = prods.reduce((acc, p) => acc + p.revenue, 0) / prods.length;
    const avgUnits = prods.reduce((acc, p) => acc + p.units, 0) / prods.length;

    return prods.map(p => {
      let quadrant = 'Underperformers';
      if (p.revenue >= avgRev && p.units >= avgUnits) quadrant = 'Stars';
      else if (p.revenue >= avgRev && p.units < avgUnits) quadrant = 'Premium';
      else if (p.revenue < avgRev && p.units >= avgUnits) quadrant = 'Volume Drivers';

      return {
        ...p,
        revenue: Math.round(p.revenue),
        quadrant,
        aov: Math.round(p.revenue / p.orders)
      };
    });
  },

  getParetoProducts(orders) {
    const bcg = this.getProductBCGMatrix(orders);
    bcg.sort((a, b) => b.revenue - a.revenue);
    const totalRev = bcg.reduce((acc, p) => acc + p.revenue, 0);

    let runningRev = 0;
    return bcg.map((p, idx) => {
      runningRev += p.revenue;
      return {
        rank: idx + 1,
        productID: p.productID,
        productName: p.productName,
        category: p.category,
        revenue: p.revenue,
        productPct: parseFloat((((idx + 1) / bcg.length) * 100).toFixed(1)),
        cumRevenuePct: totalRev > 0 ? parseFloat(((runningRev / totalRev) * 100).toFixed(1)) : 0
      };
    });
  },

  getPriceDemandBands(orders) {
    const bands = [
      { band: '< ₹1K', min: 0, max: 999.99, orders: 0, units: 0, revenue: 0 },
      { band: '₹1K - ₹2K', min: 1000, max: 1999.99, orders: 0, units: 0, revenue: 0 },
      { band: '₹2K - ₹3K', min: 2000, max: 2999.99, orders: 0, units: 0, revenue: 0 },
      { band: '₹3K - ₹4K', min: 3000, max: 3999.99, orders: 0, units: 0, revenue: 0 },
      { band: '₹4K+', min: 4000, max: Infinity, orders: 0, units: 0, revenue: 0 }
    ];

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      for (let b = 0; b < bands.length; b++) {
        if (o.UnitPrice >= bands[b].min && o.UnitPrice <= bands[b].max) {
          bands[b].orders += 1;
          bands[b].units += o.Quantity;
          bands[b].revenue += o.TotalAmount;
          break;
        }
      }
    }

    const totalRev = bands.reduce((acc, b) => acc + b.revenue, 0);
    return bands.map(b => ({
      band: b.band,
      orders: b.orders,
      units: b.units,
      revenue: Math.round(b.revenue),
      revenueSharePct: totalRev > 0 ? parseFloat(((b.revenue / totalRev) * 100).toFixed(1)) : 0,
      aov: b.orders > 0 ? Math.round(b.revenue / b.orders) : 0
    }));
  },

  // ============================================================================
  // MODULE 19 & 20: DISCOUNT ELASTICITY & DEPENDENCY
  // ============================================================================
  getDiscountBrackets(orders) {
    const brackets = [
      { label: '0% (Full Price)', min: 0, max: 0, orders: 0, units: 0, revenue: 0, discount: 0 },
      { label: '1% - 5%', min: 0.001, max: 5.0, orders: 0, units: 0, revenue: 0, discount: 0 },
      { label: '5% - 10%', min: 5.001, max: 10.0, orders: 0, units: 0, revenue: 0, discount: 0 },
      { label: '10% - 20%', min: 10.001, max: 20.0, orders: 0, units: 0, revenue: 0, discount: 0 },
      { label: '20%+', min: 20.001, max: 100.0, orders: 0, units: 0, revenue: 0, discount: 0 }
    ];

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const rate = o.DiscountRate;
      for (let b = 0; b < brackets.length; b++) {
        if (rate >= brackets[b].min && rate <= brackets[b].max) {
          brackets[b].orders += 1;
          brackets[b].units += o.Quantity;
          brackets[b].revenue += o.TotalAmount;
          brackets[b].discount += o.Discount;
          break;
        }
      }
    }

    return brackets.map(b => ({
      bracket: b.label,
      orders: b.orders,
      units: b.units,
      revenue: Math.round(b.revenue),
      discount: Math.round(b.discount),
      aov: b.orders > 0 ? Math.round(b.revenue / b.orders) : 0
    }));
  },

  // ============================================================================
  // MODULE 21: CATEGORY SCORECARD
  // ============================================================================
  getCategoryScorecard(orders) {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const cat = o.Category || 'Other';
      if (!map.has(cat)) {
        map.set(cat, {
          category: cat,
          revenue: 0,
          gross: 0,
          discount: 0,
          orders: 0,
          units: 0,
          customers: new Set()
        });
      }
      const c = map.get(cat);
      c.revenue += o.TotalAmount;
      c.gross += o.GrossAmount;
      c.discount += o.Discount;
      c.orders += 1;
      c.units += o.Quantity;
      c.customers.add(o.CustomerID);
    }

    const categories = Array.from(map.values());
    const totalRev = categories.reduce((acc, c) => acc + c.revenue, 0);

    return categories.map(c => {
      const custCount = c.customers.size;
      return {
        category: c.category,
        revenue: Math.round(c.revenue),
        revenueSharePct: totalRev > 0 ? parseFloat(((c.revenue / totalRev) * 100).toFixed(1)) : 0,
        orders: c.orders,
        units: c.units,
        customers: custCount,
        aov: Math.round(c.orders > 0 ? c.revenue / c.orders : 0),
        discountRate: c.gross > 0 ? parseFloat(((c.discount / c.gross) * 100).toFixed(1)) : 0,
        revPerCustomer: Math.round(custCount > 0 ? c.revenue / custCount : 0)
      };
    }).sort((a, b) => b.revenue - a.revenue);
  },

  // ============================================================================
  // MODULE 22 & 23: GEOGRAPHIC SCORECARD & STRATEGIC CLASSIFICATION
  // ============================================================================
  getGeographicScorecard(orders) {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const city = o.CustomerCity || 'Unknown';
      if (!map.has(city)) {
        map.set(city, {
          city,
          revenue: 0,
          gross: 0,
          discount: 0,
          orders: 0,
          units: 0,
          customers: new Set()
        });
      }
      const c = map.get(city);
      c.revenue += o.TotalAmount;
      c.gross += o.GrossAmount;
      c.discount += o.Discount;
      c.orders += 1;
      c.units += o.Quantity;
      c.customers.add(o.CustomerID);
    }

    const cities = Array.from(map.values());
    if (cities.length === 0) return [];

    const totalRev = cities.reduce((acc, c) => acc + c.revenue, 0);
    const avgRev = totalRev / cities.length;
    const avgCust = cities.reduce((acc, c) => acc + c.customers.size, 0) / cities.length;

    return cities.map(c => {
      const custCount = c.customers.size;
      let classification = 'Under-Penetrated';
      if (c.revenue >= avgRev && custCount >= avgCust) classification = 'Core Market';
      else if (c.revenue >= avgRev && custCount < avgCust) classification = 'High Value';
      else if (c.revenue < avgRev && custCount >= avgCust) classification = 'Growth Opportunity';

      return {
        city: c.city,
        revenue: Math.round(c.revenue),
        revenueSharePct: totalRev > 0 ? parseFloat(((c.revenue / totalRev) * 100).toFixed(1)) : 0,
        orders: c.orders,
        units: c.units,
        customers: custCount,
        aov: Math.round(c.orders > 0 ? c.revenue / c.orders : 0),
        revPerCustomer: Math.round(custCount > 0 ? c.revenue / custCount : 0),
        discountRate: c.gross > 0 ? parseFloat(((c.discount / c.gross) * 100).toFixed(1)) : 0,
        classification
      };
    }).sort((a, b) => b.revenue - a.revenue);
  },

  getCityCategoryHeatmap(orders) {
    const matrixMap = new Map();
    const categories = ['Sports & Fitness', 'Beauty & Personal Care', 'Home & Kitchen', 'Electronics', 'Fashion'];
    const cities = ['Ahmedabad', 'Kolkata', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'];

    cities.forEach(city => {
      categories.forEach(cat => {
        matrixMap.set(`${city}|${cat}`, 0);
      });
    });

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const key = `${o.CustomerCity}|${o.Category}`;
      if (matrixMap.has(key)) {
        matrixMap.set(key, matrixMap.get(key) + o.TotalAmount);
      }
    }

    const result = [];
    cities.forEach((city, cityIdx) => {
      categories.forEach((cat, catIdx) => {
        result.push([catIdx, cityIdx, Math.round(matrixMap.get(`${city}|${cat}`) || 0)]);
      });
    });

    return { categories, cities, data: result };
  },


  getDayMonthSeasonality(orders) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const grid = [];

    const dataMap = new Map();
    for (let m = 1; m <= 12; m++) {
      for (let d = 0; d < 7; d++) {
        dataMap.set(`${m}-${d}`, 0);
      }
    }

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const key = `${o.MonthNum}-${o.DayOfWeekNum}`;
      dataMap.set(key, (dataMap.get(key) || 0) + o.TotalAmount);
    }

    for (let m = 1; m <= 12; m++) {
      for (let d = 0; d < 7; d++) {
        grid.push([m - 1, d, Math.round(dataMap.get(`${m}-${d}`) || 0)]);
      }
    }

    return { months, days, data: grid };
  },

  // ============================================================================
  // MODULE 25: PRICE ELASTICITY PROXY SCATTER
  // ============================================================================
  getPriceElasticity(orders) {
    const prodMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!prodMap.has(o.ProductID)) {
        prodMap.set(o.ProductID, {
          name: o.ProductName,
          category: o.Category,
          unitPrice: o.UnitPrice,
          unitsSold: 0,
          revenue: 0
        });
      }
      const p = prodMap.get(o.ProductID);
      p.unitsSold += o.Quantity;
      p.revenue += o.TotalAmount;
    }
    return Array.from(prodMap.values());
  },

  // ============================================================================
  // MODULE 26: PAYMENT METHOD INTELLIGENCE
  // ============================================================================
  getPaymentIntelligence(orders) {
    const map = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!map.has(o.PaymentMethod)) {
        map.set(o.PaymentMethod, { method: o.PaymentMethod, revenue: 0, orders: 0, units: 0 });
      }
      const p = map.get(o.PaymentMethod);
      p.revenue += o.TotalAmount;
      p.orders += 1;
      p.units += o.Quantity;
    }

    const totalRev = Array.from(map.values()).reduce((acc, p) => acc + p.revenue, 0);

    return Array.from(map.values()).map(p => ({
      method: p.method,
      revenue: Math.round(p.revenue),
      revenueSharePct: totalRev > 0 ? parseFloat(((p.revenue / totalRev) * 100).toFixed(1)) : 0,
      orders: p.orders,
      aov: Math.round(p.revenue / p.orders)
    })).sort((a, b) => b.revenue - a.revenue);
  },

  // ============================================================================
  // MODULE 27: CLV DISTRIBUTION TIERS
  // ============================================================================
  getCLVDistribution(orders) {
    const custMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!custMap.has(o.CustomerID)) {
        custMap.set(o.CustomerID, { spend: 0, orders: 0 });
      }
      const c = custMap.get(o.CustomerID);
      c.spend += o.TotalAmount;
      c.orders += 1;
    }

    const tiers = [
      { tier: '< ₹25K', min: 0, max: 24999.99, customers: 0, spend: 0, orders: 0 },
      { tier: '₹25K - ₹50K', min: 25000, max: 49999.99, customers: 0, spend: 0, orders: 0 },
      { tier: '₹50K - ₹100K', min: 50000, max: 99999.99, customers: 0, spend: 0, orders: 0 },
      { tier: '₹100K - ₹200K', min: 100000, max: 199999.99, customers: 0, spend: 0, orders: 0 },
      { tier: '> ₹200K', min: 200000, max: Infinity, customers: 0, spend: 0, orders: 0 }
    ];

    custMap.forEach(c => {
      for (let t of tiers) {
        if (c.spend >= t.min && c.spend <= t.max) {
          t.customers++;
          t.spend += c.spend;
          t.orders += c.orders;
          break;
        }
      }
    });

    const totalCust = custMap.size;
    const totalSpend = Array.from(custMap.values()).reduce((acc, c) => acc + c.spend, 0);

    return tiers.map(t => ({
      tier: t.tier,
      customers: t.customers,
      customerSharePct: totalCust > 0 ? parseFloat(((t.customers / totalCust) * 100).toFixed(1)) : 0,
      revenue: Math.round(t.spend),
      revenueSharePct: totalSpend > 0 ? parseFloat(((t.spend / totalSpend) * 100).toFixed(1)) : 0,
      avgOrders: t.customers > 0 ? parseFloat((t.orders / t.customers).toFixed(1)) : 0,
      avgCustomerValue: t.customers > 0 ? Math.round(t.spend / t.customers) : 0
    }));
  },

  // ============================================================================
  // MODULE 28: BUSINESS HEALTH SCORECARD (DETERMINISTIC 0 - 100)
  // ============================================================================
  getBusinessHealthScorecard(orders) {
    const kpi = this.getExecutiveKPIs(orders);
    const channels = this.getChannelScorecard(orders);
    const cities = this.getGeographicScorecard(orders);
    const bcg = this.getProductBCGMatrix(orders);

    const realizationScore = Math.min(100, Math.max(0, Math.round(kpi.realizationRate)));
    const retScore = Math.min(100, Math.max(0, Math.round(kpi.repeatRate)));

    let diversitySum = 0;
    channels.forEach(c => {
      const p = c.revenueSharePct / 100;
      if (p > 0) diversitySum -= p * Math.log2(p);
    });
    const maxEntropy = Math.log2(Math.max(2, channels.length));
    const diversityScore = Math.min(100, Math.max(0, Math.round((diversitySum / maxEntropy) * 100)));

    const totalCatalogCount = DataLoader.rawProducts.length || 200;
    const activeSkuCount = bcg.length;
    const prodScore = Math.min(100, Math.max(0, Math.round((activeSkuCount / totalCatalogCount) * 100)));

    const discountScore = Math.min(100, Math.max(0, Math.round(100 - (kpi.discountImpactRate * 2.2))));
    const totalPossibleCities = 8;
    const geoScore = Math.min(100, Math.max(0, Math.round((kpi.distinctCities / totalPossibleCities) * 100)));
    const avgUnits = orders.length > 0 ? (kpi.totalUnits / orders.length) : 3.0;
    const basketScore = Math.min(100, Math.max(0, Math.round((avgUnits / 3.0) * 100)));

    const overall = Math.round((realizationScore + retScore + diversityScore + prodScore + discountScore + geoScore + basketScore) / 7);

    const getGrade = (s) => {
      if (s >= 85) return 'OPTIMAL';
      if (s >= 70) return 'STRONG';
      if (s >= 55) return 'MODERATE';
      return 'ATTENTION';
    };

    return [
      { dimension: 'Overall Health Index', score: overall, grade: getGrade(overall), color: 'var(--accent-violet)' },
      { dimension: 'Revenue Realization', score: realizationScore, grade: getGrade(realizationScore), color: 'var(--accent-emerald)' },
      { dimension: 'Customer Retention', score: retScore, grade: getGrade(retScore), color: 'var(--accent-cyan)' },
      { dimension: 'Channel Diversity', score: diversityScore, grade: getGrade(diversityScore), color: 'var(--accent-violet)' },
      { dimension: 'Catalog Active Velocity', score: prodScore, grade: getGrade(prodScore), color: 'var(--accent-emerald)' },
      { dimension: 'Discount Discipline', score: discountScore, grade: getGrade(discountScore), color: 'var(--accent-amber)' },
      { dimension: 'Geographic Market Reach', score: geoScore, grade: getGrade(geoScore), color: 'var(--accent-cyan)' },
      { dimension: 'Basket Depth Stability', score: basketScore, grade: getGrade(basketScore), color: 'var(--accent-emerald)' }
    ];
  },

  // ============================================================================
  // MODULE 29: DETERMINISTIC BUSINESS INSIGHT ENGINE (WITH EVIDENCE TRAILS)
  // Pure Transparent Mathematical Rules — Zero LLMs — Zero Hallucinations
  // ============================================================================
  getOpportunityAndRisks(orders) {
    if (!orders || orders.length === 0) return [];

    const kpi = this.getExecutiveKPIs(orders);
    const channels = this.getChannelScorecard(orders);
    const cities = this.getGeographicScorecard(orders);
    const categories = this.getCategoryScorecard(orders);
    const adoption = this.getOmnichannelAdoption(orders);

    const insights = [];

    // Rule 1: Omnichannel Spend Multiplier
    if (adoption && adoption.length >= 2) {
      const single = adoption.find(a => a.tier === 1) || { avgSpend: 0, customers: 0, totalSpend: 0 };
      const multi = adoption.filter(a => a.tier > 1);
      const multiCust = multi.reduce((acc, m) => acc + m.customers, 0);
      const multiSpendTotal = multi.reduce((acc, m) => acc + m.totalSpend, 0);
      const multiAvgSpend = multiCust > 0 ? Math.round(multiSpendTotal / multiCust) : 0;
      const liftRatio = single.avgSpend > 0 ? (multiAvgSpend / single.avgSpend).toFixed(2) : '1.0';

      insights.push({
        id: 'insight-omnichannel-multiplier',
        tag: 'OMNICHANNEL DYNAMICS',
        type: 'opportunity',
        title: `Omnichannel Spend Lift: ${liftRatio}× Average Value Multiplier`,
        desc: `Customers transacting across multiple channels average ₹${multiAvgSpend.toLocaleString()} in spend versus ₹${single.avgSpend.toLocaleString()} for single-channel buyers. Multichannel buyers represent ${((multiCust / (kpi.uniqueCustomers || 1)) * 100).toFixed(1)}% of transacting customers.`,
        evidence: {
          metric: 'Customer Spend Variance',
          singleChannelAvg: `₹${single.avgSpend.toLocaleString()}`,
          multichannelAvg: `₹${multiAvgSpend.toLocaleString()}`,
          liftMultiplier: `${liftRatio}×`,
          multichannelCustomers: multiCust.toLocaleString(),
          multichannelRevenue: `₹${(multiSpendTotal / 1e6).toFixed(2)}M`,
          rule: 'COMPUTE: AVG(Spend[Channels >= 2]) / AVG(Spend[Channels == 1])'
        }
      });
    }

    // Rule 2: Top Customer Revenue Concentration
    const custSpendMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      custSpendMap.set(o.CustomerID, (custSpendMap.get(o.CustomerID) || 0) + o.TotalAmount);
    }
    const sortedCusts = Array.from(custSpendMap.values()).sort((a, b) => b - a);
    const top10Count = Math.max(1, Math.round(sortedCusts.length * 0.1));
    const top10Spend = sortedCusts.slice(0, top10Count).reduce((acc, v) => acc + v, 0);
    const top10Share = kpi.netRevenue > 0 ? ((top10Spend / kpi.netRevenue) * 100).toFixed(1) : '0';

    insights.push({
      id: 'insight-customer-concentration',
      tag: 'CUSTOMER CONCENTRATION',
      type: parseFloat(top10Share) > 35 ? 'risk' : 'growth',
      title: `Top 10% Customer Concentration: ${top10Share}% of Net Revenue`,
      desc: `The top ${top10Count.toLocaleString()} customers account for ₹${(top10Spend / 1e6).toFixed(2)}M (${top10Share}%) of total realized revenue. Monitoring retention within this cohort is critical to protect core volume.`,
      evidence: {
        metric: 'Top 10% Customer Share',
        topCohortSize: `${top10Count.toLocaleString()} customers (10%)`,
        cohortRevenue: `₹${(top10Spend / 1e6).toFixed(2)}M`,
        revenueShare: `${top10Share}%`,
        totalActiveCustomers: kpi.uniqueCustomers.toLocaleString(),
        totalNetRevenue: `₹${(kpi.netRevenue / 1e6).toFixed(2)}M`,
        rule: 'COMPUTE: SUM(Top 10% Spend) / SUM(TotalAmount)'
      }
    });

    // Rule 3: Category Revenue Leader
    if (categories && categories.length > 0) {
      const topCat = categories[0];
      insights.push({
        id: 'insight-category-dominance',
        tag: 'CATALOG VELOCITY',
        type: 'growth',
        title: `Catalog Revenue Leader: ${topCat.category} (${topCat.revenueSharePct}%)`,
        desc: `${topCat.category} leads all categories generating ₹${(topCat.revenue / 1e6).toFixed(2)}M across ${topCat.orders.toLocaleString()} orders with an average basket of ₹${topCat.aov.toLocaleString()}.`,
        evidence: {
          metric: 'Category Leadership',
          topCategory: topCat.category,
          categoryRevenue: `₹${(topCat.revenue / 1e6).toFixed(2)}M`,
          categoryShare: `${topCat.revenueSharePct}%`,
          ordersCount: topCat.orders.toLocaleString(),
          averageBasket: `₹${topCat.aov.toLocaleString()}`,
          rule: 'ORDER BY Category Revenue DESC LIMIT 1'
        }
      });
    }

    // Rule 4: Discount Efficiency & Erosion Warning
    if (channels && channels.length > 0) {
      const sortedByDiscount = [...channels].sort((a, b) => b.discountRate - a.discountRate);
      const topDiscountChannel = sortedByDiscount[0];
      insights.push({
        id: 'insight-discount-erosion',
        tag: 'REVENUE REALIZATION',
        type: topDiscountChannel.discountRate > 15 ? 'risk' : 'pricing',
        title: `Discount Exposure: ${topDiscountChannel.channel} (${topDiscountChannel.discountRate}%)`,
        desc: `${topDiscountChannel.channel} experiences the highest promotional discount rate at ${topDiscountChannel.discountRate}%. Net realized revenue stands at ₹${(topDiscountChannel.revenue / 1e6).toFixed(2)}M across ${topDiscountChannel.orders.toLocaleString()} orders.`,
        evidence: {
          metric: 'Promotional Markdown Exposure',
          highestDiscountChannel: topDiscountChannel.channel,
          discountImpactRate: `${topDiscountChannel.discountRate}%`,
          channelNetRevenue: `₹${(topDiscountChannel.revenue / 1e6).toFixed(2)}M`,
          ordersMoved: topDiscountChannel.orders.toLocaleString(),
          overallRealizationRate: `${kpi.realizationRate.toFixed(1)}%`,
          rule: 'ORDER BY Channel Discount Rate DESC LIMIT 1'
        }
      });
    }

    // Rule 5: Geographic Market Concentration
    if (cities && cities.length > 0) {
      const topCity = cities[0];
      insights.push({
        id: 'insight-geographic-hub',
        tag: 'GEOGRAPHIC EXPANSION',
        type: 'opportunity',
        title: `Top Metro Market: ${topCity.city} (${topCity.revenueSharePct}%)`,
        desc: `${topCity.city} is the highest revenue contributor at ₹${(topCity.revenue / 1e6).toFixed(2)}M with ${topCity.customers.toLocaleString()} active customers and an AOV of ₹${topCity.aov.toLocaleString()}.`,
        evidence: {
          metric: 'Top Metropolitan Market',
          topCity: topCity.city,
          cityRevenue: `₹${(topCity.revenue / 1e6).toFixed(2)}M`,
          cityShare: `${topCity.revenueSharePct}%`,
          activeBuyers: topCity.customers.toLocaleString(),
          aov: `₹${topCity.aov.toLocaleString()}`,
          rule: 'ORDER BY City Net Revenue DESC LIMIT 1'
        }
      });
    }

    return insights;
  },

  // ============================================================================
  // ADVANCED ANALYTICS: SEASONALITY HEATMAP (DAY OF WEEK × MONTH)
  // ============================================================================
  getSeasonalityHeatmap(orders) {
    // 7 days (Sun=0 to Sat=6) x 12 months (Jan=1 to Dec=12)
    const matrix = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const counts = Array(7).fill(0).map(() => Array(12).fill(0));
    const revenues = Array(7).fill(0).map(() => Array(12).fill(0));

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      const d = o.DayOfWeekNum; // 0-6
      const m = o.MonthNum - 1; // 0-11
      if (d >= 0 && d < 7 && m >= 0 && m < 12) {
        counts[d][m] += 1;
        revenues[d][m] += o.TotalAmount;
      }
    }

    for (let d = 0; d < 7; d++) {
      for (let m = 0; m < 12; m++) {
        matrix.push([m, d, Math.round(revenues[d][m]), counts[d][m]]);
      }
    }

    return { matrix, dayNames, monthNames };
  },

  // ============================================================================
  // ADVANCED ANALYTICS: PRICE VS DEMAND (ELASTICITY PROXY)
  // ============================================================================
  getPriceElasticity(orders) {
    const prodMap = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (!prodMap.has(o.ProductID)) {
        prodMap.set(o.ProductID, {
          productID: o.ProductID,
          productName: o.ProductName,
          category: o.Category,
          unitPrice: o.UnitPrice,
          totalUnits: 0,
          totalRevenue: 0,
          orders: 0
        });
      }
      const p = prodMap.get(o.ProductID);
      p.totalUnits += o.Quantity;
      p.totalRevenue += o.TotalAmount;
      p.orders += 1;
    }

    return Array.from(prodMap.values()).map(p => ({
      name: p.productName,
      category: p.category,
      unitPrice: p.unitPrice,
      unitsSold: p.totalUnits,
      revenue: Math.round(p.totalRevenue),
      aov: Math.round(p.totalRevenue / p.orders)
    }));
  },

  // ============================================================================
  // ADVANCED ANALYTICS: CUSTOMER LIFETIME VALUE (CLV) DISTRIBUTION
  // ============================================================================
  getCLVDistribution(orders) {
    const custSpend = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      custSpend.set(o.CustomerID, (custSpend.get(o.CustomerID) || 0) + o.TotalAmount);
    }

    const tiers = [
      { tier: 'Low Value (< ₹25k)', min: 0, max: 24999.99, customers: 0, totalRevenue: 0 },
      { tier: 'Mid Value (₹25k - ₹50k)', min: 25000, max: 49999.99, customers: 0, totalRevenue: 0 },
      { tier: 'High Value (₹50k - ₹100k)', min: 50000, max: 99999.99, customers: 0, totalRevenue: 0 },
      { tier: 'VIP Premium (₹100k+)', min: 100000, max: Infinity, customers: 0, totalRevenue: 0 }
    ];

    custSpend.forEach(spend => {
      for (let t of tiers) {
        if (spend >= t.min && spend <= t.max) {
          t.customers++;
          t.totalRevenue += spend;
          break;
        }
      }
    });

    const totalCust = custSpend.size;
    const totalRev = Array.from(custSpend.values()).reduce((a, b) => a + b, 0);

    return tiers.map(t => ({
      tier: t.tier,
      customers: t.customers,
      customerSharePct: totalCust > 0 ? parseFloat(((t.customers / totalCust) * 100).toFixed(1)) : 0,
      revenue: Math.round(t.totalRevenue),
      revenueSharePct: totalRev > 0 ? parseFloat(((t.totalRevenue / totalRev) * 100).toFixed(1)) : 0,
      avgCustomerValue: t.customers > 0 ? Math.round(t.totalRevenue / t.customers) : 0
    }));
  },

  // ============================================================================
  // COMPARE MODE ENGINE: SIDE-BY-SIDE ANALYTICAL VARIANCE
  // ============================================================================
  getComparison(orders, dimension, valA, valB) {
    const filterFn = (o, dim, val) => {
      if (dim === 'year') return o.Year === parseInt(val);
      if (dim === 'channel') return o.SalesChannel === val;
      if (dim === 'city') return o.Location === val;
      if (dim === 'category') return o.Category === val;
      return true;
    };

    const ordersA = orders.filter(o => filterFn(o, dimension, valA));
    const ordersB = orders.filter(o => filterFn(o, dimension, valB));

    const summarize = (set, label) => {
      const rev = set.reduce((acc, o) => acc + o.TotalAmount, 0);
      const gross = set.reduce((acc, o) => acc + (o.Quantity * o.UnitPrice), 0);
      const discount = set.reduce((acc, o) => acc + o.Discount, 0);
      const ordersCount = set.length;
      const units = set.reduce((acc, o) => acc + o.Quantity, 0);
      const custSet = new Set(set.map(o => o.CustomerID));
      const aov = ordersCount > 0 ? rev / ordersCount : 0;
      const discountPct = gross > 0 ? (discount / gross) * 100 : 0;
      const revPerCust = custSet.size > 0 ? rev / custSet.size : 0;

      // Category breakdown
      const catMap = {};
      set.forEach(o => {
        catMap[o.Category] = (catMap[o.Category] || 0) + o.TotalAmount;
      });

      return {
        label,
        revenue: Math.round(rev),
        grossRevenue: Math.round(gross),
        discount: Math.round(discount),
        discountPct: parseFloat(discountPct.toFixed(1)),
        orders: ordersCount,
        units,
        customers: custSet.size,
        aov: Math.round(aov),
        revPerCust: Math.round(revPerCust),
        categories: catMap
      };
    };

    const statsA = summarize(ordersA, valA);
    const statsB = summarize(ordersB, valB);

    const calcDelta = (a, b) => {
      if (a === 0) return b === 0 ? 0 : 100;
      return parseFloat((((b - a) / a) * 100).toFixed(1));
    };

    return {
      dimension,
      valA,
      valB,
      statsA,
      statsB,
      deltas: {
        revenue: calcDelta(statsA.revenue, statsB.revenue),
        orders: calcDelta(statsA.orders, statsB.orders),
        units: calcDelta(statsA.units, statsB.units),
        aov: calcDelta(statsA.aov, statsB.aov),
        customers: calcDelta(statsA.customers, statsB.customers),
        discountPct: parseFloat((statsB.discountPct - statsA.discountPct).toFixed(1))
      }
    };
  }
};
