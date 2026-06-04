/* ============================================
   Comparison Page
   ============================================ */

Pages.Compare = (function () {
    let selectedCodes = [];

    function render() {
        const colleges = AppData.getColleges();
        const selected = selectedCodes.map(code => AppData.getCollegeByCode(code)).filter(Boolean);
        const content = document.getElementById('main-content');

        content.innerHTML = `
            <div class="page-container">
                <div class="section-header mb-16" style="margin-top:8px;">
                    <div>
                        <h1 class="page-title">Compare Colleges</h1>
                        <p class="page-subtitle">Select up to 4 colleges for side-by-side comparison</p>
                    </div>
                </div>

                <!-- College Selector -->
                <div class="compare-selector">
                    <div class="compare-selector-title">Select Colleges (${selected.length}/4)</div>
                    <div class="compare-chips">
                        ${colleges.map(c => `
                            <button class="compare-chip ${selectedCodes.includes(c.college_code) ? 'selected' : ''}"
                                onclick="Pages.Compare.toggleCollege('${c.college_code}')"
                                ${selectedCodes.length >= 4 && !selectedCodes.includes(c.college_code) ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                                ${c.college_code} - ${getShortName(c.college_name)}
                                ${selectedCodes.includes(c.college_code) ? '<span class="remove-x">✕</span>' : ''}
                            </button>
                        `).join('')}
                    </div>
                </div>

                ${selected.length >= 2 ? renderComparisonTable(selected) : `
                    <div class="empty-state">
                        <h3>Select at least 2 colleges</h3>
                        <p>Click on the college chips above to start comparing</p>
                    </div>
                `}
            </div>
        `;

        if (selected.length >= 2) {
            setTimeout(() => {
                Charts.renderRoiChart('compare-roi-chart', selected);
            }, 100);
        }
    }

    function renderComparisonTable(selected) {
        const metrics = [
            { label: 'Overall ECE Rating (Excel)', key: 'overall_rating', format: v => v ? v.toFixed(2) : 'N/A', higherBetter: true },
            { label: 'Tier', key: 'tier', format: v => v, custom: true },
            { label: 'Probability', key: 'probability', format: v => v ? Math.round(v) + '%' : 'N/A', higherBetter: true },
            { label: 'Confidence', key: 'confidence', format: v => v || 'N/A', custom: true },
            { label: 'Predicted 2026 R1', key: 'predicted_r1_2026', format: v => v || 'N/A', custom: true },
            { label: 'Predicted 2026 R4', key: 'predicted_r4_2026', format: v => v || 'N/A', custom: true },
            { label: 'NIRF Rank', key: 'nirf_rank', format: v => v || 'N/A', custom: true },
            { label: 'NAAC Grade', key: 'naac_grade', format: v => v || 'N/A', custom: true },
            { label: 'Avg Package', key: 'average_package', format: v => v ? '₹' + v + ' LPA <span style="font-size:0.688rem;color:var(--prob-green);">(Mum\'s Fav 👩‍🍳)</span>' : 'N/A', higherBetter: true },
            { label: 'Total Fees', key: 'fees', format: v => v ? '₹' + v + 'L <span style="font-size:0.688rem;color:var(--prob-orange);">(Dad\'s Fav 💸)</span>' : 'N/A', higherBetter: false },
            {
                label: 'Profile Budget Match',
                key: 'fees',
                format: (v, c) => {
                    const profile = AppData.getStudentProfile();
                    if (!profile.maxBudget) return '🟢 Limit Not Set';
                    if (!v) return 'N/A';
                    if (v <= profile.maxBudget) return '✅ Within Budget';
                    return `❌ Exceeds (₹${(v - profile.maxBudget).toFixed(2)}L over)`;
                },
                custom: true
            },
            { label: 'Hostel', key: 'hostel', format: v => v && v.toLowerCase() === 'yes' ? '✅ Yes' : (v || 'N/A'), custom: true },
            { label: 'Location', key: 'bangalore_proximity', format: v => v || 'N/A', custom: true },
            { label: 'ECE Labs', key: 'labs_rating', format: v => v || 'N/A', custom: true },
            { label: 'ECE Opportunity', key: 'ece_opportunity', format: v => v || 'N/A', custom: true },
            { label: '2024 ECE Seats', key: 'seats_2024', format: v => v || 'N/A', custom: true },
            { label: '2025 ECE Seats', key: 'seats_2025', format: v => v || 'N/A', custom: true },
        ];

        // Find all unique extra columns across selected colleges
        const allExtraKeysSet = new Set();
        selected.forEach(c => {
            if (c.extra_columns) {
                Object.keys(c.extra_columns).forEach(k => allExtraKeysSet.add(k));
            }
        });
        const allExtraKeys = Array.from(allExtraKeysSet);

        const extraRows = allExtraKeys.map(key => {
            return `
                <tr>
                    <th>${key}</th>
                    ${selected.map(c => {
                        const val = c.extra_columns ? (c.extra_columns[key] || '—') : '—';
                        return `<td>${val}</td>`;
                    }).join('')}
                </tr>
            `;
        }).join('');

        // Compare Insights calculations
        const insights = [];
        
        // Find best package
        const pkgColleges = selected.filter(c => c.average_package);
        let bestPkgCollege = null;
        if (pkgColleges.length > 0) {
            const sortedPkgs = [...pkgColleges].sort((a, b) => b.average_package - a.average_package);
            bestPkgCollege = sortedPkgs[0];
        }

        // Find lowest fees
        const feeColleges = selected.filter(c => c.fees);
        let lowestFeeCollege = null;
        if (feeColleges.length > 0) {
            const sortedFees = [...feeColleges].sort((a, b) => a.fees - b.fees);
            lowestFeeCollege = sortedFees[0];
        }

        // Find highest score (overall rating)
        const sortedScores = [...selected].sort((a, b) => b.recommendation_score - a.recommendation_score);
        const bestScoreCollege = sortedScores[0];

        // Actionable Placements vs Fees Verdict
        if (bestPkgCollege && lowestFeeCollege) {
            if (bestPkgCollege.college_code === lowestFeeCollege.college_code) {
                insights.push(`🏆 <strong>${getShortName(bestPkgCollege.college_name)}</strong> is a no-brainer! It offers the **highest average package** (₹${bestPkgCollege.average_package} LPA - Mum's Fav 👩‍🍳) AND the **lowest total fees** (₹${bestPkgCollege.fees}L - Dad's Fav 💸).`);
            } else {
                insights.push(`💼 <strong>Placements Priority (Mum's Choice 👩‍🍳):</strong> Choose <strong>${getShortName(bestPkgCollege.college_name)}</strong> for the highest average package of <strong>₹${bestPkgCollege.average_package} LPA</strong>.`);
                insights.push(`💰 <strong>Budget Priority (Dad's Choice 💸):</strong> Choose <strong>${getShortName(lowestFeeCollege.college_name)}</strong> to minimize total fees to <strong>₹${lowestFeeCollege.fees}L</strong>.`);
            }
        }

        // Return on Investment (ROI) Ratio
        const roiColleges = selected.filter(c => c.fees && c.average_package);
        if (roiColleges.length > 1) {
            const sortedRoi = [...roiColleges].sort((a, b) => (b.average_package / b.fees) - (a.average_package / a.fees));
            insights.push(`📈 <strong>Best Value (ROI):</strong> <strong>${getShortName(sortedRoi[0].college_name)}</strong> offers the best placement-to-fees ratio among these options.`);
        }

        // Admission Safe Bets
        const probColleges = selected.filter(c => c.probability);
        if (probColleges.length > 0) {
            const sortedProbs = [...probColleges].sort((a, b) => b.probability - a.probability);
            const mostSafe = sortedProbs[0];
            const leastSafe = sortedProbs[sortedProbs.length - 1];
            
            if (mostSafe.probability >= 75 && leastSafe.probability < 50) {
                insights.push(`🛡️ <strong>Safety Check:</strong> Keep <strong>${getShortName(mostSafe.college_name)}</strong> as a safe backup (${Math.round(mostSafe.probability)}% probability) if you choose the highly competitive <strong>${getShortName(leastSafe.college_name)}</strong>.`);
            } else if (mostSafe.probability > leastSafe.probability) {
                insights.push(`🛡️ <strong>Safety Check:</strong> <strong>${getShortName(mostSafe.college_name)}</strong> is your most reliable entry option with <strong>${Math.round(mostSafe.probability)}%</strong> probability.`);
            }
        }

        // Overall Recommendation Verdict
        if (bestScoreCollege && sortedScores.length > 1 && sortedScores[0].recommendation_score > sortedScores[1].recommendation_score) {
            insights.push(`⭐️ <strong>Verdict:</strong> Based on overall ECE rating, <strong>${getShortName(bestScoreCollege.college_name)}</strong> ranks #1 here with a score of <strong>${bestScoreCollege.recommendation_score}/100</strong>.`);
        }

        const insightsHtml = insights.length > 0 ? `
            <div class="method-card mb-16" style="border-left: 4px solid var(--primary); background: var(--primary-glow); padding: 14px 16px; border-radius: var(--radius-md);">
                <h3 style="margin-bottom:8px; font-size:0.875rem; display:flex; align-items:center; gap:6px;">Chaduvurani Vadiki Kanisam Pointlu Anna Chadavandi 🤣</h3>
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:6px; font-size:0.813rem; color:var(--text-primary);">
                    ${insights.map(ins => `<li style="line-height:1.4; display:flex; align-items:flex-start; gap:6px;"><span>•</span><span>${ins}</span></li>`).join('')}
                </ul>
            </div>
        ` : '';

        return `
            ${insightsHtml}

            <!-- ROI Scatter Plot Card -->
            <div class="method-card mb-16" style="padding:16px;">
                <h3 style="margin-bottom:12px; font-size:0.875rem;">📈 Placements vs. Total Fees ROI Scatter Plot</h3>
                <div class="chart-container" style="position:relative; height:320px; width:100%;">
                    <canvas id="compare-roi-chart"></canvas>
                </div>
            </div>

            <div class="compare-table-wrapper">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th>Metric</th>
                            ${selected.map(c => `<td class="college-header">${getShortName(c.college_name)}<br><span style="font-weight:400;font-size:0.688rem;opacity:0.8;">${c.college_code}</span></td>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${metrics.map(metric => {
                            const values = selected.map(c => c[metric.key]);
                            const numericValues = values.filter(v => typeof v === 'number' && v > 0);
                            let bestIdx = -1, worstIdx = -1;

                            if (!metric.custom && numericValues.length >= 2) {
                                if (metric.higherBetter) {
                                    const max = Math.max(...numericValues);
                                    const min = Math.min(...numericValues);
                                    bestIdx = values.indexOf(max);
                                    worstIdx = values.indexOf(min);
                                } else {
                                    const min = Math.min(...numericValues);
                                    const max = Math.max(...numericValues);
                                    bestIdx = values.indexOf(min);
                                    worstIdx = values.indexOf(max);
                                }
                                if (bestIdx === worstIdx) { bestIdx = -1; worstIdx = -1; }
                            }

                            return `
                                <tr>
                                    <th>${metric.label}</th>
                                    ${selected.map((c, i) => {
                                        const cls = i === bestIdx ? 'best' : (i === worstIdx ? 'worst' : '');
                                        return `<td class="${cls}">${metric.format(c[metric.key], c)}</td>`;
                                    }).join('')}
                                </tr>
                            `;
                        }).join('')}
                        ${extraRows}
                    </tbody>
                </table>
            </div>
        `;
    }

    function getShortName(name) {
        // Extract abbreviation from parentheses if available
        const match = name.match(/\(([^)]+)\)/);
        return match ? match[1] : name.split(' ').slice(0, 3).join(' ');
    }

    function toggleCollege(code) {
        const idx = selectedCodes.indexOf(code);
        if (idx >= 0) {
            selectedCodes.splice(idx, 1);
        } else if (selectedCodes.length < 4) {
            selectedCodes.push(code);
        }
        render();
    }

    function getSelectedCodes() {
        return selectedCodes;
    }

    function isCodeSelected(code) {
        return selectedCodes.includes(code);
    }

    return { render, toggleCollege, getSelectedCodes, isCodeSelected };
})();

