document.addEventListener('DOMContentLoaded', function () {
    const PATHS = {
        off: '/athon_calc/off.html',
        faq: '/faq/faq.html'
    };

    const floatingBtn = document.getElementById('floating-btn');
    const menuPanel = document.getElementById('menu-panel');
    const pageLoader = document.getElementById('page-loader');
    const cursorEl = document.getElementById('cursor');
    const modal = document.getElementById('modal');
    const modalFrame = document.getElementById('modal-frame');
    const modalClose = document.getElementById('modal-close');
    const modalLoading = document.querySelector('.modal-loading');

    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

    function hideCursor() {
        if (!cursorEl) return;
        cursorEl.classList.add('cursor-hidden');
    }
    function showCursor() {
        if (!cursorEl) return;
        cursorEl.classList.remove('cursor-hidden');
    }
    if (isTouchDevice) {
        if (cursorEl) cursorEl.style.display = 'none';
    }

    function showPageLoader() {
        if (pageLoader) pageLoader.classList.add('show');
        hideCursor();
    }
    function hidePageLoader() {
        if (pageLoader) pageLoader.classList.remove('show');
        if (!isTouchDevice) showCursor();
    }
    function showModalLoader() {
        if (modalLoading) modalLoading.style.display = 'flex';
        hideCursor();
    }
    function hideModalLoader() {
        if (modalLoading) modalLoading.style.display = 'none';
        if (!isTouchDevice) showCursor();
    }

    function closeMenu() {
        if (!menuPanel) return;
        menuPanel.style.display = 'none';
        if (floatingBtn) floatingBtn.setAttribute('aria-expanded', 'false');
        menuPanel.setAttribute('aria-hidden', 'true');
    }
    function openMenu() {
        if (!menuPanel) return;
        menuPanel.style.display = 'block';
        if (floatingBtn) floatingBtn.setAttribute('aria-expanded', 'true');
        menuPanel.setAttribute('aria-hidden', 'false');
    }

    if (floatingBtn && menuPanel) {
        floatingBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            menuPanel.style.display === 'block' ? closeMenu() : openMenu();
        });
        document.addEventListener('click', function (e) {
            if (!menuPanel.contains(e.target) && !floatingBtn.contains(e.target)) closeMenu();
        });
        document.querySelectorAll('.menu-tabs .tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const n = this.dataset.tab;
                document.querySelectorAll('.menu-tabs .tab').forEach(t => {
                    const is = t === this;
                    t.classList.toggle('active', is);
                    t.setAttribute('aria-selected', is ? 'true' : 'false');
                });
                document.querySelectorAll('[data-panel]').forEach(p => p.hidden = String(p.dataset.panel) !== String(n));
            });
        });
    }

    window.switchTab = function (n) {
        document.querySelectorAll('.menu-tabs .tab').forEach(t => {
            const is = String(t.dataset.tab) === String(n);
            t.classList.toggle('active', is);
            t.setAttribute('aria-selected', is ? 'true' : 'false');
        });
        document.querySelectorAll('[data-panel]').forEach(p => p.hidden = String(p.dataset.panel) !== String(n));
    };

    function openModule(key) {
        const url = PATHS[key] || key;
        if (!modal || !modalFrame) return;
        showModalLoader();
        modalFrame.src = url;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        hideCursor();
        setTimeout(() => hideModalLoader(), 600);
    }

    function closeModule() {
        if (!modal || !modalFrame) return;
        modalFrame.src = '';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        if (!isTouchDevice) showCursor();
    }

    window.openModule = openModule;
    window.closeModule = closeModule;

    document.querySelectorAll('[data-module]').forEach(el => {
        el.addEventListener('click', function (e) {
            const key = this.dataset.module;
            if (!key) return;
            openModule(key);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const key = this.dataset.module;
                if (!key) return;
                openModule(key);
            }
        });
        el.addEventListener('pointerenter', hideCursor);
        el.addEventListener('pointerleave', () => { if (!isTouchDevice) showCursor(); });
    });

    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModule();
        });
    }

    function escHandler(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (modal && modal.classList && modal.classList.contains('show')) closeModule();
            closeMenu();
        }
    }
    window.addEventListener('keydown', escHandler, true);

    if (modalClose) {
        modalClose.addEventListener('click', function (e) {
            e.stopPropagation();
            closeModule();
        });
    }

    if (modalFrame) {
        modalFrame.addEventListener('load', function () {
            hideModalLoader();
            hidePageLoader();
            hideCursor();
        });
    }

    if (!isTouchDevice && cursorEl) {
        document.addEventListener('mousemove', function (e) {
            if (!cursorEl || cursorEl.classList.contains('cursor-hidden')) return;
            cursorEl.style.left = e.clientX + 'px';
            cursorEl.style.top = e.clientY + 'px';
        }, { passive: true });
    }

    if (!isTouchDevice && cursorEl) {
        const interactiveSelector = 'a, button, input, textarea, select, label, .btn, .module-card, .mini-preview, .module-body, .menu-panel';
        document.querySelectorAll(interactiveSelector).forEach(node => {
            node.addEventListener('pointerenter', hideCursor);
            node.addEventListener('pointerleave', () => { if (!isTouchDevice) showCursor(); });
            node.addEventListener('focus', hideCursor, true);
            node.addEventListener('blur', () => { if (!isTouchDevice) showCursor(); }, true);
        });
    }

    document.querySelectorAll('a[href]').forEach(a => {
        const href = a.getAttribute('href');
        const target = a.getAttribute('target');
        if (!href) return;
        if (target && target.toLowerCase() === '_blank') return;
        a.addEventListener('click', function () {
            showPageLoader();
        });
    });

    window.addEventListener('pageshow', function () { hidePageLoader(); if (!isTouchDevice) showCursor(); });
    window.addEventListener('beforeunload', function () { hideCursor(); showPageLoader(); });

    document.querySelectorAll('.mini-preview').forEach(container => {
        container.addEventListener('pointerenter', hideCursor);
        container.addEventListener('pointerleave', () => { if (!isTouchDevice) showCursor(); });
        const iframe = container.querySelector('iframe.mini-frame');
        if (!iframe) return;
        const data = container.dataset.src;
        if (data && (!iframe.src || iframe.src.trim() === '')) iframe.src = data;
        iframe.addEventListener('error', () => {
            iframe.style.display = 'none';
            const fb = container.querySelector('.preview-fallback');
            if (fb) fb.style.display = 'flex';
        });
    });

    setTimeout(() => { if (!isTouchDevice) showCursor(); }, 120);
});
