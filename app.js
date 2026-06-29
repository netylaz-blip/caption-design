/**
 * Caption Design — Tombstone Layout Application
 * Professional typesetting tool for tombstone engraving
 * TEMPLATE_MASTER based on classic Orthodox tombstone layout
 */

(function () {
    'use strict';

    // === State ===
    const state = {
        width: 0,
        height: 0,
        text: '',
        lines: [],        // raw text lines
        lineStyles: [],   // per-line style overrides: { fontSize, bold, align }
        template: 'master',
        customTemplate: '',
        textAlign: 'center',
        lineSpacing: 1.5,
        locked: false,
        hasFrame: true,
        bottomLine: ''
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
        linesEditor: document.getElementById('lines-editor'),
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
        let i = 0;
        const total = lines.length;

        const lastLine = lines[total - 1].trim();
        const hasBottomSignature = /זצ"ל|זצוק"ל|ז"ל|נ"ע|ע"ה/.test(lastLine) && total > 8;
        if (hasBottomSignature) {
            bottomLine = lastLine;
        }

        const endIndex = hasBottomSignature ? total - 1 : total;

        for (i = 0; i < endIndex; i++) {
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

    // === Initialize Line Styles from classification ===
    function initLineStyles() {
        const { classified } = classifyLinesMaster(state.lines);
        state.lineStyles = classified.map(item => ({
            fontSize: item.defaultSize,
            bold: (item.type === 'name' || item.type === 'family-name' || item.type === 'header-marker'),
            align: 'center'
        }));
    }

    // === Render Per-Line Editor ===
    function renderLinesEditor() {
        const { classified } = classifyLinesMaster(state.lines);
        let html = '';

        classified.forEach((item, idx) => {
            if (item.type === 'spacer') return; // skip empty lines in editor

            const style = state.lineStyles[idx] || { fontSize: item.defaultSize, bold: false, align: 'center' };
            const typeLabel = getTypeLabel(item.type);

            html += `
                <div class="line-editor-item" data-index="${idx}">
                    <div class="line-editor-header">
                        <span class="line-editor-label">${typeLabel}</span>
                        <div class="line-editor-move">
                            <button onclick="window._moveLine(${idx}, -1)" title="הזז למעלה">▲</button>
                            <button onclick="window._moveLine(${idx}, 1)" title="הזז למטה">▼</button>
                        </div>
                    </div>
                    <input type="text" class="line-editor-text" value="${escapeHtml(item.text)}" 
                           onchange="window._updateLineText(${idx}, this.value)">
                    <div class="line-editor-controls">
                        <label>גודל:</label>
                        <input type="number" min="0.5" max="8" step="0.1" value="${style.fontSize}" 
                               onchange="window._updateLineSize(${idx}, this.value)">
                        <button class="bold-toggle ${style.bold ? 'active' : ''}" 
                                onclick="window._toggleBold(${idx}, this)">B</button>
                        <label>יישור:</label>
                        <select onchange="window._updateLineAlign(${idx}, this.value)">
                            <option value="center" ${style.align === 'center' ? 'selected' : ''}>מרכז</option>
                            <option value="right" ${style.align === 'right' ? 'selected' : ''}>ימין</option>
                            <option value="left" ${style.align === 'left' ? 'selected' : ''}>שמאל</option>
                        </select>
                    </div>
                </div>
            `;
        });

        els.linesEditor.innerHTML = html;
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
            'tnzbh': 'ת.נ.צ.ב.ה',
            'spacer': 'רווח'
        };
        return labels[type] || 'שורה';
    }

    function escapeHtml(text) {
        return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    // === Render Tombstone Preview ===
    function renderPreview(container) {
        const w = state.width;
        const h = state.height;
        const { classified, bottomLine } = classifyLinesMaster(state.lines);

        state.bottomLine = bottomLine;

        const visualHeight = '75vh';
        const aspectRatio = (w / h) * 1.35;

        let linesHTML = '';
        classified.forEach((item, idx) => {
            const style = state.lineStyles[idx] || { fontSize: item.defaultSize, bold: false, align: 'center' };

            if (item.type === 'spacer') {
                linesHTML += '<div class="line line-spacer"></div>';
                return;
            }

            const inlineStyle = `font-size: ${style.fontSize}em; font-weight: ${style.bold ? 'bold' : 'normal'}; text-align: ${style.align};`;
            linesHTML += `<div class="line" style="${inlineStyle}">${item.text}</div>`;
        });

        let bottomHTML = '';
        if (bottomLine) {
            bottomHTML = `<div class="bottom-signature">${bottomLine}</div>`;
        }

        const html = `
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

        container.innerHTML = html;
    }

    // === Global exposed edit functions ===
    window._updateLineText = function (idx, value) {
        // Update the raw line
        const { classified } = classifyLinesMaster(state.lines);
        if (classified[idx]) {
            // Find corresponding raw line index
            let rawIdx = findRawIndex(idx);
            if (rawIdx !== -1) {
                state.lines[rawIdx] = value;
                state.text = state.lines.join('\n');
            }
        }
        renderPreview(els.previewContainer);
    };

    window._updateLineSize = function (idx, value) {
        if (state.lineStyles[idx]) {
            state.lineStyles[idx].fontSize = parseFloat(value);
            renderPreview(els.previewContainer);
        }
    };

    window._toggleBold = function (idx, btn) {
        if (state.lineStyles[idx]) {
            state.lineStyles[idx].bold = !state.lineStyles[idx].bold;
            btn.classList.toggle('active');
            renderPreview(els.previewContainer);
        }
    };

    window._updateLineAlign = function (idx, value) {
        if (state.lineStyles[idx]) {
            state.lineStyles[idx].align = value;
            renderPreview(els.previewContainer);
        }
    };

    window._moveLine = function (idx, direction) {
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= state.lines.length) return;

        // Swap raw lines
        const rawIdx = findRawIndex(idx);
        const rawNewIdx = findRawIndex(newIdx);
        if (rawIdx === -1 || rawNewIdx === -1) return;

        [state.lines[rawIdx], state.lines[rawNewIdx]] = [state.lines[rawNewIdx], state.lines[rawIdx]];
        [state.lineStyles[idx], state.lineStyles[newIdx]] = [state.lineStyles[newIdx], state.lineStyles[idx]];

        state.text = state.lines.join('\n');
        renderPreview(els.previewContainer);
        renderLinesEditor();
    };

    // Find raw line index from classified index
    function findRawIndex(classifiedIdx) {
        // Since classification is 1:1 with lines array (including empty lines), index matches
        return classifiedIdx < state.lines.length ? classifiedIdx : -1;
    }

    // === Navigation ===
    function showStep(stepEl) {
        [els.step1, els.stepPreview, els.stepFinal].forEach(s => s.classList.remove('active'));
        stepEl.classList.add('active');
    }

    // === Event Handlers ===

    // Template radio change
    document.querySelectorAll('input[name="template"]').forEach(radio => {
        radio.addEventListener('change', function () {
            state.template = this.value;
            if (this.value === 'custom') {
                els.customTemplateSection.classList.remove('hidden');
            } else {
                els.customTemplateSection.classList.add('hidden');
            }
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

        // Initialize per-line styles based on template classification
        initLineStyles();

        // Render preview and editor
        renderPreview(els.previewContainer);
        renderLinesEditor();
        showStep(els.stepPreview);
    });

    // Global controls
    els.textAlign.addEventListener('change', function () {
        state.textAlign = this.value;
        renderPreview(els.previewContainer);
    });

    els.lineSpacing.addEventListener('input', function () {
        state.lineSpacing = parseFloat(this.value);
        els.lineSpacingVal.textContent = this.value;
        renderPreview(els.previewContainer);
    });

    // Back to step 1
    els.btnBack.addEventListener('click', function () {
        showStep(els.step1);
    });

    // Approve - go to final
    els.btnApprove.addEventListener('click', function () {
        renderPreview(els.finalPreview);
        state.locked = true;
        showStep(els.stepFinal);
    });

    // Edit again
    els.btnEditAgain.addEventListener('click', function () {
        state.locked = false;
        showStep(els.stepPreview);
    });

    // New design
    els.btnNew.addEventListener('click', function () {
        if (confirm('להתחיל עיצוב חדש? שינויים שלא נשמרו יאבדו.')) {
            resetState();
            showStep(els.step1);
        }
    });

    // === Save/Load ===
    function getSavedDesigns() {
        try {
            return JSON.parse(localStorage.getItem('caption_designs') || '[]');
        } catch (e) {
            return [];
        }
    }

    function saveDesign() {
        const designs = getSavedDesigns();
        const name = prompt('שם העיצוב:');
        if (!name) return;

        const design = {
            id: Date.now(),
            name: name,
            date: new Date().toLocaleDateString('he-IL'),
            state: JSON.parse(JSON.stringify(state))
        };

        designs.push(design);
        localStorage.setItem('caption_designs', JSON.stringify(designs));
        alert('העיצוב נשמר בהצלחה!');
    }

    function loadDesign(design) {
        Object.assign(state, design.state);
        els.stoneWidth.value = state.width;
        els.stoneHeight.value = state.height;
        els.stoneText.value = state.text;
        els.textAlign.value = state.textAlign;
        els.lineSpacing.value = state.lineSpacing;
        els.lineSpacingVal.textContent = state.lineSpacing;

        renderPreview(els.previewContainer);
        renderLinesEditor();
        showStep(els.stepPreview);
        els.modalSaved.classList.add('hidden');
    }

    function deleteDesign(id) {
        let designs = getSavedDesigns();
        designs = designs.filter(d => d.id !== id);
        localStorage.setItem('caption_designs', JSON.stringify(designs));
        renderSavedList();
    }

    function renderSavedList() {
        const designs = getSavedDesigns();
        if (designs.length === 0) {
            els.savedList.innerHTML = '<p class="no-saved">אין עיצובים שמורים</p>';
            return;
        }

        let html = '';
        designs.forEach(d => {
            html += `
                <div class="saved-item">
                    <div class="saved-item-info">
                        <span class="saved-item-name">${d.name}</span>
                        <span class="saved-item-date">${d.date} | ${d.state.width}x${d.state.height} ס"מ</span>
                    </div>
                    <div class="saved-item-actions">
                        <button class="btn btn-primary btn-small" onclick="window._loadDesign(${d.id})">טען</button>
                        <button class="btn btn-secondary btn-small" onclick="window._deleteDesign(${d.id})">מחק</button>
                    </div>
                </div>
            `;
        });
        els.savedList.innerHTML = html;
    }

    window._loadDesign = function (id) {
        const designs = getSavedDesigns();
        const design = designs.find(d => d.id === id);
        if (design) loadDesign(design);
    };

    window._deleteDesign = function (id) {
        if (confirm('למחוק עיצוב זה?')) {
            deleteDesign(id);
        }
    };

    els.btnSave.addEventListener('click', saveDesign);

    els.btnLoad.addEventListener('click', function () {
        renderSavedList();
        els.modalSaved.classList.remove('hidden');
    });

    els.btnCloseModal.addEventListener('click', function () {
        els.modalSaved.classList.add('hidden');
    });

    // === PDF Export ===
    els.btnExportPdf.addEventListener('click', function () {
        const printContents = els.finalPreview.innerHTML;
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>מצבה — ייצוא PDF</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        font-family: 'Dor', 'David', 'Frank Ruhl Libre', 'Noto Serif Hebrew', serif;
                        direction: rtl;
                    }
                    .tombstone-wrapper { display: flex; flex-direction: row-reverse; align-items: stretch; }
                    .ruler-top { text-align: center; font-size: 0.85em; color: #666; padding: 5px 0; font-weight: 600; border-bottom: 1px solid #999; margin-bottom: 5px; }
                    .ruler-side { writing-mode: vertical-rl; transform: rotate(180deg); text-align: center; font-size: 0.85em; color: #666; padding: 0 8px; font-weight: 600; border-left: 1px solid #999; display: flex; align-items: center; justify-content: center; }
                    .tombstone-outer { display: flex; flex-direction: column; }
                    .tombstone-box { border: 2px solid black; background: white; color: black; display: flex; flex-direction: column; justify-content: space-between; align-items: center; padding: 4% 6%; text-align: center; overflow: hidden; flex: 1; }
                    .line { width: 100%; }
                    .line-spacer { height: 0.3em; }
                    .bottom-signature { text-align: center; font-size: 1.4em; font-weight: bold; padding: 8px 0; }
                    @media print { @page { margin: 10mm; } }
                </style>
            </head>
            <body>
                ${printContents}
                <script>window.onload = function() { window.print(); };<\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });

    // === Reset ===
    function resetState() {
        state.width = 0;
        state.height = 0;
        state.text = '';
        state.lines = [];
        state.lineStyles = [];
        state.template = 'master';
        state.customTemplate = '';
        state.textAlign = 'center';
        state.lineSpacing = 1.5;
        state.locked = false;
        state.hasFrame = true;
        state.bottomLine = '';

        els.stoneWidth.value = '';
        els.stoneHeight.value = '';
        els.stoneText.value = '';
        els.textAlign.value = 'center';
        els.lineSpacing.value = 1.5;
        els.lineSpacingVal.textContent = '1.5';
        els.previewContainer.innerHTML = '';
        els.finalPreview.innerHTML = '';
        els.linesEditor.innerHTML = '';
        els.textError.classList.add('hidden');
    }

})();
