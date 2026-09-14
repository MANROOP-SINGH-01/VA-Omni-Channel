/**
 * powerbi_view.js
 * Power BI Dashboard Showcase Controller (Exact Codebasics Presentation Style)
 * Omni-Channel Retail Sales & Customer Insights
 */

const PowerBIView = {
  initialized: false,
  currentSlide: 1,
  embedMode: 'live', // 'live' | 'pdf'
  defaultEmbedUrl: 'https://app.powerbi.com/view?r=eyJrIjoiMWUxMzM0ZmEtNTQ1My00MzhhLThhOTUtOGNkYjE1MTA4NjBiIiwidCI6ImM2ZTU0OWIzLTVmNDUtNDAzMi1hYWU5LWQ0MjQ0ZGM1YjJjNCJ9',
  pdfPath: 'Sales Analytics Dashboard.pdf',

  init() {
    if (this.initialized) return;

    this.bindSlideControls();
    this.bindEmbedControls();
    this.bindCustomUrlControls();
    this.bindFullscreen();

    // Check for saved custom URL
    const savedUrl = localStorage.getItem('user_powerbi_service_url');
    if (savedUrl) {
      const input = document.getElementById('pbi-custom-embed-input');
      if (input) input.value = savedUrl;
      this.setIframeSrc(savedUrl);
    }

    this.initialized = true;
  },

  bindSlideControls() {
    const pillBtns = document.querySelectorAll('.slider-pill-btn');
    pillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const slideNum = parseInt(btn.getAttribute('data-slide'), 10);
        this.goToSlide(slideNum);
      });
    });

    const prevBtn = document.getElementById('pbi-btn-slide-prev');
    const nextBtn = document.getElementById('pbi-btn-slide-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const target = this.currentSlide === 1 ? 2 : 1;
        this.goToSlide(target);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const target = this.currentSlide === 1 ? 2 : 1;
        this.goToSlide(target);
      });
    }
  },

  goToSlide(slideNum) {
    this.currentSlide = slideNum;
    const s1 = document.getElementById('pbi-slide-1');
    const s2 = document.getElementById('pbi-slide-2');

    if (s1 && s2) {
      if (slideNum === 1) {
        s1.style.display = 'block';
        s2.style.display = 'none';
      } else {
        s1.style.display = 'none';
        s2.style.display = 'block';
      }
    }

    document.querySelectorAll('.slider-pill-btn').forEach(b => {
      const bSlide = parseInt(b.getAttribute('data-slide'), 10);
      b.classList.toggle('active', bSlide === slideNum);
    });
  },

  bindEmbedControls() {
    const btnLive = document.getElementById('btn-pbi-view-live');
    const btnPdf = document.getElementById('btn-pbi-view-pdf');

    if (btnLive) {
      btnLive.addEventListener('click', () => {
        this.embedMode = 'live';
        btnLive.classList.add('active');
        if (btnPdf) btnPdf.classList.remove('active');
        const activeUrl = localStorage.getItem('user_powerbi_service_url') || this.defaultEmbedUrl;
        this.setIframeSrc(activeUrl);
      });
    }

    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        this.embedMode = 'pdf';
        btnPdf.classList.add('active');
        if (btnLive) btnLive.classList.remove('active');
        this.setIframeSrc(this.pdfPath);
      });
    }
  },

  bindCustomUrlControls() {
    const toggleBtn = document.getElementById('btn-pbi-toggle-custom-url');
    const bar = document.getElementById('pbi-custom-url-bar');
    const applyBtn = document.getElementById('btn-apply-custom-url');
    const resetBtn = document.getElementById('btn-reset-default-url');
    const input = document.getElementById('pbi-custom-embed-input');

    if (toggleBtn && bar) {
      toggleBtn.addEventListener('click', () => {
        const isHidden = bar.style.display === 'none';
        bar.style.display = isHidden ? 'block' : 'none';
        toggleBtn.classList.toggle('active', isHidden);
      });
    }

    if (applyBtn && input) {
      applyBtn.addEventListener('click', () => {
        const url = input.value.trim();
        if (url) {
          localStorage.setItem('user_powerbi_service_url', url);
          this.setIframeSrc(url);
          const btnLive = document.getElementById('btn-pbi-view-live');
          const btnPdf = document.getElementById('btn-pbi-view-pdf');
          if (btnLive) btnLive.classList.add('active');
          if (btnPdf) btnPdf.classList.remove('active');
          if (bar) bar.style.display = 'none';
          if (toggleBtn) toggleBtn.classList.remove('active');
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        localStorage.removeItem('user_powerbi_service_url');
        if (input) input.value = '';
        this.setIframeSrc(this.defaultEmbedUrl);
        const btnLive = document.getElementById('btn-pbi-view-live');
        const btnPdf = document.getElementById('btn-pbi-view-pdf');
        if (btnLive) btnLive.classList.add('active');
        if (btnPdf) btnPdf.classList.remove('active');
        if (bar) bar.style.display = 'none';
        if (toggleBtn) toggleBtn.classList.remove('active');
      });
    }
  },

  setIframeSrc(src) {
    const iframe = document.getElementById('pbi-portfolio-iframe');
    if (iframe && iframe.src !== src) {
      iframe.src = src;
    }
  },

  bindFullscreen() {
    const btn = document.getElementById('btn-pbi-fullscreen-portal');
    const container = document.getElementById('pbi-embed-container');

    if (btn && container) {
      btn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (container.requestFullscreen) {
            container.requestFullscreen().catch(() => {
              container.classList.toggle('is-fullscreen');
            });
          } else if (container.webkitRequestFullscreen) {
            container.webkitRequestFullscreen();
          } else {
            container.classList.toggle('is-fullscreen');
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      });
    }
  },

  render() {
    this.init();
  }
};
