/**
 * sql_view.js
 * View 9: PostgreSQL 18 Warehouse & Analytical View Console
 * Omni-Channel Retail Intelligence Platform
 * Pure Deterministic Analytics — Zero Hardcoded Figures
 */

const SQLView = {
  activePreset: 'kpis',

  PRESETS: {
    kpis: {
      name: 'vw_executive_kpis',
      sql: 'SELECT * FROM vw_executive_kpis;',
      endpoint: '/api/kpis',
      fallbackFn: (orders) => {
        const k = AnalyticsEngine.getExecutiveKPIs(orders);
        return [{
          metric_scope: 'Entire Transaction Log',
          net_realized_revenue: k.netRevenue,
          gross_catalog_sales: k.grossRevenue,
          total_promotional_discount: k.totalDiscount,
          realization_rate_pct: parseFloat(k.realizationRate.toFixed(2)),
          discount_impact_rate_pct: parseFloat(k.discountImpactRate.toFixed(2)),
          total_order_volume: k.totalOrders,
          physical_units_moved: k.totalUnits,
          distinct_transacting_customers: k.uniqueCustomers,
          active_metro_markets: k.distinctCities,
          average_order_value: Math.round(k.aov),
          average_revenue_per_customer: Math.round(k.revPerCustomer)
        }];
      }
    },
    channels: {
      name: 'vw_channel_scorecard',
      sql: 'SELECT * FROM vw_channel_scorecard ORDER BY net_revenue DESC;',
      endpoint: '/api/channels',
      fallbackFn: (orders) => {
        return AnalyticsEngine.getChannelScorecard(orders).map(c => ({
          sales_channel: c.channel,
          net_revenue: c.revenue,
          revenue_share_pct: c.revenueSharePct,
          total_orders: c.orders,
          units_sold: c.units,
          active_customers: c.customers,
          average_order_value: c.aov,
          discount_erosion_pct: c.discountRate,
          revenue_per_customer: c.revPerCustomer
        }));
      }
    },
    rfm: {
      name: 'vw_rfm_segment_summary',
      sql: 'SELECT * FROM vw_rfm_segment_summary ORDER BY segment_revenue DESC;',
      endpoint: '/api/rfm',
      fallbackFn: (orders) => {
        return AnalyticsEngine.getRFMSummary(orders).map(s => ({
          rfm_segment: s.segment,
          customer_count: s.customers,
          customer_share_pct: s.customerSharePct,
          segment_revenue: s.revenue,
          revenue_share_pct: s.revenueSharePct,
          avg_monetary_spend: s.avgSpend,
          avg_order_frequency: s.avgOrders,
          avg_basket_value: s.avgAov
        }));
      }
    },
    cities: {
      name: 'vw_city_market_rankings',
      sql: 'SELECT * FROM vw_city_market_rankings ORDER BY net_revenue DESC;',
      endpoint: '/api/cities',
      fallbackFn: (orders) => {
        return AnalyticsEngine.getGeographicScorecard(orders).map(c => ({
          metro_city: c.city,
          net_revenue: c.revenue,
          revenue_share_pct: c.revenueSharePct,
          order_volume: c.orders,
          units_moved: c.units,
          unique_buyers: c.customers,
          average_order_value: c.aov,
          revenue_per_buyer: c.revPerCustomer,
          discount_rate_pct: c.discountRate,
          strategic_tier: c.classification
        }));
      }
    },
    trends: {
      name: 'vw_monthly_trends',
      sql: 'SELECT * FROM vw_monthly_trends ORDER BY year_month ASC;',
      endpoint: '/api/trends',
      fallbackFn: (orders) => {
        return AnalyticsEngine.getTrends(orders, 'monthly').map(t => ({
          year_month: t.period,
          net_revenue: t.revenue,
          order_volume: t.orders,
          units_moved: t.units,
          unique_buyers: t.customers,
          average_order_value: t.aov,
          mom_revenue_growth_pct: t.momGrowth
        }));
      }
    }
  },

  render(orders) {
    this.setupPresetListeners(orders);
    this.executeQuery(this.activePreset, orders);
  },

  setupPresetListeners(orders) {
    const btns = document.querySelectorAll('.sql-preset-btn');
    btns.forEach(btn => {
      if (btn._hasSqlListener) return;
      btn._hasSqlListener = true;

      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const key = btn.dataset.query;
        this.activePreset = key;
        this.executeQuery(key, DataLoader.filteredOrders || orders);
      });
    });

    const runBtn = document.getElementById('btn-run-sql-query');
    if (runBtn && !runBtn._hasSqlRunListener) {
      runBtn._hasSqlRunListener = true;
      runBtn.addEventListener('click', () => {
        this.executeQuery(this.activePreset, DataLoader.filteredOrders || orders);
      });
    }
  },

  async executeQuery(presetKey, orders) {
    const preset = this.PRESETS[presetKey] || this.PRESETS.kpis;
    const queryDisplay = document.getElementById('sql-query-display');
    const metaDisplay = document.getElementById('sql-result-meta');
    const thead = document.getElementById('sql-results-thead');
    const tbody = document.getElementById('sql-results-tbody');

    if (queryDisplay) queryDisplay.textContent = preset.sql;
    if (metaDisplay) metaDisplay.textContent = 'Executing query against database...';

    const startTime = performance.now();
    let records = null;
    let engineSource = 'PostgreSQL 18.6 Live';

    // Try live API first
    try {
      const resp = await fetch(preset.endpoint);
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json)) {
          records = json;
        } else if (json && json.data && Array.isArray(json.data)) {
          records = json.data;
        } else if (json && typeof json === 'object' && !json.error) {
          records = [json];
        }
      }
    } catch (err) {
      console.warn('PostgreSQL API unavailable, failing over to deterministic in-memory engine:', err);
    }

    // Fallback to in-memory deterministic calculation if PostgreSQL server is offline
    if (!records) {
      records = preset.fallbackFn(orders);
      engineSource = 'In-Memory Engine (Failover)';
    }

    const elapsed = (performance.now() - startTime).toFixed(1);

    if (metaDisplay) {
      metaDisplay.innerHTML = `<span style="color:var(--accent-emerald);">●</span> Fetched <b>${records.length}</b> record${records.length === 1 ? '' : 's'} via <b>${engineSource}</b> in <b>${elapsed}ms</b>`;
    }

    this.renderResultsTable(records, thead, tbody);
  },

  renderResultsTable(records, thead, tbody) {
    if (!thead || !tbody) return;

    if (!records || records.length === 0) {
      thead.innerHTML = '';
      tbody.innerHTML = '<tr><td style="text-align:center;padding:24px;color:var(--text-muted);">No records returned.</td></tr>';
      return;
    }

    const keys = Object.keys(records[0]);

    // Build Header
    let theadHtml = '<tr>';
    keys.forEach(k => {
      const formattedKey = k.replace(/_/g, ' ').toUpperCase();
      theadHtml += `<th>${formattedKey}</th>`;
    });
    theadHtml += '</tr>';
    thead.innerHTML = theadHtml;

    // Build Rows
    let tbodyHtml = '';
    records.forEach(row => {
      tbodyHtml += '<tr>';
      keys.forEach(k => {
        let val = row[k];
        let formattedVal = val;
        if (typeof val === 'number') {
          if (k.includes('revenue') || k.includes('sales') || k.includes('spend') || k.includes('discount') || k.includes('value') || k.includes('aov')) {
            if (val > 1e6) formattedVal = `₹${(val / 1e6).toFixed(2)}M`;
            else formattedVal = `₹${val.toLocaleString()}`;
          } else if (k.includes('pct') || k.includes('rate') || k.includes('growth')) {
            formattedVal = `${val}%`;
          } else {
            formattedVal = val.toLocaleString();
          }
        }
        tbodyHtml += `<td>${formattedVal}</td>`;
      });
      tbodyHtml += '</tr>';
    });
    tbody.innerHTML = tbodyHtml;
  }
};
