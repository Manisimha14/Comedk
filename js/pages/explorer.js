/* ============================================
   College Explorer Page
   ============================================ */

Pages.Explorer = (function () {
    let searchQuery = '';
    let showFavoritesOnly = false;

    function render() {
        const colleges = AppData.getColleges();
        const content = document.getElementById('main-content');

        content.innerHTML = `
            <div class="page-container">
                <div class="section-header mb-16" style="margin-top:8px;">
                    <div>
                        <h1 class="page-title">College Explorer</h1>
                        <p class="page-subtitle">Filter and discover the best ECE colleges for your rank</p>
                    </div>
                </div>

                <!-- Integrated Search & Bookmarks Quick Filter -->
                <div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;position:relative;">
                    <div class="search-bar-wrapper" style="flex:1;position:relative;">
                        <input type="text" id="explorer-search" placeholder="Search by name, code, location..." value="${searchQuery}" style="width:100%;">
                        <span class="search-icon">🔍</span>
                        ${searchQuery ? `<button onclick="Pages.Explorer.clearSearch()" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;z-index:10;display:flex;align-items:center;justify-content:center;" aria-label="Clear search">✕</button>` : ''}
                    </div>
                    <button id="explorer-fav-toggle" class="filter-chip ${showFavoritesOnly ? 'active' : ''}" 
                        onclick="Pages.Explorer.toggleFavoritesFilter()" 
                        style="padding:12px 16px;white-space:nowrap;height:46px;display:flex;align-items:center;font-weight:600;border-radius:var(--radius-md);border:1.5px solid var(--border-light);background:var(--card-bg);color:var(--text-primary);cursor:pointer;transition:var(--transition);">
                        ★ Bookmarks
                    </button>
                </div>

                ${Filters.render()}

                <div class="sort-bar mb-16" style="margin-top:16px;">
                    <span class="result-count" id="explorer-result-count"></span>
                </div>

                <div class="cards-grid" id="explorer-cards-grid">
                    <!-- Cards will be rendered here -->
                </div>

                <div id="explorer-empty" style="display:none;">
                    <div class="empty-state">
                        <h3>No colleges match your criteria</h3>
                        <p>Try adjusting your search query, filters, or bookmarks toggle</p>
                    </div>
                </div>
            </div>
        `;

        renderCards();

        const searchInput = document.getElementById('explorer-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                renderCards();
                updateClearButtonVisibility();
            });
        }
    }

    function updateClearButtonVisibility() {
        const wrapper = document.querySelector('.search-bar-wrapper');
        if (!wrapper) return;
        let clearBtn = wrapper.querySelector('button');
        
        if (searchQuery && !clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.style.cssText = "position:absolute;right:16px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;z-index:10;display:flex;align-items:center;justify-content:center;";
            clearBtn.ariaLabel = "Clear search";
            clearBtn.innerHTML = "✕";
            clearBtn.onclick = () => Pages.Explorer.clearSearch();
            wrapper.appendChild(clearBtn);
        } else if (!searchQuery && clearBtn) {
            clearBtn.remove();
        }
    }

    function renderCards() {
        const colleges = AppData.getColleges();
        const favorites = AppData.getFavorites();
        
        // Get filtered colleges from the component
        let list = Filters.filterAndSort(colleges);

        // Filter by bookmarks
        if (showFavoritesOnly) {
            list = list.filter(c => favorites.includes(c.college_code));
        }

        // Filter by search query
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => {
                const tierName = `tier ${c.tier.toLowerCase()}`;
                const tierNameReverse = `${c.tier.toLowerCase()} tier`;
                return c.college_name.toLowerCase().includes(q) ||
                    c.college_code.toLowerCase().includes(q) ||
                    c.tier.toLowerCase() === q ||
                    tierName.includes(q) ||
                    tierNameReverse.includes(q) ||
                    (c.bangalore_proximity || '').toLowerCase().includes(q);
            });
        }

        const grid = document.getElementById('explorer-cards-grid');
        const empty = document.getElementById('explorer-empty');
        const counter = document.getElementById('explorer-result-count');

        if (counter) {
            counter.innerHTML = `Showing <strong>${list.length}</strong> of ${colleges.length} colleges`;
        }

        if (grid) {
            if (list.length === 0) {
                grid.innerHTML = '';
                if (empty) empty.style.display = 'block';
            } else {
                grid.innerHTML = list.map(c => CollegeCard.render(c)).join('');
                if (empty) empty.style.display = 'none';
            }
        }
    }

    function toggleFavoritesFilter() {
        showFavoritesOnly = !showFavoritesOnly;
        const btn = document.getElementById('explorer-fav-toggle');
        if (btn) {
            btn.classList.toggle('active', showFavoritesOnly);
        }
        renderCards();
    }

    function clearSearch() {
        searchQuery = '';
        const searchInput = document.getElementById('explorer-search');
        if (searchInput) searchInput.value = '';
        renderCards();
        updateClearButtonVisibility();
    }

    return { render, toggleFavoritesFilter, clearSearch };
})();
