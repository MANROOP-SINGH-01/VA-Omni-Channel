/**
 * data_loader.js
 * High-performance CSV ingestion & in-memory relational indexing using PapaParse
 * Omni-Channel Retail Intelligence Platform
 */

const DataLoader = {
  rawCustomers: [],
  rawProducts: [],
  rawOrders: [],
  customerMap: new Map(),
  productMap: new Map(),
  isLoaded: false,

  async init(onProgress) {
    if (this.isLoaded) return true;

    try {
      if (onProgress) onProgress('Loading customer records (5,000)...', 20);
      this.rawCustomers = await this.loadCSV('data/customers.csv', '../customers.csv');

      if (onProgress) onProgress('Loading catalog products (200)...', 40);
      this.rawProducts = await this.loadCSV('data/products.csv', '../products.csv');

      if (onProgress) onProgress('Loading order transactions (50,000)...', 70);
      this.rawOrders = await this.loadCSV('data/orders.csv', '../orders.csv');

      if (onProgress) onProgress('Constructing analytical indices & relationships...', 90);
      this.buildIndices();

      this.isLoaded = true;
      if (onProgress) onProgress('Ready!', 100);
      return true;
    } catch (err) {
      console.error('Data loading error:', err);
      throw err;
    }
  },

  async loadCSV(primaryPath, fallbackPath) {
    let text = null;
    try {
      const res = await fetch(primaryPath);
      if (res.ok) {
        text = await res.text();
      }
    } catch (e) {
      // Ignore and try fallback
    }

    if (!text && fallbackPath) {
      try {
        const resFallback = await fetch(fallbackPath);
        if (resFallback.ok) {
          text = await resFallback.text();
        }
      } catch (e) {
        // Fallback failed
      }
    }

    if (!text) {
      throw new Error(`Failed to load dataset from ${primaryPath}`);
    }

    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            resolve(results.data);
          } else {
            reject(new Error(`Parsed 0 rows from ${primaryPath}`));
          }
        },
        error: (err) => reject(err)
      });
    });
  },

  buildIndices() {
    this.customerMap.clear();
    this.productMap.clear();

    // 1. Index Customers
    for (let i = 0; i < this.rawCustomers.length; i++) {
      const c = this.rawCustomers[i];
      if (!c.CustomerID) continue;
      c.orders = [];
      c.totalSpend = 0;
      c.totalUnits = 0;
      c.channelsUsed = new Set();
      this.customerMap.set(c.CustomerID, c);
    }

    // 2. Index Products
    for (let i = 0; i < this.rawProducts.length; i++) {
      const p = this.rawProducts[i];
      if (!p.ProductID) continue;
      p.orders = [];
      p.totalRevenue = 0;
      p.totalUnits = 0;
      p.totalDiscount = 0;
      this.productMap.set(p.ProductID, p);
    }

    // 3. Process Orders and wire relations
    for (let i = 0; i < this.rawOrders.length; i++) {
      const o = this.rawOrders[i];
      if (!o.OrderID || !o.CustomerID || !o.ProductID) continue;

      // Type coercions
      o.Quantity = Number(o.Quantity) || 0;
      o.UnitPrice = Number(o.UnitPrice) || 0;
      o.Discount = Number(o.Discount) || 0;
      o.TotalAmount = Number(o.TotalAmount) || 0;
      o.GrossAmount = o.Quantity * o.UnitPrice;
      o.DiscountRate = o.GrossAmount > 0 ? (o.Discount / o.GrossAmount) * 100 : 0;

      // Temporal parsing
      const parts = String(o.OrderDate).split('-');
      o.Year = parseInt(parts[0], 10);
      o.MonthNum = parseInt(parts[1], 10);
      o.YearMonth = `${parts[0]}-${parts[1]}`;
      
      const d = new Date(o.OrderDate);
      o.DayOfWeekNum = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      o.DayOfWeekName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][o.DayOfWeekNum];

      // Customer link
      const cust = this.customerMap.get(o.CustomerID);
      if (cust) {
        cust.orders.push(o);
        cust.totalSpend += o.TotalAmount;
        cust.totalUnits += o.Quantity;
        cust.channelsUsed.add(o.SalesChannel);
        o.CustomerCity = cust.Location;
        o.CustomerName = cust.CustomerName;
      }

      // Product link
      const prod = this.productMap.get(o.ProductID);
      if (prod) {
        prod.orders.push(o);
        prod.totalRevenue += o.TotalAmount;
        prod.totalUnits += o.Quantity;
        prod.totalDiscount += o.Discount;
        o.ProductName = prod.ProductName;
        o.Category = prod.Category;
      }
    }
  }
};
