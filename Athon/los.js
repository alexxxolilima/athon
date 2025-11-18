document.addEventListener('DOMContentLoaded', function () {
    const PATHS = { carne: 'carne.html', off: 'off.html' };

    const floatingBtn = document.getElementById('floating-btn');
    const menuPanel = document.getElementById('menu-panel');

    function closeMenu() {
        if (!menuPanel) return;
        menuPanel.style.display = 'none';
        floatingBtn.setAttribute('aria-expanded', 'false');
        menuPanel.setAttribute('aria-hidden', 'true');
        document.querySelectorAll('.menu-tabs .tab').forEach(t => t.classList.remove('active'));
    }

    function openMenu() {
        if (!menuPanel) return;
        menuPanel.style.display = 'block';
        floatingBtn.setAttribute('aria-expanded', 'true');
        menuPanel.setAttribute('aria-hidden', 'false');
    }

    if (floatingBtn && menuPanel) {
        floatingBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (menuPanel.style.display === 'block') closeMenu(); else openMenu();
        });
        document.addEventListener('click', function (e) {
            if (!menuPanel.contains(e.target) && e.target !== floatingBtn) closeMenu();
        });
        document.querySelectorAll('.menu-tabs .tab').forEach(tab => {
            tab.addEventListener('click', function () {
                const n = this.dataset.tab;
                document.querySelectorAll('.menu-tabs .tab').forEach(t => { t.classList.toggle('active', t === this); t.setAttribute('aria-selected', t === this ? 'true' : 'false'); });
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

    const modal = document.getElementById('modal');
    const modalFrame = document.getElementById('modal-frame');
    const modalClose = document.getElementById('modal-close');
    const modalLoading = document.querySelector('.modal-loading');

    function openModule(key) {
        const url = PATHS[key] || key;
        if (modalLoading) modalLoading.style.display = 'flex';
        modalFrame.src = url;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        setTimeout(() => { if (modalLoading) modalLoading.style.display = 'none'; }, 600);
    }

    function closeModule() {
        modalFrame.src = '';
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
    }

    window.openModule = openModule;
    window.closeModule = closeModule;

    document.querySelectorAll('[data-module]').forEach(el => {
        el.addEventListener('click', function (e) {
            const key = this.dataset.module;
            openModule(key);
        });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const key = this.dataset.module;
                openModule(key);
            }
        });
    });

    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeModule();
        });
    }

    function escHandler(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (modal.classList.contains('show')) closeModule();
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

    document.querySelectorAll('.mini-preview').forEach(container => {
        const iframe = container.querySelector('iframe.mini-frame');
        if (!iframe) return;
        const data = container.dataset.src;
        if (data && (!iframe.src || iframe.src.trim() === '')) iframe.src = data;
        iframe.addEventListener('error', () => {
            iframe.style.display = 'none';
            const fb = container.querySelector('.preview-fallback');
            if (fb) fb.style.display = 'flex';
        });
        setTimeout(() => {
            try {
                const h = iframe.contentWindow && iframe.contentDocument && iframe.contentDocument.body ? iframe.contentDocument.body.scrollHeight : null;
                if (!h) { }
            } catch (err) { }
        }, 1200);
    });

    document.addEventListener('mousemove', function (e) {
        const cursor = document.getElementById('cursor');
        if (!cursor) return;
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }, { passive: true });
});
