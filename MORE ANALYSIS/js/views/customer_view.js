/**
 * customer_view.js
 * View 3: Customer Intelligence, RFM Segmentation & Cohort Retention
 * Omni-Channel Retail Intelligence Platform
 */

const CustomerView = {
  render(orders) {
    const rfm = AnalyticsEngine.computeFullRFM();
    const rfmSummary = AnalyticsEngine.getRFMSummary(orders);
    const cohorts = AnalyticsEngine.getCohortRetentionMatrix(orders);
    const funnel = AnalyticsEngine.getCustomerFunnel(orders);

    // 1. Customer Value Matrix (Scatter: Frequency vs Monetary)
    ChartManager.renderCustomerScatter('chart-customer-scatter', rfm.list, (cid) => {
      EntityDrawer.openCustomer(cid);
    });

    // 2. RFM Segment Donut Chart
    const donutData = rfmSummary.map(s => ({ name: s.segment, value: s.revenue }));
    ChartManager.renderDonutChart('chart-rfm-donut', donutData, 'Segment Revenue');

    // 3. Customer Retention Funnel
    this.renderFunnelChart(funnel);

    // 4. Cohort Retention Matrix Table
    this.renderCohortTable(cohorts);

    // 5. RFM Segment Breakdown Table
    this.renderRFMTable(rfmSummary);
  },

  renderFunnelChart(funnel) {
    const chart = ChartManager.getChart('chart-customer-funnel');
    if (!chart) return;

    const option = {
      ...ChartManager.getBaseOption(),
      tooltip: ChartManager.getTooltip({
        trigger: 'item',
        formatter: params => {
          const d = funnel[params.dataIndex];
          return `<div style="font-weight:700;color:#38bdf8;">${d.step}</div>
                  <div style="font-size:12px;color:#94a3b8;">Customers: <b style="color:#f8fafc;">${d.count.toLocaleString()}</b> (${d.pct}% of cohort)</div>`;
        }
      }),
      grid: { top: 15, right: 35, bottom: 25, left: 100 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      yAxis: {
        type: 'category',
        data: funnel.map(f => f.step).reverse(),
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [
        {
          type: 'bar',
          data: funnel.map(f => f.count).reverse(),
          barWidth: '50%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#10b981' }
            ])
          },
          label: {
            show: true,
            position: 'right',
            formatter: params => `${funnel.slice().reverse()[params.dataIndex].pct}%`,
            color: '#94a3b8',
            fontSize: 11
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  renderCohortTable(cohorts) {
    const container = document.getElementById('cohort-matrix-tbody');
    if (!container) return;

    let html = '';
    cohorts.forEach(c => {
      let cells = '';
      c.retention.forEach((pct, idx) => {
        if (pct === null) {
          cells += '<td style="color:#475569;text-align:center;">—</td>';
        } else {
          // Color intensity from 0% (dark) to 100% (bright cyan)
          const alpha = idx === 0 ? 0.35 : Math.min(0.8, Math.max(0.15, (pct / 50) * 0.7));
          cells += `
            <td style="background:rgba(56, 189, 248, ${alpha});color:#f8fafc;font-weight:600;text-align:center;">
              ${pct}%
            </td>
          `;
        }
      });

      html += `
        <tr>
          <td><b>${c.cohort}</b></td>
          <td style="color:#94a3b8;">${c.initialSize}</td>
          ${cells}
        </tr>
      `;
    });

    container.innerHTML = html;
  },

  renderRFMTable(rfmSummary) {
    const tbody = document.getElementById('rfm-summary-tbody');
    if (!tbody) return;

    let html = '';
    rfmSummary.forEach(s => {
      html += `
        <tr>
          <td><span class="badge ${s.segment === 'Champions' ? 'badge-champion' : s.segment === 'Loyal Customers' ? 'badge-loyal' : s.segment === 'Big Spenders' ? 'badge-spenders' : 'badge-risk'}">${s.segment}</span></td>
          <td>${s.customers.toLocaleString()}</td>
          <td><b>₹${(s.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${s.revenueSharePct}%</td>
          <td>₹${s.avgSpend.toLocaleString()}</td>
          <td>₹${s.avgAov.toLocaleString()}</td>
          <td>${s.avgOrders}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
