/* ============================================
   Final Preference Order Page — Multi-List & Export
   ============================================ */

Pages.Preferences = (function () {
    const LISTS_KEY = 'comedk-preference-lists-map';
    const ACTIVE_KEY = 'comedk-preference-active-list-name';
    const DEFAULT_LIST_NAME = 'Default Preference List';

    // ---- Storage Helpers ----
    function getListsMap() {
        try {
            let map = JSON.parse(localStorage.getItem(LISTS_KEY));
            if (!map || typeof map !== 'object') {
                map = {};
            }
            
            // Migrate legacy flat list if present
            const oldFlat = localStorage.getItem('comedk-preference-order-flat');
            if (oldFlat && !map[DEFAULT_LIST_NAME]) {
                try {
                    map[DEFAULT_LIST_NAME] = JSON.parse(oldFlat);
                } catch (e) {
                    console.warn('Failed to migrate legacy list', e);
                }
            }
            
            if (Object.keys(map).length === 0) {
                map[DEFAULT_LIST_NAME] = [];
            }
            return map;
        } catch {
            return { [DEFAULT_LIST_NAME]: [] };
        }
    }

    function getActiveListName() {
        return localStorage.getItem(ACTIVE_KEY) || DEFAULT_LIST_NAME;
    }

    function saveActiveListName(name) {
        localStorage.setItem(ACTIVE_KEY, name);
    }

    function saveListsMap(map) {
        localStorage.setItem(LISTS_KEY, JSON.stringify(map));
    }

    function getSavedOrder() {
        const map = getListsMap();
        const active = getActiveListName();
        return map[active] || [];
    }

    // ---- Render ----
    function render() {
        const colleges = [...AppData.getColleges()];
        const savedOrder = getSavedOrder();
        const activeList = getActiveListName();
        const listsMap = getListsMap();
        const listNames = Object.keys(listsMap);
        const content = document.getElementById('main-content');

        // Apply saved order if exists
        if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
            colleges.sort((a, b) => {
                const idxA = savedOrder.indexOf(a.college_code);
                const idxB = savedOrder.indexOf(b.college_code);
                const valA = idxA === -1 ? 9999 : idxA;
                const valB = idxB === -1 ? 9999 : idxB;
                return valA - valB;
            });
        } else {
            // Default sort: Elite (S) -> Premium (A) -> Strong (B) -> Safety (C), then sheet index
            const tierWeights = { S: 1, A: 2, B: 3, C: 4 };
            colleges.sort((a, b) => {
                const wA = tierWeights[a.tier] || 9;
                const wB = tierWeights[b.tier] || 9;
                if (wA !== wB) return wA - wB;
                return a.sheet_index - b.sheet_index;
            });
        }

        content.innerHTML = `
            <div class="page-container">
                <div class="section-header mb-16" style="margin-top:8px;">
                    <div>
                        <h1 class="page-title">Final Preference Order</h1>
                        <p class="page-subtitle">Drag and drop colleges to customize your choice entry layout</p>
                    </div>
                </div>

                <!-- Multi-List Management Panel -->
                <div class="method-card mb-16" style="padding:14px; display:flex; flex-direction:column; gap:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                            <span style="font-size:0.813rem; font-weight:600; color:var(--text-secondary);">Active List:</span>
                            <select id="pref-list-selector" onchange="Pages.Preferences.switchList(this.value)" style="padding:6px 10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); font-weight:600; cursor:pointer;">
                                ${listNames.map(name => `<option value="${name}" ${name === activeList ? 'selected' : ''}>${name}</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="category-tab" onclick="Pages.Preferences.createNewList()" style="font-size:0.75rem; padding:5px 10px;">➕ New List</button>
                            <button class="category-tab" onclick="Pages.Preferences.renameCurrentList()" style="font-size:0.75rem; padding:5px 10px;">✏️ Rename</button>
                            <button class="category-tab" onclick="Pages.Preferences.deleteCurrentList()" style="font-size:0.75rem; padding:5px 10px; color:var(--dream-color); border-color:var(--dream-color);">🗑️ Delete</button>
                        </div>
                    </div>
                    
                    <div style="border-top:1px dashed var(--border-light); padding-top:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="category-tab active" onclick="Pages.Preferences.copyPreferences()" style="font-size:0.75rem; background:var(--primary); color:white; border:none; padding:6px 12px;">📋 Copy Text</button>
                            <button class="category-tab" onclick="Pages.Preferences.exportToCSV()" style="font-size:0.75rem; background:var(--primary-glow); border-color:var(--primary); color:var(--primary); padding:5px 12px;">📥 Export CSV (Excel)</button>
                            <button class="category-tab" onclick="Pages.Preferences.downloadPreferences()" style="font-size:0.75rem; padding:5px 12px;">📄 Download TXT</button>
                        </div>
                        <button class="category-tab" onclick="Pages.Preferences.generateShareURL()" style="font-size:0.75rem; background:var(--primary-glow); border-color:var(--primary); color:var(--primary); padding:5px 12px; display:inline-flex; align-items:center; gap:4px;">🔗 Share List</button>
                    </div>
                </div>

                <div class="pref-list" id="pref-list-unified">
                    ${colleges.map((c, i) => {
                        return `
                            <div class="pref-item" data-code="${c.college_code}">
                                <div class="pref-drag-handle">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                                        <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                                    </svg>
                                </div>
                                <div class="pref-order-num">${i + 1}</div>
                                <div class="pref-item-info" style="min-width: 0;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span class="pref-item-name" style="margin-bottom:0;">${c.college_name}</span>
                                        ${Badges.tierBadge(c.tier)}
                                    </div>
                                    <div class="pref-item-outcome">
                                        ${c.probability_text} probability • Rating: ${c.recommendation_score}/100 • ${getOutcome(c)}
                                    </div>
                                </div>
                                ${Badges.probabilityBadge(c.probability, c.probability_text)}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="method-card" style="margin-top:12px;">
                    <p style="font-size:0.813rem;color:var(--text-secondary);text-align:center;">
                        💡 Drag items to reorder them globally. You can rank any college above another regardless of tier. Custom order saves automatically.
                    </p>
                </div>
            </div>
        `;

        // Initialize SortableJS
        setTimeout(() => initSortable(), 100);
    }

    function initSortable() {
        const el = document.getElementById('pref-list-unified');
        if (!el) return;
        
        new Sortable(el, {
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            handle: '.pref-drag-handle',
            onEnd: function () {
                saveOrder();
                updateOrderNumbers();
            }
        });
    }

    function updateOrderNumbers() {
        const el = document.getElementById('pref-list-unified');
        if (!el) return;
        el.querySelectorAll('.pref-order-num').forEach((numEl, i) => {
            numEl.textContent = i + 1;
        });
    }

    function saveOrder() {
        const el = document.getElementById('pref-list-unified');
        if (!el) return;
        const codes = Array.from(el.querySelectorAll('.pref-item')).map(item => item.dataset.code);
        
        const map = getListsMap();
        const active = getActiveListName();
        map[active] = codes;
        saveListsMap(map);
    }

    // ---- List Operations ----
    function createNewList() {
        const name = prompt("Enter a name for your new preference list:");
        if (!name) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        
        const map = getListsMap();
        if (map[trimmed]) {
            AppData.showToast("⚠️ A list with that name already exists!", "error");
            return;
        }
        
        // Copy codes of current order
        const currentCodes = Array.from(document.querySelectorAll('.pref-item')).map(item => item.dataset.code);
        
        map[trimmed] = currentCodes.length > 0 ? currentCodes : colleges.map(c => c.college_code);
        saveListsMap(map);
        saveActiveListName(trimmed);
        render();
        AppData.showToast(`➕ Created list "${trimmed}"`, "success");
    }

    function renameCurrentList() {
        const active = getActiveListName();
        if (active === DEFAULT_LIST_NAME) {
            AppData.showToast("⚠️ Cannot rename the default list", "error");
            return;
        }
        
        const newName = prompt(`Rename list "${active}" to:`, active);
        if (!newName) return;
        const trimmed = newName.trim();
        if (!trimmed || trimmed === active) return;
        
        const map = getListsMap();
        if (map[trimmed]) {
            AppData.showToast("⚠️ A list with that name already exists!", "error");
            return;
        }
        
        map[trimmed] = map[active];
        delete map[active];
        saveListsMap(map);
        saveActiveListName(trimmed);
        render();
        AppData.showToast(`✏️ Renamed list to "${trimmed}"`, "success");
    }

    function deleteCurrentList() {
        const active = getActiveListName();
        const map = getListsMap();
        const listNames = Object.keys(map);
        
        if (listNames.length <= 1) {
            AppData.showToast("⚠️ Cannot delete your only list", "error");
            return;
        }
        
        const confirmDelete = confirm(`🗑️ Are you sure you want to delete list "${active}"?`);
        if (!confirmDelete) return;
        
        delete map[active];
        saveListsMap(map);
        
        const remainingNames = Object.keys(map);
        saveActiveListName(remainingNames[0]);
        render();
        AppData.showToast(`🗑️ Deleted list "${active}"`, "info");
    }

    function switchList(name) {
        saveActiveListName(name);
        render();
        AppData.showToast(`📂 Switched to "${name}"`, "info");
    }

    // ---- Exports ----
    function getSortedColleges() {
        const colleges = [...AppData.getColleges()];
        const savedOrder = getSavedOrder();
        
        if (savedOrder && Array.isArray(savedOrder) && savedOrder.length > 0) {
            colleges.sort((a, b) => {
                const idxA = savedOrder.indexOf(a.college_code);
                const idxB = savedOrder.indexOf(b.college_code);
                const valA = idxA === -1 ? 9999 : idxA;
                const valB = idxB === -1 ? 9999 : idxB;
                return valA - valB;
            });
        }
        return colleges;
    }

    function copyPreferences() {
        const colleges = getSortedColleges();
        const textLines = colleges.map((c, i) => `${i + 1}. Choice #${i + 1} | Code: ${c.college_code} | Name: ${c.college_name} (Tier ${c.tier})`);
        const text = `COMEDK ECE PREFERENCE LIST ("${getActiveListName()}"):\n\n` + textLines.join('\n');
        
        navigator.clipboard.writeText(text).then(() => {
            AppData.showToast('📋 Preference list copied to clipboard!', 'success');
        }).catch(err => {
            AppData.showToast('❌ Failed to copy list to clipboard', 'error');
        });
    }

    function downloadPreferences() {
        const colleges = getSortedColleges();
        const textLines = colleges.map((c, i) => `${i + 1}. Choice #${i + 1} | Code: ${c.college_code} | Name: ${c.college_name} (Tier ${c.tier})`);
        const text = `COMEDK ECE PREFERENCE LIST\nList Name: ${getActiveListName()}\nGenerated: ${new Date().toLocaleDateString()}\n\n` + textLines.join('\n');
        
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `COMEDK-ECE-Preferences-${getActiveListName().replace(/\s+/g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        AppData.showToast('📥 Preference list downloaded as TXT file', 'success');
    }

    function exportToCSV() {
        const colleges = getSortedColleges();
        
        // Formulate headers (comma separated)
        const headers = ['Choice Number', 'College Code', 'College Name', 'Tier', 'Average Package (LPA)', 'Total 4-Yr Fees (Lakhs)', 'Admission Probability', 'Category'];
        const csvRows = [headers.join(',')];
        
        colleges.forEach((c, i) => {
            const row = [
                i + 1,
                `"${c.college_code.replace(/"/g, '""')}"`,
                `"${c.college_name.replace(/"/g, '""')}"`,
                `"${c.tier}"`,
                c.average_package || 'N/A',
                c.fees || 'N/A',
                `"${c.probability_text}"`,
                `"${c.category.toUpperCase()}"`
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `COMEDK-Preferences-${getActiveListName().replace(/\s+/g, '-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        AppData.showToast('📥 CSV List downloaded successfully', 'success');
    }

    function generateShareURL() {
        const savedOrder = getSavedOrder();
        if (!savedOrder || savedOrder.length === 0) {
            // Backup with actual elements in page if order is uninitialized
            const elCodes = Array.from(document.querySelectorAll('.pref-item')).map(item => item.dataset.code);
            if (elCodes.length === 0) {
                AppData.showToast('⚠️ No colleges to share', 'error');
                return;
            }
            savedOrder.push(...elCodes);
        }
        
        const codesStr = savedOrder.join(',');
        const shareURL = `${window.location.origin}${window.location.pathname}?share=${codesStr}#/preferences`;
        
        navigator.clipboard.writeText(shareURL).then(() => {
            AppData.showToast('🔗 Shared preference link copied to clipboard!', 'success');
        }).catch(() => {
            AppData.showToast('❌ Failed to copy share URL', 'error');
        });
    }

    function checkSharedPreferences() {
        const params = new URLSearchParams(window.location.search);
        const shareData = params.get('share');
        if (shareData) {
            const codes = shareData.split(',').map(c => c.trim().toUpperCase()).filter(Boolean);
            if (codes.length > 0) {
                // Remove parameter so it doesn't prompt again
                const newUrl = window.location.pathname + window.location.hash;
                window.history.replaceState({}, document.title, newUrl);
                
                setTimeout(() => {
                    const confirmImport = confirm(`📬 You opened a shared preference list containing ${codes.length} colleges.\n\nWould you like to import it as a new custom list?`);
                    if (confirmImport) {
                        const listName = prompt("Name your imported list:", `Shared List (${new Date().toLocaleDateString()})`);
                        if (listName) {
                            const trimmed = listName.trim();
                            if (trimmed) {
                                const map = getListsMap();
                                map[trimmed] = codes;
                                saveListsMap(map);
                                saveActiveListName(trimmed);
                                
                                AppData.showToast(`✅ Imported "${trimmed}" successfully!`, 'success');
                                Router.navigate('/preferences');
                            }
                        }
                    }
                }, 800);
            }
        }
    }

    function getOutcome(c) {
        if (c.probability >= 90) return '✅ Very likely to get seat';
        if (c.probability >= 75) return '✅ Likely to get seat';
        if (c.probability >= 50) return '⚠️ Moderate chance';
        if (c.probability >= 20) return '⚠️ Competitive, worth trying';
        return '🔴 Unlikely but aspirational';
    }

    return { 
        render, 
        switchList, 
        createNewList, 
        renameCurrentList, 
        deleteCurrentList, 
        copyPreferences, 
        downloadPreferences, 
        exportToCSV, 
        generateShareURL, 
        checkSharedPreferences,
        getListsMap,
        saveListsMap,
        saveActiveListName
    };
})();
