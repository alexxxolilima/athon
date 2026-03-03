document.addEventListener('DOMContentLoaded', function () {
    const PATHS = {
        off: './athon_calc/off.html',
        faq: './faq/faq.html'
    };

    const pageLoader = document.getElementById('page-loader');
    const cursorEl = document.getElementById('cursor');
    const modal = document.getElementById('modal');
    const modalFrame = document.getElementById('modal-frame');
    const modalClose = document.getElementById('modal-close');
    const modalLoading = document.querySelector('.modal-loading');
    const currentDateTimeEl = document.getElementById('current-datetime');

    const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

    function runRevealAnimation() {
        const nodes = Array.from(document.querySelectorAll('.reveal-item'));
        if (!nodes.length) return;
        if (reduceMotion) {
            nodes.forEach((node) => node.classList.add('is-visible'));
            return;
        }
        nodes.forEach((node, idx) => {
            setTimeout(() => node.classList.add('is-visible'), idx * 80);
        });
    }

    function startDateTimeClock() {
        if (!currentDateTimeEl) return;

        const fmt = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const tick = () => {
            const value = fmt.format(new Date()).replace(',', ' •');
            currentDateTimeEl.textContent = value;
        };

        tick();
        setInterval(tick, 1000);
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
        const interactiveSelector = 'a, button, input, textarea, select, label, .btn, .module-card, .ui-card, .mini-preview, .module-body';
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
    runRevealAnimation();
    startDateTimeClock();
});
