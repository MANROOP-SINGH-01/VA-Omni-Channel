/**
 * sales_view.js
 * View 2: Sales Depth, Growth Analytics & Time Seasonality
 * Omni-Channel Retail Intelligence Platform
 */

const SalesView = {
  render(orders) {
    const monthlyTrends = AnalyticsEngine.getTrends(orders, 'monthly');
    const payments = AnalyticsEngine.getPaymentIntelligence(orders);

    // 1. Render Growth Momentum Chart (MoM Revenue Growth %)
    this.renderGrowthChart(monthlyTrends);

    // 2. Render Day-of-Week x Month Heatmap
    const seasonality = AnalyticsEngine.getSeasonalityHeatmap(orders);
    ChartManager.renderSeasonalityHeatmap('chart-seasonality-heatmap', seasonality);

    // 3. Render Payment Method Breakdown
    ChartManager.renderBarChart(
      'chart-payment-bar',
      payments.map(p => p.method),
      payments.map(p => p.revenue),
      true
    );

    // 4. Render Day-of-Week Revenue Distribution
    const dayMap = new Map();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayNames.forEach(d => dayMap.set(d, 0));
    orders.forEach(o => dayMap.set(o.DayOfWeekName, (dayMap.get(o.DayOfWeekName) || 0) + o.TotalAmount));

    ChartManager.renderBarChart(
      'chart-day-of-week-bar',
      dayNames,
      dayNames.map(d => Math.round(dayMap.get(d) || 0)),
      false
    );

    // 5. Render Growth Scorecard Table
    this.renderGrowthTable(monthlyTrends);
  },

  renderGrowthChart(trends) {
    const chart = ChartManager.getChart('chart-mom-growth');
    if (!chart) return;

    const xData = trends.map(t => t.period);
    const growthData = trends.map(t => t.momGrowth);

    const option = {
      ...ChartManager.getBaseOption(),
      tooltip: ChartManager.getTooltip({
        trigger: 'axis',
        formatter: params => {
          const p = params[0];
          const color = p.value >= 0 ? '#10b981' : '#f43f5e';
          return `<div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">${p.name}</div>
                  <div style="font-size:12px;color:#94a3b8;">MoM Revenue Growth: <b style="color:${color};">${p.value}%</b></div>`;
        }
      }),
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 }
      },
      yAxis: {
        type: 'value',
        name: 'MoM Growth %',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', formatter: '{value}%' },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: 'MoM Growth',
          type: 'bar',
          data: growthData.map(v => ({
            value: v,
            itemStyle: {
              color: v >= 0 ? '#10b981' : '#f43f5e',
              borderRadius: v >= 0 ? [3, 3, 0, 0] : [0, 0, 3, 3]
            }
          }))
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  renderGrowthTable(trends) {
    const tbody = document.getElementById('sales-growth-tbody');
    if (!tbody) return;

    let html = '';
    trends.slice(-8).reverse().forEach(t => {
      const growthColor = t.momGrowth >= 0 ? '#10b981' : '#f43f5e';
      const growthSign = t.momGrowth >= 0 ? '+' : '';
      html += `
        <tr>
          <td><b>${t.period}</b></td>
          <td>₹${(t.revenue / 1e6).toFixed(2)}M</td>
          <td>${t.orders.toLocaleString()}</td>
          <td>${t.customers.toLocaleString()}</td>
          <td>₹${t.aov.toLocaleString()}</td>
          <td><span style="font-weight:700;color:${growthColor};">${growthSign}${t.momGrowth}%</span></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
