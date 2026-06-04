/* ============================================
   Final Preference Order Page — Multi-List & Export
   ============================================ */

Pages.Preferences = (function () {
    const LISTS_KEY = 'comedk-preference-lists-map';
    const ACTIVE_KEY = 'comedk-preference-active-list-name';
    const DEFAULT_LIST_NAME = 'Default Preference List';
    let choiceEntryMode = false;

    // ---- HTML Sanitizer ----
    function sanitize(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return m;
            }
        });
    }

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
                        <p class="page-subtitle">${choiceEntryMode ? '🛠️ Assistant Mode Active — Check off entered choices while filling the official COMEDK portal' : 'Drag and drop colleges to customize your choice entry layout'}</p>
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
                        <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center;">
                            <button class="category-tab" onclick="Pages.Preferences.toggleChoiceEntryMode()" style="font-size:0.75rem; padding:5px 12px; display:inline-flex; align-items:center; gap:4px; ${choiceEntryMode ? 'background:var(--safe-color); border-color:var(--safe-color); color:white;' : 'color:var(--primary); border-color:var(--primary); background:var(--primary-glow);'}">
                                ${choiceEntryMode ? '🛠️ Exit Assistant' : '🛠️ Choice Assistant'}
                            </button>
                            <button class="category-tab" onclick="Pages.Preferences.generateShareURL()" style="font-size:0.75rem; background:var(--primary-glow); border-color:var(--primary); color:var(--primary); padding:5px 12px; display:inline-flex; align-items:center; gap:4px;">🔗 Share List</button>
                        </div>
                    </div>
                </div>

                <!-- Counseling List Diagnostics & Smart Advisor -->
                ${renderListAnalytics(colleges)}


                <div class="pref-list" id="pref-list-unified">
                    ${colleges.map((c, i) => {
                        const enteredList = getEnteredChoices();
                        const isEntered = enteredList.includes(c.college_code);
                        const profile = AppData.getStudentProfile();
                        const budgetWarning = (profile.maxBudget && c.fees && c.fees > profile.maxBudget)
                            ? `<span style="font-size:0.688rem; color:#ef4444; font-weight:600; display:inline-flex; align-items:center; gap:2px; padding:2px 6px; border-radius:var(--radius-sm); background:rgba(239,68,68,0.12); margin-left:6px;">⚠️ Budget Warning (₹${c.fees}L)</span>`
                            : '';
                        
                        return `
                            <div class="pref-item ${choiceEntryMode ? 'choice-assistant-item' : ''} ${isEntered && choiceEntryMode ? 'choice-entered' : ''}" data-code="${c.college_code}">
                                ${choiceEntryMode ? `
                                    <input type="checkbox" ${isEntered ? 'checked' : ''} 
                                        onchange="Pages.Preferences.toggleChoiceEntered('${c.college_code}', this.checked)"
                                        style="width: 16px; height: 16px; margin: 0 4px; accent-color: var(--safe-color); cursor: pointer; flex-shrink:0;">
                                ` : `
                                    <div class="pref-drag-handle">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                                            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                                        </svg>
                                    </div>
                                `}
                                <div class="pref-order-num">${i + 1}</div>
                                <div class="pref-item-info" style="min-width: 0;">
                                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                                        <span class="pref-item-name" style="margin-bottom:0; ${isEntered && choiceEntryMode ? 'text-decoration:line-through; opacity:0.6;' : ''}">${c.college_name}</span>
                                        ${Badges.tierBadge(c.tier)}
                                        ${budgetWarning}
                                    </div>
                                    <div class="pref-item-outcome">
                                        ${c.probability_text} probability • Rating: ${c.recommendation_score}/100 • ${getOutcome(c)}
                                    </div>
                                </div>
                                ${Badges.probabilityBadge(c.probability, c.probability_text)}
                                ${choiceEntryMode ? `
                                    <button class="category-tab active" onclick="event.stopPropagation(); Pages.Preferences.copyCodeAndMark('${c.college_code}')" style="font-size:0.688rem; padding:4px 8px; margin:0 0 0 6px; flex-shrink:0; background:var(--primary); border:none; color:white; display:inline-flex; align-items:center; gap:4px; height:28px;" title="Copy Code & Mark Entered">
                                        📋 Copy & Check
                                    </button>
                                ` : `
                                    <button class="category-tab" onclick="event.stopPropagation(); navigator.clipboard.writeText('${c.college_code}'); AppData.showToast('📋 Copied Code ${c.college_code}', 'success');" style="font-size:0.688rem; padding:4px 8px; margin:0 0 0 6px; flex-shrink:0; background:var(--bg-secondary); border-color:var(--border-light); color:var(--text-secondary); display:inline-flex; align-items:center; gap:4px; height:28px;" title="Copy College Code for Choice Entry">
                                        📋 Copy Code
                                    </button>
                                `}
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
        if (choiceEntryMode) return;
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
        const trimmed = sanitize(name.trim());
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
        const trimmed = sanitize(newName.trim());
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
                            const trimmed = sanitize(listName.trim());
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

    // ---- Smart Advisor Diagnostics ----
    function renderListAnalytics(listColleges) {
        if (!listColleges || listColleges.length === 0) {
            return `
                <div class="method-card mb-16" style="padding:16px; border-left:4px solid var(--text-muted); background:var(--bg-secondary);">
                    <div style="font-weight:700; font-size:0.875rem; color:var(--text-secondary); display:flex; align-items:center; gap:6px;">
                        🔍 Smart Advisor Panel
                    </div>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">Add colleges to your preference list to see dynamic counseling diagnostics and smart optimization tips!</p>
                </div>
            `;
        }

        // Analyze the top 10 choices (most critical in choice entry)
        const topChoicesCount = Math.min(10, listColleges.length);
        const topChoices = listColleges.slice(0, topChoicesCount);

        let safeCount = 0;
        let targetCount = 0;
        let reachCount = 0;
        let dreamCount = 0;
        let unlikelyCount = 0;

        let totalPackage = 0;
        let packageCount = 0;

        topChoices.forEach(c => {
            if (c.probability >= 90) safeCount++;
            else if (c.probability >= 75) targetCount++;
            else if (c.probability >= 50) targetCount++;
            else if (c.probability >= 20) reachCount++;
            else if (c.probability >= 5) dreamCount++;
            else unlikelyCount++;

            if (c.average_package) {
                totalPackage += c.average_package;
                packageCount++;
            }
        });

        const avgPackageText = packageCount > 0 ? `₹${(totalPackage / packageCount).toFixed(2)} LPA` : 'N/A';

        // Check alerts
        const alerts = [];
        const profile = AppData.getStudentProfile();
        const budgetViolations = [];
        if (profile.maxBudget) {
            listColleges.forEach((c, idx) => {
                if (c.fees && c.fees > profile.maxBudget) {
                    budgetViolations.push(`Choice #${idx + 1} (${c.college_code})`);
                }
            });
        }
        if (budgetViolations.length > 0) {
            alerts.push({
                type: 'error',
                text: `💸 <strong>Budget Check</strong>: ${budgetViolations.length} college(s) in your list exceed your budget of ₹${profile.maxBudget.toFixed(1)}L: ${budgetViolations.join(', ')}. Review their fee structure.`
            });
        }
 
        // Alert 1: No safe backup
        if (safeCount === 0) {
            alerts.push({
                type: 'error',
                text: '❌ <strong>Safety Alert</strong>: No "Safe" options in your top choices. Add at least 1-2 safe backup colleges to prevent sliding out of choice allocation entirely.'
            });
        }

        // Alert 2: Too few colleges
        if (listColleges.length < 5) {
            alerts.push({
                type: 'warning',
                text: `⚠️ <strong>Choice Density</strong>: You have only added ${listColleges.length} choices. We recommend adding at least 8-10 options to safeguard against cutoff fluctuations.`
            });
        }

        // Alert 3: Tier ordering check
        // Check if an S-Tier college is placed below a B-Tier or C-Tier college
        let orderIssue = false;
        let higherTierCollege = null;
        let lowerTierCollege = null;
        let higherIndex = -1;
        let lowerIndex = -1;
        
        for (let i = 0; i < topChoices.length; i++) {
            const current = topChoices[i];
            const currentTierVal = getTierValue(current.tier); // S=4, A=3, B=2, C=1
            
            for (let j = i + 1; j < topChoices.length; j++) {
                const next = topChoices[j];
                const nextTierVal = getTierValue(next.tier);
                
                // If current has lower tier than next, and difference is major (e.g. S placed below B or C)
                if (currentTierVal < nextTierVal && (nextTierVal - currentTierVal) >= 2) {
                    orderIssue = true;
                    higherTierCollege = next;
                    lowerTierCollege = current;
                    higherIndex = j + 1;
                    lowerIndex = i + 1;
                    break;
                }
            }
            if (orderIssue) break;
        }

        if (orderIssue && higherTierCollege && lowerTierCollege) {
            alerts.push({
                type: 'info',
                text: `💡 <strong>Tier Order Tip</strong>: You ranked choice #${lowerIndex} <strong>${lowerTierCollege.college_code}</strong> (${lowerTierCollege.tier} Tier) above choice #${higherIndex} <strong>${higherTierCollege.college_code}</strong> (${higherTierCollege.tier} Tier). Ensure this is intentional (e.g., due to lower fees/proximity), as COMEDK will lock your seat to #${lowerIndex} if available, bypassing #${higherIndex}.`
            });
        }

        // If no alerts, show positive review
        if (alerts.length === 0) {
            alerts.push({
                type: 'success',
                text: '🏆 <strong>Healthy List</strong>: Excellent! Your top choices are well-balanced with safe backups, target options, and are correctly ordered by tier.'
            });
        }

        const alertClassMap = {
            error: 'note-item cons',
            warning: 'note-item warning',
            info: 'note-item recommendation',
            success: 'note-item pros'
        };

        return `
            <div class="method-card mb-16" style="padding:16px;">
                <div style="font-weight:700; font-size:0.875rem; color:var(--text-primary); display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px;">
                    <span style="display:flex; align-items:center; gap:6px;">🔍 Counseling Smart Advisor</span>
                    <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">Diagnostics for top ${topChoicesCount} choices</span>
                </div>
                
                <!-- Quick Stats Grid -->
                <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; margin-bottom:14px; text-align:center;">
                    <div style="background:var(--bg-secondary); padding:8px; border-radius:var(--radius-sm);">
                        <div style="font-size:0.625rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Top Avg LPA</div>
                        <div style="font-size:0.938rem; font-weight:700; color:var(--primary); margin-top:2px;">${avgPackageText}</div>
                    </div>
                    <div style="background:var(--bg-secondary); padding:8px; border-radius:var(--radius-sm);">
                        <div style="font-size:0.625rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Top Safe Options</div>
                        <div style="font-size:0.938rem; font-weight:700; color:var(--safe-color); margin-top:2px;">${safeCount}</div>
                    </div>
                    <div style="background:var(--bg-secondary); padding:8px; border-radius:var(--radius-sm);">
                        <div style="font-size:0.625rem; color:var(--text-muted); font-weight:600; text-transform:uppercase;">Top Targets/Reaches</div>
                        <div style="font-size:0.938rem; font-weight:700; color:var(--prob-orange); margin-top:2px;">${targetCount + reachCount}</div>
                    </div>
                </div>

                <!-- Advisor Recommendations -->
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${alerts.map(a => `
                        <div class="${alertClassMap[a.type] || 'note-item'}" style="padding:10px 14px; font-size:0.75rem; border-radius:var(--radius-sm); border-left-width:3px; border-left-style:solid; line-height:1.4;">
                            ${a.text}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function getTierValue(tier) {
        switch (tier) {
            case 'S': return 4;
            case 'A': return 3;
            case 'B': return 2;
            case 'C': return 1;
            default: return 0;
        }
    }

    function toggleChoiceEntryMode() {
        choiceEntryMode = !choiceEntryMode;
        render();
        AppData.showToast(choiceEntryMode ? '🛠️ Choice Assistant Mode Activated' : '↩️ Assistant Mode Deactivated', 'info');
    }

    function getEnteredChoices() {
        try {
            return JSON.parse(sessionStorage.getItem('comedk-entered-choices')) || [];
        } catch {
            return [];
        }
    }

    function toggleChoiceEntered(code, isChecked) {
        const list = getEnteredChoices();
        const idx = list.indexOf(code);
        if (isChecked && idx === -1) {
            list.push(code);
        } else if (!isChecked && idx !== -1) {
            list.splice(idx, 1);
        }
        sessionStorage.setItem('comedk-entered-choices', JSON.stringify(list));
        render();
    }

    function copyCodeAndMark(code) {
        navigator.clipboard.writeText(code).then(() => {
            AppData.showToast(`📋 Copied Code ${code}`, 'success');
            const list = getEnteredChoices();
            if (!list.includes(code)) {
                list.push(code);
                sessionStorage.setItem('comedk-entered-choices', JSON.stringify(list));
            }
            render();
        }).catch(() => {
            AppData.showToast('❌ Copy failed', 'error');
        });
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
        saveActiveListName,
        getActiveListName,
        toggleChoiceEntryMode,
        getEnteredChoices,
        toggleChoiceEntered,
        copyCodeAndMark
    };
})();
