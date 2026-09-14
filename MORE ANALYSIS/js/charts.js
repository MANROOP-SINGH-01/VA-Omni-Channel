/**
 * charts.js
 * Apache ECharts Theme Configuration & Reusable SaaS Chart Builders
 * Omni-Channel Retail Intelligence Platform
 */

const ChartManager = {
  instances: new Map(),

  // Unified Rexora SaaS Color Palette
  COLORS: ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#a855f7', '#14b8a6', '#6366f1'],

  getTooltip(overrides = {}) {
    return {
      trigger: 'axis',
      backgroundColor: 'rgba(11, 17, 32, 0.96)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: "'Inter', sans-serif" },
      extraCssText: 'box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7); border-radius: 8px; backdrop-filter: blur(8px); z-index: 9999;',
      ...overrides
    };
  },

  getBaseOption() {
    return {
      backgroundColor: 'transparent',
      animationDuration: 300,
      animationDurationUpdate: 250,
      textStyle: {
        fontFamily: "'Inter', sans-serif"
      },
      tooltip: this.getTooltip(),
      grid: {
        top: 35,
        right: 25,
        bottom: 30,
        left: 55,
        containLabel: true
      }
    };
  },

  getChart(domId) {
    const el = document.getElementById(domId);
    if (!el) return null;
    if (this.instances.has(domId)) {
      return this.instances.get(domId);
    }
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    this.instances.set(domId, chart);

    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (el.offsetParent !== null && el.clientWidth > 0) {
          chart.resize();
        }
      });
      ro.observe(el);
    }

    return chart;
  },

  resizeAll() {
    this.instances.forEach((chart, domId) => {
      const el = document.getElementById(domId);
      if (chart && el && el.offsetParent !== null && el.clientWidth > 0) {
        chart.resize();
      }
    });
  },

  // Dynamic Inline SVG Sparkline Generator (UI/UX Pro Max Bezier Smoothing)
  createSparklineSVG(points, color = '#8b5cf6', width = 120, height = 30) {
    if (!points || points.length < 2) return '';
    let min = Math.min(...points);
    let max = Math.max(...points);
    const delta = max - min;
    if (delta < 0.0001) {
      min -= 1;
      max += 1;
    } else {
      min -= delta * 0.06;
      max += delta * 0.06;
    }
    const range = max - min || 1;
    const padding = 3;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    const pts = points.map((val, idx) => ({
      x: padding + (idx / (points.length - 1)) * drawWidth,
      y: height - padding - ((val - min) / range) * drawHeight
    }));

    // Smooth cubic Bezier path
    let pathD = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const mx = (p0.x + p1.x) / 2;
      pathD += ` C ${mx.toFixed(1)},${p0.y.toFixed(1)} ${mx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }

    const last = pts[pts.length - 1];
    const areaD = `${pathD} L ${last.x.toFixed(1)},${height} L ${pts[0].x.toFixed(1)},${height} Z`;
    const gradId = `spk-grad-${Math.random().toString(36).substr(2, 7)}`;

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.38"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#${gradId})"/>
        <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.5" fill="${color}" stroke="#070a13" stroke-width="1"/>
      </svg>
    `;
  },

  // 1. Line / Area Trend Chart
  renderTrendLine(domId, trendData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const xData = trendData.map(d => d.period);
    const revData = trendData.map(d => d.revenue);
    const ordData = trendData.map(d => d.orders);

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'axis',
        formatter: (params) => {
          let s = `<div style="font-weight:600;margin-bottom:4px;color:#f8fafc;">${params[0].name}</div>`;
          params.forEach(p => {
            const val = p.seriesName === 'Revenue' ? `₹${(p.value / 1e6).toFixed(2)}M` : `${p.value.toLocaleString()} orders`;
            s += `<div style="display:flex;align-items:center;gap:6px;font-size:12px;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};"></span>
                    <span style="color:#94a3b8;">${p.seriesName}: <b style="color:#f8fafc;">${val}</b></span>
                  </div>`;
          });
          return s;
        }
      }),
      legend: {
        data: ['Revenue', 'Orders'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 6,
        left: 'center',
        itemGap: 28
      },
      grid: {
        top: 48,
        right: 42,
        bottom: 28,
        left: 28,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisTick: { alignWithLabel: true }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Revenue (₹)',
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'left' },
          axisLabel: {
            color: '#64748b',
            fontSize: 10,
            formatter: v => `₹${(v / 1e6).toFixed(1)}M`
          },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        {
          type: 'value',
          name: 'Orders',
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'right' },
          axisLabel: { color: '#64748b', fontSize: 10 },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Revenue',
          type: 'line',
          data: revData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 3, color: '#8b5cf6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.35)' },
              { offset: 1, color: 'rgba(139, 92, 246, 0.0)' }
            ])
          }
        },
        {
          name: 'Orders',
          type: 'line',
          yAxisIndex: 1,
          data: ordData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#06b6d4', type: 'dashed' }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 2. Bar Chart
  renderBarChart(domId, categories, seriesData, isHorizontal = false) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const option = {
      ...this.getBaseOption(),
      grid: {
        top: 35,
        right: 25,
        bottom: !isHorizontal && categories.length > 4 ? 45 : 30,
        left: isHorizontal ? 80 : 55,
        containLabel: true
      },
      tooltip: this.getTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params[0];
          const val = typeof p.value === 'number' ? (p.value >= 1e5 ? `₹${(p.value / 1e6).toFixed(2)}M` : `₹${p.value.toLocaleString()}`) : p.value;
          return `<div style="font-weight:600;margin-bottom:4px;color:#f8fafc;">${p.name}</div>
                  <div style="display:flex;align-items:center;gap:6px;font-size:12px;">
                    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color || '#38bdf8'};"></span>
                    <span style="color:#94a3b8;">Revenue: <b style="color:#f8fafc;">${val}</b></span>
                  </div>`;
        }
      }),
      xAxis: isHorizontal ? {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1e6).toFixed(1)}M` },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      } : {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 11, interval: 0, rotate: categories.length > 4 ? 20 : 0 }
      },
      yAxis: isHorizontal ? {
        type: 'category',
        data: categories,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      } : {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1e6).toFixed(1)}M` },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          type: 'bar',
          data: seriesData,
          barWidth: '55%',
          itemStyle: {
            borderRadius: isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
            color: new echarts.graphic.LinearGradient(
              isHorizontal ? 0 : 0, isHorizontal ? 0 : 0, isHorizontal ? 1 : 0, isHorizontal ? 0 : 1,
              [
                { offset: 0, color: '#38bdf8' },
                { offset: 1, color: '#6366f1' }
              ]
            )
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 3. Donut / Pie Chart
  renderDonutChart(domId, data, title = '') {
    const chart = this.getChart(domId);
    if (!chart) return;

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'item',
        formatter: params => {
          return `<div style="font-weight:600;color:#f8fafc;margin-bottom:4px;">${params.name}</div>
                  <div style="font-size:12px;color:#94a3b8;">Revenue: <b style="color:#38bdf8;">₹${(params.value / 1e6).toFixed(2)}M</b> (${params.percent}%)</div>`;
        }
      }),
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
        itemWidth: 10,
        itemHeight: 10
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['52%', '78%'],
          center: ['40%', '50%'],
          avoidLabelOverlap: false,
          label: { show: false },
          emphasis: {
            label: { show: false },
            itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
          },
          labelLine: { show: false },
          data: data,
          color: this.COLORS
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 4. Customer Value Scatter (Frequency vs Monetary)
  renderCustomerScatter(domId, rfmList, onCustomerClick) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const colorMap = {
      'Champions': '#10b981',
      'Loyal Customers': '#38bdf8',
      'Big Spenders': '#a855f7',
      'Potential Loyalists': '#f59e0b',
      'Needs Attention': '#3b82f6',
      'At Risk': '#f97316',
      'Lost Customers': '#f43f5e',
      'Casual Buyers': '#64748b'
    };

    // Subsample up to 1,500 points for smooth browser rendering
    const sample = rfmList.length > 1500 ? rfmList.filter((_, i) => i % 3 === 0) : rfmList;

    const seriesBySegment = {};
    sample.forEach(c => {
      const seg = c.segment;
      if (!seriesBySegment[seg]) seriesBySegment[seg] = [];
      // [Frequency, Monetary, AOV, CustomerID, CustomerName]
      seriesBySegment[seg].push([c.frequency, c.monetary, c.aov, c.customerID, c.customerName]);
    });

    const series = Object.keys(seriesBySegment).map(seg => ({
      name: seg,
      type: 'scatter',
      data: seriesBySegment[seg],
      symbolSize: (data) => Math.min(22, Math.max(7, (data[2] / 6137) * 9)),
      animation: false,
      itemStyle: {
        color: colorMap[seg] || '#94a3b8',
        opacity: 0.8
      }
    }));

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'item',
        formatter: params => {
          const d = params.value;
          return `<div style="font-weight:700;color:#38bdf8;">${d[4]} (${d[3]})</div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Segment: <b style="color:#ffffff;">${params.seriesName}</b></div>
                  <div style="margin-top:4px;">Revenue: <b>₹${(d[1] / 1000).toFixed(1)}K</b></div>
                  <div>Orders: <b>${d[0]}</b> | AOV: <b>₹${d[2]}</b></div>
                  <div style="font-size:10px;color:#38bdf8;margin-top:4px;">Click to view customer profile</div>`;
        }
      }),
      legend: {
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 10 }
      },
      grid: { top: 50, right: 25, bottom: 45, left: 65 },
      xAxis: {
        name: 'Order Frequency',
        nameLocation: 'center',
        nameGap: 24,
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: {
        name: 'Monetary Spend (₹)',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b', formatter: v => `₹${(v / 1000).toFixed(0)}K` }
      },
      series: series
    };

    chart.setOption(option, true);
    chart.resize();

    if (onCustomerClick) {
      chart.off('click');
      chart.on('click', params => {
        if (params.value && params.value[3]) {
          onCustomerClick(params.value[3]);
        }
      });
    }
  },

  // 5. BCG Matrix Scatter (Units vs Revenue)
  renderBCGScatter(domId, products, onProductClick) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const colorMap = {
      'Stars': '#10b981',
      'Premium': '#38bdf8',
      'Volume Drivers': '#f59e0b',
      'Underperformers': '#f43f5e'
    };

    const seriesByQuad = {};
    products.forEach(p => {
      const q = p.quadrant;
      if (!seriesByQuad[q]) seriesByQuad[q] = [];
      // [units, revenue, aov, productID, productName, category]
      seriesByQuad[q].push([p.units, p.revenue, p.aov, p.productID, p.productName, p.category]);
    });

    const series = Object.keys(seriesByQuad).map(q => ({
      name: q,
      type: 'scatter',
      data: seriesByQuad[q],
      symbolSize: (data) => Math.min(24, Math.max(8, (data[2] / 6137) * 10)),
      itemStyle: { color: colorMap[q] || '#94a3b8', opacity: 0.85 }
    }));

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'item',
        formatter: params => {
          const d = params.value;
          return `<div style="font-weight:700;color:#38bdf8;">${d[4]} (${d[3]})</div>
                  <div style="font-size:11px;color:#94a3b8;">Category: ${d[5]} | Quadrant: <b style="color:#ffffff;">${params.seriesName}</b></div>
                  <div style="margin-top:4px;">Revenue: <b>₹${(d[1] / 1e6).toFixed(2)}M</b></div>
                  <div>Units Sold: <b>${d[0]}</b> | AOV: <b>₹${d[2]}</b></div>
                  <div style="font-size:10px;color:#38bdf8;margin-top:4px;">Click to view product details</div>`;
        }
      }),
      legend: {
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 }
      },
      grid: { top: 42, right: 25, bottom: 45, left: 65 },
      xAxis: {
        name: 'Units Sold (Volume)',
        nameLocation: 'center',
        nameGap: 24,
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b' }
      },
      yAxis: {
        name: 'Net Revenue (₹)',
        nameTextStyle: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#64748b', formatter: v => `₹${(v / 1e6).toFixed(1)}M` }
      },
      series
    };

    chart.setOption(option, true);
    chart.resize();

    if (onProductClick) {
      chart.off('click');
      chart.on('click', params => {
        if (params.value && params.value[3]) {
          onProductClick(params.value[3]);
        }
      });
    }
  },

  // 6. Heatmap (Day x Month or City x Category)
  renderHeatmap(domId, xLabels, yLabels, data, valueFormatter) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const nonZero = data.map(d => d[2]).filter(v => v > 0);
    const minVal = nonZero.length > 0 ? Math.min(...nonZero) * 0.95 : 0;
    const maxVal = nonZero.length > 0 ? Math.max(...nonZero) * 1.02 : 100;

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        position: 'top',
        formatter: params => {
          const val = valueFormatter ? valueFormatter(params.value[2]) : params.value[2];
          return `<div style="font-weight:700;color:#c4b5fd;">${xLabels[params.value[0]]} ➔ ${yLabels[params.value[1]]}</div>
                  <div>Revenue: <b style="color:#38bdf8;">${val}</b></div>`;
        }
      }),
      grid: {
        top: 25,
        right: 30,
        bottom: 75,
        left: 95
      },
      xAxis: {
        type: 'category',
        data: xLabels,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: {
          color: '#94a3b8',
          fontSize: 10,
          interval: 0,
          rotate: 30,
          formatter: v => v ? v.replace(' & ', ' &\n') : v
        }
      },
      yAxis: {
        type: 'category',
        data: yLabels,
        splitArea: { show: true },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 }
      },
      visualMap: {
        dimension: 2,
        min: Math.floor(minVal),
        max: Math.ceil(maxVal),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 4,
        itemWidth: 12,
        itemHeight: 180,
        text: ['Peak', 'Baseline'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: ['#0f172a', '#1e3a8a', '#2563eb', '#38bdf8', '#34d399']
        },
        outOfRange: {
          color: 'rgba(15, 23, 42, 0.6)'
        }
      },
      series: [
        {
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            formatter: p => p.value[2] > 0 ? `₹${(p.value[2] / 1e6).toFixed(1)}M` : '',
            fontSize: 9,
            fontWeight: 600,
            color: '#f8fafc'
          },
          itemStyle: {
            borderColor: '#070a13',
            borderWidth: 1.5,
            borderRadius: 3
          },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(6, 182, 212, 0.6)' }
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 7. Pareto Curve (Columns + Cumulative Line)
  renderParetoChart(domId, paretoData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    // Subsample top 40 SKUs for clear visual display
    const sample = paretoData.slice(0, 40);
    const xData = sample.map(d => d.productID);
    const revData = sample.map(d => d.revenue);
    const pctData = sample.map(d => d.cumRevenuePct);

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'axis',
        formatter: params => {
          const p = sample[params[0].dataIndex];
          return `<div style="font-weight:700;color:#38bdf8;">${p.productName} (${p.productID})</div>
                  <div>Rank: <b>#${p.rank}</b> (${p.productPct}% of Catalog)</div>
                  <div>Revenue: <b>₹${(p.revenue / 1e6).toFixed(2)}M</b></div>
                  <div>Cumulative Share: <b style="color:#10b981;">${p.cumRevenuePct}%</b></div>`;
        }
      }),
      legend: {
        data: ['Revenue', 'Cumulative %'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 6,
        left: 'center',
        itemGap: 24
      },
      grid: {
        top: 48,
        right: 42,
        bottom: 45,
        left: 28,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 45 }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Revenue (₹)',
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'left' },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1e6).toFixed(1)}M` },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        {
          type: 'value',
          name: 'Cumulative %',
          nameLocation: 'end',
          nameGap: 14,
          nameTextStyle: { color: '#64748b', fontSize: 10, align: 'right' },
          min: 0,
          max: 100,
          axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `${v}%` },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'Revenue',
          type: 'bar',
          data: revData,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#1e3a8a' }
            ]),
            borderRadius: [3, 3, 0, 0]
          }
        },
        {
          name: 'Cumulative %',
          type: 'line',
          yAxisIndex: 1,
          data: pctData,
          lineStyle: { width: 3, color: '#10b981' },
          symbol: 'circle',
          symbolSize: 4,
          markLine: {
            data: [{ yAxis: 80, name: '80% Threshold' }],
            lineStyle: { color: '#f59e0b', type: 'dashed', width: 2 },
            label: { formatter: '80% Cutoff', color: '#f59e0b' }
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 8. Compare Mode: Grouped Metric Variance Chart
  renderCompareBarChart(domId, compareData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const { statsA, statsB, valA, valB } = compareData;
    const metrics = [
      { name: 'Revenue (₹M)', valA: statsA.revenue / 1e6, valB: statsB.revenue / 1e6 },
      { name: 'Orders (k)', valA: statsA.orders / 1e3, valB: statsB.orders / 1e3 },
      { name: 'Units (k)', valA: statsA.units / 1e3, valB: statsB.units / 1e3 },
      { name: 'AOV (₹k)', valA: statsA.aov / 1e3, valB: statsB.aov / 1e3 },
      { name: 'Customers (k)', valA: statsA.customers / 1e3, valB: statsB.customers / 1e3 },
      { name: 'Avg Discount (%)', valA: statsA.discountPct, valB: statsB.discountPct }
    ];

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      }),
      legend: {
        data: [valA, valB],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      grid: { top: 35, right: 20, bottom: 25, left: 40 },
      xAxis: {
        type: 'category',
        data: metrics.map(m => m.name),
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: valA,
          type: 'bar',
          data: metrics.map(m => parseFloat(m.valA.toFixed(2))),
          itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: valB,
          type: 'bar',
          data: metrics.map(m => parseFloat(m.valB.toFixed(2))),
          itemStyle: { color: '#818cf8', borderRadius: [3, 3, 0, 0] }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 9. Compare Mode: Category Split Comparison
  renderCompareCategoryChart(domId, compareData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const { statsA, statsB, valA, valB } = compareData;
    const allCategories = ['Sports & Fitness', 'Beauty & Personal Care', 'Home & Kitchen', 'Electronics', 'Fashion'];

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: params => {
          let s = `<div style="font-weight:600;margin-bottom:4px;color:#f8fafc;">${params[0].name}</div>`;
          params.forEach(p => {
            s += `<div style="font-size:12px;color:#94a3b8;">${p.seriesName}: <b style="color:#f8fafc;">₹${p.value.toFixed(2)}M</b></div>`;
          });
          return s;
        }
      }),
      legend: {
        data: [valA, valB],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      grid: { top: 35, right: 20, bottom: 25, left: 55 },
      xAxis: {
        type: 'category',
        data: allCategories.map(c => c.split(' ')[0]),
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${v}M` },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          name: valA,
          type: 'bar',
          data: allCategories.map(cat => parseFloat(((statsA.categories[cat] || 0) / 1e6).toFixed(2))),
          itemStyle: { color: '#38bdf8', borderRadius: [3, 3, 0, 0] }
        },
        {
          name: valB,
          type: 'bar',
          data: allCategories.map(cat => parseFloat(((statsB.categories[cat] || 0) / 1e6).toFixed(2))),
          itemStyle: { color: '#818cf8', borderRadius: [3, 3, 0, 0] }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // ============================================================================
  // REXORA THEME SPECIALIZED BUILDERS
  // ============================================================================

  // 1. Inline Dynamic SVG Sparkline Generator
  createSparklineSVG(dataPoints, strokeColor = '#8b5cf6', width = 160, height = 32) {
    if (!dataPoints || dataPoints.length < 2) return '';
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = max - min || 1;
    const padding = 3;
    const w = width - padding * 2;
    const h = height - padding * 2;

    const coords = dataPoints.map((val, idx) => {
      const x = padding + (idx / (dataPoints.length - 1)) * w;
      const y = height - padding - ((val - min) / range) * h;
      return [x, y];
    });

    let pathD = `M ${coords[0][0]},${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      pathD += ` L ${coords[i][0]},${coords[i][1]}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1][0]},${height} L ${coords[0][0]},${height} Z`;
    const lastPoint = coords[coords.length - 1];

    return `
      <svg class="kpi-sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad-${strokeColor.replace('#', '')}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="${areaD}" fill="url(#spark-grad-${strokeColor.replace('#', '')})" />
        <path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="${lastPoint[0]}" cy="${lastPoint[1]}" r="3" fill="${strokeColor}" />
      </svg>
    `;
  },

  // 2. Revenue Realization vs Discount Impact Concentric Ring Gauge
  renderRealizationGauge(domId, realizationPct, discountPct) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'item',
        formatter: '{b}: <b>{c}%</b>'
      }),
      legend: { show: false },
      series: [
        {
          name: 'Revenue Flow',
          type: 'pie',
          radius: ['68%', '88%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: false,
          label: {
            show: true,
            position: 'center',
            formatter: () => `{val|${realizationPct.toFixed(1)}%}\n{label|Realization}`,
            rich: {
              val: {
                fontSize: 18,
                fontWeight: 700,
                color: '#f8fafc',
                fontFamily: "'Inter', sans-serif"
              },
              label: {
                fontSize: 10,
                color: '#94a3b8',
                padding: [4, 0, 0, 0]
              }
            }
          },
          labelLine: { show: false },
          data: [
            {
              value: parseFloat(realizationPct.toFixed(1)),
              name: 'Net Realized Revenue',
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                  { offset: 0, color: '#8b5cf6' },
                  { offset: 1, color: '#06b6d4' }
                ]),
                borderRadius: 4
              }
            },
            {
              value: parseFloat(discountPct.toFixed(1)),
              name: 'Promotional Discounts Given',
              itemStyle: {
                color: 'rgba(244, 63, 94, 0.75)',
                borderRadius: 4
              }
            }
          ]
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 3. Day of Week × Month Seasonality Heatmap
  renderSeasonalityHeatmap(domId, heatmapData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const { matrix = [], dayNames = [], monthNames = [] } = heatmapData || {};
    const nonZero = matrix.map(m => m[2]).filter(v => v > 0);
    const minVal = nonZero.length > 0 ? Math.min(...nonZero) * 0.96 : 0;
    const maxVal = nonZero.length > 0 ? Math.max(...nonZero) * 1.02 : 1000000;

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        position: 'top',
        formatter: (p) => {
          const month = monthNames[p.value[0]] || '';
          const day = dayNames[p.value[1]] || '';
          const rev = p.value[2] || 0;
          const orders = p.value[3] || 0;
          return `<div style="font-weight:700;color:#c4b5fd;">${day}, ${month}</div>
                  <div>Revenue: <b style="color:#38bdf8;">₹${(rev / 1e6).toFixed(2)}M</b></div>
                  <div>Transactions: <b style="color:#10b981;">${orders.toLocaleString()} orders</b></div>`;
        }
      }),
      grid: { top: 25, right: 30, bottom: 65, left: 65 },
      xAxis: {
        type: 'category',
        data: monthNames,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.01)', 'rgba(0,0,0,0.05)'] } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      yAxis: {
        type: 'category',
        data: dayNames,
        splitArea: { show: true },
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      visualMap: {
        dimension: 2,
        min: Math.floor(minVal),
        max: Math.ceil(maxVal),
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: 8,
        itemWidth: 14,
        itemHeight: 220,
        text: ['Peak Velocity', 'Baseline'],
        textStyle: { color: '#94a3b8', fontSize: 10 },
        inRange: {
          color: ['#0f172a', '#1e1b4b', '#312e81', '#4338ca', '#6366f1', '#8b5cf6', '#a855f7', '#06b6d4', '#10b981']
        },
        outOfRange: {
          color: 'rgba(15, 23, 42, 0.6)'
        }
      },
      series: [
        {
          name: 'Seasonality Velocity',
          type: 'heatmap',
          data: matrix,
          label: {
            show: true,
            formatter: (p) => p.value[2] > 0 ? `₹${(p.value[2] / 1e6).toFixed(1)}M` : '',
            fontSize: 10,
            fontWeight: 600,
            color: '#f8fafc'
          },
          itemStyle: {
            borderColor: '#070a13',
            borderWidth: 2,
            borderRadius: 4
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 14,
              shadowColor: 'rgba(56, 189, 248, 0.6)',
              borderColor: '#38bdf8',
              borderWidth: 2
            }
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 4. Product Pareto Analysis Curve (80/20 Rule)
  renderParetoChart(domId, paretoData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const xData = paretoData.map(p => `SKU ${p.rank}`);
    const revData = paretoData.map(p => p.revenue);
    const cumData = paretoData.map(p => p.cumRevenuePct);

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'axis',
        formatter: (params) => {
          const idx = params[0].dataIndex;
          const p = paretoData[idx];
          return `<div style="font-weight:700;color:#38bdf8;">#${p.rank}: ${p.productName}</div>
                  <div style="font-size:11px;color:#94a3b8;">${p.category}</div>
                  <div style="margin-top:4px;">Revenue: <b>₹${(p.revenue / 1e6).toFixed(2)}M</b></div>
                  <div>Cumulative Share: <b style="color:#06b6d4;">${p.cumRevenuePct}%</b></div>`;
        }
      }),
      legend: {
        data: ['SKU Net Revenue', 'Cumulative %'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
      },
      yAxis: [
        {
          type: 'value',
          name: 'Revenue (₹)',
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${(v / 1e6).toFixed(1)}M` },
          splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        {
          type: 'value',
          name: 'Cumulative %',
          min: 0,
          max: 100,
          nameTextStyle: { color: '#64748b', fontSize: 10 },
          axisLabel: { color: '#64748b', fontSize: 10, formatter: '{value}%' },
          splitLine: { show: false }
        }
      ],
      series: [
        {
          name: 'SKU Net Revenue',
          type: 'bar',
          data: revData,
          itemStyle: { color: '#8b5cf6', opacity: 0.85 }
        },
        {
          name: 'Cumulative %',
          type: 'line',
          yAxisIndex: 1,
          data: cumData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2.5, color: '#06b6d4' }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  },

  // 5. Price vs Demand Scatter Plot (Elasticity Proxy)
  renderPriceElasticityScatter(domId, scatterData) {
    const chart = this.getChart(domId);
    if (!chart) return;

    const data = scatterData.map(p => [p.unitPrice, p.unitsSold, p.revenue, p.name, p.category]);

    const option = {
      ...this.getBaseOption(),
      tooltip: this.getTooltip({
        trigger: 'item',
        formatter: (p) => {
          const item = p.value;
          return `<b style="color:#38bdf8;">${item[3]}</b> <span style="color:#94a3b8;">(${item[4]})</span><br/>
                  Price: <b>₹${item[0].toLocaleString()}</b><br/>
                  Units Sold: <b>${item[1].toLocaleString()}</b><br/>
                  Net Revenue: <b>₹${(item[2] / 1e6).toFixed(2)}M</b>`;
        }
      }),
      xAxis: {
        type: 'value',
        name: 'Unit Price (₹)',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10, formatter: v => `₹${v}` },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      yAxis: {
        type: 'value',
        name: 'Units Moved',
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
      },
      series: [
        {
          type: 'scatter',
          data,
          symbolSize: (val) => Math.min(24, Math.max(6, Math.sqrt(val[2] / 20000))),
          itemStyle: {
            color: new echarts.graphic.RadialGradient(0.4, 0.3, 1, [
              { offset: 0, color: 'rgba(139, 92, 246, 0.85)' },
              { offset: 1, color: 'rgba(6, 182, 212, 0.65)' }
            ]),
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        }
      ]
    };

    chart.setOption(option, true);
    chart.resize();
  }
};

let _chartResizeDebounce = null;
window.addEventListener('resize', () => {
  if (_chartResizeDebounce) clearTimeout(_chartResizeDebounce);
  _chartResizeDebounce = setTimeout(() => {
    ChartManager.resizeAll();
  }, 150);
});
