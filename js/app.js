/* ============================================
   App Initialization
   ============================================ */

const App = (function () {
    function initTheme() {
        const savedTheme = localStorage.getItem('comedk-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('comedk-theme', newTheme);
        AppData.showToast(`Switched to ${newTheme} mode`, 'info');
        updateThemeToggles();
    }

    function updateThemeToggles() {
        const current = document.documentElement.getAttribute('data-theme');
        const svgSun = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
        const svgMoon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
        
        document.querySelectorAll('.theme-toggle-icon').forEach(el => {
            el.innerHTML = current === 'dark' ? svgSun : svgMoon;
        });
    }

    async function init() {
        try {
            // Initialize theme
            initTheme();

            // Fetch data from Google Sheets
            await AppData.fetchData();

            // Hide loading screen
            const loader = document.getElementById('loading-screen');
            const app = document.getElementById('app');
            if (loader) loader.classList.add('hidden');
            if (app) app.style.display = '';

            // Render navbar
            updateNavbar();

            // Initialize router
            Router.init({
                '/': () => { Pages.Dashboard.render(); updateNavbar(); },
                '/explore': () => { Pages.Explorer.render(); updateNavbar(); },
                '/college/:code': (params) => { Pages.Details.render(params.code); updateNavbar(); },
                '/compare': () => { Pages.Compare.render(); updateNavbar(); },
                '/preferences': () => { Pages.Preferences.render(); updateNavbar(); },
                '/simulator': () => { Pages.Simulator.render(); updateNavbar(); },
                '/methodology': () => { Pages.Methodology.render(); updateNavbar(); },
            });

            // Start auto-refresh
            AppData.startAutoRefresh();

            // Update timestamp every minute
            setInterval(() => Navbar.updateTimestamp(), 60000);

            // Check for shared preference list in URL params
            if (Pages.Preferences && typeof Pages.Preferences.checkSharedPreferences === 'function') {
                Pages.Preferences.checkSharedPreferences();
            }

            // Prompt user to check/adjust profile on initial entry
            if (!sessionStorage.getItem('comedk-profile-prompted')) {
                setTimeout(() => {
                    AppData.showToast("👋 Welcome! Make sure to check/adjust your Rank & Category profile at the top to personalize predictions! 🎓", "info");
                    openProfileModal();
                    sessionStorage.setItem('comedk-profile-prompted', 'true');
                }, 1200);
            }

        } catch (err) {
            console.error('App init failed:', err);
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.querySelector('.loading-title').textContent = 'Connection Error';
                loader.querySelector('.loading-subtitle').textContent = 'Could not load data from Google Sheets. Please check your internet connection and try again.';
                loader.querySelector('.loading-spinner').style.display = 'none';
            }
        }
    }

    function updateNavbar() {
        const navEl = document.getElementById('navbar');
        if (navEl) navEl.innerHTML = Navbar.render();
        Navbar.updateTimestamp();
        updateThemeToggles();
    }

    async function refresh() {
        const btn = document.getElementById('nav-refresh-btn');
        if (btn) btn.classList.add('refreshing');

        try {
            await AppData.fetchData();
            AppData.showToast('✅ Data refreshed from Google Sheets', 'success');

            // Re-render current page
            const route = Router.getCurrentRoute();
            if (route) {
                const hash = window.location.hash || '#/';
                window.dispatchEvent(new HashChangeEvent('hashchange'));
            }
        } catch (err) {
            AppData.showToast('❌ Failed to refresh data', 'error');
        } finally {
            if (btn) btn.classList.remove('refreshing');
        }
    }

    function toggleCompareFromCard(code, isChecked) {
        const selected = Pages.Compare.getSelectedCodes();
        const idx = selected.indexOf(code);
        
        if (isChecked && idx === -1) {
            if (selected.length >= 4) {
                AppData.showToast('⚠️ Maximum 4 colleges can be compared', 'error');
                // Uncheck checkbox
                document.querySelectorAll(`.college-card[data-code="${code}"] input[type="checkbox"]`).forEach(c => c.checked = false);
                return;
            }
            selected.push(code);
            AppData.showToast(`Selected ${code} for comparison`, 'success');
        } else if (!isChecked && idx !== -1) {
            selected.splice(idx, 1);
            AppData.showToast(`Removed ${code} from comparison`, 'info');
        }
    }

    function playChimeSound() {
        try {
            const audio = new Audio('screen-recording-2026-06-04-232143_D3O5p0gd.mp3');
            audio.play().catch(err => {
                console.warn("Audio playback was blocked or failed:", err);
            });
        } catch (e) {
            console.error("Audio playback error:", e);
        }
    }

    function openProfileModal() {
        playChimeSound();
        const profile = AppData.getStudentProfile();
        
        // Create modal container if not exists
        let modal = document.getElementById('profile-settings-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'profile-settings-modal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h2>🎓 Edit Student Profile</h2>
                    <button class="modal-close-btn" onclick="App.closeProfileModal()">✕</button>
                </div>
                <div class="modal-body">
                    <p style="font-size:0.813rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.5;">
                        Adjust your COMEDK General Merit (GM) rank and category to dynamically update all admission probabilities, categories (Safe/Target/Reach/Dream), and card ratings.
                    </p>
                    <div style="display:flex;flex-direction:column;gap:14px;">
                        <div class="form-group">
                            <label for="profile-rank" style="font-size:0.813rem;font-weight:600;display:block;margin-bottom:6px;">Your COMEDK Rank (GM):</label>
                            <input type="number" id="profile-rank" value="${profile.rank}" min="1" max="150000" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary);outline:none;font-weight:500;">
                        </div>
                        <div class="form-group">
                            <label for="profile-category" style="font-size:0.813rem;font-weight:600;display:block;margin-bottom:6px;">Seat Category / Pool:</label>
                            <select id="profile-category" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary);outline:none;font-weight:500;">
                                <option value="GM" ${profile.category === 'GM' ? 'selected' : ''}>General Merit (GM) — Recommended</option>
                                <option value="K" ${profile.category === 'K' ? 'selected' : ''}>Karnataka (K) Quota</option>
                                <option value="HK" ${profile.category === 'HK' ? 'selected' : ''}>Hyderabad-Karnataka (HK) Quota</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="profile-budget" style="font-size:0.813rem;font-weight:600;display:block;margin-bottom:6px;">Maximum 4-Year Budget (Fees + Hostel):</label>
                            <select id="profile-budget" style="width:100%;padding:10px;border-radius:var(--radius-sm);border:1px solid var(--border-light);background:var(--bg-secondary);color:var(--text-primary);outline:none;font-weight:500;">
                                <option value="" ${profile.maxBudget === null ? 'selected' : ''}>No Limit</option>
                                <option value="10.0" ${profile.maxBudget === 10.0 ? 'selected' : ''}>₹10.0 Lakhs</option>
                                <option value="12.0" ${profile.maxBudget === 12.0 ? 'selected' : ''}>₹12.0 Lakhs</option>
                                <option value="15.0" ${profile.maxBudget === 15.0 ? 'selected' : ''}>₹15.0 Lakhs</option>
                                <option value="18.0" ${profile.maxBudget === 18.0 ? 'selected' : ''}>₹18.0 Lakhs</option>
                                <option value="20.0" ${profile.maxBudget === 20.0 ? 'selected' : ''}>₹20.0 Lakhs</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display:flex;justify-content:space-between;gap:10px;margin-top:20px;">
                    <button class="category-tab" onclick="App.resetProfileToDefault()" style="font-size:0.813rem;background:none;border-color:var(--border-light);">Reset (12k GM)</button>
                    <div style="display:flex;gap:8px;">
                        <button class="category-tab" onclick="App.closeProfileModal()" style="font-size:0.813rem;">Cancel</button>
                        <button class="category-tab active" onclick="App.saveProfile()" style="font-size:0.813rem;background:var(--primary);color:white;border:none;">Save Profile</button>
                    </div>
                </div>
            </div>
        `;
        
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeProfileModal() {
        const modal = document.getElementById('profile-settings-modal');
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function saveProfile() {
        const rankEl = document.getElementById('profile-rank');
        const categoryEl = document.getElementById('profile-category');
        const budgetEl = document.getElementById('profile-budget');
        if (!rankEl || !categoryEl || !budgetEl) return;
        
        const rank = parseInt(rankEl.value) || 12000;
        const category = categoryEl.value;
        const maxBudget = budgetEl.value ? parseFloat(budgetEl.value) : null;
        
        AppData.saveStudentProfile({ rank, category, maxBudget });
        closeProfileModal();
        AppData.showToast('🎓 Profile updated! Values recalculated.', 'success');
        
        // Re-render current page
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }

    function resetProfileToDefault() {
        AppData.saveStudentProfile({ rank: 12000, category: 'GM', maxBudget: null });
        closeProfileModal();
        AppData.showToast('🎓 Profile reset to default (12,000 GM, No Limit)', 'info');
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }

    // Boot
    document.addEventListener('DOMContentLoaded', init);

    return { init, refresh, toggleTheme, toggleCompareFromCard, openProfileModal, closeProfileModal, saveProfile, resetProfileToDefault };
})();
