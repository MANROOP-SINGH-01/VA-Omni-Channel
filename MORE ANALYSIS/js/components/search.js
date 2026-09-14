/**
 * search.js
 * Universal Entity Search Bar (Customers, Products, Cities, Channels, Categories)
 * Omni-Channel Retail Intelligence Platform
 */

const SearchBar = {
  inputEl: null,
  dropdownEl: null,

  init(onSelectEntity) {
    this.inputEl = document.getElementById('global-search-input');
    this.dropdownEl = document.getElementById('search-results-dropdown');
    if (!this.inputEl || !this.dropdownEl) return;

    this.inputEl.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) {
        this.dropdownEl.style.display = 'none';
        return;
      }
      this.performSearch(q, onSelectEntity);
    });

    document.addEventListener('click', (e) => {
      if (!this.inputEl.contains(e.target) && !this.dropdownEl.contains(e.target)) {
        this.dropdownEl.style.display = 'none';
      }
    });
  },

  performSearch(query, onSelect) {
    const results = [];

    // 1. Search Customers
    const custs = Array.from(DataLoader.customerMap.values());
    for (let i = 0; i < custs.length; i++) {
      const c = custs[i];
      if (c.CustomerID.toLowerCase().includes(query) || c.CustomerName.toLowerCase().includes(query)) {
        results.push({ type: 'Customer', id: c.CustomerID, title: `${c.CustomerName} (${c.CustomerID})`, subtitle: `City: ${c.Location} | Spend: ₹${Math.round(c.totalSpend).toLocaleString()}` });
        if (results.length >= 8) break;
      }
    }

    // 2. Search Products
    const prods = Array.from(DataLoader.productMap.values());
    for (let i = 0; i < prods.length; i++) {
      const p = prods[i];
      if (p.ProductID.toLowerCase().includes(query) || p.ProductName.toLowerCase().includes(query) || p.Category.toLowerCase().includes(query)) {
        results.push({ type: 'Product', id: p.ProductID, title: `${p.ProductName} (${p.ProductID})`, subtitle: `${p.Category} | Price: ₹${p.UnitPrice.toFixed(0)}` });
        if (results.length >= 15) break;
      }
    }

    // 3. Search Cities
    const cities = ['Ahmedabad', 'Kolkata', 'Bangalore', 'Chennai', 'Mumbai', 'Delhi', 'Hyderabad', 'Pune'];
    cities.forEach(city => {
      if (city.toLowerCase().includes(query)) {
        results.push({ type: 'City', id: city, title: city, subtitle: 'Metro Market' });
      }
    });

    // 4. Search Channels
    const channels = ['Physical Store', 'Marketplace-Amazon', 'Marketplace-Flipkart', 'Website', 'Mobile App'];
    channels.forEach(ch => {
      if (ch.toLowerCase().includes(query)) {
        results.push({ type: 'Channel', id: ch, title: ch, subtitle: 'Sales Channel' });
      }
    });

    this.renderResults(results, onSelect);
  },

  renderResults(results, onSelect) {
    if (results.length === 0) {
      this.dropdownEl.innerHTML = '<div style="padding:12px;color:#64748b;font-size:12px;text-align:center;">No matching entities found.</div>';
      this.dropdownEl.style.display = 'block';
      return;
    }

    let html = '';
    results.forEach(r => {
      html += `
        <div class="search-result-item" data-type="${r.type}" data-id="${r.id}">
          <div>
            <div class="search-result-title">${r.title}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">${r.subtitle}</div>
          </div>
          <span class="search-result-type">${r.type}</span>
        </div>
      `;
    });

    this.dropdownEl.innerHTML = html;
    this.dropdownEl.style.display = 'block';

    this.dropdownEl.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const id = item.getAttribute('data-id');
        this.dropdownEl.style.display = 'none';
        this.inputEl.value = '';
        if (onSelect) onSelect(type, id);
      });
    });
  }
};
