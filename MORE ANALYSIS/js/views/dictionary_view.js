/**
 * dictionary_view.js
 * View 10: Central Metric Definitions & Startup Data Validation Gate
 * Omni-Channel Retail Intelligence Platform
 * Single Source of Truth — Zero Mathematical Ambiguity
 */

const DictionaryView = {
  METRIC_COLUMNS_MAP: {
    'Gross Sales': 'Quantity, UnitPrice',
    'Net Revenue': 'TotalAmount',
    'Total Orders': 'OrderID',
    'Units Sold': 'Quantity',
    'Average Order Value (AOV)': 'TotalAmount, OrderID',
    'Customers': 'CustomerID',
    'Revenue Realization Rate': 'TotalAmount, Quantity, UnitPrice',
    'Discount Impact Rate': 'Discount, Quantity, UnitPrice',
    'Repeat Customer Rate': 'CustomerID, OrderID',
    'Revenue per Customer': 'TotalAmount, CustomerID'
  },

  render(orders) {
    this.renderValidationGate();
    this.renderMetricDefinitions();
  },

  renderValidationGate() {
    const report = AnalyticsEngine.validateDataset(
      DataLoader.rawOrders,
      DataLoader.rawCustomers,
      DataLoader.rawProducts
    );

    const overallBadge = document.getElementById('validation-overall-badge');
    const checksGrid = document.getElementById('validation-checks-grid');

    if (overallBadge) {
      if (report.isValid) {
        overallBadge.className = 'data-health-badge';
        overallBadge.innerHTML = `<span class="health-dot" style="background:#10b981;"></span><span>DATA HEALTH: PASSED (${report.checks.length}/${report.checks.length} CHECKS)</span>`;
      } else {
        overallBadge.className = 'data-health-badge';
        overallBadge.style.borderColor = 'var(--accent-rose)';
        overallBadge.innerHTML = `<span class="health-dot" style="background:#f43f5e;"></span><span style="color:#f43f5e;">DATA HEALTH: FAILED (${report.criticalErrors} CRITICAL)</span>`;
      }
    }

    if (checksGrid) {
      let html = '';
      report.checks.forEach(check => {
        const dotColor = check.passed ? '#10b981' : '#f43f5e';
        const statusText = check.passed ? 'PASSED' : 'FAILED';
        html += `
          <div class="evidence-cell" style="padding:14px;border-left: 3px solid ${dotColor};">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <span style="font-weight:600;font-size:0.85rem;color:var(--text-primary);">${check.name}</span>
              <span style="font-size:0.7rem;font-weight:700;color:${dotColor};letter-spacing:0.05em;">● ${statusText}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-muted);">${check.detail}</div>
          </div>
        `;
      });
      checksGrid.innerHTML = html;
    }
  },

  renderMetricDefinitions() {
    const tbody = document.getElementById('metric-definitions-tbody');
    if (!tbody) return;

    let html = '';
    AnalyticsEngine.METRIC_DEFINITIONS.forEach(m => {
      const cols = this.METRIC_COLUMNS_MAP[m.name] || 'Derived';
      html += `
        <tr>
          <td><b style="color:var(--accent-cyan);">${m.name}</b></td>
          <td><code style="background:rgba(139, 92, 246, 0.12);color:var(--accent-violet);padding:4px 8px;border-radius:4px;font-family:monospace;font-size:0.82rem;">${m.formula}</code></td>
          <td><span style="font-family:monospace;color:var(--text-muted);font-size:0.8rem;">${cols}</span></td>
          <td style="color:var(--text-secondary);font-size:0.82rem;">${m.desc}</td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }
};
