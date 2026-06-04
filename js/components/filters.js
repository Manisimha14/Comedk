/* ============================================
   Filters Component
   ============================================ */

const Filters = (function () {
    let currentFilters = {
        tiers: [],
        categories: [],
        hostel: null,
        bangalore: null,
        confidence: null,
    };
    let currentSort = 'recommendation';
    let filtersOpen = false;

    function render(onFilterChange) {
        return `
            <div class="filters-container">
                <button class="filters-toggle" onclick="Filters.toggle()">
                    <span>🔍 Filters & Sort</span>
                    <span id="filter-arrow">${filtersOpen ? '▲' : '▼'}</span>
                </button>
                <div class="filters-body ${filtersOpen ? 'open' : ''}" id="filters-body">
                    <div class="filter-group">
                        <label class="filter-label">Tier</label>
                        <div class="filter-chips">
                            ${['S', 'A', 'B', 'C'].map(t =>
                                `<button class="filter-chip ${currentFilters.tiers.includes(t) ? 'active' : ''}" 
                                    onclick="Filters.toggleTier('${t}')">${t} Tier</button>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Category</label>
                        <div class="filter-chips">
                            ${['dream', 'reach', 'target', 'safe'].map(c =>
                                `<button class="filter-chip ${currentFilters.categories.includes(c) ? 'active' : ''}" 
                                    onclick="Filters.toggleCategory('${c}')">${c.charAt(0).toUpperCase() + c.slice(1)}</button>`
                            ).join('')}
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Hostel</label>
                        <div class="filter-chips">
                            <button class="filter-chip ${currentFilters.hostel === true ? 'active' : ''}" 
                                onclick="Filters.setHostel(true)">Available</button>
                            <button class="filter-chip ${currentFilters.hostel === false ? 'active' : ''}" 
                                onclick="Filters.setHostel(false)">Not Available</button>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Location</label>
                        <div class="filter-chips">
                            <button class="filter-chip ${currentFilters.bangalore === 'city' ? 'active' : ''}" 
                                onclick="Filters.setBangalore('city')">In Bangalore</button>
                            <button class="filter-chip ${currentFilters.bangalore === 'far' ? 'active' : ''}" 
                                onclick="Filters.setBangalore('far')">Outside Bangalore</button>
                        </div>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Confidence Level</label>
                        <select class="filter-select" onchange="Filters.setConfidence(this.value)">
                            <option value="">All</option>
                            <option value="Very High" ${currentFilters.confidence === 'Very High' ? 'selected' : ''}>Very High</option>
                            <option value="High" ${currentFilters.confidence === 'High' ? 'selected' : ''}>High</option>
                            <option value="Medium-High" ${currentFilters.confidence === 'Medium-High' ? 'selected' : ''}>Medium-High</option>
                            <option value="Medium" ${currentFilters.confidence === 'Medium' ? 'selected' : ''}>Medium</option>
                            <option value="Low" ${currentFilters.confidence === 'Low' ? 'selected' : ''}>Low</option>
                        </select>
                    </div>
                    <div class="filter-group">
                        <label class="filter-label">Sort By</label>
                        <select class="filter-select" onchange="Filters.setSort(this.value)">
                            <option value="recommendation" ${currentSort === 'recommendation' ? 'selected' : ''}>Default (Sheet Order)</option>
                            <option value="probability" ${currentSort === 'probability' ? 'selected' : ''}>Highest Probability</option>
                            <option value="placement" ${currentSort === 'placement' ? 'selected' : ''}>Best Placement</option>
                            <option value="fees" ${currentSort === 'fees' ? 'selected' : ''}>Lowest Fees</option>
                            <option value="tier" ${currentSort === 'tier' ? 'selected' : ''}>Highest Tier</option>
                        </select>
                    </div>
                    <button class="filter-chip" style="margin-top:8px;background:var(--primary-glow);color:var(--primary);border-color:var(--primary);" 
                        onclick="Filters.reset()">✕ Clear All Filters</button>
                </div>
            </div>
        `;
    }

    function toggle() {
        filtersOpen = !filtersOpen;
        const body = document.getElementById('filters-body');
        const arrow = document.getElementById('filter-arrow');
        if (body) body.classList.toggle('open', filtersOpen);
        if (arrow) arrow.textContent = filtersOpen ? '▲' : '▼';
    }

    function toggleTier(tier) {
        const idx = currentFilters.tiers.indexOf(tier);
        if (idx >= 0) currentFilters.tiers.splice(idx, 1);
        else currentFilters.tiers.push(tier);
        applyFilters();
    }

    function toggleCategory(cat) {
        const idx = currentFilters.categories.indexOf(cat);
        if (idx >= 0) currentFilters.categories.splice(idx, 1);
        else currentFilters.categories.push(cat);
        applyFilters();
    }

    function setHostel(val) {
        currentFilters.hostel = currentFilters.hostel === val ? null : val;
        applyFilters();
    }

    function setBangalore(val) {
        currentFilters.bangalore = currentFilters.bangalore === val ? null : val;
        applyFilters();
    }

    function setConfidence(val) {
        currentFilters.confidence = val || null;
        applyFilters();
    }

    function setSort(val) {
        currentSort = val;
        applyFilters();
    }

    function reset() {
        currentFilters = { tiers: [], categories: [], hostel: null, bangalore: null, confidence: null };
        currentSort = 'recommendation';
        applyFilters();
    }

    function applyFilters() {
        if (typeof Pages !== 'undefined' && Pages.Explorer) {
            Pages.Explorer.render();
        }
    }

    function filterAndSort(colleges) {
        let filtered = [...colleges];

        // Apply filters
        if (currentFilters.tiers.length > 0) {
            filtered = filtered.filter(c => currentFilters.tiers.includes(c.tier));
        }
        if (currentFilters.categories.length > 0) {
            filtered = filtered.filter(c => currentFilters.categories.includes(c.category));
        }
        if (currentFilters.hostel !== null) {
            filtered = filtered.filter(c => {
                const hasHostel = c.hostel && c.hostel.toLowerCase() === 'yes';
                return currentFilters.hostel ? hasHostel : !hasHostel;
            });
        }
        if (currentFilters.bangalore !== null) {
            filtered = filtered.filter(c => {
                const prox = (c.bangalore_proximity || '').toLowerCase();
                if (currentFilters.bangalore === 'city') return prox.includes('center') || prox.includes('city');
                return prox.includes('far');
            });
        }
        if (currentFilters.confidence) {
            filtered = filtered.filter(c => c.confidence === currentFilters.confidence);
        }

        // Apply sorting
        const tierOrder = { S: 0, A: 1, B: 2, C: 3 };
        switch (currentSort) {
            case 'recommendation':
                filtered.sort((a, b) => a.sheet_index - b.sheet_index);
                break;
            case 'probability':
                filtered.sort((a, b) => b.probability - a.probability);
                break;
            case 'placement':
                filtered.sort((a, b) => (b.average_package || 0) - (a.average_package || 0));
                break;
            case 'fees':
                filtered.sort((a, b) => (a.fees || 999) - (b.fees || 999));
                break;
            case 'tier':
                filtered.sort((a, b) => (tierOrder[a.tier] || 9) - (tierOrder[b.tier] || 9));
                break;
        }

        return filtered;
    }

    return { render, toggle, toggleTier, toggleCategory, setHostel, setBangalore, setConfidence, setSort, reset, filterAndSort };
})();
