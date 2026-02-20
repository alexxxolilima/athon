document.addEventListener('DOMContentLoaded', () => {
    if (typeof IMask === 'undefined') {
        console.error("ERRO: IMask nao carregado. Adicione <script src='https://unpkg.com/imask'></script>");
        return;
    }

    const R = { PERCENTUAL_MULTA: 0.30 };
    const C = {
        DIAS_MES: 30,
        MAX_FIDELIDADE: 12,
        MAX_DIAS: 365,
        DEBOUNCE: 300,
        KEY_DATA: 'simulador_inputs'
    };

    const $ = (id) => document.getElementById(id);
    const DOM = {
        planoBase: $('planoBase'),
        mesesFid: $('mesesFidelidadeRestantes'),
        diasUso: $('diasDeUso'),
        custoEquip: $('custoEquipamento'),
        custoAd: $('custoAdicionalInput'),
        descPercent: $('descontoPercent'),
        qtdDesc: $('qtdMensalidadesDesconto'),
        svaInputs: Array.from(document.querySelectorAll('.sva-quantity')),
        resultadoCard: $('resultadoCard'),
        btnReset: $('btnReset'),
        btnCopy: $('btnCopyResults'),
        msgCopy: $('copySuccessMessage'),
        gPlano: $('group-planoBase'),
        gMeses: $('group-mesesFidelidadeRestantes'),
        gDias: $('group-diasDeUso') || $('group-dias-de-uso'),
        gDesc: $('group-mensalidadeDesconto'),
        out: {
            dias: $('diasACobrar'),
            valorMensal: $('valorMensalTotal'),
            multaFid: $('multaFidelidade'),
            proRata: $('proRata'),
            sva: $('totalSva'),
            equip: $('equipamento'),
            total: $('totalMulta'),
            extra: $('custoAdicionalOut'),
            multaDesc: $('multaMensalidadesDesconto')
        },
        dateBtn: $('dateRangeBtn'),
        datePanel: $('dateRangePanel'),
        drFrom: $('drFrom'),
        drTo: $('drTo'),
        drDiff: $('drDiffCalc'),
        drTotal: $('drTotalDays'),
        svaBtn: $('svaPanelBtn'),
        svaPanel: $('svaPanel')
    };

    const maskCfg = {
        mask: Number,
        scale: 2,
        signed: false,
        thousandsSeparator: '.',
        padFractionalZeros: true,
        normalizeZeros: true,
        radix: ',',
        mapToRadix: ['.']
    };

    const maskPlano = DOM.planoBase ? IMask(DOM.planoBase, maskCfg) : null;
    const maskCusto = DOM.custoAd ? IMask(DOM.custoAd, maskCfg) : null;

    const fmt = (v) => (isFinite(v) ? v : 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const getVal = (mask, el) => (mask ? Number(mask.typedValue || 0) : Number(el?.value || 0));

    function lerInputs() {
        const plano = getVal(maskPlano, DOM.planoBase);
        const custoAd = getVal(maskCusto, DOM.custoAd);
        const meses = Math.min(C.MAX_FIDELIDADE, Math.max(0, parseInt(DOM.mesesFid?.value || 0, 10)));
        const dias = Math.min(C.MAX_DIAS, Math.max(0, parseInt(DOM.diasUso?.value || 0, 10)));
        const equip = parseFloat(DOM.custoEquip?.value || 0) || 0;
        const desc = Math.min(100, Math.max(0, parseFloat(DOM.descPercent?.value || 0)));
        const qtdDesc = Math.max(0, Math.min(C.MAX_FIDELIDADE, parseInt(DOM.qtdDesc?.value || 0, 10)));

        let svaTotal = 0;
        const svaData = [];

        DOM.svaInputs.forEach((i) => {
            const q = Math.max(0, parseInt(i.value || 0, 10));
            const p = parseFloat(i.dataset.price || 0);
            const name = i.dataset.svaName || i.parentElement.querySelector('.sva-name')?.textContent || 'SVA';
            const total = q * p;
            svaTotal += total;
            svaData.push({ name, q, total });
        });

        const data = {
            plano,
            custoAd,
            meses,
            dias,
            equip,
            desc,
            qtdDesc,
            svaTotal,
            svaData,
            rawPlano: maskPlano?.unmaskedValue,
            rawCusto: maskCusto?.unmaskedValue
        };

        salvarStorage(data);
        return data;
    }

    function calcular(d) {
        let proRata = 0;
        if (d.dias > 0 && d.plano > 0) proRata = (d.plano / C.DIAS_MES) * d.dias;

        let multa = 0;
        if (d.meses > 0) multa = d.plano * d.meses * R.PERCENTUAL_MULTA;

        let multaDesc = 0;
        if (d.qtdDesc > 0 && d.plano > 0) {
            const valorComDesc = d.plano * (1 - d.desc / 100);
            multaDesc = valorComDesc * d.qtdDesc;
        }

        const total = multa + proRata + d.svaTotal + d.equip + d.custoAd + multaDesc;
        return { multa, proRata, equip: d.equip, extra: d.custoAd, total, sva: d.svaTotal, multaDesc, plano: d.plano };
    }

    function render(res, dias, plano) {
        const set = (el, txt) => {
            if (el) el.textContent = txt;
        };

        set(DOM.out.dias, `${dias} dias`);
        set(DOM.out.valorMensal, fmt(plano));
        set(DOM.out.proRata, fmt(res.proRata));
        set(DOM.out.multaFid, fmt(res.multa));
        set(DOM.out.sva, fmt(res.sva));
        set(DOM.out.equip, fmt(res.equip));
        set(DOM.out.extra, fmt(res.extra));
        set(DOM.out.multaDesc, fmt(res.multaDesc));
        set(DOM.out.total, fmt(res.total));
    }

    function toggleResult(show) {
        const el = DOM.resultadoCard;
        if (!el) return;

        if (show) {
            el.classList.remove('animate-exit');
            el.classList.add('visible', 'animate-entrance');
        } else {
            if (!el.classList.contains('visible')) return;
            el.classList.remove('animate-entrance');
            el.classList.add('animate-exit');
            setTimeout(() => el.classList.remove('visible', 'animate-exit'), 500);
        }
    }

    function setError(el, group, msg, isErr) {
        if (!group) return;
        group.classList.toggle('has-error', isErr);
        if (el) el.setAttribute('aria-invalid', isErr);
        const f = group.querySelector('.error-feedback') || document.getElementById(el?.getAttribute('aria-describedby'));
        if (f) f.textContent = msg;
    }

    function validar(visual = true) {
        let ok = true;

        const p = getVal(maskPlano, DOM.planoBase);
        const pOk = p > 0;
        if (visual) setError(DOM.planoBase, DOM.gPlano, 'Insira um valor maior que R$ 0,00.', !pOk);
        if (!pOk) ok = false;

        const m = parseInt(DOM.mesesFid?.value || 0, 10);
        const mOk = m >= 0 && m <= C.MAX_FIDELIDADE;
        if (visual && !mOk) setError(DOM.mesesFid, DOM.gMeses, `Entre 0 e ${C.MAX_FIDELIDADE}.`, true);
        if (!mOk) ok = false;

        const d = parseInt(DOM.diasUso?.value || 0, 10);
        const dOk = d >= 0 && d <= C.MAX_DIAS;
        if (visual && !dOk) setError(DOM.diasUso, DOM.gDias, `Entre 0 e ${C.MAX_DIAS}.`, true);
        if (!dOk) ok = false;

        return ok;
    }

    function calcularEExibir() {
        const d = lerInputs();
        const valid = validar(false);

        if (!valid || d.plano + d.svaTotal + d.equip + d.custoAd + d.meses + d.dias === 0) {
            toggleResult(false);
            render({ multa: 0, proRata: 0, equip: 0, extra: 0, total: 0, sva: 0, multaDesc: 0 }, 0, 0);
            return;
        }

        const res = calcular(d);
        render(res, d.dias, d.plano);
        toggleResult(res.total > 0);
    }

    function salvarStorage(d) {
        try {
            const payload = {
                plano: d.rawPlano,
                custo: d.rawCusto,
                meses: d.meses,
                dias: d.dias,
                equip: d.equip,
                desc: d.desc,
                qtdDesc: d.qtdDesc,
                sva: DOM.svaInputs.map((i) => ({ p: i.dataset.price, v: i.value }))
            };
            localStorage.setItem(C.KEY_DATA, JSON.stringify(payload));
        } catch (e) {
            // noop
        }
    }

    function carregarStorage() {
        try {
            const raw = localStorage.getItem(C.KEY_DATA);
            if (!raw) return;
            const d = JSON.parse(raw);

            if (d.plano && maskPlano) maskPlano.unmaskedValue = d.plano;
            if (d.custo && maskCusto) maskCusto.unmaskedValue = d.custo;
            if (DOM.mesesFid) DOM.mesesFid.value = d.meses || 0;
            if (DOM.diasUso) DOM.diasUso.value = d.dias || 0;
            if (DOM.custoEquip) DOM.custoEquip.value = d.equip || 0;
            if (DOM.descPercent) DOM.descPercent.value = d.desc || '';
            if (DOM.qtdDesc) DOM.qtdDesc.value = d.qtdDesc || 0;

            if (d.sva) {
                d.sva.forEach((s) => {
                    const el = DOM.svaInputs.find((i) => i.dataset.price === s.p);
                    if (el) el.value = s.v;
                });
            }
        } catch (e) {
            localStorage.removeItem(C.KEY_DATA);
        }
    }

    function resetAll() {
        if (DOM.planoBase) DOM.planoBase.value = '';
        if (maskPlano) maskPlano.updateValue();
        if (DOM.custoAd) DOM.custoAd.value = '';
        if (maskCusto) maskCusto.updateValue();

        [DOM.mesesFid, DOM.diasUso, DOM.custoEquip, DOM.qtdDesc].forEach((e) => {
            if (e) e.value = 0;
        });

        if (DOM.descPercent) DOM.descPercent.value = '';
        DOM.svaInputs.forEach((i) => {
            i.value = 0;
        });

        [DOM.gPlano, DOM.gMeses, DOM.gDias, DOM.gDesc].forEach((g) => g?.classList.remove('has-error'));

        localStorage.removeItem(C.KEY_DATA);
        calcularEExibir();
    }

    let copyUiTimer = null;

    function showCopyFeedback(success) {
        const label = DOM.btnCopy?.querySelector('.btn-copy-label');

        if (DOM.msgCopy) {
            DOM.msgCopy.textContent = success ? 'Copiado!' : 'Nao foi possivel copiar';
            DOM.msgCopy.classList.add('show');
        }

        if (DOM.btnCopy) DOM.btnCopy.classList.toggle('copied', !!success);
        if (label) label.textContent = success ? 'Copiado!' : 'Copiar';

        clearTimeout(copyUiTimer);
        copyUiTimer = setTimeout(() => {
            if (DOM.msgCopy) DOM.msgCopy.classList.remove('show');
            if (DOM.btnCopy) DOM.btnCopy.classList.remove('copied');
            if (label) label.textContent = 'Copiar';
        }, 2000);
    }

    function fallbackCopy(text) {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.opacity = '0';
        area.style.pointerEvents = 'none';
        document.body.appendChild(area);
        area.focus();
        area.select();
        area.setSelectionRange(0, area.value.length);

        let ok = false;
        try {
            ok = document.execCommand('copy');
        } catch (e) {
            ok = false;
        }

        document.body.removeChild(area);
        return ok;
    }

    function copyResults() {
        const d = lerInputs();
        const r = calcular(d);
        if (r.total <= 0) return;

        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

        const lines = [
            `Cliente negativado em: ${dateStr}`,
            '',
            `Valor total da dívida: ${fmt(r.total)}`
        ];

        if (r.proRata > 0) lines.push(`${fmt(r.proRata)} - ${d.dias} dias de uso`);
        if (r.multa > 0) lines.push(`${fmt(r.multa)} - ${d.meses} meses de multa`);
        if (r.multaDesc > 0) lines.push(`${fmt(r.multaDesc)} - Mensalidades desc. (${d.qtdDesc}x ${d.desc}%)`);
        if (r.extra > 0) lines.push(`${fmt(r.extra)} - Custo adicional`);
        if (r.equip > 0) lines.push(`${fmt(r.equip)} - Equipamento não devolvido`);

        if (r.sva > 0) {
            lines.push(`${fmt(r.sva)} - SVAs`);
            d.svaData
                .filter((s) => s.q > 0)
                .forEach((s) => lines.push(`  * ${s.name}: ${s.q} x ${fmt(s.total / s.q)} = ${fmt(s.total)}`));
        }
        const payload = lines.join('\n');

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard
                .writeText(payload)
                .then(() => showCopyFeedback(true))
                .catch(() => showCopyFeedback(fallbackCopy(payload)));
            return;
        }

        showCopyFeedback(fallbackCopy(payload));
    }

    const debounce = (fn, ms) => {
        let t;
        return (...a) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...a), ms);
        };
    };

    const calcDebounced = debounce(calcularEExibir, C.DEBOUNCE);

    const inputs = [
        DOM.planoBase,
        DOM.mesesFid,
        DOM.diasUso,
        DOM.custoEquip,
        DOM.custoAd,
        DOM.descPercent,
        DOM.qtdDesc,
        ...DOM.svaInputs
    ].filter(Boolean);

    document.querySelectorAll('[data-sva-step]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-sva-name');
            const step = parseInt(btn.getAttribute('data-sva-step') || '0', 10);
            const target = DOM.svaInputs.find((i) => String(i.dataset.svaName) === String(key));
            if (!target || !step) return;
            const current = Math.max(0, parseInt(target.value || 0, 10));
            const next = Math.max(0, current + step);
            target.value = next;
            target.dispatchEvent(new Event('input', { bubbles: true }));
        });
    });

    inputs.forEach((i) => {
        i.addEventListener('input', calcDebounced);
        if (i.type === 'number' || i.tagName === 'SELECT') {
            i.addEventListener('change', () => {
                validar(true);
                calcDebounced();
            });
        }
    });

    if (maskPlano) {
        maskPlano.on('complete', () => {
            validar(true);
            calcDebounced();
        });
    }

    if (maskCusto) maskCusto.on('accept', calcDebounced);
    if (DOM.btnReset) DOM.btnReset.addEventListener('click', resetAll);
    if (DOM.btnCopy) DOM.btnCopy.addEventListener('click', copyResults);

    document.body.classList.add('dark-mode');
    carregarStorage();
    calcularEExibir();

    (function calendarModule() {
        if (!DOM.dateBtn || !DOM.datePanel) return;

        let picker = document.getElementById('datePickerWidget');

        if (!picker) {
            picker = document.createElement('div');
            picker.id = 'datePickerWidget';
            DOM.datePanel.appendChild(picker);
        }

        const pad = (n) => String(n).padStart(2, '0');

        const parseBr = (s) => {
            if (!s) return null;
            const p = s.split('/');
            return p.length === 3 ? new Date(+p[2], +p[1] - 1, +p[0]) : null;
        };

        const fmtBr = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

        const diffDays = (a, b) =>
            Math.round(
                (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
                    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) /
                    86400000
            );

        function buildCal(m, y, input) {
            picker.innerHTML = '';

            const head = document.createElement('div');
            const prev = document.createElement('button');
            prev.textContent = '<';
            prev.onclick = (e) => {
                e.stopPropagation();
                buildCal(m < 1 ? 11 : m - 1, m < 1 ? y - 1 : y, input);
            };

            const next = document.createElement('button');
            next.textContent = '>';
            next.onclick = (e) => {
                e.stopPropagation();
                buildCal(m > 10 ? 0 : m + 1, m > 10 ? y + 1 : y, input);
            };

            const title = document.createElement('strong');
            title.textContent = `${pad(m + 1)}/${y}`;

            head.append(prev, title, next);
            picker.appendChild(head);

            const grid = document.createElement('div');
            grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center';

            const weeks = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
            weeks.forEach((w) => {
                const el = document.createElement('div');
                el.textContent = w;
                el.style.cssText = 'font-size:0.75rem; font-weight:bold; color:var(--text-muted); padding-bottom:4px;';
                grid.appendChild(el);
            });

            const daysInMonth = new Date(y, m + 1, 0).getDate();
            const startDay = new Date(y, m, 1).getDay();

            for (let i = 0; i < startDay; i += 1) grid.appendChild(document.createElement('div'));

            for (let d = 1; d <= daysInMonth; d += 1) {
                const btn = document.createElement('button');
                btn.textContent = d;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    input.value = fmtBr(new Date(y, m, d));
                    updateDiff();
                };
                grid.appendChild(btn);
            }

            picker.appendChild(grid);
        }

        let activeInput = null;

        function showCal(input) {
            if (activeInput === input && picker.style.display === 'block') return;
            activeInput = input;

            const d = parseBr(input.value) || new Date();
            buildCal(d.getMonth(), d.getFullYear(), input);
            picker.style.display = 'block';
        }

        function outsideClick(e) {
            const clickOnDateBtn = DOM.dateBtn.contains(e.target);
            const clickOnDatePanel = DOM.datePanel.contains(e.target);
            const clickOnSvaBtn = DOM.svaBtn && DOM.svaBtn.contains(e.target);
            const clickOnSvaPanel = DOM.svaPanel && DOM.svaPanel.contains(e.target);

            if (!clickOnDatePanel && !clickOnDateBtn) {
                DOM.datePanel.style.display = 'none';
                DOM.datePanel.setAttribute('data-visible', 'false');
            }
            if (DOM.svaPanel && !clickOnSvaPanel && !clickOnSvaBtn) {
                DOM.svaPanel.style.display = 'none';
                DOM.svaPanel.setAttribute('data-visible', 'false');
            }
        }

        function positionDatePanel() {
            if (window.innerWidth <= 900) {
                DOM.datePanel.style.left = '50%';
                DOM.datePanel.style.top = '50%';
                DOM.datePanel.style.right = 'auto';
                DOM.datePanel.style.transform = 'translate(-50%, -50%)';
                return;
            }

            const header = document.querySelector('.header-content');
            const headerRect = header ? header.getBoundingClientRect() : DOM.dateBtn.getBoundingClientRect();
            const panelWidth = DOM.datePanel.offsetWidth || 300;
            const marginRight = 24;
            const left = window.scrollX + window.innerWidth - panelWidth - marginRight;
            const top = window.scrollY + headerRect.top;

            DOM.datePanel.style.left = `${left}px`;
            DOM.datePanel.style.top = `${top}px`;
            DOM.datePanel.style.right = 'auto';
            DOM.datePanel.style.transform = 'none';
        }

        function positionSvaPanel() {
            if (!DOM.svaBtn || !DOM.svaPanel) return;
            if (window.innerWidth <= 900) {
                DOM.svaPanel.style.left = '50%';
                DOM.svaPanel.style.top = '50%';
                DOM.svaPanel.style.right = 'auto';
                DOM.svaPanel.style.transform = 'translate(-50%, -50%)';
                return;
            }

            const header = document.querySelector('.header-content');
            const headerRect = header ? header.getBoundingClientRect() : DOM.svaBtn.getBoundingClientRect();
            const marginRight = 24;
            const top = window.scrollY + headerRect.top;
            let panelWidth = DOM.svaPanel.offsetWidth || 320;

            const resultRect = DOM.resultadoCard ? DOM.resultadoCard.getBoundingClientRect() : null;
            if (resultRect) {
                const availableRight = Math.floor(window.innerWidth - resultRect.right - marginRight);
                const computedWidth = Math.min(320, Math.max(260, availableRight));
                panelWidth = computedWidth;
                DOM.svaPanel.style.width = `${computedWidth}px`;
            } else {
                DOM.svaPanel.style.width = '320px';
                panelWidth = 320;
            }

            const left = window.scrollX + window.innerWidth - panelWidth - marginRight;
            DOM.svaPanel.style.left = `${left}px`;
            DOM.svaPanel.style.top = `${top}px`;
            DOM.svaPanel.style.right = 'auto';
            DOM.svaPanel.style.transform = 'none';
        }

        function updateDiff() {
            const d1 = parseBr(DOM.drFrom.value);
            const d2 = parseBr(DOM.drTo.value);
            if (d1 && d2) {
                const diff = Math.max(0, diffDays(d1, d2));
                if (DOM.drDiff) DOM.drDiff.textContent = `${Math.floor(diff / 7)} sem, ${diff % 7} dias`;
                if (DOM.drTotal) DOM.drTotal.textContent = `${diff} dias total`;
                if (DOM.diasUso) {
                    DOM.diasUso.value = diff;
                    DOM.diasUso.dispatchEvent(new Event('input'));
                }
            }
        }

        document.addEventListener('click', outsideClick);

        DOM.dateBtn.onclick = (e) => {
            e.stopPropagation();
            const vis = DOM.datePanel.getAttribute('data-visible') === 'true';
            DOM.datePanel.style.display = vis ? 'none' : 'block';
            DOM.datePanel.setAttribute('data-visible', String(!vis));

            if (!vis && !DOM.drFrom.value) {
                const hoje = fmtBr(new Date());
                DOM.drFrom.value = hoje;
                DOM.drTo.value = hoje;
                updateDiff();
            }

            if (!vis) {
                if (DOM.svaPanel) {
                    DOM.svaPanel.style.display = 'none';
                    DOM.svaPanel.setAttribute('data-visible', 'false');
                }
                positionDatePanel();
                showCal(DOM.drFrom);
            }
        };

        if (DOM.svaBtn && DOM.svaPanel) {
            DOM.svaBtn.onclick = (e) => {
                e.stopPropagation();
                const vis = DOM.svaPanel.getAttribute('data-visible') === 'true';
                DOM.svaPanel.style.display = vis ? 'none' : 'block';
                DOM.svaPanel.setAttribute('data-visible', String(!vis));
                DOM.svaBtn.setAttribute('aria-expanded', String(!vis));
                if (!vis) {
                    DOM.datePanel.style.display = 'none';
                    DOM.datePanel.setAttribute('data-visible', 'false');
                    positionSvaPanel();
                }
            };
        }

        if (DOM.drFrom) {
            DOM.drFrom.addEventListener('click', (e) => {
                e.stopPropagation();
                showCal(DOM.drFrom);
            });
        }

        if (DOM.drTo) {
            DOM.drTo.addEventListener('click', (e) => {
                e.stopPropagation();
                showCal(DOM.drTo);
            });
        }

        DOM.datePanel.addEventListener('click', (e) => e.stopPropagation());
        if (DOM.svaPanel) DOM.svaPanel.addEventListener('click', (e) => e.stopPropagation());
        window.addEventListener('resize', () => {
            if (DOM.datePanel.getAttribute('data-visible') === 'true') positionDatePanel();
            if (DOM.svaPanel && DOM.svaPanel.getAttribute('data-visible') === 'true') positionSvaPanel();
        });
        window.addEventListener('scroll', () => {
            if (DOM.datePanel.getAttribute('data-visible') === 'true') positionDatePanel();
            if (DOM.svaPanel && DOM.svaPanel.getAttribute('data-visible') === 'true') positionSvaPanel();
        }, { passive: true });
    })();
});




