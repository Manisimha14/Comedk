/* ============================================
   College Card Component
   ============================================ */

const CollegeCard = (function () {
    function render(college) {
        const feesDisplay = college.fees ? `₹${college.fees}L <span style="font-size:0.65rem;font-weight:600;color:var(--prob-orange);opacity:0.9;">(Dad's Fav 💸)</span>` : 'N/A';
        const packageDisplay = college.average_package
            ? `₹${college.average_package} LPA${college.package_type ? ` (${college.package_type})` : ''} <span style="font-size:0.65rem;font-weight:600;color:var(--prob-green);opacity:0.9;">(Mum's Fav 👩‍🍳)</span>`
            : 'N/A';
        const hostelIcon = college.hostel && college.hostel.toLowerCase() === 'yes' ? '✅' : (college.hostel ? '❌' : '—');
        
        const isFav = AppData.isFavorite(college.college_code);
        const heartColor = isFav ? '#ef4444' : 'var(--text-muted)';
        const fillValue = isFav ? '#ef4444' : 'none';
        const heartIcon = `
            <button class="card-fav-btn" 
                onclick="event.stopPropagation(); AppData.toggleFavorite('${college.college_code}');" 
                style="background:none;border:none;padding:4px;cursor:pointer;color:${heartColor};display:inline-flex;align-items:center;justify-content:center;transition:var(--transition);"
                aria-label="Bookmark college">
                <svg viewBox="0 0 24 24" fill="${fillValue}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
            </button>
        `;

        const profile = AppData.getStudentProfile();
        const budgetWarning = (profile.maxBudget && college.fees && college.fees > profile.maxBudget)
            ? `<span class="badge" style="background:rgba(239,68,68,0.12); color:#ef4444; border:1px solid rgba(239,68,68,0.25);">⚠️ Exceeds Budget</span>`
            : '';

        return `
            <div class="college-card" onclick="Router.navigate('/college/${college.college_code}')" data-code="${college.college_code}">
                <div class="college-card-header">
                    <div class="college-card-title">
                        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
                            <div class="college-card-name" style="margin-bottom:0;">${college.college_name}</div>
                            ${heartIcon}
                        </div>
                        <div class="college-card-code" style="margin-top:4px;">${college.college_code} • ${college.nirf_rank !== 'Not Ranked' ? 'NIRF ' + college.nirf_rank : 'Unranked'}</div>
                    </div>
                    ${Badges.scoreRing(college.recommendation_score)}
                </div>
                <div class="college-card-badges">
                    ${Badges.tierBadge(college.tier)}
                    ${Badges.probabilityBadge(college.probability, college.probability_text)}
                    ${Badges.categoryBadge(college.category)}
                    ${budgetWarning}
                </div>
                <div class="college-card-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Pred. 2026 R1</span>
                        <span class="metric-value">${college.predicted_r1_2026}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Pred. 2026 R4</span>
                        <span class="metric-value">${college.predicted_r4_2026}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Avg Package</span>
                        <span class="metric-value">${packageDisplay}</span>
                    </div>
                    <div class="metric-item">
                        <span class="metric-label">Total Fees</span>
                        <span class="metric-value">${feesDisplay}</span>
                    </div>
                </div>
                <div class="college-card-footer">
                    <div>
                        ${college.is_best_in_tier ? Badges.bestChoiceBadge() : `<span class="card-rank-badge">🏅 #${college.recommendation_rank} Rank by Rating</span>`}
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <label class="card-compare-label" onclick="event.stopPropagation();" style="display:inline-flex;align-items:center;gap:4px;font-size:0.75rem;color:var(--text-secondary);cursor:pointer;font-weight:500;user-select:none;">
                            <input type="checkbox" 
                                ${Pages.Compare.isCodeSelected(college.college_code) ? 'checked' : ''} 
                                onchange="App.toggleCompareFromCard('${college.college_code}', this.checked)"
                                style="width:13px;height:13px;accent-color:var(--primary);cursor:pointer;margin:0;">
                            Compare
                        </label>
                        <div class="card-view-btn">
                            Details →
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderCompact(college) {
        return `
            <div class="college-card" onclick="Router.navigate('/college/${college.college_code}')" style="padding:14px;">
                <div class="college-card-header" style="margin-bottom:8px;">
                    <div class="college-card-title">
                        <div class="college-card-name" style="font-size:0.813rem;">${college.college_name}</div>
                        <div class="college-card-code">${college.college_code}</div>
                    </div>
                    ${Badges.scoreRing(college.recommendation_score, 40)}
                </div>
                <div class="college-card-badges">
                    ${Badges.tierBadge(college.tier)}
                    ${Badges.probabilityBadge(college.probability, college.probability_text)}
                </div>
            </div>
        `;
    }

    return { render, renderCompact };
})();
