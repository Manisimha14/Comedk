/* ============================================
   Navigation Component
   ============================================ */

const Navbar = (function () {
    const navItems = [
        { path: '/', label: 'Dashboard', icon: 'home' },
        { path: '/explore', label: 'Explore', icon: 'search' },
        { path: '/compare', label: 'Compare', icon: 'columns' },
        { path: '/preferences', label: 'Preference', icon: 'list' },
        { path: '/simulator', label: 'Simulator', icon: 'simulator' },
        { path: '/methodology', label: 'Method', icon: 'info' },
    ];

    const icons = {
        home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
        search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
        columns: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>`,
        list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
        simulator: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M10 8l6 4-6 4V8z"/></svg>`,
        info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        refresh: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`
    };

    function render() {
        const currentHash = window.location.hash || '#/';
        const currentPath = currentHash.replace('#', '').split('/').slice(0, 2).join('/') || '/';

        // Desktop top nav
        const topNav = `
            <div class="top-nav">
                <div class="nav-inner">
                    <a href="#/" class="nav-brand">
                        <div class="nav-brand-icon">🎓</div>
                        <span>COMEDK ECE</span>
                    </a>
                    <ul class="nav-links">
                        ${navItems.map(item => `
                            <li><a href="#${item.path}" class="${isActive(currentPath, item.path) ? 'active' : ''}">${item.label}</a></li>
                        `).join('')}
                    </ul>
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <span class="nav-timestamp" id="nav-timestamp"></span>
                        
                        <!-- Dynamic Cache Health Status -->
                        ${AppData.isDataFromCache() 
                            ? `<span class="status-indicator-pill cached" title="Data loaded from offline browser cache. Refresh to check for sheet updates.">🟠 Cached</span>`
                            : `<span class="status-indicator-pill live" title="Connected to live Google Sheets data.">🟢 Live</span>`
                        }
                        
                        <!-- Interactive Profile Pill -->
                        <button class="profile-pill-nav" onclick="App.openProfileModal()" title="Modify your COMEDK Rank & Seat Pool Settings">
                            🎓 Rank ${AppData.getStudentProfile().rank.toLocaleString()} <span style="font-size:0.75rem;opacity:0.9;">🔊</span>
                        </button>

                        <button class="nav-refresh" onclick="App.refresh()" id="nav-refresh-btn">
                            ${icons.refresh} Refresh
                        </button>
                        <button class="nav-theme-toggle" onclick="App.toggleTheme()" aria-label="Toggle Theme" style="background:none;border:none;padding:8px;color:var(--text-secondary);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:var(--transition);border-radius:var(--radius-sm);">
                            <span class="theme-toggle-icon" style="display:flex;"></span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Mobile bottom nav
        const bottomNav = `
            <div class="bottom-nav">
                ${navItems.map(item => `
                    <a href="#${item.path}" class="bottom-nav-item ${isActive(currentPath, item.path) ? 'active' : ''}">
                        ${icons[item.icon]}
                        <span>${item.label}</span>
                    </a>
                `).join('')}
            </div>
        `;

        return topNav + bottomNav;
    }

    function isActive(current, path) {
        if (path === '/') return current === '/' || current === '';
        return current.startsWith(path);
    }

    function updateTimestamp() {
        const el = document.getElementById('nav-timestamp');
        if (!el) return;
        const last = AppData.getLastUpdated();
        if (!last) { el.textContent = ''; return; }
        const diff = Math.round((Date.now() - last.getTime()) / 60000);
        el.textContent = diff < 1 ? 'Just now' : `${diff}m ago`;
    }

    return { render, updateTimestamp };
})();
