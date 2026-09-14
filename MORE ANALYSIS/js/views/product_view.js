/**
 * product_view.js
 * View 4: Product Portfolio, BCG Quadrants, Pareto & Price Elasticity
 * Omni-Channel Retail Intelligence Platform
 */

const ProductView = {
  render(orders) {
    const bcg = AnalyticsEngine.getProductBCGMatrix(orders);
    const pareto = AnalyticsEngine.getParetoProducts(orders);
    const priceBands = AnalyticsEngine.getPriceDemandBands(orders);
    const discountBrackets = AnalyticsEngine.getDiscountBrackets(orders);

    // 1. BCG Quadrant Scatter Plot
    ChartManager.renderBCGScatter('chart-bcg-scatter', bcg, (pid) => {
      EntityDrawer.openProduct(pid);
    });

    // 2. Pareto 80/20 Curve
    ChartManager.renderParetoChart('chart-pareto-curve', pareto);

    // 3. Price Band Demand Bar Chart
    ChartManager.renderBarChart(
      'chart-price-bands-bar',
      priceBands.map(b => b.band),
      priceBands.map(b => b.revenue),
      false
    );

    // 4. Discount Elasticity Area Chart
    this.renderDiscountElasticity(discountBrackets);

    // 5. Product Catalog Ranking Table
    this.renderProductTable(bcg);
  },

  renderDiscountElasticity(brackets) {
    const chart = ChartManager.getChart('chart-discount-elasticity');
    if (!chart) return;

    const xData = brackets.map(b => b.bracket);
    const revData = brackets.map(b => b.revenue);
    const discData = brackets.map(b => b.discount);

    const option = {
      ...ChartManager.getBaseOption(),
      tooltip: ChartManager.getTooltip({
        trigger: 'axis',
        formatter: params => {
          let s = `<div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">Discount Tier: ${params[0].name}</div>`;
          params.forEach(p => {
            s += `<div style="font-size:12px;color:#94a3b8;">${p.seriesName}: <b style="color:#f8fafc;">₹${(p.value / 1e6).toFixed(2)}M</b></div>`;
          });
          return s;
        }
      }),
      legend: {
        data: ['Net Revenue', 'Discount Sacrificed'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 6,
        left: 'center',
        itemGap: 24
      },
      grid: {
        top: 42,
        right: 25,
        bottom: 25,
        left: 25,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1e6).toFixed(0)}M` },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: 'Net Revenue',
          type: 'line',
          data: revData,
          smooth: true,
          lineStyle: { width: 3, color: '#38bdf8' },
          areaStyle: { color: 'rgba(56, 189, 248, 0.2)' }
        },
        {
          name: 'Discount Sacrificed',
          type: 'line',
          data: discData,
          smooth: true,
          lineStyle: { width: 2, color: '#f43f5e', type: 'dashed' },
          areaStyle: { color: 'rgba(244, 63, 94, 0.1)' }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  renderProductTable(products) {
    const tbody = document.getElementById('product-catalog-tbody');
    if (!tbody) return;

    let html = '';
    // Sort by revenue descending so ranks #1 to #10 represent true catalog revenue leaders
    const sortedProducts = [...products].sort((a, b) => b.revenue - a.revenue);

    sortedProducts.slice(0, 10).forEach((p, idx) => {
      html += `
        <tr>
          <td><span style="font-weight:700;color:#64748b;">#${idx + 1}</span></td>
          <td><span class="entity-link" onclick="EntityDrawer.openProduct('${p.productID}')">${p.productName}</span></td>
          <td>${p.category}</td>
          <td>₹${Math.round(p.unitPrice).toLocaleString()}</td>
          <td><b>₹${(p.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${p.units.toLocaleString()}</td>
          <td>₹${p.aov.toLocaleString()}</td>
          <td><span class="badge ${p.quadrant === 'Stars' ? 'badge-champion' : p.quadrant === 'Premium' ? 'badge-loyal' : 'badge-spenders'}">${p.quadrant}</span></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
