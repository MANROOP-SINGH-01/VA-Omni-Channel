/**
 * geo_view.js
 * View 6: Geographic Intelligence, Strategic City Matrix & City x Category Heatmap
 * Omni-Channel Retail Intelligence Platform
 */

const GeoView = {
  render(orders) {
    const cities = AnalyticsEngine.getGeographicScorecard(orders);
    const heatmap = AnalyticsEngine.getCityCategoryHeatmap(orders);

    // 1. City Revenue Bar Chart
    ChartManager.renderBarChart(
      'chart-city-revenue-bar',
      cities.map(c => c.city),
      cities.map(c => c.revenue),
      true
    );

    // 2. City x Category Performance Heatmap
    ChartManager.renderHeatmap(
      'chart-city-category-heatmap',
      heatmap.categories,
      heatmap.cities,
      heatmap.data,
      v => `₹${(v / 1e6).toFixed(2)}M`
    );

    // 3. City Strategic Scorecard Table
    this.renderCityTable(cities);
  },

  renderCityTable(cities) {
    const tbody = document.getElementById('city-scorecard-tbody');
    if (!tbody) return;

    let html = '';
    cities.forEach(c => {
      let badgeClass = 'badge-loyal';
      if (c.classification.includes('Core')) badgeClass = 'badge-champion';
      else if (c.classification.includes('High Value')) badgeClass = 'badge-spenders';
      else if (c.classification.includes('Growth')) badgeClass = 'badge-risk';

      html += `
        <tr>
          <td><span class="entity-link" onclick="EntityDrawer.openCity('${c.city}')"><b>${c.city}</b></span></td>
          <td><b>₹${(c.revenue / 1e6).toFixed(2)}M</b></td>
          <td>${c.customers.toLocaleString()}</td>
          <td>${c.orders.toLocaleString()}</td>
          <td>₹${c.aov.toLocaleString()}</td>
          <td><b style="color:#10b981;">₹${c.revPerCustomer.toLocaleString()}</b></td>
          <td>${c.discountRate}%</td>
          <td><span class="badge ${badgeClass}">${c.classification}</span></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
