/**
 * Caption Design — Tombstone Layout Application
 * Inline editing: click on any line in the preview to edit it
 */

(function () {
    'use strict';

    // === State ===
    const state = {
        width: 0,
        height: 0,
        text: '',
        lines: [],
        lineStyles: [],
        template: 'master',
        customTemplate: '',
        textAlign: 'center',
        lineSpacing: 1.5,
        locked: false,
        bottomLine: '',
        selectedLine: -1
    };

    // === DOM References ===
    const els = {
        step1: document.getElementById('step-1'),
        stepPreview: document.getElementById('step-preview'),
        stepFinal: document.getElementById('step-final'),
        stoneWidth: document.getElementById('stone-width'),
        stoneHeight: document.getElementById('stone-height'),
        stoneText: document.getElementById('stone-text'),
        textError: document.getElementById('text-error'),
        customTemplateSection: document.getElementById('custom-template-section'),
        customTemplate: document.getElementById('custom-template'),
        previewContainer: document.getElementById('preview-container'),
        finalPreview: document.getElementById('final-preview'),
        editPanel: document.getElementById('line-edit-panel'),
        editPanelLabel: document.getElementById('edit-panel-label'),
        editLineText: document.getElementById('edit-line-text'),
        editLineSize: document.getElementById('edit-line-size'),
        editLineSizeVal: document.getElementById('edit-line-size-val'),
        editLineBold: document.getElementById('edit-line-bold'),
        editLineAlign: document.getElementById('edit-line-align'),
        editLineUp: document.getElementById('edit-line-up'),
        editLineDown: document.getElementById('edit-line-down'),
        btnClosePanel: document.getElementById('btn-close-panel'),
        textAlign: document.getElementById('text-align'),
        lineSpacing: document.getElementById('line-spacing'),
        lineSpacingVal: document.getElementById('line-spacing-val'),
        modalSaved: document.getElementById('modal-saved'),
        savedList: document.getElementById('saved-list'),
        btnNew: document.getElementById('btn-new'),
        btnLoad: document.getElementById('btn-load'),
        btnGenerate: document.getElementById('btn-generate'),
        btnBack: document.getElementById('btn-back'),
        btnApprove: document.getElementById('btn-approve'),
        btnSave: document.getElementById('btn-save'),
        btnExportPdf: document.getElementById('btn-export-pdf'),
        btnEditAgain: document.getElementById('btn-edit-again'),
        btnCloseModal: document.getElementById('btn-close-modal')
    };

    // === Hebrew Validation ===
    function isHebrewOnly(text) {
        const allowed = /^[\u0590-\u05FF\uFB1D-\uFB4F0-9\s\n\r\t.,;:!?'"()\-–—✡\u201C\u201D\u201E\u05F4\u05F3\u2018\u2019/]+$/;
        const cleaned = text.replace(/\s/g, '');
        if (cleaned.length === 0) return false;
        return allowed.test(text);
    }

    // === TEMPLATE_MASTER: Classify Lines ===
    function classifyLinesMaster(lines) {
        if (lines.length === 0) return { classified: [], bottomLine: '' };

        const classified = [];
        let bottomLine = '';
        const total = lines.length;

        const lastLine = lines[total - 1].trim();
        const hasBottomSignature = /זצ"ל|זצוק"ל|ז"ל|נ"ע|ע"ה/.test(lastLine) && total > 8;
        if (hasBottomSignature) {
            bottomLine = lastLine;
        }

        const endIndex = hasBottomSignature ? total - 1 : total;

        for (let i = 0; i < endIndex; i++) {
            const line = lines[i].trim();
            if (line === '') {
                classified.push({ text: '', type: 'spacer', defaultSize: 0.5 });
                continue;
            }
            if (i === 0 && /^פ[""״]נ$/.test(line)) {
                classified.push({ text: line, type: 'header-marker', defaultSize: 1.8 });
                continue;
            }
            if (/^ת[\.\s]*נ[\.\s]*צ[\.\s]*ב[\.\s]*ה[\.\s]*$/.test(line.replace(/\s/g, ''))) {
                classified.push({ text: line, type: 'tnzbh', defaultSize: 1.1 });
                continue;
            }
            if (/נלב[""״]ע|נפט|נסתלק/.test(line)) {
                classified.push({ text: line, type: 'date-section', defaultSize: 1.2 });
                continue;
            }
            if (/[תרש][""״]/.test(line) && i > endIndex - 5) {
                classified.push({ text: line, type: 'date-section', defaultSize: 1.2 });
                continue;
            }
            if (/והוא בן|והיא בת/.test(line)) {
                classified.push({ text: line, type: 'date-section', defaultSize: 1.2 });
                continue;
            }
            if (/^בן\s|^בת\s/.test(line)) {
                classified.push({ text: line, type: 'lineage', defaultSize: 1.3 });
                continue;
            }
            if (i <= 4 && classified.filter(c => c.type === 'family-name').length === 0) {
                const words = line.split(/\s+/);
                const hasName = classified.some(c => c.type === 'name');
                if (hasName && words.length <= 2 && !/^בן|^בת|הרה|זצ"ל/.test(line)) {
                    classified.push({ text: line, type: 'family-name', defaultSize: 4.2 });
                    continue;
                }
                if (/הרה[""״]ג|הרב|ר'|ר׳|מרת|גב'/.test(line) || (i >= 2 && !hasName && words.length >= 2)) {
                    classified.push({ text: line, type: 'name', defaultSize: 3.5 });
                    continue;
                }
                classified.push({ text: line, type: 'title', defaultSize: 1.6 });
                continue;
            }
            classified.push({ text: line, type: 'body', defaultSize: 1.3 });
        }

        return { classified, bottomLine };
    }

    function getTypeLabel(type) {
        const labels = {
            'header-marker': 'כותרת (פ"נ)',
            'title': 'תואר/כינוי',
            'name': 'שם',
            'family-name': 'שם משפחה',
            'lineage': 'ייחוס (בן/בת)',
            'body': 'גוף הטקסט',
            'date-section': 'תאריך',
            'tnzbh': 'ת.נ.צ.ב.ה'
        };
        return labels[type] || 'שורה';
    }

    // === Initialize Line Styles ===
    function initLineStyles() {
        const { classified } = classifyLinesMaster(state.lines);
        state.lineStyles = classified.map(item => ({
            fontSize: item.defaultSize,
            bold: (item.type === 'name' || item.type === 'family-name' || item.type === 'header-marker'),
            align: 'center'
        }));
    }

    // === Render Tombstone Preview (clickable lines) ===
    function renderPreview(container, interactive) {
        const w = state.width;
        const h = state.height;
        const { classified, bottomLine } = classifyLinesMaster(state.lines);
        state.bottomLine = bottomLine;

        const visualHeight = '70vh';
        const aspectRatio = (w / h) * 1.35;

        let linesHTML = '';
        classified.forEach((item, idx) => {
            const style = state.lineStyles[idx] || { fontSize: item.defaultSize, bold: false, align: 'center' };

            if (item.type === 'spacer') {
                linesHTML += '<div class="line line-spacer"></div>';
                return;
            }

            const selectedClass = (interactive && idx === state.selectedLine) ? ' selected' : '';
            const clickable = interactive ? ` line-clickable${selectedClass}` : '';
            const clickHandler = interactive ? ` onclick="window._selectLine(${idx})" ontouchend="window._selectLine(${idx}); event.preventDefault();"` : '';
            const inlineStyle = `font-size: ${style.fontSize}em; font-weight: ${style.bold ? 'bold' : 'normal'}; text-align: ${style.align};`;

            linesHTML += `<div class="line${clickable}" style="${inlineStyle}"${clickHandler}>${item.text}</div>`;
        });

        let bottomHTML = '';
        if (bottomLine) {
            bottomHTML = `<div class="bottom-signature">${bottomLine}</div>`;
        }

        container.innerHTML = `
            <div class="tombstone-wrapper">
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div class="ruler-top">${w.toFixed(2)} ס"מ</div>
                    <div style="display: flex; align-items: stretch;">
                        <div class="tombstone-outer" style="
                            height: ${visualHeight};
                            width: calc(${visualHeight} * ${aspectRatio});
                        ">
                            <div class="tombstone-box" style="
                                text-align: ${state.textAlign};
                                line-height: ${state.lineSpacing};
                                font-family: 'Dor', 'David', 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif;
                            ">
                                ${linesHTML}
                            </div>
                            ${bottomHTML}
                        </div>
                        <div class="ruler-side">${h.toFixed(2)} ס"מ</div>
                    </div>
                </div>
            </div>
        `;
    }

    // === Line Selection & Edit Panel ===
    window._selectLine = function (idx) {
        state.selectedLine = idx;
        const { classified } = classifyLinesMaster(state.lines);
        const item = classified[idx];
        const style = state.lineStyles[idx];
        if (!item || !style) return;

        // Update panel
        els.editPanelLabel.textContent = 'עריכת: ' + getTypeLabel(item.type);
        els.editLineText.value = item.text;
        els.editLineSize.value = style.fontSize;
        els.editLineSizeVal.textContent = style.fontSize + 'em';
        els.editLineBold.classList.toggle('active', style.bold);
        els.editLineAlign.value = style.align;

        els.editPanel.classList.remove('hidden');
        renderPreview(els.previewContainer, true);

        // Scroll edit panel into view (important for mobile)
        setTimeout(function () {
            els.editPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    };

    // Close panel
    els.btnClosePanel.addEventListener('click', function () {
        state.selectedLine = -1;
        els.editPanel.classList.add('hidden');
        renderPreview(els.previewContainer, true);
    });

    // Edit text
    els.editLineText.addEventListener('input', function () {
        const idx = state.selectedLine;
        if (idx < 0 || idx >= state.lines.length) return;
        state.lines[idx] = this.value;
        state.text = state.lines.join('\n');
        renderPreview(els.previewContainer, true);
    });

    // Edit size
    els.editLineSize.addEventListener('input', function () {
        const idx = state.selectedLine;
        if (idx < 0 || !state.lineStyles[idx]) return;
        state.lineStyles[idx].fontSize = parseFloat(this.value);
        els.editLineSizeVal.textContent = this.value + 'em';
        renderPreview(els.previewContainer, true);
    });

    // Toggle bold
    els.editLineBold.addEventListener('click', function () {
        const idx = state.selectedLine;
        if (idx < 0 || !state.lineStyles[idx]) return;
        state.lineStyles[idx].bold = !state.lineStyles[idx].bold;
        this.classList.toggle('active');
        renderPreview(els.previewContainer, true);
    });

    // Edit align
    els.editLineAlign.addEventListener('change', function () {
        const idx = state.selectedLine;
        if (idx < 0 || !state.lineStyles[idx]) return;
        state.lineStyles[idx].align = this.value;
        renderPreview(els.previewContainer, true);
    });

    // Move up
    els.editLineUp.addEventListener('click', function () {
        moveLine(-1);
    });

    // Move down
    els.editLineDown.addEventListener('click', function () {
        moveLine(1);
    });

    function moveLine(direction) {
        const idx = state.selectedLine;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= state.lines.length) return;

        [state.lines[idx], state.lines[newIdx]] = [state.lines[newIdx], state.lines[idx]];
        [state.lineStyles[idx], state.lineStyles[newIdx]] = [state.lineStyles[newIdx], state.lineStyles[idx]];
        state.text = state.lines.join('\n');
        state.selectedLine = newIdx;

        renderPreview(els.previewContainer, true);
        // Re-open panel for new position
        window._selectLine(newIdx);
    }

    // === Navigation ===
    function showStep(stepEl) {
        [els.step1, els.stepPreview, els.stepFinal].forEach(s => s.classList.remove('active'));
        stepEl.classList.add('active');
    }

    // === Event Handlers ===

    // Template radio
    document.querySelectorAll('input[name="template"]').forEach(radio => {
        radio.addEventListener('change', function () {
            state.template = this.value;
            els.customTemplateSection.classList.toggle('hidden', this.value !== 'custom');
        });
    });

    // Generate preview
    els.btnGenerate.addEventListener('click', function () {
        const w = parseFloat(els.stoneWidth.value);
        const h = parseFloat(els.stoneHeight.value);
        const text = els.stoneText.value.trim();

        if (!w || !h || w <= 0 || h <= 0) {
            alert('יש להזין מידות תקינות לאבן');
            return;
        }
        if (!text) {
            alert('יש להזין טקסט לחריטה');
            return;
        }
        if (!isHebrewOnly(text)) {
            els.textError.classList.remove('hidden');
            return;
        }
        els.textError.classList.add('hidden');

        state.width = w;
        state.height = h;
        state.text = text;
        state.lines = text.split('\n');
        state.customTemplate = els.customTemplate ? els.customTemplate.value : '';
        state.selectedLine = -1;

        initLineStyles();
        renderPreview(els.previewContainer, true);
        els.editPanel.classList.add('hidden');
        showStep(els.stepPreview);
    });

    // Global controls
    els.textAlign.addEventListener('change', function () {
        state.textAlign = this.value;
        renderPreview(els.previewContainer, true);
    });

    els.lineSpacing.addEventListener('input', function () {
        state.lineSpacing = parseFloat(this.value);
        els.lineSpacingVal.textContent = this.value;
        renderPreview(els.previewContainer, true);
    });

    // Back
    els.btnBack.addEventListener('click', function () {
        showStep(els.step1);
    });

    // Approve
    els.btnApprove.addEventListener('click', function () {
        state.selectedLine = -1;
        renderPreview(els.finalPreview, false);
        state.locked = true;
        showStep(els.stepFinal);
    });

    // Edit again
    els.btnEditAgain.addEventListener('click', function () {
        state.locked = false;
        renderPreview(els.previewContainer, true);
        showStep(els.stepPreview);
    });

    // New
    els.btnNew.addEventListener('click', function () {
        if (confirm('להתחיל עיצוב חדש? שינויים שלא נשמרו יאבדו.')) {
            resetState();
            showStep(els.step1);
        }
    });

    // === Save/Load ===
    function getSavedDesigns() {
        try { return JSON.parse(localStorage.getItem('caption_designs') || '[]'); }
        catch (e) { return []; }
    }

    function saveDesign() {
        const designs = getSavedDesigns();
        const name = prompt('שם העיצוב:');
        if (!name) return;
        designs.push({
            id: Date.now(),
            name: name,
            date: new Date().toLocaleDateString('he-IL'),
            state: JSON.parse(JSON.stringify(state))
        });
        localStorage.setItem('caption_designs', JSON.stringify(designs));
        alert('העיצוב נשמר בהצלחה!');
    }

    function loadDesign(design) {
        Object.assign(state, design.state);
        state.selectedLine = -1;
        els.stoneWidth.value = state.width;
        els.stoneHeight.value = state.height;
        els.stoneText.value = state.text;
        els.textAlign.value = state.textAlign;
        els.lineSpacing.value = state.lineSpacing;
        els.lineSpacingVal.textContent = state.lineSpacing;
        renderPreview(els.previewContainer, true);
        els.editPanel.classList.add('hidden');
        showStep(els.stepPreview);
        els.modalSaved.classList.add('hidden');
    }

    function renderSavedList() {
        const designs = getSavedDesigns();
        if (designs.length === 0) {
            els.savedList.innerHTML = '<p class="no-saved">אין עיצובים שמורים</p>';
            return;
        }
        let html = '';
        designs.forEach(d => {
            html += `<div class="saved-item">
                <div class="saved-item-info">
                    <span class="saved-item-name">${d.name}</span>
                    <span class="saved-item-date">${d.date} | ${d.state.width}x${d.state.height} ס"מ</span>
                </div>
                <div class="saved-item-actions">
                    <button class="btn btn-primary btn-small" onclick="window._loadDesign(${d.id})">טען</button>
                    <button class="btn btn-secondary btn-small" onclick="window._deleteDesign(${d.id})">מחק</button>
                </div>
            </div>`;
        });
        els.savedList.innerHTML = html;
    }

    window._loadDesign = function (id) {
        const d = getSavedDesigns().find(x => x.id === id);
        if (d) loadDesign(d);
    };
    window._deleteDesign = function (id) {
        if (!confirm('למחוק עיצוב זה?')) return;
        const designs = getSavedDesigns().filter(x => x.id !== id);
        localStorage.setItem('caption_designs', JSON.stringify(designs));
        renderSavedList();
    };

    els.btnSave.addEventListener('click', saveDesign);
    els.btnLoad.addEventListener('click', function () { renderSavedList(); els.modalSaved.classList.remove('hidden'); });
    els.btnCloseModal.addEventListener('click', function () { els.modalSaved.classList.add('hidden'); });

    // === PDF Export ===
    els.btnExportPdf.addEventListener('click', function () {
        const printContents = els.finalPreview.innerHTML;
        const pw = window.open('', '_blank');
        pw.document.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
            <title>מצבה — PDF</title><style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:'Dor','David','Frank Ruhl Libre','Noto Serif Hebrew',serif;direction:rtl}
            .tombstone-wrapper{display:flex;flex-direction:row-reverse;align-items:stretch}
            .ruler-top{text-align:center;font-size:.85em;color:#666;padding:5px 0;font-weight:600;border-bottom:1px solid #999;margin-bottom:5px}
            .ruler-side{writing-mode:vertical-rl;transform:rotate(180deg);text-align:center;font-size:.85em;color:#666;padding:0 8px;font-weight:600;border-left:1px solid #999;display:flex;align-items:center;justify-content:center}
            .tombstone-outer{display:flex;flex-direction:column}
            .tombstone-box{border:2px solid black;background:white;color:black;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:4% 6%;text-align:center;overflow:hidden;flex:1}
            .line{width:100%}.line-spacer{height:.3em}
            .bottom-signature{text-align:center;font-size:1.4em;font-weight:bold;padding:8px 0}
            @media print{@page{margin:10mm}}
            </style></head><body>${printContents}<script>window.onload=function(){window.print()};<\/script></body></html>`);
        pw.document.close();
    });

    // === Reset ===
    function resetState() {
        state.width = 0; state.height = 0; state.text = ''; state.lines = [];
        state.lineStyles = []; state.template = 'master'; state.customTemplate = '';
        state.textAlign = 'center'; state.lineSpacing = 1.5; state.locked = false;
        state.bottomLine = ''; state.selectedLine = -1;
        els.stoneWidth.value = ''; els.stoneHeight.value = ''; els.stoneText.value = '';
        els.textAlign.value = 'center'; els.lineSpacing.value = 1.5; els.lineSpacingVal.textContent = '1.5';
        els.previewContainer.innerHTML = ''; els.finalPreview.innerHTML = '';
        els.editPanel.classList.add('hidden'); els.textError.classList.add('hidden');
    }

})();
