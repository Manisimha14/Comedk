/* ============================================
   Data Layer — Google Sheets Live Connector
   ============================================ */

const AppData = (function () {
    // ---- Configuration ----
    const SHEET_ID = '1LD8_0Lyowc7ShqR0-m9EnTpHpFtqRhd5GpfZRr3dGV4';
    const SHEET_NAME = 'DashboardData';
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // ---- State ----
    let colleges = [];
    let lastUpdated = null;
    let refreshTimer = null;
    let callbacks = [];
    let isCachedData = false;

    let studentProfile = {
        rank: 12000,
        branch: 'ECE',
        category: 'GM',
        maxBudget: null
    };

    // Load profile from localStorage immediately
    try {
        const savedProfile = localStorage.getItem('comedk-student-profile');
        if (savedProfile) {
            studentProfile = { ...studentProfile, ...JSON.parse(savedProfile) };
        }
    } catch (e) {
        console.warn('Failed to load profile from localstorage', e);
    }

    // Known columns to ignore when extracting extra columns
    const KNOWN_COLUMNS = new Set([
        'College Name', 'College Code', 'NIRF', 'NAAC Rating', '2025 R4', '2025 R3', '2025 R1', '2024 R4',
        'Predicted 2026 R1', 'Predicted 2026 R4', 'Confidence', 'Rank Variation from 2024', 'Ece Opportunity',
        'Ece Specalised Labs', 'ECE Average or Overall Average(LPA)', 'Fees(Total)', 'Hostel', 'Proximity To Bengaluru',
        'Review', 'Reasoning', 'Other Reviews', 'Probability', 'Overall Rating For Ece', '2024 ec seats', '2025 ec seats'
    ]);

    // ---- Fetch from Google Sheets (gviz/tq) ----
    async function fetchFromSheet() {
        const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_NAME)}`;
        const response = await fetch(url);
        const text = await response.text();

        // Strip JSONP wrapper
        const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);?\s*$/);
        if (!match || !match[1]) throw new Error('Failed to parse Google Sheets response');

        const json = JSON.parse(match[1]);
        if (json.status === 'error') throw new Error(json.errors?.[0]?.message || 'Sheet error');

        const cols = json.table.cols.map(c => c.label || '');
        const rows = json.table.rows || [];

        return rows
            .map(row => {
                const obj = {};
                row.c.forEach((cell, i) => {
                    obj[cols[i]] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : (cell.f || '')) : '';
                });
                return obj;
            })
            .filter(row => row['College Name'] && row['College Code']); // Skip empty rows
    }

    // ---- Data Sanitization (XSS Protection) ----
    function sanitize(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, function (m) {
            switch (m) {
                case '&': return '&amp;';
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '"': return '&quot;';
                case "'": return '&#39;';
                default: return m;
            }
        });
    }

    function sanitizeObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = sanitize(obj[key]);
            } else if (typeof obj[key] === 'object') {
                sanitizeObject(obj[key]);
            }
        }
        return obj;
    }

    // ---- Parse & Normalize ----
    function parseCollege(raw, index = 999) {
        const c = {};
        c.sheet_index = index;

        c.college_name = raw['College Name'] || '';
        c.college_code = raw['College Code'] || '';
        c.nirf_rank = raw['NIRF'] || 'Not Ranked';
        c.naac_grade = raw['NAAC Rating'] || 'N/A';

        // Cutoffs — parse as numbers
        c.cutoff_2025_r4 = parseNum(raw['2025 R4']);
        c.cutoff_2025_r3 = parseNum(raw['2025 R3']);
        c.cutoff_2025_r1 = parseNum(raw['2025 R1']);
        c.cutoff_2024_r4 = parseNum(raw['2024 R4']);

        // Predictions (keep as text ranges)
        c.predicted_r1_2026 = raw['Predicted 2026 R1'] || 'N/A';
        c.predicted_r4_2026 = raw['Predicted 2026 R4'] || 'N/A';

        // Parse predicted range midpoints for scoring
        c.predicted_r1_2026_mid = parseRangeMid(raw['Predicted 2026 R1']);
        c.predicted_r4_2026_mid = parseRangeMid(raw['Predicted 2026 R4']);

        c.confidence = raw['Confidence'] || 'Unknown';
        c.rank_variation = raw['Rank Variation from 2024'] || '';
        c.ece_opportunity = raw['Ece Opportunity'] || '';
        c.labs_rating = raw['Ece Specalised Labs'] || '';

        // Average package — parse number and type (E/O)
        const pkgRaw = raw['ECE Average or Overall Average(LPA)'] || '';
        c.average_package_raw = pkgRaw;
        const pkgMatch = pkgRaw.match(/([\d.]+)\s*\(([EO])\)/i);
        c.average_package = pkgMatch ? parseFloat(pkgMatch[1]) : parseNum(pkgRaw);
        c.package_type = pkgMatch ? pkgMatch[2].toUpperCase() : '';

        // Fees — parse range midpoint (in lakhs)
        c.fees_raw = raw['Fees(Total)'] || '';
        c.fees = parseRangeMidSimple(c.fees_raw);

        c.hostel = raw['Hostel'] || '';
        c.bangalore_proximity = raw['Proximity To Bengaluru'] || '';
        c.review = raw['Review'] || '';
        c.reasoning = raw['Reasoning'] || '';
        c.other_reviews = raw['Other Reviews'] || '';

        // Probability — parse range to midpoint
        c.probability_text = raw['Probability'] || '';
        c.probability = parseProbability(c.probability_text);

        // Overall rating
        c.overall_rating = parseFloat(raw['Overall Rating For Ece']) || 0;

        // Seats
        c.seats_2024 = parseNum(raw['2024 ec seats']);
        c.seats_2025 = parseNum(raw['2025 ec seats']);

        // Compute tier
        c.tier = computeTier(c);

        // Category based on probability
        c.category = getCategory(c.probability);

        // Extract extra columns dynamically
        c.extra_columns = {};
        for (const key in raw) {
            if (!KNOWN_COLUMNS.has(key)) {
                const val = raw[key];
                if (val !== null && val !== undefined && val !== '') {
                    c.extra_columns[key] = val;
                }
            }
        }

        return sanitizeObject(c);
    }

    // ---- Parsing Helpers ----
    function parseNum(val) {
        if (val === null || val === undefined || val === '') return null;
        const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
        return isNaN(n) ? null : n;
    }

    function parseRangeMid(val) {
        if (!val) return null;
        const s = String(val).replace(/,/g, '');
        // Match patterns like "700–800", "700-800", "700 - 800"
        const m = s.match(/([\d.]+)\s*[–\-]\s*([\d.]+)/);
        if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    function parseRangeMidSimple(val) {
        if (!val) return null;
        const s = String(val).replace(/,/g, '').replace(/₹|lakhs?|lpa/gi, '').trim();
        const m = s.match(/([\d.]+)\s*[–\-]\s*([\d.]+)/);
        if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
        const n = parseFloat(s);
        return isNaN(n) ? null : n;
    }

    function parseProbability(text) {
        if (!text) return 0;
        const s = String(text).replace(/[%\s]/g, '');
        // "99+" → 99
        if (s.includes('+')) {
            const n = parseFloat(s.replace('+', ''));
            return isNaN(n) ? 99 : Math.min(n, 99.5);
        }
        // "<1" → 0.5
        if (s.startsWith('<')) {
            const n = parseFloat(s.replace('<', ''));
            return isNaN(n) ? 0.5 : n * 0.5;
        }
        // "88–95" or "88-95" → midpoint
        const m = s.match(/([\d.]+)[–\-]([\d.]+)/);
        if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
        // Single number
        const n = parseFloat(s);
        return isNaN(n) ? 0 : n;
    }

    // ---- Tier Computation ----
    function computeTier(c) {
        // S Tier: NIRF top 150 + strong overall rating
        // A Tier: NIRF top 200 or overall rating >= 4 with good placement
        // B Tier: Decent colleges with moderate metrics
        // C Tier: Safety schools / incomplete data

        const nirfScore = parseNirfScore(c.nirf_rank);
        const hasDetailedData = c.ece_opportunity && c.labs_rating && c.average_package;

        if (nirfScore >= 80 && c.overall_rating > 40) return 'S';
        if (nirfScore >= 80 && c.overall_rating >= 3) return 'A';
        if (nirfScore >= 60 && hasDetailedData) return 'A';
        if (hasDetailedData && c.average_package >= 7) return 'B';
        if (hasDetailedData) return 'B';
        if (c.overall_rating >= 3) return 'B';
        return 'C';
    }

    function parseNirfScore(nirf) {
        if (!nirf || nirf === 'Not Ranked') return 0;
        const s = String(nirf).replace(/\s/g, '');
        const m = s.match(/(\d+)\s*[–\-]\s*(\d+)/);
        if (m) {
            const avg = (parseInt(m[1]) + parseInt(m[2])) / 2;
            // Lower NIRF = better. Score out of 100.
            if (avg <= 100) return 100;
            if (avg <= 150) return 85;
            if (avg <= 200) return 70;
            if (avg <= 300) return 55;
            return 40;
        }
        return 0;
    }

    // ---- Category ----
    function getCategory(probability) {
        if (probability >= 75) return 'safe';
        if (probability >= 50) return 'target';
        if (probability >= 20) return 'reach';
        return 'dream';
    }

    // ---- Recommendation Score Engine ----
    function computeRecommendationScores(colleges) {
        if (colleges.length === 0) return;

        // Normalize metrics across all colleges
        const maxPackage = Math.max(...colleges.map(c => c.average_package || 0), 1);
        const maxFees = Math.max(...colleges.map(c => c.fees || 0), 1);
        const maxNirf = 100; // Already scored

        colleges.forEach(c => {
            // 40% Admission Probability
            const probScore = c.probability;

            // 25% Placement Quality
            const packageNorm = c.average_package ? (c.average_package / maxPackage) * 100 : 30;
            const ratingNorm = c.overall_rating > 5 ? (c.overall_rating / 100) * 100 : (c.overall_rating / 5) * 100;
            const placementScore = c.average_package ? (packageNorm * 0.6 + ratingNorm * 0.4) : ratingNorm;

            // 15% Fees (lower = better)
            const feesScore = c.fees ? (1 - c.fees / maxFees) * 100 : 50;

            // 10% Bangalore Proximity
            let proximityScore = 50;
            const prox = (c.bangalore_proximity || '').toLowerCase();
            if (prox.includes('center') || prox.includes('city') || prox.includes('in bangalore')) proximityScore = 100;
            else if (prox.includes('near') || prox.includes('close')) proximityScore = 70;
            else if (prox.includes('far') || prox.includes('very far')) proximityScore = 20;

            // 10% Academic Reputation
            const nirfScore = parseNirfScore(c.nirf_rank);
            const naacScore = parseNaacScore(c.naac_grade);
            const labsScore = c.labs_rating ? (c.labs_rating.toLowerCase().includes('all') ? 90 : 60) : 30;
            const academicScore = (nirfScore * 0.4 + naacScore * 0.3 + labsScore * 0.3);

            // Set score directly using Overall ECE Rating normalized to 100
            c.recommendation_score = c.overall_rating > 5
                ? Math.round(c.overall_rating)
                : Math.round(c.overall_rating * 20);


            // Store individual scores for breakdown
            c.score_breakdown = {
                probability: Math.round(probScore),
                placement: Math.round(placementScore),
                fees: Math.round(feesScore),
                proximity: Math.round(proximityScore),
                academic: Math.round(academicScore)
            };
        });

        // Assign ranks
        const sorted = [...colleges].sort((a, b) => b.recommendation_score - a.recommendation_score);
        sorted.forEach((c, i) => {
            c.recommendation_rank = i + 1;
        });

        // Best in tier
        const tierBest = {};
        sorted.forEach(c => {
            if (!tierBest[c.tier]) tierBest[c.tier] = c;
        });
        colleges.forEach(c => {
            c.is_best_in_tier = tierBest[c.tier] === c;
        });
    }

    function parseNaacScore(grade) {
        if (!grade) return 30;
        const g = grade.toUpperCase().replace(/\s/g, '');
        if (g === 'A++') return 100;
        if (g === 'A+') return 85;
        if (g === 'A') return 70;
        if (g === 'B++') return 55;
        if (g === 'B+') return 45;
        if (g === 'B') return 35;
        return 30;
    }

    // ---- Public API ----
    // Dynamic Probability interpolation
    function calculateDynamicProbability(c, rank) {
        const category = studentProfile.category;
        let quotaMultiplier = 1.0;
        if (category === 'K') quotaMultiplier = 1.15;
        else if (category === 'HK') quotaMultiplier = 1.30;

        const finalCutoff = c.cutoff_2025_r4 || c.predicted_r4_2026_mid || c.cutoff_2024_r4 || c.cutoff_2025_r3;
        const r1Cutoff = c.cutoff_2025_r1 || c.predicted_r1_2026_mid;

        const adjustedFinal = finalCutoff ? finalCutoff * quotaMultiplier : null;
        const adjustedR1 = r1Cutoff ? r1Cutoff * quotaMultiplier : null;

        if (!adjustedFinal) {
            // Fallback to sheet probability
            return parseProbability(c.probability_text);
        }

        if (adjustedR1 && rank <= adjustedR1) {
            const ratio = rank / adjustedR1;
            const prob = 90 + (1 - ratio) * 9.5;
            return Math.min(Math.max(prob, 90), 99.5);
        }

        if (adjustedR1 && rank <= adjustedFinal) {
            const range = adjustedFinal - adjustedR1;
            if (range <= 0) return 75;
            const position = (adjustedFinal - rank) / range;
            const prob = 50 + position * 40;
            return Math.min(Math.max(prob, 50), 90);
        }

        if (!adjustedR1 && rank <= adjustedFinal) {
            const ratio = rank / adjustedFinal;
            if (ratio <= 0.8) return 90;
            const prob = 50 + (1 - ratio) * 200;
            return Math.min(Math.max(prob, 50), 90);
        }

        const ratio = rank / adjustedFinal;
        if (ratio <= 1.15) {
            const position = (1.15 - ratio) / 0.15;
            const prob = 20 + position * 29;
            return Math.min(Math.max(prob, 20), 49);
        } else if (ratio <= 1.4) {
            const position = (1.4 - ratio) / 0.25;
            const prob = 5 + position * 14;
            return Math.min(Math.max(prob, 5), 19);
        } else {
            return Math.max(1, Math.round(5 / ratio));
        }
    }

    function getProbabilityText(prob) {
        if (prob >= 95) return '99%+';
        if (prob >= 90) return '90–95%';
        if (prob >= 75) return '75–90%';
        if (prob >= 50) return '50–75%';
        if (prob >= 20) return '20–50%';
        if (prob >= 5) return '5–20%';
        return '<5%';
    }

    function evaluateProfileFit(list) {
        list.forEach(c => {
            const dynamicProb = calculateDynamicProbability(c, studentProfile.rank);
            c.probability = dynamicProb;
            c.probability_text = getProbabilityText(dynamicProb);
            c.category = getCategory(dynamicProb);
        });
    }

    function recalculateData() {
        evaluateProfileFit(colleges);
        computeRecommendationScores(colleges);
    }

    function saveStudentProfile(profile) {
        studentProfile = { ...studentProfile, ...profile };
        localStorage.setItem('comedk-student-profile', JSON.stringify(studentProfile));
        recalculateData();
        notifyCallbacks();
    }

    function isDataFromCache() {
        return isCachedData;
    }

    async function fetchData() {
        try {
            const rawData = await fetchFromSheet();
            colleges = rawData.map((c, idx) => parseCollege(c, idx));
            
            evaluateProfileFit(colleges);
            computeRecommendationScores(colleges);
            
            lastUpdated = new Date();
            isCachedData = false;
            
            // Save to offline cache
            try {
                localStorage.setItem('comedk-colleges-cache', JSON.stringify(rawData));
                localStorage.setItem('comedk-cache-timestamp', lastUpdated.toISOString());
            } catch (e) {
                console.warn('Failed to write raw data cache', e);
            }
            
            notifyCallbacks();
            return true;
        } catch (err) {
            console.warn('Sheet fetch failed, checking offline cache...', err);
            try {
                const cachedData = localStorage.getItem('comedk-colleges-cache');
                const cachedTime = localStorage.getItem('comedk-cache-timestamp');
                if (cachedData && cachedTime) {
                    const rawData = JSON.parse(cachedData);
                    colleges = rawData.map((c, idx) => parseCollege(c, idx));
                    
                    evaluateProfileFit(colleges);
                    computeRecommendationScores(colleges);
                    
                    lastUpdated = new Date(cachedTime);
                    isCachedData = true;
                    notifyCallbacks();
                    
                    setTimeout(() => {
                        showToast('⚠️ Offline Mode: Loaded from cache', 'info');
                    }, 1000);
                    return true;
                }
            } catch (cacheErr) {
                console.error('Failed to parse offline cache data', cacheErr);
            }
            throw err;
        }
    }

    function startAutoRefresh() {
        if (refreshTimer) clearTimeout(refreshTimer);
        refreshTimer = setTimeout(async () => {
            try {
                await fetchData();
                showToast('Data refreshed successfully', 'success');
            } catch (e) {
                console.warn('Auto-refresh failed:', e);
            }
            startAutoRefresh();
        }, REFRESH_INTERVAL);
    }

    function onDataUpdate(cb) {
        callbacks.push(cb);
    }

    function notifyCallbacks() {
        callbacks.forEach(cb => {
            try { cb(colleges); } catch (e) { console.error(e); }
        });
    }

    function getColleges() { return colleges; }

    function getCollegeByCode(code) {
        return colleges.find(c => c.college_code === code) || null;
    }

    function getLastUpdated() { return lastUpdated; }

    function getCategories() {
        return {
            dream: colleges.filter(c => c.category === 'dream'),
            reach: colleges.filter(c => c.category === 'reach'),
            target: colleges.filter(c => c.category === 'target'),
            safe: colleges.filter(c => c.category === 'safe')
        };
    }

    function getStudentProfile() {
        return studentProfile;
    }

    function getCollegesByTier() {
        const tiers = { S: [], A: [], B: [], C: [] };
        colleges.forEach(c => {
            if (tiers[c.tier]) tiers[c.tier].push(c);
        });
        // Sort each tier by original Excel sheet order
        Object.values(tiers).forEach(arr => arr.sort((a, b) => a.sheet_index - b.sheet_index));
        return tiers;
    }

    // Toast helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ---- Bookmarks / Favorites Management ----
    const FAVORITES_KEY = 'comedk-favorites-list';
    let favorites = [];
    try {
        favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch (e) {
        favorites = [];
    }

    function toggleFavorite(code) {
        const idx = favorites.indexOf(code);
        if (idx === -1) {
            favorites.push(code);
            showToast('Added to bookmarks', 'success');
        } else {
            favorites.splice(idx, 1);
            showToast('Removed from bookmarks', 'info');
        }
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        notifyCallbacks();
        return isFavorite(code);
    }

    // Explicitly expose on window for global toggle access
    window.toggleFavorite = toggleFavorite;

    function isFavorite(code) {
        return favorites.includes(code);
    }

    function getFavorites() {
        return favorites;
    }

    return {
        fetchData,
        startAutoRefresh,
        getColleges,
        getCollegeByCode,
        getLastUpdated,
        getCategories,
        getStudentProfile,
        getCollegesByTier,
        onDataUpdate,
        showToast,
        SHEET_ID,
        toggleFavorite,
        isFavorite,
        getFavorites,
        saveStudentProfile,
        isDataFromCache
    };
})();
