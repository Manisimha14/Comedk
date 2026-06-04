/* ============================================
   Badge Components
   ============================================ */

const Badges = (function () {
    function tierBadge(tier) {
        const labels = { S: 'S Tier', A: 'A Tier', B: 'B Tier', C: 'C Tier' };
        return `<span class="badge badge-tier-${tier.toLowerCase()}">${labels[tier] || tier}</span>`;
    }

    function probabilityBadge(probability, text) {
        let cls, label;
        if (probability >= 90) { cls = 'green'; label = 'Very High'; }
        else if (probability >= 75) { cls = 'light-green'; label = 'High'; }
        else if (probability >= 50) { cls = 'yellow'; label = 'Moderate'; }
        else if (probability >= 20) { cls = 'orange'; label = 'Low'; }
        else { cls = 'red'; label = 'Very Low'; }

        const displayText = text || `${Math.round(probability)}%`;
        return `<span class="badge badge-prob-${cls}" title="${label} probability">${displayText}</span>`;
    }

    function confidenceBadge(confidence) {
        return `<span class="badge badge-confidence">⚡ ${confidence}</span>`;
    }

    function categoryBadge(category) {
        const labels = { safe: '🟢 Safe', target: '🟡 Target', reach: '🟠 Reach', dream: '🔴 Dream' };
        return `<span class="badge badge-${category}">${labels[category] || category}</span>`;
    }

    function bestChoiceBadge() {
        return `<span class="best-choice-badge">⭐ Best Choice</span>`;
    }

    function scoreRing(score, size = 52) {
        const r = (size - 8) / 2;
        const circumference = 2 * Math.PI * r;
        const offset = circumference * (1 - score / 100);

        let color;
        if (score >= 80) color = 'var(--prob-green)';
        else if (score >= 60) color = 'var(--prob-light-green)';
        else if (score >= 40) color = 'var(--prob-yellow)';
        else if (score >= 20) color = 'var(--prob-orange)';
        else color = 'var(--prob-red)';

        return `
            <div class="college-card-score" style="width:${size}px;height:${size}px;">
                <svg class="score-ring" viewBox="0 0 ${size} ${size}">
                    <circle class="score-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}"/>
                    <circle class="score-ring-fill" cx="${size/2}" cy="${size/2}" r="${r}"
                        stroke="${color}"
                        stroke-dasharray="${circumference}"
                        stroke-dashoffset="${offset}"/>
                </svg>
                <span class="score-value" style="color:${color}">${score}</span>
            </div>
        `;
    }

    return { tierBadge, probabilityBadge, confidenceBadge, categoryBadge, bestChoiceBadge, scoreRing };
})();
