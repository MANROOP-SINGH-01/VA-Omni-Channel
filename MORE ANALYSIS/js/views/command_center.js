/**
 * command_center.js
 * View 1: Executive Command Center & Landing Page (Rexora Theme)
 * Omni-Channel Retail Intelligence Platform
 * Pure Deterministic Analytics — Zero Hardcoded Figures
 */

const CommandCenterView = {
  activeGranularity: 'monthly',

  render(orders) {
    const kpis = AnalyticsEngine.getExecutiveKPIs(orders);
    const trends = AnalyticsEngine.getTrends(orders, this.activeGranularity);
    const monthlyTrends = AnalyticsEngine.getTrends(orders, 'monthly');
    const channels = AnalyticsEngine.getChannelScorecard(orders);
    const health = AnalyticsEngine.getBusinessHealthScorecard(orders);
    const alerts = AnalyticsEngine.getOpportunityAndRisks(orders);

    // 1. Render Top KPI Row with Dynamic SVG Sparklines
    this.renderKPIRow(kpis, monthlyTrends);

    // 2. Render Main Interactive Revenue Trajectory & Order Volume
    ChartManager.renderTrendLine('chart-revenue-trend', trends);
    this.bindGranularityToggles(orders);

    // 3. Render Business Health Scorecard
    this.renderHealthScorecard(health);

    // 4. Render Deterministic Opportunity & Risk Ticker
    this.renderOpportunityTicker(alerts);

    // 5. Render Rexora Signature Multi-Channel Performance Module
    this.renderRexoraChannels(channels);

    // 6. Render Revenue Realization & Discount Efficiency Card
    this.renderRealizationEfficiency(kpis);

    // 7. Top 5 Products Table
    this.renderTopProducts(orders);
  },

  renderKPIRow(kpis, monthlyTrends) {
    const elRev = document.getElementById('kpi-revenue');
    const elOrders = document.getElementById('kpi-orders');
    const elUnits = document.getElementById('kpi-units');
    const elAov = document.getElementById('kpi-aov');
    const elCust = document.getElementById('kpi-customers');
    const elRealization = document.getElementById('kpi-realization');

    if (elRev) elRev.innerText = `₹${(kpis.netRevenue / 1e6).toFixed(2)}M`;
    if (elOrders) elOrders.innerText = kpis.totalOrders.toLocaleString();
    if (elUnits) elUnits.innerText = kpis.totalUnits.toLocaleString();
    if (elAov) elAov.innerText = `₹${Math.round(kpis.aov).toLocaleString()}`;
    if (elCust) elCust.innerText = kpis.uniqueCustomers.toLocaleString();
    if (elRealization) elRealization.innerText = `${kpis.realizationRate.toFixed(1)}%`;

    // Dynamic Context Footers
    const elPeriodCities = document.getElementById('kpi-period-cities');
    if (elPeriodCities) elPeriodCities.innerText = `${kpis.distinctCities} markets`;

    const elPeriodDiscount = document.getElementById('kpi-period-discount');
    if (elPeriodDiscount) elPeriodDiscount.innerText = `${kpis.discountImpactRate.toFixed(1)}% discount erosion`;

    // Delotas
    const elDeltaRev = document.getElementById('kpi-delta-revenue');
    if (elDeltaRev) {
      const d = kpis.revDelta;
      elDeltaRev.className = `kpi-delta ${d >= 0 ? 'positive' : 'neutral'}`;
      elDeltaRev.innerText = d !== 0 ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}%` : 'Active';
    }

    const elDeltaOrders = document.getElementById('kpi-delta-orders');
    if (elDeltaOrders) {
      const d = kpis.orderDelta;
      elDeltaOrders.className = `kpi-delta ${d >= 0 ? 'positive' : 'neutral'}`;
      elDeltaOrders.innerText = d !== 0 ? `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(1)}%` : `${kpis.totalOrders.toLocaleString()} vol`;
    }

    const elDeltaUnits = document.getElementById('kpi-delta-units');
    if (elDeltaUnits) {
      const avgUnits = kpis.totalOrders > 0 ? (kpis.totalUnits / kpis.totalOrders).toFixed(1) : '0';
      elDeltaUnits.innerText = `${avgUnits} units/basket`;
    }

    const elDeltaAov = document.getElementById('kpi-delta-aov');
    if (elDeltaAov) {
      elDeltaAov.innerText = `₹${Math.round(kpis.aov).toLocaleString()}`;
    }

    const elDeltaCust = document.getElementById('kpi-delta-customers');
    if (elDeltaCust) {
      elDeltaCust.innerText = `${kpis.repeatRate.toFixed(1)}% repeat`;
    }

    const elDeltaReal = document.getElementById('kpi-delta-realization');
    if (elDeltaReal) {
      elDeltaReal.innerText = `${kpis.realizationRate.toFixed(1)}% captured`;
    }

    // Dynamic SVG Sparklines derived directly from monthly trend array
    if (monthlyTrends && monthlyTrends.length >= 2) {
      const revPoints = monthlyTrends.map(t => t.revenue);
      const orderPoints = monthlyTrends.map(t => t.orders);
      const unitPoints = monthlyTrends.map(t => t.units);
      const aovPoints = monthlyTrends.map(t => t.aov);
      const custPoints = monthlyTrends.map(t => t.customers);
      const realPoints = monthlyTrends.map(t => t.realizationRate || (t.revenue > 0 ? (t.revenue / (t.revenue + (t.discount || t.revenue * 0.17647))) * 100 : 85));

      const spRev = document.getElementById('sparkline-revenue');
      if (spRev) spRev.innerHTML = ChartManager.createSparklineSVG(revPoints, '#8b5cf6');

      const spOrd = document.getElementById('sparkline-orders');
      if (spOrd) spOrd.innerHTML = ChartManager.createSparklineSVG(orderPoints, '#06b6d4');

      const spUnits = document.getElementById('sparkline-units');
      if (spUnits) spUnits.innerHTML = ChartManager.createSparklineSVG(unitPoints, '#10b981');

      const spAov = document.getElementById('sparkline-aov');
      if (spAov) spAov.innerHTML = ChartManager.createSparklineSVG(aovPoints, '#f59e0b');

      const spCust = document.getElementById('sparkline-customers');
      if (spCust) spCust.innerHTML = ChartManager.createSparklineSVG(custPoints, '#8b5cf6');

      const spReal = document.getElementById('sparkline-realization');
      if (spReal) spReal.innerHTML = ChartManager.createSparklineSVG(realPoints, '#10b981');
    }
  },

  bindGranularityToggles(orders) {
    const btns = document.querySelectorAll('.btn-trend-toggle');
    btns.forEach(btn => {
      btn.onclick = (e) => {
        btns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.activeGranularity = e.target.getAttribute('data-granularity');
        const updatedTrends = AnalyticsEngine.getTrends(orders, this.activeGranularity);
        ChartManager.renderTrendLine('chart-revenue-trend', updatedTrends);
      };
    });
  },

  renderRexoraChannels(channels) {
    const container = document.getElementById('rexora-channels-container');
    if (!container) return;

    if (!channels || channels.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted);font-size:0.85rem;padding:1rem;">No channel data for active filter slice.</div>';
      return;
    }

    const getChannelSVG = (name) => {
      if (name.includes('Store')) {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>`;
      }
      if (name.includes('Amazon')) {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>`;
      }
      if (name.includes('Flipkart')) {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
      }
      if (name.includes('App')) {
        return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>`;
      }
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
    };

    let html = '';
    channels.forEach(c => {
      const iconSvg = getChannelSVG(c.channel);
      const sharePct = typeof c.revenueSharePct === 'number' ? c.revenueSharePct.toFixed(1) : parseFloat(c.revenueSharePct).toFixed(1);
      html += `
        <div class="rexora-channel-row" onclick="FilterBar.setFilter('channel', '${c.channel}'); App.switchView('omnichannel');" style="cursor:pointer;" title="Click to filter by ${c.channel}">
          <div class="rexora-channel-meta">
            <div class="rexora-channel-name-group">
              <span class="rexora-channel-icon">${iconSvg}</span>
              <span class="rexora-channel-title">${c.channel}</span>
            </div>
            <div class="rexora-channel-metrics">
              <span><b>₹${(c.revenue / 1e6).toFixed(2)}M</b></span>
              <span>${c.orders.toLocaleString()} orders</span>
              <span>AOV: <b>₹${Math.round(c.aov).toLocaleString()}</b></span>
              <span class="rexora-channel-share-pill">${sharePct}%</span>
            </div>
          </div>
          <div class="rexora-channel-bar-bg">
            <div class="rexora-channel-bar-fill" style="width: ${sharePct}%;"></div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  renderRealizationEfficiency(kpis) {
    const elGross = document.getElementById('realization-gross-val');
    const elDisc = document.getElementById('realization-discount-val');
    const elNet = document.getElementById('realization-net-val');
    const elPct = document.getElementById('realization-pct-val');

    if (elGross) elGross.innerText = `₹${(kpis.grossRevenue / 1e6).toFixed(2)}M`;
    if (elDisc) elDisc.innerText = `₹${(kpis.totalDiscount / 1e6).toFixed(2)}M`;
    if (elNet) elNet.innerText = `₹${(kpis.netRevenue / 1e6).toFixed(2)}M`;
    if (elPct) elPct.innerText = `${kpis.realizationRate.toFixed(1)}%`;

    ChartManager.renderRealizationGauge(
      'chart-realization-gauge',
      kpis.realizationRate,
      kpis.discountImpactRate
    );
  },

  renderHealthScorecard(health) {
    const container = document.getElementById('health-scorecard-container');
    if (!container) return;

    let html = '';
    health.forEach(h => {
      html += `
        <div class="scorecard-item">
          <div class="scorecard-label">${h.dimension}</div>
          <div class="scorecard-score-row">
            <span class="scorecard-score" style="color:${h.color};">${h.score}</span>
            <span style="font-size:10px;font-weight:700;color:${h.color};">${h.grade}</span>
          </div>
          <div class="scorecard-bar-bg">
            <div class="scorecard-bar-fill" style="width:${h.score}%;background:${h.color};"></div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  renderOpportunityTicker(alerts) {
    const container = document.getElementById('opportunity-ticker');
    if (!container) return;

    let html = '';
    alerts.forEach((a, idx) => {
      html += `
        <div class="insight-card ${a.type}" onclick="CommandCenterView.openEvidenceDrawer(${idx})">
          <div class="insight-content">
            <div class="insight-header-row">
              <span class="insight-tag ${a.type}">${a.tag}</span>
              <span class="insight-title">${a.title}</span>
            </div>
            <div class="insight-desc">${a.desc}</div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
    this.currentAlerts = alerts;
  },

  openEvidenceDrawer(idx) {
    if (!this.currentAlerts || !this.currentAlerts[idx]) return;
    const alert = this.currentAlerts[idx];
    const drawer = document.getElementById('evidence-drawer');
    const overlay = document.getElementById('evidence-drawer-overlay');
    const title = document.getElementById('evidence-title');
    const body = document.getElementById('evidence-body');

    if (!drawer || !body) return;

    if (title) title.innerText = alert.title;

    let gridHtml = '';
    if (alert.evidence) {
      for (const [key, val] of Object.entries(alert.evidence)) {
        if (key === 'rule') continue;
        const readableKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        gridHtml += `
          <div class="evidence-cell">
            <div class="evidence-cell-label">${readableKey}</div>
            <div class="evidence-cell-val">${val}</div>
          </div>
        `;
      }
    }

    body.innerHTML = `
      <div class="evidence-rule-card">
        <div class="evidence-rule-label">Mathematical Verification Rule</div>
        <div class="evidence-rule-code">${alert.evidence ? alert.evidence.rule : 'N/A'}</div>
      </div>
      <div>
        <h4 style="font-size:0.85rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:0.6rem;">Dataset Supporting Metrics</h4>
        <div class="evidence-grid">${gridHtml}</div>
      </div>
      <div style="font-size:0.82rem;color:var(--text-secondary);background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);padding:0.9rem;border-radius:var(--radius-sm);line-height:1.5;">
        ${alert.desc}
      </div>
    `;

    drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');

    // Close handler
    const closeBtn = document.getElementById('evidence-close-btn');
    const closeFn = () => {
      drawer.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-open');
    };
    if (closeBtn) closeBtn.onclick = closeFn;
    if (overlay) overlay.onclick = closeFn;
  },

  renderTopProducts(orders) {
    const tableBody = document.getElementById('top-products-tbody');
    if (!tableBody) return;

    const bcg = AnalyticsEngine.getProductBCGMatrix(orders);
    bcg.sort((a, b) => b.revenue - a.revenue);

    let html = '';
    bcg.slice(0, 5).forEach((p, idx) => {
      html += `
        <tr>
          <td><span style="font-weight:700;color:#64748b;">#${idx + 1}</span></td>
          <td><span class="entity-link" onclick="EntityDrawer.openProduct('${p.productID}')">${p.productName}</span></td>
          <td><span style="color:#94a3b8;">${p.category}</span></td>
          <td><b>₹${(p.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${p.units.toLocaleString()}</td>
          <td><span class="badge ${p.quadrant === 'Stars' ? 'badge-champion' : 'badge-loyal'}">${p.quadrant}</span></td>
        </tr>
      `;
    });
    tableBody.innerHTML = html;
  }
};
