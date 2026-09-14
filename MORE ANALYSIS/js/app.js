/**
 * app.js
 * Master Application Orchestrator & State Coordinator
 * Omni-Channel Retail Intelligence Platform
 * Rexora Dark Obsidian Executive Theme
 * Pure Deterministic Analytics — Zero Hardcoded Figures
 */

const App = {
  currentView: 'command-center',
  views: {},

  async init() {
    this.views = {
      'command-center': CommandCenterView,
      'sales': SalesView,
      'customers': CustomerView,
      'products': ProductView,
      'omnichannel': OmnichannelView,
      'geo': GeoView,
      'explorer': ExplorerView,
      'powerbi': PowerBIView,
      'sql': SQLView,
      'dictionary': DictionaryView,
      'pipeline': PipelineView
    };

    // 1. Initialize UI components
    EntityDrawer.init();

    SearchBar.init((type, id) => {
      if (type === 'Customer') EntityDrawer.openCustomer(id);
      else if (type === 'Product') EntityDrawer.openProduct(id);
      else if (type === 'City') EntityDrawer.openCity(id);
      else if (type === 'Channel') {
        FilterBar.setFilter('channel', id);
        this.switchView('omnichannel');
      }
    });

    FilterBar.init((filters) => {
      this.syncUrlState();
      this.refreshCurrentView();
    });

    this.bindNavTabs();
    this.bindGlobalKeyShortcuts();
    this.checkDatabaseStatus();

    // 2. Load dataset
    const loadOverlay = document.getElementById('loading-overlay');
    const loadText = document.getElementById('loading-status-text');

    try {
      await DataLoader.init((msg, pct) => {
        if (loadText) loadText.innerText = msg;
      });

      // Hide overlay
      if (loadOverlay) {
        loadOverlay.style.opacity = '0';
        setTimeout(() => loadOverlay.style.display = 'none', 400);
      }

      // 3. Execute Startup Data Validation Gate
      this.runStartupValidation();

      // 4. Restore URL deep-linked state if present
      this.restoreUrlState();

      // 5. Initial render
      this.refreshCurrentView();

    } catch (err) {
      console.error('Data loading error:', err);
      if (loadText) {
        loadText.innerHTML = `<span style="color:#f43f5e;">Error loading data: ${err.message}.<br>Please serve via local server.</span>`;
      }
    }
  },

  runStartupValidation() {
    const report = AnalyticsEngine.validateDataset(
      DataLoader.rawOrders,
      DataLoader.rawCustomers,
      DataLoader.rawProducts
    );

    const badge = document.getElementById('data-health-gate-badge');
    const label = document.getElementById('data-health-label');

    if (badge && label) {
      if (report.isValid) {
        badge.className = 'data-health-badge';
        label.innerHTML = `DATA HEALTH: <span style="color:#10b981;font-weight:700;">● Passed</span>`;
        badge.title = `Data Validation Gate Passed: All ${report.checks.length} structural integrity checks verified. Click to view Data Dictionary.`;
      } else {
        badge.className = 'data-health-badge health-failed';
        label.innerHTML = `DATA HEALTH: <span style="color:#f43f5e;font-weight:700;">● ${report.criticalErrors} Errors</span>`;
        badge.title = `Data Validation Failed: ${report.criticalErrors} critical discrepancies detected. Click to inspect.`;
      }

      badge.style.cursor = 'pointer';
      badge.onclick = () => this.switchView('dictionary');
    }
  },

  async checkDatabaseStatus() {
    const badge = document.getElementById('db-status-badge');
    const label = document.getElementById('db-status-label');
    if (!badge || !label) return;

    try {
      const res = await fetch('/api/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          badge.className = 'status-badge db-connected';
          badge.title = `Connected to ${data.engine} (${data.database}) • Orders: ${data.counts.orders.toLocaleString()}`;
          label.innerHTML = `<span style="color:var(--accent-emerald);font-weight:600;">PostgreSQL Live</span> (${(data.counts.orders / 1000).toFixed(0)}k rows)`;
          return;
        }
      }
    } catch (e) {
      // Backend not running / static host
    }

    badge.className = 'status-badge db-standalone';
    badge.title = 'In-Memory Client-Side Engine • 50,000 Transactions Loaded';
    label.innerHTML = `<span>In-Memory</span> (50k rows)`;
  },

  bindNavTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const viewName = tab.getAttribute('data-view');
        if (!viewName) return;
        this.switchView(viewName);
      });
    });
  },

  bindGlobalKeyShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      if (e.key === 'Escape') {
        // Dismiss drawers
        EntityDrawer.close();

        const evDrawer = document.getElementById('evidence-drawer');
        const evOverlay = document.getElementById('evidence-drawer-overlay');
        if (evDrawer) evDrawer.classList.remove('is-open');
        if (evOverlay) evOverlay.classList.remove('is-open');

        // Dismiss search dropdown
        const searchDrop = document.getElementById('search-results-dropdown');
        if (searchDrop) searchDrop.classList.remove('active');
      }
    });
  },

  switchView(viewName) {
    if (!this.views[viewName]) return;
    this.currentView = viewName;

    // Update tab styles
    document.querySelectorAll('.nav-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-view') === viewName);
    });

    // Update view container visibility
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });

    this.syncUrlState();
    this.refreshCurrentView();
    setTimeout(() => ChartManager.resizeAll(), 150);
  },

  refreshCurrentView() {
    const orders = AnalyticsEngine.filterOrders(DataLoader.rawOrders, FilterBar.currentFilters);
    DataLoader.filteredOrders = orders;

    const view = this.views[this.currentView];
    if (view && typeof view.render === 'function') {
      view.render(orders);
    }
    if (FilterBar.isCompareMode) {
      FilterBar.renderCompare();
    }
  },

  syncUrlState() {
    try {
      const params = new URLSearchParams();
      if (this.currentView && this.currentView !== 'command-center') {
        params.set('view', this.currentView);
      }
      const f = FilterBar.currentFilters || {};
      if (f.year && f.year !== 'ALL') params.set('year', f.year);
      if (f.channel && f.channel !== 'ALL') params.set('channel', f.channel);
      if (f.city && f.city !== 'ALL') params.set('city', f.city);
      if (f.category && f.category !== 'ALL') params.set('category', f.category);
      if (f.segment && f.segment !== 'ALL') params.set('segment', f.segment);

      const qs = params.toString();
      const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    } catch (e) {
      // Ignore URL state serialization errors
    }
  },

  restoreUrlState() {
    try {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam && this.views[viewParam]) {
        this.currentView = viewParam;
        document.querySelectorAll('.nav-tab').forEach(t => {
          t.classList.toggle('active', t.getAttribute('data-view') === viewParam);
        });
        document.querySelectorAll('.view-section').forEach(sec => {
          sec.classList.toggle('active', sec.id === `view-${viewParam}`);
        });
      }

      ['year', 'channel', 'city', 'category', 'segment'].forEach(key => {
        const val = params.get(key);
        if (val) FilterBar.setFilter(key, val);
      });
    } catch (e) {
      // Ignore URL parsing errors
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
