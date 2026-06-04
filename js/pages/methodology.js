/* ============================================
   Methodology Page
   ============================================ */

Pages.Methodology = (function () {
    const checklistItems = [
        "COMEDK Registration & Rank Card received",
        "Counselling Registration & Document Upload completed",
        "Document Verification Status approved by COMEDK office",
        "Preference Order finalized on the Preference page of this dashboard",
        "Mock Allotment results announced and choices edited",
        "Round 1 Choice Submission locked & saved",
        "Round 1 Seat Allotment outcome announced",
        "Selected Allotment Decision Action (Freeze / Upgrade / Withdraw)",
        "Required Fee payment paid to COMEDK bank gateway",
        "Reported to allotted college with physical documents (completed admission)"
    ];

    function render() {
        const content = document.getElementById('main-content');
        const profile = AppData.getStudentProfile();
        const colleges = AppData.getColleges();

        // Calculate macro Seat Matrix aggregates
        let totalSeats2024 = 0;
        let totalSeats2025 = 0;
        let collegesWithSeatData = 0;

        colleges.forEach(c => {
            if (c.seats_2024 || c.seats_2025) {
                totalSeats2024 += (c.seats_2024 || 0);
                totalSeats2025 += (c.seats_2025 || 0);
                collegesWithSeatData++;
            }
        });

        const netSeatChange = totalSeats2025 - totalSeats2024;
        const seatChangePercent = totalSeats2024 ? ((netSeatChange / totalSeats2024) * 100).toFixed(1) : '0';
        const changeSign = netSeatChange >= 0 ? '+' : '';

        content.innerHTML = `
            <div class="page-container">
                <div class="section-header mb-16" style="margin-top:8px;">
                    <div>
                        <h1 class="page-title">Methodology & Tracker</h1>
                        <p class="page-subtitle">Counselling analysis roadmap and live seats matrix data</p>
                    </div>
                </div>

                <!-- Student Profile -->
                <div class="method-card" onclick="App.openProfileModal()" style="cursor:pointer;" title="Click to edit profile settings">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;width:100%;flex-wrap:wrap;gap:8px;">
                        <h3 style="margin:0;">🎓 Student Profile</h3>
                        <span style="font-size:0.75rem;padding:3px 8px;border-radius:var(--radius-sm);background:var(--primary-glow);color:var(--primary);font-weight:600;display:inline-flex;align-items:center;">✏️ Edit Settings</span>
                    </div>
                    <div class="detail-grid" style="gap:12px;">
                        <div class="method-highlight">
                            <div class="method-highlight-number">${profile.rank.toLocaleString()}</div>
                            <div class="method-highlight-label">COMEDK Rank</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number">${profile.branch}</div>
                            <div class="method-highlight-label">Branch</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number">${profile.category}</div>
                            <div class="method-highlight-label">Category</div>
                        </div>
                    </div>
                </div>

                <!-- Live Seat Matrix Trend Card -->
                <div class="method-card">
                    <h3>📊 Live ECE Seat Matrix Trend (Aggregated)</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:16px;">
                        <div class="method-highlight">
                            <div class="method-highlight-number">${totalSeats2024}</div>
                            <div class="method-highlight-label">Total ECE Seats (2024)</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number">${totalSeats2025}</div>
                            <div class="method-highlight-label">Total ECE Seats (2025)</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number" style="color:${netSeatChange >= 0 ? 'var(--safe-color)' : 'var(--dream-color)'};">
                                ${changeSign}${netSeatChange} (${changeSign}${seatChangePercent}%)
                            </div>
                            <div class="method-highlight-label">Net Seats Change</div>
                        </div>
                    </div>
                    <p style="font-size:0.813rem;color:var(--text-secondary);line-height:1.6;">
                        This live macro analysis automatically aggregates data from ${collegesWithSeatData} colleges with published seat matrix counts. 
                        A net increase in seat matrix numbers generally relaxes competition, helping cutoffs drift higher (favorable), 
                        while seat count reductions lead to tighter entry ranks.
                    </p>
                </div>

                <!-- Interactive Counselling Checklist -->
                <div class="method-card">
                    <h3>✅ My Counselling Checklist (Saves Locally)</h3>
                    <p style="font-size:0.813rem;color:var(--text-secondary);margin-bottom:14px;line-height:1.5;">
                        Track your progress through all official COMEDK stages. Tick off items as you complete them:
                    </p>
                    <div style="display:flex;flex-direction:column;gap:10px;">
                        ${checklistItems.map((item, idx) => {
                            const isChecked = localStorage.getItem(`comedk-checklist-${idx}`) === 'true';
                            return `
                                <label style="display:flex;align-items:flex-start;gap:10px;font-size:0.813rem;color:var(--text-primary);cursor:pointer;padding:10px 12px;border-radius:var(--radius-md);background:var(--card-bg);border:1px solid var(--border-light);transition:var(--transition);user-select:none;">
                                    <input type="checkbox" 
                                        ${isChecked ? 'checked' : ''} 
                                        onchange="Pages.Methodology.toggleChecklist(${idx}, this.checked)"
                                        style="margin-top:3px;cursor:pointer;accent-color:var(--primary);width:14px;height:14px;">
                                    <span style="${isChecked ? 'text-decoration:line-through;color:var(--text-muted);' : ''}">${item}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>

                <!-- Data Sources -->
                <div class="method-card">
                    <h3>📊 Data Sources</h3>
                    <ul class="method-list">
                        <li>2024 Round 4 Final Cutoffs (official COMEDK data)</li>
                        <li>2025 Round 1 Cutoffs</li>
                        <li>2025 Round 3 Cutoffs</li>
                        <li>2025 Round 4 Final Cutoffs</li>
                        <li>ECE Seat Matrix (2024 and 2025 intake)</li>
                        <li>Applicant count trends (2024–2026)</li>
                        <li>NIRF Rankings & NAAC Grades</li>
                        <li>Placement data from college websites and student reviews</li>
                    </ul>
                </div>

                <!-- Forecast Assumptions -->
                <div class="method-card">
                    <h3>📈 Forecast Assumptions</h3>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:16px;">
                        <div class="method-highlight">
                            <div class="method-highlight-number">1,20,000</div>
                            <div class="method-highlight-label">2024 Applicants</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number">1,30,000</div>
                            <div class="method-highlight-label">2025 Applicants</div>
                        </div>
                        <div class="method-highlight">
                            <div class="method-highlight-number">~1,20,000</div>
                            <div class="method-highlight-label">2026 Projected</div>
                        </div>
                    </div>
                    <p style="font-size:0.813rem;color:var(--text-secondary);line-height:1.6;">
                        The 2026 applicant count is projected to stabilize around 2024 levels after the 2025 surge. 
                        This normalization factor affects cutoff predictions, as fewer applicants generally lead to 
                        higher (more relaxed) cutoffs.
                    </p>
                </div>

                <!-- Prediction Methodology -->
                <div class="method-card">
                    <h3>🔮 Prediction Methodology</h3>
                    <ul class="method-list">
                        <li><strong>Historical Trend Analysis:</strong> Examining cutoff progression across rounds (R1→R4) and years (2024→2025) to identify patterns</li>
                        <li><strong>Seat Adjustment Factor:</strong> Changes in ECE seat count between years directly impact competition levels and cutoffs</li>
                        <li><strong>Applicant Normalization:</strong> Adjusting predictions based on projected 2026 applicant pool compared to 2024/2025</li>
                        <li><strong>Round Drift Analysis:</strong> Modeling how cutoffs relax from Round 1 to Round 4 based on historical patterns</li>
                        <li><strong>Rank Variation Analysis:</strong> Understanding the typical range of rank fluctuation for each college across years</li>
                    </ul>
                </div>

                <!-- Profile Evaluation Factors -->
                <div class="method-card">
                    <h3>⭐ Profile Evaluation Weights</h3>
                    <p style="font-size:0.813rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
                        Though primary ranks are sorted directly by the Excel overall ECE rating score, these factors describe the multi-dimensional alignment for evaluation:
                    </p>
                    <div class="score-breakdown">
                        ${renderWeight('Admission Probability', 40, '#4361ee', 'How likely you are to get a seat based on predicted cutoffs vs your rank')}
                        ${renderWeight('Placement Quality', 25, '#10b981', 'Average package, placement rate, and ECE-specific opportunities')}
                        ${renderWeight('Fees', 15, '#f59e0b', 'Total fee burden (lower fees = higher score)')}
                        ${renderWeight('Bangalore Proximity', 10, '#8b5cf6', 'Distance from Bangalore center — closer is scored higher')}
                        ${renderWeight('Academic Reputation', 10, '#ec4899', 'NIRF rank, NAAC grade, and ECE lab infrastructure')}
                    </div>
                </div>

                <!-- Category Definitions -->
                <div class="method-card">
                    <h3>🎯 College Categories</h3>
                    <div style="display:flex;flex-direction:column;gap:12px;">
                        <div class="note-item pros" style="border-left-color:var(--safe-color);background:var(--safe-bg);">
                            <strong>🟢 Safe (75–100% probability):</strong> Very likely to get a seat. Should be prioritized as reliable options.
                        </div>
                        <div class="note-item recommendation" style="border-left-color:var(--target-color);background:var(--target-bg);">
                            <strong>🟡 Target (50–74% probability):</strong> Good chance of admission. These should be your primary focus colleges.
                        </div>
                        <div class="note-item recommendation" style="border-left-color:var(--reach-color);background:var(--reach-bg);">
                            <strong>🟠 Reach (20–49% probability):</strong> Possible but competitive. Worth listing but don't count on them.
                        </div>
                        <div class="note-item cons" style="border-left-color:var(--dream-color);background:var(--dream-bg);">
                            <strong>🔴 Dream (0–19% probability):</strong> Aspirational choices. Include them at the top of your preference list but have backup plans.
                        </div>
                    </div>
                </div>

                <!-- Tier Calculation Methodology -->
                <div class="method-card">
                    <h3>🏫 College Tier Classification Rules</h3>
                    <p style="font-size:0.813rem;color:var(--text-secondary);margin-bottom:16px;line-height:1.6;">
                        Colleges are placed into Tiers (S, A, B, or C) based on their academic rankings, ECE specialized lab infrastructure, placement outcomes, and overall ECE rating scores:
                    </p>
                    <div style="display:flex;flex-direction:column;gap:12px;font-size:0.813rem;line-height:1.5;">
                        <div style="padding:12px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--card-bg);">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                ${Badges.tierBadge('S')}
                                <strong>Elite / Tier S (Top Academic & Infrastructure)</strong>
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.75rem;padding-left:42px;">
                                NIRF Engineering Rank &le; 150 AND Overall ECE rating score above 40/100. These are the premier choices with outstanding research facilities and institutional prestige.
                            </div>
                        </div>
                        <div style="padding:12px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--card-bg);">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                ${Badges.tierBadge('A')}
                                <strong>Premium / Tier A (Strong Reputation & Good Placements)</strong>
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.75rem;padding-left:42px;">
                                NIRF Engineering Rank &le; 200 with an overall rating &ge; 3/5, OR having strong ECE laboratory infrastructure, specialized branch opportunities, and average packages.
                            </div>
                        </div>
                        <div style="padding:12px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--card-bg);">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                ${Badges.tierBadge('B')}
                                <strong>Strong / Tier B (Moderate & Value Options)</strong>
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.75rem;padding-left:42px;">
                                Decent placement outcomes with ECE average packages &ge; 7 LPA, or showing moderate overall ratings (&ge; 3/5) but stable admission cutoffs.
                            </div>
                        </div>
                        <div style="padding:12px;border-radius:var(--radius-md);border:1px solid var(--border-light);background:var(--card-bg);">
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
                                ${Badges.tierBadge('C')}
                                <strong>Safety / Tier C (Backups & Safe Alternatives)</strong>
                            </div>
                            <div style="color:var(--text-secondary);font-size:0.75rem;padding-left:42px;">
                                Moderate overall ratings, newer branch establishments, or safety schools with cutoffs that generally extend beyond typical merit ranges.
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Confidence Levels -->
                <div class="method-card">
                    <h3>📊 Confidence Levels</h3>
                    <ul class="method-list">
                        <li><strong>Very High:</strong> Multiple years of consistent data, stable seat count, predictable trends</li>
                        <li><strong>High:</strong> Good historical data with minor variations</li>
                        <li><strong>Medium-High:</strong> Reliable data but some seat or demand changes</li>
                        <li><strong>Medium:</strong> Moderate data quality or recent pattern changes</li>
                        <li><strong>Low:</strong> Limited data, new college, or volatile cutoff patterns</li>
                        <li><strong>Very Low:</strong> Insufficient data for reliable prediction</li>
                    </ul>
                </div>

                <!-- Disclaimer -->
                <div class="method-card" style="border-left:3px solid var(--prob-orange);">
                    <h3>⚠️ Disclaimer</h3>
                    <p style="font-size:0.813rem;color:var(--text-secondary);line-height:1.6;">
                        This dashboard is a <strong>decision-support tool</strong>, not a guarantee of admission. 
                        Predictions are based on historical data and statistical modeling. Actual cutoffs may vary 
                        due to unforeseen factors such as changes in exam difficulty, applicant demographics, 
                        policy changes, or seat allocation adjustments. Always verify information from official 
                        COMEDK sources before making final decisions.
                    </p>
                </div>

                <!-- Data Source -->
                <div class="method-card" style="text-align:center;">
                    <p style="font-size:0.75rem;color:var(--text-muted);">
                        Data powered by Google Sheets • Auto-refreshes every 5 minutes • Credits footer visible below<br>
                        <a href="https://docs.google.com/spreadsheets/d/${AppData.SHEET_ID}" target="_blank" 
                            style="color:var(--primary);text-decoration:underline;">View Source Spreadsheet ↗</a>
                    </p>
                </div>
            </div>
        `;
    }

    function toggleChecklist(index, isChecked) {
        localStorage.setItem(`comedk-checklist-${index}`, isChecked ? 'true' : 'false');
        AppData.showToast(isChecked ? '✅ Progress checklist step checked' : '↩️ Step unchecked', 'info');
        render();
    }

    function renderWeight(label, weight, color, description) {
        return `
            <div style="margin-bottom:12px;">
                <div class="score-factor">
                    <span class="score-factor-label" style="min-width:130px;">${label}</span>
                    <div class="score-factor-bar">
                        <div class="score-factor-bar-fill" style="width:${weight}%;background:${color}"></div>
                    </div>
                    <span class="score-factor-value" style="color:${color}">${weight}%</span>
                </div>
                <p style="font-size:0.688rem;color:var(--text-muted);margin-top:4px;margin-left:140px;">${description}</p>
            </div>
        `;
    }

    return { render, toggleChecklist };
})();
