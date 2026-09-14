/**
 * explorer_view.js
 * View 7: Entity Explorer & Drill-Down Directory
 * Omni-Channel Retail Intelligence Platform
 * Pure Deterministic Analytics — Zero Hardcoded Figures
 */

const ExplorerView = {
  allEntities: [],
  filteredEntities: [],

  render(orders) {
    this.buildEntities(orders);
    this.setupListeners();
    this.renderTable();
  },

  buildEntities(orders) {
    const list = [];

    // 1. Channels
    const channelScorecard = AnalyticsEngine.getChannelScorecard(orders);
    channelScorecard.forEach(c => {
      list.push({
        type: 'Channel',
        typeBadge: 'badge-loyal',
        id: c.channel,
        name: c.channel,
        context: `${c.revenueSharePct}% Catalog Share • ${c.discountRate}% Markdown`,
        revenue: c.revenue,
        orders: c.orders,
        units: c.units,
        openFn: () => EntityDrawer.openChannel(c.channel)
      });
    });

    // 2. Cities
    const geoScorecard = AnalyticsEngine.getGeographicScorecard(orders);
    geoScorecard.forEach(c => {
      list.push({
        type: 'City',
        typeBadge: 'badge-champion',
        id: c.city,
        name: c.city,
        context: `${c.classification} • ${c.customers.toLocaleString()} Buyers`,
        revenue: c.revenue,
        orders: c.orders,
        units: c.units,
        openFn: () => EntityDrawer.openCity(c.city)
      });
    });

    // 3. Products (Ranked)
    const bcg = AnalyticsEngine.getProductBCGMatrix(orders);
    bcg.sort((a, b) => b.revenue - a.revenue);
    bcg.forEach(p => {
      list.push({
        type: 'Product',
        typeBadge: 'badge-spenders',
        id: p.productID,
        name: p.productName,
        context: `${p.category} • ₹${p.unitPrice.toLocaleString()}`,
        revenue: p.revenue,
        orders: p.orders,
        units: p.units,
        openFn: () => EntityDrawer.openProduct(p.productID)
      });
    });

    // 4. Customers (Active in filtered slice, Top 50 by spend)
    const custSpend = new Map();
    const custOrders = new Map();
    const custUnits = new Map();
    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      custSpend.set(o.CustomerID, (custSpend.get(o.CustomerID) || 0) + o.TotalAmount);
      custOrders.set(o.CustomerID, (custOrders.get(o.CustomerID) || 0) + 1);
      custUnits.set(o.CustomerID, (custUnits.get(o.CustomerID) || 0) + o.Quantity);
    }

    const sortedCusts = Array.from(custSpend.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
    sortedCusts.forEach(([cid, rev]) => {
      const cObj = DataLoader.customerMap.get(cid);
      const name = cObj ? cObj.Name : `Customer ${cid}`;
      const city = cObj ? cObj.Location : 'Metro';
      list.push({
        type: 'Customer',
        typeBadge: 'badge-risk',
        id: cid,
        name: name,
        context: `${cid} • ${city}`,
        revenue: Math.round(rev),
        orders: custOrders.get(cid) || 0,
        units: custUnits.get(cid) || 0,
        openFn: () => EntityDrawer.openCustomer(cid)
      });
    });

    this.allEntities = list;
    this.filteredEntities = list;
  },

  setupListeners() {
    const input = document.getElementById('explorer-filter-input');
    if (!input || input._hasExplorerListener) return;
    input._hasExplorerListener = true;

    input.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (!q) {
        this.filteredEntities = this.allEntities;
      } else {
        this.filteredEntities = this.allEntities.filter(item => 
          item.name.toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          item.context.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        );
      }
      this.renderTable();
    });
  },

  renderTable() {
    const tbody = document.getElementById('explorer-table-tbody');
    if (!tbody) return;

    if (this.filteredEntities.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-muted);">No entities matched your search query.</td></tr>`;
      return;
    }

    const displayLimit = 60;
    const slice = this.filteredEntities.slice(0, displayLimit);

    let html = '';
    slice.forEach((item, idx) => {
      const globalIdx = this.allEntities.indexOf(item);
      html += `
        <tr>
          <td><span class="badge ${item.typeBadge}">${item.type}</span></td>
          <td>
            <span class="entity-link" style="font-weight:600;" onclick="ExplorerView.inspect(${globalIdx})">${item.name}</span>
          </td>
          <td style="color:var(--text-muted);font-size:0.82rem;">${item.context}</td>
          <td><b style="color:var(--accent-emerald);">₹${(item.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${item.orders.toLocaleString()}</td>
          <td>${item.units.toLocaleString()}</td>
          <td>
            <button class="filter-reset-btn" style="padding:4px 10px;font-size:0.75rem;" onclick="ExplorerView.inspect(${globalIdx})">Inspect ➔</button>
          </td>
        </tr>
      `;
    });

    if (this.filteredEntities.length > displayLimit) {
      html += `<tr><td colspan="7" style="text-align:center;padding:12px;color:var(--text-muted);font-size:0.8rem;">Showing top ${displayLimit} of ${this.filteredEntities.length} matching entities. Narrow query above.</td></tr>`;
    }

    tbody.innerHTML = html;
  },

  inspect(idx) {
    const item = this.allEntities[idx];
    if (item && typeof item.openFn === 'function') {
      item.openFn();
    }
  }
};
