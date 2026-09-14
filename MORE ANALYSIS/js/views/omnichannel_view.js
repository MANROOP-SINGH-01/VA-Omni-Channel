/**
 * omnichannel_view.js
 * View 5: True Omnichannel Dynamics, Customer Channel Adoption & Journey Crossover
 * Omni-Channel Retail Intelligence Platform
 */

const OmnichannelView = {
  render(orders) {
    const adoption = AnalyticsEngine.getOmnichannelAdoption(orders);
    const crossover = AnalyticsEngine.getChannelCrossover(orders);
    const channels = AnalyticsEngine.getChannelScorecard(orders);

    // 1. The Omnichannel Multiplier (Bar Chart: Channels Adopted vs Avg Spend)
    this.renderMultiplierChart(adoption);

    // 2. Channel Crossover Bar / Journey Flow
    this.renderCrossoverChart(crossover);

    // 3. Channel Depth Scorecard Table
    this.renderChannelTable(channels);

    // 4. Multichannel Adoption Ladder Table
    this.renderAdoptionTable(adoption);
  },

  renderMultiplierChart(adoption) {
    const chart = ChartManager.getChart('chart-omnichannel-multiplier');
    if (!chart) return;

    const xData = adoption.map(a => a.label);
    const spendData = adoption.map(a => a.avgSpend);
    const ordersData = adoption.map(a => a.avgOrders);

    const option = {
      ...ChartManager.getBaseOption(),
      tooltip: ChartManager.getTooltip({
        trigger: 'axis',
        formatter: params => {
          const item = adoption[params[0].dataIndex];
          return `<div style="font-weight:700;color:#38bdf8;">${item.label}</div>
                  <div style="font-size:12px;color:#cbd5e1;margin-top:2px;">Average Lifetime Spend: <b>₹${item.avgSpend.toLocaleString()}</b></div>
                  <div style="font-size:12px;color:#cbd5e1;">Average Orders: <b>${item.avgOrders} orders</b></div>
                  <div style="font-size:12px;color:#cbd5e1;">Customers in Tier: <b>${item.customers.toLocaleString()}</b> (${item.revenueSharePct}% of total rev)</div>
                  <div style="color:#10b981;font-size:11px;margin-top:4px;">Multiplier vs 1 Channel: <b>${(item.avgSpend / Math.max(1, adoption[0].avgSpend)).toFixed(2)}x</b></div>`;
        }
      }),
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Avg Spend / Cust (₹)',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1000).toFixed(0)}K` },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        {
          type: 'value',
          name: 'Avg Orders',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Average Spend',
          type: 'bar',
          data: spendData,
          barWidth: '45%',
          itemStyle: {
            borderRadius: [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#10b981' }
            ])
          }
        },
        {
          name: 'Average Orders',
          type: 'line',
          yAxisIndex: 1,
          data: ordersData,
          lineStyle: { width: 3, color: '#f59e0b' },
          symbol: 'circle',
          symbolSize: 6
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  renderCrossoverChart(crossover) {
    const chart = ChartManager.getChart('chart-channel-crossover');
    if (!chart) return;

    const topFlows = crossover.slice(0, 8);

    const option = {
      ...ChartManager.getBaseOption(),
      tooltip: ChartManager.getTooltip({
        trigger: 'item',
        formatter: params => {
          const d = topFlows[params.dataIndex];
          return `<div style="font-weight:700;color:#38bdf8;">${d.flow}</div>
                  <div style="font-size:12px;color:#cbd5e1;margin-top:2px;">Customers Migrating: <b style="color:#f8fafc;">${d.count.toLocaleString()}</b></div>`;
        }
      }),
      grid: { top: 15, right: 30, bottom: 25, left: 25, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      yAxis: {
        type: 'category',
        data: topFlows.map(f => f.flow).reverse(),
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      series: [
        {
          type: 'bar',
          data: topFlows.map(f => f.count).reverse(),
          barWidth: '55%',
          itemStyle: {
            borderRadius: [0, 4, 4, 0],
            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
              { offset: 0, color: '#6366f1' },
              { offset: 1, color: '#a855f7' }
            ])
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  renderChannelTable(channels) {
    const tbody = document.getElementById('channel-scorecard-tbody');
    if (!tbody) return;

    let html = '';
    channels.forEach(c => {
      html += `
        <tr>
          <td><b>${c.channel}</b></td>
          <td><b>₹${(c.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${Number(c.revenueSharePct).toFixed(1)}%</td>
          <td>${c.orders.toLocaleString()}</td>
          <td>${c.customers.toLocaleString()}</td>
          <td>₹${c.aov.toLocaleString()}</td>
          <td>${Number(c.discountRate).toFixed(1)}%</td>
          <td>₹${c.revPerCustomer.toLocaleString()}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },

  renderAdoptionTable(adoption) {
    const tbody = document.getElementById('omnichannel-adoption-tbody');
    if (!tbody) return;

    let html = '';
    adoption.forEach(a => {
      html += `
        <tr>
          <td><span style="font-weight:700;color:#38bdf8;">${a.label}</span></td>
          <td>${a.customers.toLocaleString()}</td>
          <td><b>₹${(a.totalSpend / 1e6).toFixed(2)}M</b></td>
          <td>${Number(a.revenueSharePct).toFixed(1)}%</td>
          <td><b style="color:#10b981;">₹${a.avgSpend.toLocaleString()}</b></td>
          <td>${a.avgOrders}</td>
          <td>₹${a.aov.toLocaleString()}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
