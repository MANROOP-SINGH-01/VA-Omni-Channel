/**
 * filter_bar.js
 * Global Analytics Filter Bar & Compare Mode Handler
 * Omni-Channel Retail Intelligence Platform
 */

const FilterBar = {
  currentFilters: {
    year: 'ALL',
    channel: 'ALL',
    city: 'ALL',
    category: 'ALL',
    segment: 'ALL'
  },
  isCompareMode: false,
  compareConfig: {
    dimension: 'year',
    valA: '2023',
    valB: '2024'
  },
  onChangeCallback: null,

  init(onChange) {
    this.onChangeCallback = onChange;
    this.populateDropdowns();
    this.buildCustomDropdowns();
    this.populateCompareOptions();
    this.bindEvents();
  },

  populateDropdowns() {
    // 1. Year
    const yearSelect = document.getElementById('filter-year');
    if (yearSelect) {
      yearSelect.innerHTML = '<option value="ALL">All Years (2022 - 2024)</option>' +
                             '<option value="2022">2022</option>' +
                             '<option value="2023">2023</option>' +
                             '<option value="2024">2024</option>';
    }

    // 2. Channel
    const chSelect = document.getElementById('filter-channel');
    if (chSelect) {
      const channels = ['Physical Store', 'Marketplace-Amazon', 'Marketplace-Flipkart', 'Website', 'Mobile App'];
      let html = '<option value="ALL">All Channels (5)</option>';
      channels.forEach(ch => html += `<option value="${ch}">${ch}</option>`);
      chSelect.innerHTML = html;
    }

    // 3. City
    const citySelect = document.getElementById('filter-city');
    if (citySelect) {
      const cities = ['Ahmedabad', 'Kolkata', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'];
      let html = '<option value="ALL">All Cities (8 Metros)</option>';
      cities.forEach(ci => html += `<option value="${ci}">${ci}</option>`);
      citySelect.innerHTML = html;
    }

    // 4. Category
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      const categories = ['Sports & Fitness', 'Beauty & Personal Care', 'Home & Kitchen', 'Electronics', 'Fashion'];
      let html = '<option value="ALL">All Categories (5)</option>';
      categories.forEach(cat => html += `<option value="${cat}">${cat}</option>`);
      catSelect.innerHTML = html;
    }

    // 5. RFM Segment
    const segSelect = document.getElementById('filter-segment');
    if (segSelect) {
      const segments = ['Champions', 'Loyal Customers', 'Big Spenders', 'Potential Loyalists', 'Needs Attention', 'At Risk', 'Lost Customers'];
      let html = '<option value="ALL">All Customer Segments</option>';
      segments.forEach(seg => html += `<option value="${seg}">${seg}</option>`);
      segSelect.innerHTML = html;
    }
  },

  buildCustomDropdowns() {
    const filterIds = ['filter-year', 'filter-channel', 'filter-city', 'filter-category', 'filter-segment'];
    
    filterIds.forEach(id => {
      const select = document.getElementById(id);
      if (!select) return;

      // Hide the native select
      select.style.display = 'none';

      // Remove previous custom dropdown if present
      const existing = select.parentElement.querySelector(`.custom-dropdown[data-for="${id}"]`);
      if (existing) existing.remove();

      // Create custom dropdown wrapper
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-dropdown';
      wrapper.setAttribute('data-for', id);

      // Trigger button
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'custom-dropdown-btn';
      
      const selectedOption = select.options[select.selectedIndex] || select.options[0];
      const labelText = selectedOption ? selectedOption.text : 'Select...';

      btn.innerHTML = `
        <span class="custom-dropdown-text">${labelText}</span>
        <svg class="custom-dropdown-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      `;

      // Menu
      const menu = document.createElement('div');
      menu.className = 'custom-dropdown-menu';

      Array.from(select.options).forEach(opt => {
        const item = document.createElement('div');
        const isActive = opt.value === select.value;
        item.className = `custom-dropdown-item ${isActive ? 'active' : ''}`;
        item.setAttribute('data-value', opt.value);
        item.innerHTML = `
          <span>${opt.text}</span>
          ${isActive ? `
            <svg class="custom-dropdown-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>` : ''}
        `;

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          select.value = opt.value;
          
          btn.querySelector('.custom-dropdown-text').innerText = opt.text;
          
          menu.querySelectorAll('.custom-dropdown-item').forEach(it => {
            const isSelected = it.getAttribute('data-value') === opt.value;
            it.classList.toggle('active', isSelected);
            const check = it.querySelector('.custom-dropdown-check');
            if (isSelected) {
              if (!check) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'custom-dropdown-check');
                svg.setAttribute('width', '14');
                svg.setAttribute('height', '14');
                svg.setAttribute('viewBox', '0 0 24 24');
                svg.setAttribute('fill', 'none');
                svg.setAttribute('stroke', 'currentColor');
                svg.setAttribute('stroke-width', '2.5');
                svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
                it.appendChild(svg);
              }
            } else if (check) {
              check.remove();
            }
          });

          wrapper.classList.remove('is-open');

          // Trigger change event on select
          const evt = new Event('change', { bubbles: true });
          select.dispatchEvent(evt);
        });

        menu.appendChild(item);
      });

      // Toggle menu on button click
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = wrapper.classList.contains('is-open');
        document.querySelectorAll('.custom-dropdown.is-open').forEach(d => {
          if (d !== wrapper) d.classList.remove('is-open');
        });
        wrapper.classList.toggle('is-open', !isOpen);
      });

      wrapper.appendChild(btn);
      wrapper.appendChild(menu);
      select.parentNode.insertBefore(wrapper, select.nextSibling);
    });

    // Close on click outside or Escape
    if (!this._hasClickOutsideListener) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-dropdown')) {
          document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          document.querySelectorAll('.custom-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
        }
      });
      this._hasClickOutsideListener = true;
    }
  },

  updateCustomDropdownUI(id) {
    const select = document.getElementById(id);
    if (!select) return;
    const wrapper = select.parentElement.querySelector(`.custom-dropdown[data-for="${id}"]`);
    if (!wrapper) return;

    const opt = select.options[select.selectedIndex];
    if (opt) {
      const txt = wrapper.querySelector('.custom-dropdown-text');
      if (txt) txt.innerText = opt.text;

      wrapper.querySelectorAll('.custom-dropdown-item').forEach(it => {
        const isActive = it.getAttribute('data-value') === opt.value;
        it.classList.toggle('active', isActive);
        const check = it.querySelector('.custom-dropdown-check');
        if (isActive) {
          if (!check) {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'custom-dropdown-check');
            svg.setAttribute('width', '14');
            svg.setAttribute('height', '14');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');
            svg.setAttribute('stroke', 'currentColor');
            svg.setAttribute('stroke-width', '2.5');
            svg.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
            it.appendChild(svg);
          }
        } else if (check) {
          check.remove();
        }
      });
    }
  },

  populateCompareOptions() {
    const dimSelect = document.getElementById('compare-dimension');
    const aSelect = document.getElementById('compare-entity-a');
    const bSelect = document.getElementById('compare-entity-b');
    if (!dimSelect || !aSelect || !bSelect) return;

    const dim = this.compareConfig.dimension;
    let options = [];
    let defaultA = '';
    let defaultB = '';

    if (dim === 'year') {
      options = ['2022', '2023', '2024'];
      defaultA = '2023';
      defaultB = '2024';
    } else if (dim === 'channel') {
      options = ['Physical Store', 'Marketplace-Amazon', 'Marketplace-Flipkart', 'Website', 'Mobile App'];
      defaultA = 'Physical Store';
      defaultB = 'Website';
    } else if (dim === 'city') {
      options = ['Ahmedabad', 'Kolkata', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'];
      defaultA = 'Ahmedabad';
      defaultB = 'Pune';
    } else if (dim === 'category') {
      options = ['Sports & Fitness', 'Beauty & Personal Care', 'Home & Kitchen', 'Electronics', 'Fashion'];
      defaultA = 'Sports & Fitness';
      defaultB = 'Electronics';
    }

    let aHtml = '';
    let bHtml = '';
    options.forEach(opt => {
      aHtml += `<option value="${opt}" ${opt === defaultA ? 'selected' : ''}>${opt}</option>`;
      bHtml += `<option value="${opt}" ${opt === defaultB ? 'selected' : ''}>${opt}</option>`;
    });

    aSelect.innerHTML = aHtml;
    bSelect.innerHTML = bHtml;
    this.compareConfig.valA = defaultA;
    this.compareConfig.valB = defaultB;
  },

  bindEvents() {
    const selects = ['filter-year', 'filter-channel', 'filter-city', 'filter-category', 'filter-segment'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', (e) => {
        const key = id.replace('filter-', '');
        this.currentFilters[key] = e.target.value;
        if (this.onChangeCallback) this.onChangeCallback(this.currentFilters);
      });
    });

    const resetBtn = document.getElementById('filter-reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetFilters());
    }

    const compareBtn = document.getElementById('btn-compare-mode');
    if (compareBtn) {
      compareBtn.addEventListener('click', () => {
        this.toggleCompareMode();
      });
    }

    const closeCompareBtn = document.getElementById('btn-close-compare');
    if (closeCompareBtn) {
      closeCompareBtn.addEventListener('click', () => {
        this.toggleCompareMode(false);
      });
    }

    const dimSelect = document.getElementById('compare-dimension');
    if (dimSelect) {
      dimSelect.addEventListener('change', (e) => {
        this.compareConfig.dimension = e.target.value;
        this.populateCompareOptions();
        this.renderCompare();
      });
    }

    const aSelect = document.getElementById('compare-entity-a');
    if (aSelect) {
      aSelect.addEventListener('change', (e) => {
        this.compareConfig.valA = e.target.value;
        this.renderCompare();
      });
    }

    const bSelect = document.getElementById('compare-entity-b');
    if (bSelect) {
      bSelect.addEventListener('change', (e) => {
        this.compareConfig.valB = e.target.value;
        this.renderCompare();
      });
    }
  },

  resetFilters() {
    this.currentFilters = { year: 'ALL', channel: 'ALL', city: 'ALL', category: 'ALL', segment: 'ALL' };
    const ids = ['filter-year', 'filter-channel', 'filter-city', 'filter-category', 'filter-segment'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'ALL';
      this.updateCustomDropdownUI(id);
    });
    if (this.onChangeCallback) this.onChangeCallback(this.currentFilters);
  },

  setFilter(key, value) {
    if (this.currentFilters[key] !== undefined) {
      this.currentFilters[key] = value;
      const el = document.getElementById(`filter-${key}`);
      if (el) el.value = value;
      this.updateCustomDropdownUI(`filter-${key}`);
      if (this.onChangeCallback) this.onChangeCallback(this.currentFilters);
    }
  },

  toggleCompareMode(forceState) {
    this.isCompareMode = forceState !== undefined ? forceState : !this.isCompareMode;
    const btn = document.getElementById('btn-compare-mode');
    if (btn) {
      btn.classList.toggle('active', this.isCompareMode);
      btn.innerHTML = this.isCompareMode 
        ? '<span>✕</span> Exit Compare' 
        : '<span>⇄</span> Compare Mode';
    }

    const compareBar = document.getElementById('compare-bar');
    const comparePanel = document.getElementById('compare-results-panel');

    if (compareBar) compareBar.style.display = this.isCompareMode ? 'flex' : 'none';
    if (comparePanel) comparePanel.style.display = this.isCompareMode ? 'block' : 'none';

    if (this.isCompareMode) {
      this.renderCompare();
    }
  },

  renderCompare() {
    if (!this.isCompareMode) return;
    if (!DataLoader || !DataLoader.rawOrders || DataLoader.rawOrders.length === 0) return;

    const { dimension, valA, valB } = this.compareConfig;
    const comp = AnalyticsEngine.getComparison(DataLoader.rawOrders, dimension, valA, valB);

    // Update Title
    const titleEl = document.getElementById('compare-panel-title');
    if (titleEl) {
      titleEl.innerText = `Comparative Analysis: ${valA} vs ${valB} (${dimension.toUpperCase()})`;
    }

    // Render Metric Cards
    const gridEl = document.getElementById('compare-metrics-grid');
    if (gridEl) {
      const metrics = [
        {
          label: 'Net Realized Revenue',
          valA: `₹${(comp.statsA.revenue / 1e6).toFixed(2)}M`,
          valB: `₹${(comp.statsB.revenue / 1e6).toFixed(2)}M`,
          delta: comp.deltas.revenue,
          isPctDelta: true
        },
        {
          label: 'Order Volume',
          valA: comp.statsA.orders.toLocaleString(),
          valB: comp.statsB.orders.toLocaleString(),
          delta: comp.deltas.orders,
          isPctDelta: true
        },
        {
          label: 'Units Sold',
          valA: comp.statsA.units.toLocaleString(),
          valB: comp.statsB.units.toLocaleString(),
          delta: comp.deltas.units,
          isPctDelta: true
        },
        {
          label: 'Average Order Value (AOV)',
          valA: `₹${comp.statsA.aov.toLocaleString()}`,
          valB: `₹${comp.statsB.aov.toLocaleString()}`,
          delta: comp.deltas.aov,
          isPctDelta: true
        },
        {
          label: 'Customers',
          valA: comp.statsA.customers.toLocaleString(),
          valB: comp.statsB.customers.toLocaleString(),
          delta: comp.deltas.customers,
          isPctDelta: true
        },
        {
          label: 'Average Discount Drag',
          valA: `${comp.statsA.discountPct}%`,
          valB: `${comp.statsB.discountPct}%`,
          delta: comp.deltas.discountPct,
          isDiscount: true
        }
      ];

      let html = '';
      metrics.forEach(m => {
        let deltaHtml = '';
        if (m.isDiscount) {
          const isHigher = m.delta > 0;
          deltaHtml = `<span class="compare-delta-badge ${isHigher ? 'negative' : 'positive'}">${isHigher ? '+' : ''}${m.delta}% pts</span>`;
        } else {
          const isPos = m.delta >= 0;
          deltaHtml = `<span class="compare-delta-badge ${isPos ? 'positive' : 'negative'}">${isPos ? '↑ +' : '↓ '}${m.delta}%</span>`;
        }

        html += `
          <div class="compare-metric-card">
            <div class="compare-metric-label">${m.label}</div>
            <div class="compare-metric-values">
              <span class="compare-val-a" title="${valA}">${m.valA}</span>
              <span style="color:#64748b;font-size:0.75rem;">vs</span>
              <span class="compare-val-b" title="${valB}">${m.valB}</span>
            </div>
            <div>${deltaHtml} <span style="font-size:10px;color:#64748b;margin-left:4px;">${valB} vs ${valA}</span></div>
          </div>
        `;
      });
      gridEl.innerHTML = html;
    }

    // Render Comparison Charts
    setTimeout(() => {
      ChartManager.renderCompareBarChart('chart-compare-bars', comp);
      ChartManager.renderCompareCategoryChart('chart-compare-categories', comp);
    }, 50);
  }
};
