/* ============================================
   College Details Page — Mobile First Segmented UI
   ============================================ */

Pages.Details = (function () {
    let activeTabName = 'overview';

    function render(code) {
        const college = AppData.getCollegeByCode(code);
        const content = document.getElementById('main-content');

        if (!college) {
            content.innerHTML = `
                <div class="page-container">
                    <div class="empty-state">
                        <h3>College not found</h3>
                        <p>Code "${code}" doesn't match any college</p>
                        <button class="category-tab active" onclick="Router.navigate('/')" style="margin-top:16px;">← Back to Dashboard</button>
                    </div>
                </div>`;
            return;
        }

        // Reset tab if switched to another college
        const lastLoadedCode = content.dataset.loadedCode;
        if (lastLoadedCode !== code) {
            activeTabName = 'overview';
            content.dataset.loadedCode = code;
        }

        const profile = AppData.getStudentProfile();
        const feesDisplay = college.fees ? `₹${college.fees} Lakhs <span style="font-size:0.75rem;color:var(--prob-orange);font-weight:normal;">(Dad's Favorite — 'Jebu Khali!' 💸)</span>` : 'N/A';
        const packageDisplay = college.average_package
            ? `₹${college.average_package} LPA${college.package_type ? ` (${college.package_type === 'E' ? 'ECE' : 'Overall'})` : ''} <span style="font-size:0.75rem;color:var(--safe-color);font-weight:normal;">(Mum's Favorite — 'Kamayi Mukhyam Bigiluu!' 👩‍🍳💰)</span>`
            : 'N/A';

        // Bookmark Toggle HTML
        const isFav = AppData.isFavorite(college.college_code);
        const heartColor = isFav ? '#ef4444' : 'rgba(255, 255, 255, 0.7)';
        const fillValue = isFav ? '#ef4444' : 'none';
        const heartIcon = `
            <button class="detail-fav-btn" 
                onclick="Pages.Details.toggleBookmark('${college.college_code}')" 
                style="background:rgba(255,255,255,0.22);border:none;border-radius:50%;width:36px;height:36px;cursor:pointer;color:${heartColor};display:inline-flex;align-items:center;justify-content:center;transition:var(--transition);backdrop-filter:blur(4px);flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.1);"
                aria-label="Bookmark college">
                <svg viewBox="0 0 24 24" fill="${fillValue}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        `;

        // Render dynamic extra columns section
        const extraColumnsKeys = Object.keys(college.extra_columns || {});
        let extraColumnsSection = '';
        if (extraColumnsKeys.length > 0) {
            extraColumnsSection = `
                <div class="detail-section" style="margin-top: 14px;">
                    <div class="detail-section-title">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Additional Information
                    </div>
                    <div class="detail-grid">
                        ${extraColumnsKeys.map(key => `
                            <div class="detail-item">
                                <span class="detail-item-label">${key}</span>
                                <span class="detail-item-value">${college.extra_columns[key]}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // Tier gradients
        const tierGradients = {
            'S': 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
            'A': 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            'B': 'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
            'C': 'linear-gradient(135deg, #c27803 0%, #f59e0b 100%)'
        };
        const bgGradient = tierGradients[college.tier] || 'var(--bg-hero)';

        content.innerHTML = `
            <div class="page-container">
                <a class="detail-back" onclick="history.back()" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-weight:600; margin-bottom:12px;">← Back</a>
 
                <!-- Dynamic Hero Header -->
                <div class="detail-hero" style="background: ${bgGradient}; border-radius: var(--radius-xl); padding: 24px; color: white; margin-bottom: 16px; box-shadow: var(--glass-shadow);">
                    <div class="detail-hero-top" style="display:flex; justify-content:space-between; align-items:flex-start; gap:16px;">
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                                <h1 style="margin:0; font-size:1.35rem; line-height:1.2; font-weight:800; color:white; text-shadow:0 2px 4px rgba(0,0,0,0.15);">${college.college_name}</h1>
                                ${heartIcon}
                            </div>
                            <div class="detail-hero-badges" style="display:flex; gap:6px; flex-wrap:wrap;">
                                <span class="badge" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.25); color:white; font-weight:600;">${college.college_code}</span>
                                <span class="badge" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.25); color:white; font-weight:600;">${college.tier} Tier</span>
                                <span class="badge" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.25); color:white; font-weight:600;">${college.probability_text} Prob</span>
                                <span class="badge" style="background:rgba(255,255,255,0.2); border:1px solid rgba(255,255,255,0.25); color:white; font-weight:600;">${college.confidence} Conf</span>
                            </div>
                        </div>
                        <div class="detail-hero-score" style="background:rgba(255,255,255,0.18); backdrop-filter:blur(8px); padding:10px 14px; border-radius:var(--radius-md); text-align:center; min-width:68px; border:1px solid rgba(255,255,255,0.2);">
                            <div class="score-big" style="font-size:2.1rem; font-weight:800; line-height:1; color:white;">${college.recommendation_score}</div>
                            <div class="score-label" style="font-size:0.625rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; opacity:0.9; margin-top:2px;">ECE Rating</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px;">
                        ${college.is_best_in_tier ? '<span class="best-choice-badge" style="background:#eab308; color:#1e1b4b; font-weight:700; font-size:0.7rem; padding:4px 8px; border-radius:var(--radius-sm); display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 6px rgba(234,179,8,0.3);">⭐ Best Choice in ' + college.tier + ' Tier</span>' : ''}
                        <span style="font-size:0.75rem; font-weight:500; opacity:0.9; display:inline-flex; align-items:center; background:rgba(0,0,0,0.15); padding:4px 8px; border-radius:var(--radius-sm);">🏅 Recommended Rank #${college.recommendation_rank}</span>
                    </div>
                </div>

                <!-- Sticky Mobile-First Tab Bar -->
                <div class="details-tab-bar">
                    <button class="details-tab ${activeTabName === 'overview' ? 'active' : ''}" data-tab="overview" onclick="Pages.Details.switchTab('overview', '${college.college_code}')">📊 Overview</button>
                    <button class="details-tab ${activeTabName === 'admissions' ? 'active' : ''}" data-tab="admissions" onclick="Pages.Details.switchTab('admissions', '${college.college_code}')">🎓 Admissions</button>
                    <button class="details-tab ${activeTabName === 'finance' ? 'active' : ''}" data-tab="finance" onclick="Pages.Details.switchTab('finance', '${college.college_code}')">💰 Placement & Fees</button>
                    <button class="details-tab ${activeTabName === 'notes' ? 'active' : ''}" data-tab="notes" onclick="Pages.Details.switchTab('notes', '${college.college_code}')">📝 My Notes</button>
                </div>

                <!-- Tab Pane 1: Overview -->
                <div id="pane-overview" class="details-tab-content ${activeTabName === 'overview' ? 'active' : ''}">
                    <!-- Basic Info -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            Basic College Details
                        </div>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-item-label">College Code</span>
                                <span class="detail-item-value">${college.college_code}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Location (Proximity)</span>
                                <span class="detail-item-value">${college.bangalore_proximity || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">NIRF Rank</span>
                                <span class="detail-item-value">${college.nirf_rank}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">NAAC Grade</span>
                                <span class="detail-item-value">${college.naac_grade}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Evaluation Factors Fit -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                            Profile Fit Breakdown
                        </div>
                        <div class="score-breakdown">
                            ${renderScoreFactor('Admission Probability', college.score_breakdown.probability, '#4361ee')}
                            ${renderScoreFactor('Placement Quality', college.score_breakdown.placement, '#10b981')}
                            ${renderScoreFactor('Fees Index', college.score_breakdown.fees, '#f59e0b')}
                            ${renderScoreFactor('Bangalore Proximity', college.score_breakdown.proximity, '#8b5cf6')}
                            ${renderScoreFactor('Academic Reputation', college.score_breakdown.academic, '#ec4899')}
                        </div>
                    </div>

                    <!-- Academics & Infrastructure -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 7 3 12 0v-5"/></svg>
                            Academics & Specialized Labs
                        </div>
                        <div class="detail-grid" style="margin-bottom: 16px;">
                            <div class="detail-item">
                                <span class="detail-item-label">Specialized ECE Labs</span>
                                <span class="detail-item-value">${college.labs_rating || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Research & Core Opportunities</span>
                                <span class="detail-item-value">${college.ece_opportunity || 'N/A'}</span>
                            </div>
                        </div>
                        ${college.overall_rating ? `
                        <div style="margin-top:12px; border-top:1px solid var(--border-light); padding-top:12px;">
                            ${renderProgressBar('Overall ECE Rating Score', college.overall_rating > 5 ? college.overall_rating : college.overall_rating * 20, college.overall_rating > 5 ? college.overall_rating.toFixed(1) + '/100' : college.overall_rating + '/5')}
                        </div>` : ''}
                    </div>

                    <!-- Spreadsheet Reviews and Notes -->
                    ${college.review || college.reasoning || college.other_reviews ? `
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            Official Analysis Notes
                        </div>
                        <div class="detail-notes">
                            ${college.review ? `<div class="note-item recommendation" style="margin-bottom:8px;"><strong>📝 Anna Matalu:</strong> ${college.review}</div>` : ''}
                            ${college.reasoning ? `<div class="note-item pros" style="margin-bottom:8px;"><strong>📊 Core Reasoning:</strong> ${college.reasoning}</div>` : ''}
                            ${college.other_reviews ? `<div class="note-item cons"><strong>💬 Student & Alumni Feedback:</strong> ${college.other_reviews}</div>` : ''}
                        </div>
                    </div>` : ''}
                </div>

                <!-- Tab Pane 2: Admissions -->
                <div id="pane-admissions" class="details-tab-content ${activeTabName === 'admissions' ? 'active' : ''}">
                    <!-- Admission & Cutoffs -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                            Historical Cutoffs & Predictor
                        </div>
                        <div class="detail-grid" style="margin-bottom:20px;">
                            <div class="detail-item">
                                <span class="detail-item-label">2024 Round 4</span>
                                <span class="detail-item-value">${college.cutoff_2024_r4?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">2025 Round 1</span>
                                <span class="detail-item-value">${college.cutoff_2025_r1?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">2025 Round 3</span>
                                <span class="detail-item-value">${college.cutoff_2025_r3?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">2025 Round 4</span>
                                <span class="detail-item-value">${college.cutoff_2025_r4?.toLocaleString() || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label" style="color:var(--primary); font-weight:700;">Pred. 2026 Round 1</span>
                                <span class="detail-item-value highlight" style="font-weight:700;">${college.predicted_r1_2026}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label" style="color:var(--primary); font-weight:700;">Pred. 2026 Round 4</span>
                                <span class="detail-item-value highlight" style="font-weight:700;">${college.predicted_r4_2026}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Admission Chance</span>
                                <span class="detail-item-value">${Badges.probabilityBadge(college.probability, college.probability_text)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Prediction Confidence</span>
                                <span class="detail-item-value">${Badges.confidenceBadge(college.confidence)}</span>
                            </div>
                        </div>

                        <!-- Cutoff Chart Canvas -->
                        <div class="chart-container" style="border-top:1px solid var(--border-light); padding-top:16px;">
                            <canvas id="cutoff-chart"></canvas>
                        </div>
                    </div>

                    <!-- Seat Matrix -->
                    ${college.seats_2024 || college.seats_2025 ? `
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                            ECE Intake Seat Matrix
                        </div>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <span class="detail-item-label">2024 Seats count</span>
                                <span class="detail-item-value">${college.seats_2024 || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">2025 Seats count</span>
                                <span class="detail-item-value">${college.seats_2025 || 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Seat Variation</span>
                                <span class="detail-item-value ${college.seats_2025 > college.seats_2024 ? 'highlight' : ''}" style="color:${college.seats_2025 > college.seats_2024 ? 'var(--safe-color)' : (college.seats_2025 < college.seats_2024 ? 'var(--dream-color)' : 'var(--text-primary)')}; font-weight:700;">
                                    ${college.seats_2024 && college.seats_2025 
                                        ? (college.seats_2025 - college.seats_2024 >= 0 ? '+' : '') + (college.seats_2025 - college.seats_2024)
                                        : 'N/A'}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Seat Trend Comment</span>
                                <span class="detail-item-value" style="font-size:0.8rem;">${college.rank_variation || 'Stable'}</span>
                            </div>
                        </div>
                    </div>` : ''}
                </div>

                <!-- Tab Pane 3: Placement & Cost -->
                <div id="pane-finance" class="details-tab-content ${activeTabName === 'finance' ? 'active' : ''}">
                    <!-- Placements -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                            Placements Statistics
                        </div>
                        <div class="detail-grid">
                            <div class="detail-item" style="grid-column: span 2;">
                                <span class="detail-item-label">Average Annual Package</span>
                                <span class="detail-item-value highlight" style="font-size:1.05rem;">${packageDisplay}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Data Scope</span>
                                <span class="detail-item-value" style="font-size:0.8rem;">${college.package_type === 'E' ? 'ECE Specific average' : college.package_type === 'O' ? 'Overall college average' : 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-item-label">Hostel Facility</span>
                                <span class="detail-item-value">${college.hostel && college.hostel.toLowerCase() === 'yes' ? '✅ Available <span style="font-size:0.72rem;color:var(--safe-color);font-weight:normal;">(Nanamma Undhile 👵❤️)</span>' : (college.hostel || 'N/A')}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Cost Split calculator -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                            Integrated 4-Year Cost Analysis
                        </div>
                        <div style="display:flex; flex-direction:column; gap:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.875rem;">
                                <span>Total 4-Year Cost (Tuition + Hostel) <span style="font-size:0.75rem; color:var(--prob-orange);">(Dad's Nightmare 💸)</span>:</span>
                                <strong style="color:var(--safe-color); font-size:1.05rem;">${college.fees ? `₹${(college.fees).toFixed(2)} Lakhs` : 'N/A'}</strong>
                            </div>
                            <p style="font-size:0.75rem; color:var(--text-muted); margin:0; line-height:1.4;">
                                💡 Note: The sheet's total fees already include tuition and hostel charges.
                            </p>
                            <div style="border-top:1px dashed var(--border-light); padding-top:10px; margin-top:4px;">
                                <label style="display:flex; justify-content:space-between; align-items:center; font-size:0.813rem; font-weight:600; margin-bottom:8px; cursor:pointer;">
                                    <span>Estimate Hostel Split:</span>
                                    <select id="calc-hostel-rate" onchange="Pages.Details.recalculateCost(${college.fees || 0})" style="padding:5px 8px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); cursor:pointer; font-size:0.75rem; outline:none; font-weight:600;">
                                        <option value="1.0">₹1.0 Lakh/yr (Est. Basic Sharing)</option>
                                        <option value="1.25">₹1.25 Lakhs/yr (Est. Standard)</option>
                                        <option value="1.5" selected>₹1.5 Lakhs/yr (Est. Premium)</option>
                                        <option value="2.0">₹2.0 Lakhs/yr (Est. AC/Luxury)</option>
                                    </select>
                                </label>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:6px; font-size:0.813rem; padding:12px; border-radius:var(--radius-md); background:var(--bg-secondary); border:1px solid var(--border-light);">
                                <div style="display:flex; justify-content:space-between; align-items:center;">
                                    <span style="color:var(--text-secondary);">Estimated Pure Tuition (4 Yrs):</span>
                                    <span id="calc-split-tuition" style="font-weight:700; color:var(--primary);">₹${college.fees ? (college.fees - 6.0).toFixed(2) : 'N/A'} Lakhs</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px; border-top:1px dashed var(--border-light); padding-top:4px;">
                                    <span style="color:var(--text-secondary);">Estimated Hostel & Mess (4 Yrs) <span style="font-size:0.72rem;color:var(--safe-color);font-weight:normal;">(Nanamma Undhile 👵🥣)</span>:</span>
                                    <span id="calc-split-hostel" style="font-weight:700; color:var(--text-primary);">₹6.00 Lakhs</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Pane 4: Notes -->
                <div id="pane-notes" class="details-tab-content ${activeTabName === 'notes' ? 'active' : ''}">
                    <!-- My Personal Notes -->
                    <div class="detail-section">
                        <div class="detail-section-title">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            My Custom Counseling Notes
                        </div>
                        <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:10px; line-height:1.4;">
                            Save notes from college visits, talks with seniors, or phone numbers here. Saved locally in this browser.
                        </p>
                        <textarea id="custom-note-textarea" placeholder="Type notes here (saved locally)..." style="width:100%; height:110px; padding:12px; border-radius:var(--radius-md); border:1.5px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); font-size:0.875rem; resize:vertical; outline:none; transition:var(--transition); font-family:inherit; margin-bottom:12px;">${localStorage.getItem(`comedk-note-${college.college_code}`) || ''}</textarea>
                        <button class="nav-refresh" onclick="Pages.Details.saveCustomNote('${college.college_code}')" style="background:var(--primary); color:white; border:none; padding:8px 16px; border-radius:var(--radius-sm); font-weight:600; font-size:0.813rem; transition:var(--transition); display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
                            💾 Save Note
                        </button>
                    </div>

                    ${extraColumnsSection}
                </div>
            </div>
        `;

        // Render chart immediately if admissions tab is active, otherwise wait till switched
        if (activeTabName === 'admissions') {
            setTimeout(() => Charts.renderCutoffChart('cutoff-chart', college), 100);
        }
    }

    function switchTab(tabName, collegeCode) {
        // Toggle tabs
        document.querySelectorAll('.details-tab').forEach(btn => {
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Toggle panes
        document.querySelectorAll('.details-tab-content').forEach(pane => {
            if (pane.id === `pane-${tabName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        activeTabName = tabName;

        // Render chart if Admissions is opened
        if (tabName === 'admissions') {
            const college = AppData.getCollegeByCode(collegeCode);
            if (college) {
                setTimeout(() => Charts.renderCutoffChart('cutoff-chart', college), 100);
            }
        }
    }

    function toggleBookmark(code) {
        const isNowFav = AppData.toggleFavorite(code);
        render(code);
    }

    function saveCustomNote(code) {
        const textarea = document.getElementById('custom-note-textarea');
        if (textarea) {
            localStorage.setItem(`comedk-note-${code}`, textarea.value);
            AppData.showToast('📝 Custom notes saved successfully', 'success');
        }
    }

    function recalculateCost(totalFees) {
        const rateSelect = document.getElementById('calc-hostel-rate');
        const tuitionSpan = document.getElementById('calc-split-tuition');
        const hostelSpan = document.getElementById('calc-split-hostel');
        
        if (!totalFees) return;
        
        const rate = rateSelect ? parseFloat(rateSelect.value) : 1.5;
        const totalHostel = rate * 4;
        const totalTuition = Math.max(0, totalFees - totalHostel);
        
        if (tuitionSpan) tuitionSpan.textContent = `₹${totalTuition.toFixed(2)} Lakhs`;
        if (hostelSpan) hostelSpan.textContent = `₹${totalHostel.toFixed(2)} Lakhs`;
    }

    function renderScoreFactor(label, value, color) {
        return `
            <div class="score-factor" style="margin-bottom:8px;">
                <span class="score-factor-label" style="min-width:130px; font-size:0.75rem;">${label}</span>
                <div class="score-factor-bar" style="height:6px; flex:1;">
                    <div class="score-factor-bar-fill" style="width:${value}%; background:${color}"></div>
                </div>
                <span class="score-factor-value" style="color:${color}; font-size:0.75rem; font-weight:700; width:36px; text-align:right;">${value}%</span>
            </div>
        `;
    }

    function renderProgressBar(label, percentage, valueText) {
        return `
            <div class="progress-bar-container">
                <div class="progress-bar-header" style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.75rem;">
                    <span class="progress-bar-label" style="font-weight:600; color:var(--text-secondary);">${label}</span>
                    <span class="progress-bar-value" style="font-weight:700; color:var(--text-primary);">${valueText}</span>
                </div>
                <div class="progress-bar-track" style="height:8px; background:var(--bg-secondary); border-radius:var(--radius-full); overflow:hidden;">
                    <div class="progress-bar-fill" style="width:${Math.min(percentage, 100)}%; height:100%; background:var(--primary); border-radius:var(--radius-full); transition:width 1s ease;"></div>
                </div>
            </div>
        `;
    }

    return { render, toggleBookmark, saveCustomNote, recalculateCost, switchTab };
})();
