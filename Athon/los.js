document.addEventListener('DOMContentLoaded', function () {
    const PATHS = { carne: 'carne.html', off: 'off.html' };

    const floatingBtn = document.getElementById('floating-btn');
    const menuPanel = document.getElementById('menu-panel');
    if (floatingBtn && menuPanel) {
        floatingBtn.addEventListener('click', function (e) { e.stopPropagation(); menuPanel.style.display = (menuPanel.style.display === 'block') ? 'none' : 'block'; });
        document.addEventListener('click', function (e) { if (!menuPanel.contains(e.target) && e.target !== floatingBtn) menuPanel.style.display = 'none'; });
    }
    window.switchTab = function (n) {
        document.getElementById('panel-1').style.display = n === 1 ? 'block' : 'none';
        document.getElementById('panel-2').style.display = n === 2 ? 'block' : 'none';
    };

    const modal = document.getElementById('modal');
    const modalFrame = document.getElementById('modal-frame');
    const modalClose = document.getElementById('modal-close');

    function openModule(key) {
        const url = PATHS[key] || key;
        modalFrame.src = url;
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';

        try { window.focus(); } catch (e) { }
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

    document.querySelectorAll('button[data-module]').forEach(btn => {
        btn.addEventListener('click', function () {
            const key = this.dataset.module;
            openModule(key);
        });
    });

    modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModule();
    });

    function escHandler(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            if (modal.classList.contains('show')) { closeModule(); }
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
                if (!h) {
                }
            } catch (err) {
            }
        }, 1200);
    });

});


