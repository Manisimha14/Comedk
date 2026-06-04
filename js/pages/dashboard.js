/* ============================================
   Dashboard Page
   ============================================ */

const Pages = window.Pages || {};

Pages.Dashboard = (function () {
    let activeCategory = 'all';
    let searchQuery = '';

    function render() {
        const colleges = AppData.getColleges();
        const categories = AppData.getCategories();
        const profile = AppData.getStudentProfile();
        const favorites = AppData.getFavorites();
        const content = document.getElementById('main-content');

        content.innerHTML = `
            <div class="page-container">
                <!-- Hero Section -->
                <div class="hero">
                    <div class="hero-profile" onclick="App.openProfileModal()" style="cursor:pointer;" title="Click to edit rank and settings">
                        <div class="hero-avatar">🎓</div>
                        <div class="hero-info">
                            <h1 style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">COMEDK ECE Dashboard <span style="font-size:0.75rem;padding:3px 8px;border-radius:var(--radius-sm);background:rgba(255,255,255,0.25);font-weight:600;display:inline-flex;align-items:center;gap:4px;">✏️ Edit Profile</span></h1>
                            <p>Decision Support for Rank ${profile.rank.toLocaleString()} • ${profile.branch} • ${profile.category}</p>
                        </div>
                    </div>
                    <div class="hero-question">Which colleges should you focus on?</div>
                    <div class="hero-meta">
                        <span class="hero-meta-item">📊 ${colleges.length} Colleges Analyzed</span>
                        <span class="hero-meta-item">🎯 Rank ~${profile.rank.toLocaleString()}</span>
                        <span class="hero-meta-item" id="hero-timestamp">⏱ Loading...</span>
                        <button class="hero-meta-item" onclick="App.refresh()" style="cursor:pointer;border:none;background:none;color:white;display:inline-flex;align-items:center;gap:4px;">🔄 Refresh</button>
                    </div>
                </div>

                <!-- Stats Grid -->
                <div class="stats-grid">
                    <div class="stat-card total ${activeCategory === 'all' ? 'active' : ''}" onclick="Pages.Dashboard.setCategory('all')" style="border-bottom: 3px solid var(--bg-hero);">
                        <div class="stat-icon">📊</div>
                        <div class="stat-number">${colleges.length}</div>
                        <div class="stat-label">Total</div>
                    </div>
                    <div class="stat-card safe ${activeCategory === 'safe' ? 'active' : ''}" onclick="Pages.Dashboard.setCategory('safe')" style="border-bottom: 3px solid var(--safe-color);">
                        <div class="stat-icon">🟢</div>
                        <div class="stat-number">${categories.safe.length}</div>
                        <div class="stat-label">Safe</div>
                    </div>
                    <div class="stat-card target ${activeCategory === 'target' ? 'active' : ''}" onclick="Pages.Dashboard.setCategory('target')" style="border-bottom: 3px solid var(--target-color);">
                        <div class="stat-icon">🟡</div>
                        <div class="stat-number">${categories.target.length}</div>
                        <div class="stat-label">Target</div>
                    </div>
                    <div class="stat-card reach ${activeCategory === 'reach' ? 'active' : ''}" onclick="Pages.Dashboard.setCategory('reach')" style="border-bottom: 3px solid var(--reach-color);">
                        <div class="stat-icon">🟠</div>
                        <div class="stat-number">${categories.reach.length}</div>
                        <div class="stat-label">Reach</div>
                    </div>
                    <div class="stat-card dream ${activeCategory === 'dream' ? 'active' : ''}" onclick="Pages.Dashboard.setCategory('dream')" style="border-bottom: 3px solid var(--dream-color);">
                        <div class="stat-icon">🔴</div>
                        <div class="stat-number">${categories.dream.length}</div>
                        <div class="stat-label">Dream</div>
                    </div>
                </div>

                <!-- Search and Controls -->
                <div class="search-bar-wrapper mb-24" style="position:relative; display:flex; align-items:center;">
                    <input type="text" id="dashboard-search" placeholder="Search by name, code, tier, location..." value="${searchQuery}" style="width:100%;">
                    <span class="search-icon">🔍</span>
                    ${searchQuery ? `<button onclick="Pages.Dashboard.clearSearch()" style="position:absolute;right:16px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;" aria-label="Clear search">✕</button>` : ''}
                </div>

                <!-- Category Tabs -->
                <div class="category-tabs">
                    ${['all', 'safe', 'target', 'reach', 'dream', 'favorites'].map(cat => {
                        let count = 0;
                        let label = '';
                        if (cat === 'all') { count = colleges.length; label = 'All Colleges'; }
                        else if (cat === 'favorites') { count = favorites.length; label = '★ Bookmarks'; }
                        else { count = categories[cat]?.length || 0; label = cat.charAt(0).toUpperCase() + cat.slice(1); }
                        return `<button class="category-tab ${activeCategory === cat ? 'active' : ''}" 
                            onclick="Pages.Dashboard.setCategory('${cat}')">${label}<span class="tab-count">${count}</span></button>`;
                    }).join('')}
                </div>

                <!-- College Cards Grid -->
                <div class="cards-grid" id="dashboard-cards-grid">
                    <!-- Cards will be rendered here -->
                </div>
                
                <div id="dashboard-empty" style="display:none;">
                    <div class="empty-state">
                        <h3>No colleges found</h3>
                        <p>Try searching for a different term or changing the filter</p>
                    </div>
                </div>
            </div>
        `;

        renderCards();
        updateTimestamp();

        const searchInput = document.getElementById('dashboard-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value;
                // Re-render only cards & check if we need to show/hide clear button
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
            clearBtn.style.cssText = "position:absolute;right:16px;background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;";
            clearBtn.ariaLabel = "Clear search";
            clearBtn.innerHTML = "✕";
            clearBtn.onclick = () => Pages.Dashboard.clearSearch();
            wrapper.appendChild(clearBtn);
        } else if (!searchQuery && clearBtn) {
            clearBtn.remove();
        }
    }

    function renderCards() {
        const colleges = AppData.getColleges();
        const categories = AppData.getCategories();
        const favorites = AppData.getFavorites();

        let list = activeCategory === 'all'
            ? [...colleges]
            : activeCategory === 'favorites'
                ? colleges.filter(c => favorites.includes(c.college_code))
                : categories[activeCategory] || [];

        // Sort by Excel sheet order (original sheet index)
        list.sort((a, b) => a.sheet_index - b.sheet_index);

        // Filter by search query
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            list = list.filter(c => 
                c.college_name.toLowerCase().includes(q) ||
                c.college_code.toLowerCase().includes(q) ||
                c.tier.toLowerCase().includes(q) ||
                (c.bangalore_proximity || '').toLowerCase().includes(q)
            );
        }

        const grid = document.getElementById('dashboard-cards-grid');
        const empty = document.getElementById('dashboard-empty');

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

    function setCategory(cat) {
        activeCategory = cat;
        render();
    }

    function clearSearch() {
        searchQuery = '';
        const searchInput = document.getElementById('dashboard-search');
        if (searchInput) searchInput.value = '';
        renderCards();
        updateClearButtonVisibility();
    }

    function updateTimestamp() {
        const el = document.getElementById('hero-timestamp');
        if (!el) return;
        const last = AppData.getLastUpdated();
        if (last) {
            const diff = Math.round((Date.now() - last.getTime()) / 60000);
            el.textContent = diff < 1 ? '⏱ Updated just now' : `⏱ Updated ${diff}m ago`;
        }
    }

    return { render, setCategory, clearSearch };
})();
