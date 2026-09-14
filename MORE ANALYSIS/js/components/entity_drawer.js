/**
 * entity_drawer.js
 * Slide-Over Detail Inspector Panel (Customer 360, Product 360, City & Channel Profiles)
 * Omni-Channel Retail Intelligence Platform
 */

const EntityDrawer = {
  drawerEl: null,
  backdropEl: null,

  init() {
    this.drawerEl = document.getElementById('entity-drawer');
    this.backdropEl = document.getElementById('drawer-backdrop');
    const closeBtn = document.getElementById('drawer-close-btn');

    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    if (this.backdropEl) this.backdropEl.addEventListener('click', () => this.close());
  },

  open() {
    if (this.drawerEl) this.drawerEl.classList.add('active');
    if (this.backdropEl) this.backdropEl.classList.add('active');
  },

  close() {
    if (this.drawerEl) this.drawerEl.classList.remove('active');
    if (this.backdropEl) this.backdropEl.classList.remove('active');
  },

  // 1. Customer 360 Profile
  openCustomer(customerID) {
    const cust = DataLoader.customerMap.get(customerID);
    if (!cust) return;

    const rfm = AnalyticsEngine.getCustomerRFM(customerID) || {
      segment: 'Standard',
      recency: 0,
      frequency: cust.orders.length,
      monetary: Math.round(cust.totalSpend),
      aov: Math.round(cust.totalSpend / Math.max(1, cust.orders.length))
    };

    const titleEl = document.getElementById('drawer-title');
    const subEl = document.getElementById('drawer-subtitle');
    const bodyEl = document.getElementById('drawer-body');

    if (titleEl) titleEl.innerText = `${cust.CustomerName}`;
    if (subEl) subEl.innerText = `Customer ID: ${cust.CustomerID} • ${cust.Location}`;

    // Calculate category breakdown
    const catMap = new Map();
    cust.orders.forEach(o => {
      catMap.set(o.Category, (catMap.get(o.Category) || 0) + o.TotalAmount);
    });
    const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

    // Timeline of recent orders
    const sortedOrders = [...cust.orders].sort((a, b) => (b.OrderDate > a.OrderDate ? 1 : -1));

    let timelineHtml = '';
    sortedOrders.slice(0, 10).forEach(o => {
      timelineHtml += `
        <div class="timeline-item">
          <div class="timeline-date">${o.OrderDate} • ${o.SalesChannel}</div>
          <div class="timeline-text">
            <b>${o.ProductName}</b> (${o.Category})<br>
            <span style="color:#94a3b8;font-size:11px;">Qty: ${o.Quantity} | Paid: ₹${o.TotalAmount.toLocaleString()} via ${o.PaymentMethod}</span>
          </div>
        </div>
      `;
    });

    let catBarsHtml = '';
    sortedCats.forEach(([cat, amt]) => {
      const pct = cust.totalSpend > 0 ? ((amt / cust.totalSpend) * 100).toFixed(1) : 0;
      catBarsHtml += `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
            <span>${cat}</span>
            <span style="color:#38bdf8;">${pct}% (₹${Math.round(amt).toLocaleString()})</span>
          </div>
          <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, #38bdf8, #6366f1);border-radius:4px;"></div>
          </div>
        </div>
      `;
    });

    bodyEl.innerHTML = `
      <div class="drawer-stats-grid">
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Total Spend</div>
          <div class="drawer-stat-val" style="color:#38bdf8;">₹${Math.round(cust.totalSpend).toLocaleString()}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Total Orders</div>
          <div class="drawer-stat-val">${cust.orders.length}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Average Order Value</div>
          <div class="drawer-stat-val">₹${Math.round(rfm.aov).toLocaleString()}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Loyalty Points</div>
          <div class="drawer-stat-val" style="color:#f59e0b;">${cust.LoyaltyPoints.toLocaleString()}</div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#94a3b8;">RFM Classification</span>
          <span class="badge badge-champion" style="font-size:11px;">${rfm.segment}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span style="font-size:12px;color:#94a3b8;">Retention Risk</span>
          <span style="font-size:11px;font-weight:600;color:${rfm.recency > 180 ? '#f43f5e' : '#10b981'};">
            ${rfm.recency > 180 ? 'HIGH (Inactive > 180 days)' : 'LOW (Active Buyer)'}
          </span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span style="font-size:12px;color:#94a3b8;">Channels Adopted</span>
          <span style="font-size:11px;color:#38bdf8;font-weight:600;">${cust.channelsUsed.size} Channels</span>
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">Category Spend Distribution</div>
        ${catBarsHtml}
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:12px;text-transform:uppercase;letter-spacing:0.04em;">Order History Timeline</div>
        <div class="timeline">
          ${timelineHtml}
        </div>
      </div>
    `;

    this.open();
  },

  // 2. Product 360 Profile
  openProduct(productID) {
    const prod = DataLoader.productMap.get(productID);
    if (!prod) return;

    const titleEl = document.getElementById('drawer-title');
    const subEl = document.getElementById('drawer-subtitle');
    const bodyEl = document.getElementById('drawer-body');

    if (titleEl) titleEl.innerText = `${prod.ProductName}`;
    if (subEl) subEl.innerText = `SKU: ${prod.ProductID} • ${prod.Category}`;

    // Quadrant logic
    let quad = 'Underperformer';
    if (prod.totalRevenue >= 1534203 && prod.totalUnits >= 751) quad = 'Star';
    else if (prod.totalRevenue >= 1534203 && prod.totalUnits < 751) quad = 'Premium Driver';
    else if (prod.totalRevenue < 1534203 && prod.totalUnits >= 751) quad = 'Volume Driver';

    // Channel split
    const chMap = new Map();
    prod.orders.forEach(o => chMap.set(o.SalesChannel, (chMap.get(o.SalesChannel) || 0) + o.Quantity));
    const sortedCh = Array.from(chMap.entries()).sort((a, b) => b[1] - a[1]);

    let chBarsHtml = '';
    sortedCh.forEach(([ch, qty]) => {
      const pct = prod.totalUnits > 0 ? ((qty / prod.totalUnits) * 100).toFixed(1) : 0;
      chBarsHtml += `
        <div style="margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:2px;">
            <span>${ch}</span>
            <span style="color:#38bdf8;">${pct}% (${qty} units)</span>
          </div>
          <div style="height:4px;background:rgba(255,255,255,0.08);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:linear-gradient(90deg, #38bdf8, #10b981);border-radius:4px;"></div>
          </div>
        </div>
      `;
    });

    bodyEl.innerHTML = `
      <div class="drawer-stats-grid">
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Net Revenue</div>
          <div class="drawer-stat-val" style="color:#38bdf8;">₹${(prod.totalRevenue / 1e6).toFixed(2)}M</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Units Sold</div>
          <div class="drawer-stat-val">${prod.totalUnits.toLocaleString()}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Unit Catalog Price</div>
          <div class="drawer-stat-val">₹${prod.UnitPrice.toFixed(0)}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Total Orders</div>
          <div class="drawer-stat-val">${prod.orders.length}</div>
        </div>
      </div>

      <div style="background:rgba(255,255,255,0.02);border:1px solid var(--border-subtle);border-radius:8px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:#94a3b8;">BCG Portfolio Quadrant</span>
          <span class="badge ${quad === 'Star' ? 'badge-champion' : quad === 'Premium Driver' ? 'badge-loyal' : 'badge-spenders'}">${quad}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;">
          <span style="font-size:12px;color:#94a3b8;">Realized Discount Sacrificed</span>
          <span style="font-size:11px;font-weight:600;color:#f59e0b;">₹${Math.round(prod.totalDiscount).toLocaleString()}</span>
        </div>
      </div>

      <div>
        <div style="font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.04em;">Sales Volume by Channel</div>
        ${chBarsHtml}
      </div>
    `;

    this.open();
  },

  // 3. City Profile
  openCity(cityName) {
    const titleEl = document.getElementById('drawer-title');
    const subEl = document.getElementById('drawer-subtitle');
    const bodyEl = document.getElementById('drawer-body');

    const orders = DataLoader.rawOrders.filter(o => o.CustomerCity === cityName);
    const rev = orders.reduce((acc, o) => acc + o.TotalAmount, 0);
    const units = orders.reduce((acc, o) => acc + o.Quantity, 0);
    const customers = new Set(orders.map(o => o.CustomerID)).size;

    if (titleEl) titleEl.innerText = `${cityName} Metro Market`;
    if (subEl) subEl.innerText = `Geographic Intelligence • ${orders.length} Orders`;

    bodyEl.innerHTML = `
      <div class="drawer-stats-grid">
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Net Revenue</div>
          <div class="drawer-stat-val" style="color:#38bdf8;">₹${(rev / 1e6).toFixed(2)}M</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Unique Customers</div>
          <div class="drawer-stat-val">${customers}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Average Order Value</div>
          <div class="drawer-stat-val">₹${Math.round(rev / orders.length).toLocaleString()}</div>
        </div>
        <div class="drawer-stat-tile">
          <div class="drawer-stat-label">Revenue / Customer</div>
          <div class="drawer-stat-val" style="color:#10b981;">₹${Math.round(rev / customers).toLocaleString()}</div>
        </div>
      </div>
      <div style="margin-top:10px;color:#94a3b8;font-size:12px;line-height:1.5;">
        ${cityName} is a critical territory with strong customer lifetime value. Click <b>"Filter by City"</b> to focus the entire dashboard on this market.
      </div>
      <button id="btn-apply-city-filter" style="margin-top:12px;background:var(--accent-cyan);color:#070a12;border:none;padding:8px 14px;border-radius:6px;font-weight:700;cursor:pointer;">Focus Dashboard on ${cityName}</button>
    `;

    document.getElementById('btn-apply-city-filter').addEventListener('click', () => {
      FilterBar.setFilter('city', cityName);
      this.close();
    });

    this.open();
  }
};
