/* ============================================
   COMEDK Counseling Simulator Page
   ============================================ */

window.Pages = window.Pages || {};

Pages.Simulator = (function () {
    // Top B.Arch Colleges Database
    const BARCH_COLLEGES = [
        { college_code: 'RVCA', college_name: 'RV College of Architecture, Bangalore', fees: 3.0, hostel: 'Y', cutoff_r1: 150, cutoff_r4: 220 },
        { college_code: 'BMSCA', college_name: 'BMS College of Architecture, Bangalore', fees: 2.8, hostel: 'Y', cutoff_r1: 320, cutoff_r4: 450 },
        { college_code: 'MSRIT-A', college_name: 'M. S. Ramaiah Institute of Technology (B.Arch), Bangalore', fees: 2.8, hostel: 'Y', cutoff_r1: 480, cutoff_r4: 650 },
        { college_code: 'DSCA-A', college_name: 'Dayananda Sagar College of Architecture, Bangalore', fees: 2.5, hostel: 'Y', cutoff_r1: 720, cutoff_r4: 950 },
        { college_code: 'BIT-A', college_name: 'Bangalore Institute of Technology (B.Arch), Bangalore', fees: 2.5, hostel: 'N', cutoff_r1: 950, cutoff_r4: 1300 },
        { college_code: 'SJB-A', college_name: 'SJB School of Architecture & Planning, Bangalore', fees: 2.2, hostel: 'Y', cutoff_r1: 1300, cutoff_r4: 1800 }
    ];

    // State structure
    let state = {
        step: 'setup', // 'setup', 'upload-supp', 'mock', 'round1', 'round2', 'round3', 'round4', 'receipt'
        trackMode: 'both', // 'engineering' | 'architecture' | 'both'
        
        // Engineering values
        rank: 12000,
        category: 'GM',
        maxBudget: null,
        preferenceListName: '',
        choices: [], // Array of engineering college codes

        // Architecture values
        barchRank: 450,
        barchChoices: ['RVCA', 'BMSCA', 'MSRIT-A', 'DSCA-A', 'BIT-A', 'SJB-A'],

        // Eligibility Checklist
        regCompleted: false,
        docApproved: false,
        choiceCompleted: false,
        kkrApproved: false, // Independent KKR verification status check

        // Supplementary status
        isSupplementary: false,
        supplementaryMarkSheetUploaded: false,
        suppFile: null,

        // Fee Gates
        feePaid: false, // engineering fee paid
        barchFeePaid: false, // architecture fee paid
        transactionId: '',
        paymentDate: null,
        cancelled: false, // tracks cancellation portal status
        refundAmount: 0,

        // Simulation Decisions
        decisions: {
            round1: null, // 'freeze' | 'upgrade' | 'reject' | 'withdraw'
            round2: null,
            round3: null,
            round4: null
        },
        barchDecisions: {
            round1: null,
            round2: null,
            round3: null,
            round4: null
        },

        // Rules and Mistakes Declarations
        rulesDeclaration: {
            blankChoices: false,
            feeDeadlines: false,
            kkrGating: false,
            crossAllotment: false,
            docClarity: false
        },

        // Round Allotments Track seats
        // structure: { conservative: { eng: null, arch: null }, expected: { eng: null, arch: null }, optimistic: { eng: null, arch: null } }
        trackSeats: {
            conservative: { eng: null, arch: null },
            expected: { eng: null, arch: null },
            optimistic: { eng: null, arch: null }
        },

        // Holds actual candidate final outcomes (Expected baseline path)
        heldSeats: {
            eng: null, // { college, choiceNumber, roundAllotted }
            arch: null
        },

        // History logs
        historyLog: []
    };

    // Cutoff helpers for engineering
    function getQuotaCutoffs(c, quotaMultiplier) {
        let r1 = c.cutoff_2025_r1 || c.predicted_r1_2026_mid || (c.cutoff_2024_r4 ? c.cutoff_2024_r4 * 0.9 : 5000);
        let r3 = c.cutoff_2025_r3 || (c.cutoff_2025_r4 ? c.cutoff_2025_r4 * 0.95 : (c.cutoff_2024_r4 ? c.cutoff_2024_r4 * 0.95 : 6000));
        let r4 = c.cutoff_2025_r4 || c.cutoff_2025_r3 || (c.cutoff_2024_r4 || 7000);

        r1 *= quotaMultiplier;
        r3 *= quotaMultiplier;
        r4 *= quotaMultiplier;

        let r2 = r1 + (r3 - r1) * 0.4;

        r2 = Math.max(r2, r1 * 1.02);
        r3 = Math.max(r3, r2 * 1.02);
        r4 = Math.max(r4, r3 * 1.02);

        return { r1, r2, r3, r4 };
    }

    // Cutoff helpers for architecture B.Arch
    function getBArchCutoffs(c, quotaMultiplier) {
        let r1 = c.cutoff_r1;
        let r4 = c.cutoff_r4;

        r1 *= quotaMultiplier;
        r4 *= quotaMultiplier;

        let r2 = r1 * 1.10;
        let r3 = r1 * 1.25;

        return { r1, r2, r3, r4 };
    }

    function getQuotaMultiplier(category) {
        if (category === 'K') return 1.15;
        if (category === 'HK') return 1.30;
        return 1.0;
    }

    function getTrackMultiplier(track) {
        if (track === 'conservative') return 0.90; // Harder
        if (track === 'optimistic') return 1.15;    // Easier
        return 1.0; // Expected
    }

    function getMarketDriftMultiplier(c) {
        const score = c.recommendation_score || 50;
        const tier = c.tier || 'C';
        if (tier === 'S' || score >= 80) {
            return 0.94; // 6% drop in cutoff (makes it harder, representing high demand)
        } else if (tier === 'A' || score >= 65) {
            return 0.98; // 2% drop
        } else {
            return 1.03; // 3% increase in cutoff (makes it easier)
        }
    }

    function getBArchTier(code) {
        if (code === 'RVCA' || code === 'BMSCA') return 'S';
        if (code === 'MSRIT-A' || code === 'DSCA-A') return 'A';
        return 'B';
    }

    // SIMULATOR ENGINES
    function simulateEngineeringRound(track, round) {
        const qMult = getQuotaMultiplier(state.category);
        const tMult = getTrackMultiplier(track);
        const rank = state.rank;
        const choices = state.choices;
        const currentSeat = state.trackSeats[track].eng;

        const prevRound = round - 1;
        const prevDecision = prevRound >= 1 ? state.decisions[`round${prevRound}`] : null;

        if (prevDecision === 'withdraw' || state.cancelled) {
            return null;
        }

        if (prevDecision === 'freeze' && currentSeat) {
            return currentSeat;
        }

        let searchChoices = [...choices];
        if (prevDecision === 'upgrade' && currentSeat) {
            searchChoices = choices.slice(0, currentSeat.choiceNumber - 1);
        }

        let allotted = null;
        const colleges = AppData.getColleges();

        for (let i = 0; i < searchChoices.length; i++) {
            const code = searchChoices[i];
            const c = colleges.find(item => item.college_code === code);
            if (!c) continue;

            if (state.maxBudget && c.fees && c.fees > state.maxBudget) {
                continue;
            }

            const cutoffs = getQuotaCutoffs(c, qMult);
            let roundCutoff = cutoffs.r1;
            if (round === 2) roundCutoff = cutoffs.r2;
            if (round === 3) roundCutoff = cutoffs.r3;
            if (round === 4) roundCutoff = cutoffs.r4;

            const driftMult = getMarketDriftMultiplier(c);
            const finalCutoff = Math.round(roundCutoff * tMult * driftMult);

            if (rank <= finalCutoff) {
                allotted = {
                    college: c,
                    choiceNumber: choices.indexOf(code) + 1,
                    roundAllotted: round,
                    cutoff: finalCutoff,
                    type: 'Engineering'
                };
                break;
            }
        }

        if (!allotted && prevDecision === 'upgrade' && currentSeat) {
            allotted = currentSeat;
        }

        return allotted;
    }

    function simulateArchitectureRound(track, round) {
        const qMult = getQuotaMultiplier(state.category);
        const tMult = getTrackMultiplier(track);
        const rank = state.barchRank;
        const choices = state.barchChoices;
        const currentSeat = state.trackSeats[track].arch;

        const prevRound = round - 1;
        const prevDecision = prevRound >= 1 ? state.barchDecisions[`round${prevRound}`] : null;

        if (prevDecision === 'withdraw' || state.cancelled) {
            return null;
        }

        if (prevDecision === 'freeze' && currentSeat) {
            return currentSeat;
        }

        let searchChoices = [...choices];
        if (prevDecision === 'upgrade' && currentSeat) {
            searchChoices = choices.slice(0, currentSeat.choiceNumber - 1);
        }

        let allotted = null;

        for (let i = 0; i < searchChoices.length; i++) {
            const code = searchChoices[i];
            const c = BARCH_COLLEGES.find(item => item.college_code === code);
            if (!c) continue;

            const cutoffs = getBArchCutoffs(c, qMult);
            let roundCutoff = cutoffs.r1;
            if (round === 2) roundCutoff = cutoffs.r2;
            if (round === 3) roundCutoff = cutoffs.r3;
            if (round === 4) roundCutoff = cutoffs.r4;

            const finalCutoff = Math.round(roundCutoff * tMult);

            if (rank <= finalCutoff) {
                allotted = {
                    college: c,
                    choiceNumber: choices.indexOf(code) + 1,
                    roundAllotted: round,
                    cutoff: finalCutoff,
                    type: 'Architecture'
                };
                break;
            }
        }

        if (!allotted && prevDecision === 'upgrade' && currentSeat) {
            allotted = currentSeat;
        }

        return allotted;
    }

    function runMockSimulation() {
        const qMult = getQuotaMultiplier(state.category);
        const colleges = AppData.getColleges();

        ['conservative', 'expected', 'optimistic'].forEach(track => {
            const tMult = getTrackMultiplier(track);
            let engAllotted = null;
            let archAllotted = null;

            // Eng mock
            if (state.trackMode === 'engineering' || state.trackMode === 'both') {
                for (let i = 0; i < state.choices.length; i++) {
                    const code = state.choices[i];
                    const c = colleges.find(item => item.college_code === code);
                    if (!c) continue;

                    if (state.maxBudget && c.fees && c.fees > state.maxBudget) continue;

                    const cutoffs = getQuotaCutoffs(c, qMult);
                    const driftMult = getMarketDriftMultiplier(c);
                    const finalCutoff = Math.round(cutoffs.r1 * tMult * driftMult);

                    if (state.rank <= finalCutoff) {
                        engAllotted = {
                            college: c,
                            choiceNumber: i + 1,
                            roundAllotted: 'Mock',
                            cutoff: finalCutoff,
                            type: 'Engineering'
                        };
                        break;
                    }
                }
            }

            // Barch mock
            if (state.trackMode === 'architecture' || state.trackMode === 'both') {
                for (let i = 0; i < state.barchChoices.length; i++) {
                    const code = state.barchChoices[i];
                    const c = BARCH_COLLEGES.find(item => item.college_code === code);
                    if (!c) continue;

                    const cutoffs = getBArchCutoffs(c, qMult);
                    const finalCutoff = Math.round(cutoffs.r1 * tMult);

                    if (state.barchRank <= finalCutoff) {
                        archAllotted = {
                            college: c,
                            choiceNumber: i + 1,
                            roundAllotted: 'Mock',
                            cutoff: finalCutoff,
                            type: 'Architecture'
                        };
                        break;
                    }
                }
            }

            state.trackSeats[track].eng = engAllotted;
            state.trackSeats[track].arch = archAllotted;
        });

        // Set baseline Expected as the default candidate held seats
        state.heldSeats.eng = state.trackSeats.expected.eng;
        state.heldSeats.arch = state.trackSeats.expected.arch;
    }

    // CROSS ALLOTMENT RESOLVER
    function resolveCrossAllotment(chosenSeatType) {
        if (chosenSeatType === 'architecture') {
            if (state.heldSeats.eng) {
                state.historyLog.push(`🔄 Cross-Allotment: Released Engineering seat [${state.heldSeats.eng.college.college_code}] to accept B.Arch seat [${state.heldSeats.arch.college.college_code}]`);
                state.heldSeats.eng = null;
                state.decisions.round1 = 'withdraw';
                state.decisions.round2 = 'withdraw';
                state.decisions.round3 = 'withdraw';
                state.decisions.round4 = 'withdraw';
                ['conservative', 'expected', 'optimistic'].forEach(t => {
                    state.trackSeats[t].eng = null;
                });
                AppData.showToast('📐 B.Arch seat accepted. Engineering seat released!', 'info');
            }
        } else if (chosenSeatType === 'engineering') {
            if (state.heldSeats.arch) {
                state.historyLog.push(`🔄 Cross-Allotment: Released Architecture seat [${state.heldSeats.arch.college.college_code}] to accept Engineering seat [${state.heldSeats.eng.college.college_code}]`);
                state.heldSeats.arch = null;
                state.barchDecisions.round1 = 'withdraw';
                state.barchDecisions.round2 = 'withdraw';
                state.barchDecisions.round3 = 'withdraw';
                state.barchDecisions.round4 = 'withdraw';
                ['conservative', 'expected', 'optimistic'].forEach(t => {
                    state.trackSeats[t].arch = null;
                });
                AppData.showToast('📋 Engineering seat accepted. B.Arch seat released!', 'info');
            }
        }
    }

    // INITIALIZATION
    function init() {
        const profile = AppData.getStudentProfile();
        state.rank = profile.rank || 12000;
        state.category = profile.category || 'GM';
        state.maxBudget = profile.maxBudget || null;

        if (Pages.Preferences) {
            const map = Pages.Preferences.getListsMap();
            const active = Pages.Preferences.getActiveListName();
            state.preferenceListName = active;
            state.choices = [...(map[active] || [])];
        }

        // Reset
        state.step = 'setup';
        state.regCompleted = false;
        state.docApproved = false;
        state.choiceCompleted = state.choices.length > 0;
        state.kkrApproved = false;
        state.isSupplementary = false;
        state.supplementaryMarkSheetUploaded = false;
        state.suppFile = null;
        state.feePaid = false;
        state.barchFeePaid = false;
        state.cancelled = false;
        state.refundAmount = 0;
        state.decisions = { round1: null, round2: null, round3: null, round4: null };
        state.barchDecisions = { round1: null, round2: null, round3: null, round4: null };
        state.rulesDeclaration = {
            blankChoices: false,
            feeDeadlines: false,
            kkrGating: false,
            crossAllotment: false,
            docClarity: false
        };
        state.trackSeats = {
            conservative: { eng: null, arch: null },
            expected: { eng: null, arch: null },
            optimistic: { eng: null, arch: null }
        };
        state.heldSeats = { eng: null, arch: null };
        state.historyLog = [];
    }

    function render() {
        const content = document.getElementById('main-content');
        if (!content) return;

        // Sync fresh profile details if in setup
        if (state.step === 'setup') {
            const profile = AppData.getStudentProfile();
            state.rank = profile.rank || 12000;
            state.category = profile.category || 'GM';
            state.maxBudget = profile.maxBudget || null;
            if (Pages.Preferences) {
                const map = Pages.Preferences.getListsMap();
                const active = Pages.Preferences.getActiveListName();
                state.preferenceListName = active;
                state.choices = [...(map[active] || [])];
                state.choiceCompleted = state.choices.length > 0;
            }
        }

        let viewHtml = `
            <div class="explorer-hero" style="background:var(--bg-hero); margin-bottom: 24px;">
                <div class="explorer-hero-content">
                    <h1 class="explorer-title">🎓 Interactive Counseling Portal</h1>
                    <p class="explorer-subtitle">Simulate choice editing, parallel Engineering/Architecture tracks, KKR Waitlisting, and seat cancellation refunds.</p>
                </div>
            </div>

            <div class="content-container" style="max-width:var(--content-max); margin:0 auto; padding:0 var(--page-padding) 40px;">
                ${renderStepTracker()}
                
                <div class="simulator-card-wrapper" style="margin-top:24px;">
                    ${renderCurrentStep()}
                </div>
            </div>
        `;

        content.innerHTML = viewHtml;
        setupEventListeners();
    }

    function renderStepTracker() {
        const isSupp = state.isSupplementary;
        let steps = [];

        if (isSupp) {
            steps = [
                { key: 'setup', label: '1. Setup' },
                { key: 'upload-supp', label: '2. Upload Marksheet' },
                { key: 'round3', label: '3. Round 3 Entry' },
                { key: 'round4', label: '4. Round 4' },
                { key: 'receipt', label: '5. Receipt' }
            ];
        } else {
            steps = [
                { key: 'setup', label: '1. Setup' },
                { key: 'mock', label: '2. Mock Round' },
                { key: 'round1', label: '3. Round 1' },
                { key: 'round2', label: '4. Round 2 (KKR)' },
                { key: 'round3', label: '5. Round 3' },
                { key: 'round4', label: '6. Round 4' },
                { key: 'receipt', label: '7. Receipt' }
            ];
        }

        return `
            <div class="details-tab-bar" style="overflow-x:auto; display:flex; gap:8px; background:var(--glass-bg); padding:8px; border-radius:var(--radius-md); border:1px solid var(--glass-border); backdrop-filter:var(--glass-blur);">
                ${steps.map(s => {
                    const isActive = state.step === s.key;
                    const isCompleted = getStepIndex(state.step, isSupp) > getStepIndex(s.key, isSupp);
                    return `
                        <div class="details-tab ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                             style="flex:1; text-align:center; min-width:115px; padding:10px; font-weight:600; font-size:0.75rem; border-radius:var(--radius-sm); border:none; display:flex; align-items:center; justify-content:center; gap:6px; cursor:default; background:${isActive ? 'var(--primary)' : (isCompleted ? 'rgba(16, 185, 129, 0.08)' : 'transparent')}; color:${isActive ? 'white' : (isCompleted ? 'var(--safe-color)' : 'var(--text-secondary)')};">
                            ${isCompleted ? '✓' : ''} ${s.label}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function getStepIndex(stepKey, isSupp) {
        const orderSupp = ['setup', 'upload-supp', 'round3', 'round4', 'receipt'];
        const orderNormal = ['setup', 'mock', 'round1', 'round2', 'round3', 'round4', 'receipt'];
        const activeOrder = isSupp ? orderSupp : orderNormal;
        return activeOrder.indexOf(stepKey);
    }

    function renderCurrentStep() {
        if (state.step === 'round4') {
            const hasEng = state.trackMode !== 'architecture' && state.engineeringActive !== false;
            const hasArch = state.trackMode !== 'engineering' && state.barchActive !== false;

            if (hasEng && state.heldSeats.eng && !state.decisions.round4) {
                state.decisions.round4 = 'freeze';
            }
            if (hasArch && state.heldSeats.arch && !state.barchDecisions.round4) {
                state.barchDecisions.round4 = 'freeze';
            }
        }
        switch (state.step) {
            case 'setup': return renderSetupStep();
            case 'upload-supp': return renderSupplementaryUploadStep();
            case 'mock': return renderMockStep();
            case 'round1': return renderRoundStep(1);
            case 'round2': return renderRoundStep(2);
            case 'round3': return renderRoundStep(3);
            case 'round4': return renderRoundStep(4);
            case 'receipt': return renderReceiptStep();
            default: return renderSetupStep();
        }
    }

    // STEP 1: SETUP
    function renderSetupStep() {
        const listsMap = Pages.Preferences ? Pages.Preferences.getListsMap() : {};
        const listNames = Object.keys(listsMap);
        
        let preferenceOptions = listNames.map(name => `
            <option value="${name}" ${state.preferenceListName === name ? 'selected' : ''}>${name} (${listsMap[name].length} choices)</option>
        `).join('');

        if (preferenceOptions.length === 0) {
            preferenceOptions = `<option value="">No lists found. Please save a preference list first.</option>`;
        }

        return `
            <div class="note-item recommendation" style="margin-bottom:20px; border-left-color:var(--primary);">
                <div style="font-weight:700; font-size:0.938rem; color:var(--text-primary); margin-bottom:4px;">🎯 Simulator Configuration & Double-Gate Gatekeepers</div>
                <p style="font-size:0.813rem; color:var(--text-secondary); line-height:1.4; margin:0;">
                    Choose your counseling path (Engineering, B.Arch, or Both), fill eligibility checkmarks, and verify KKR region approval to proceed.
                </p>
            </div>

            <div class="grid-layout-setup">
                <!-- Inputs Glass Card -->
                <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur);" class="glass-panel">
                    <h3 style="font-size:1.063rem; font-weight:700; margin-bottom:16px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary);">📊 Custom Metrics</h3>
                    
                    <div style="display:flex; flex-direction:column; gap:14px;">
                        <div class="form-group">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">Counseling Track Mode:</label>
                            <select id="sim-track-mode" onchange="Pages.Simulator.setTrackMode(this.value)" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600;">
                                <option value="both" ${state.trackMode === 'both' ? 'selected' : ''}>Dual Track (Engineering & B.Arch)</option>
                                <option value="engineering" ${state.trackMode === 'engineering' ? 'selected' : ''}>Engineering Only</option>
                                <option value="architecture" ${state.trackMode === 'architecture' ? 'selected' : ''}>B.Arch Only</option>
                            </select>
                        </div>

                        <div id="eng-rank-group" style="display:${state.trackMode !== 'architecture' ? 'block' : 'none'};">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">Engineering Rank (GM):</label>
                            <input type="number" id="sim-rank" value="${state.rank}" min="1" max="150000" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600; margin-bottom:10px;">
                        </div>

                        <div id="arch-rank-group" style="display:${state.trackMode !== 'engineering' ? 'block' : 'none'};">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">B.Arch Merit Rank:</label>
                            <input type="number" id="sim-barch-rank" value="${state.barchRank}" min="1" max="10000" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600; margin-bottom:10px;">
                        </div>

                        <div class="form-group">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">Seat Category Quota:</label>
                            <select id="sim-category" onchange="Pages.Simulator.setCategory(this.value)" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600;">
                                <option value="GM" ${state.category === 'GM' ? 'selected' : ''}>General Merit (GM)</option>
                                <option value="K" ${state.category === 'K' ? 'selected' : ''}>Karnataka (K) Quota</option>
                                <option value="HK" ${state.category === 'HK' ? 'selected' : ''}>Hyderabad-Karnataka (HK) Quota</option>
                            </select>
                        </div>

                        <div class="form-group" id="eng-budget-group" style="display:${state.trackMode !== 'architecture' ? 'block' : 'none'};">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">Engineering Fee Cap Budget:</label>
                            <select id="sim-budget" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600;">
                                <option value="" ${state.maxBudget === null ? 'selected' : ''}>No Limit</option>
                                <option value="2.0" ${state.maxBudget === 2.0 ? 'selected' : ''}>₹2.0 Lakhs / year</option>
                                <option value="2.3" ${state.maxBudget === 2.3 ? 'selected' : ''}>₹2.3 Lakhs / year</option>
                                <option value="2.6" ${state.maxBudget === 2.6 ? 'selected' : ''}>₹2.6 Lakhs / year</option>
                                <option value="3.0" ${state.maxBudget === 3.0 ? 'selected' : ''}>₹3.0 Lakhs / year</option>
                            </select>
                        </div>

                        <div class="form-group" id="eng-list-group" style="display:${state.trackMode !== 'architecture' ? 'block' : 'none'};">
                            <label style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:6px;">Load Engineering Preferences:</label>
                            <select id="sim-list-select" onchange="Pages.Simulator.handleListChange(this.value)" style="width:100%; padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none; font-weight:600;">
                                ${preferenceOptions}
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Eligibility checklist double gates -->
                <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur);" class="glass-panel">
                    <h3 style="font-size:1.063rem; font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary);">🔐 Portal Verification Gates</h3>
                    
                    <div style="margin-bottom:16px;">
                        <label style="display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:0.813rem; color:var(--text-primary); cursor:pointer;">
                            <input type="checkbox" id="sim-is-supplementary" ${state.isSupplementary ? 'checked' : ''} onchange="Pages.Simulator.setSupplementary(this.checked)" style="width:16px; height:16px; accent-color:var(--primary);">
                            ⚠️ Supplementary Candidate (Passed supplementary 2026)
                        </label>
                        <p style="font-size:0.688rem; color:var(--text-secondary); margin-left:24px; margin-top:2px;">Skipping Mock & Rounds 1/2. Directly entering Round 3 General Merit seats only.</p>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                            <input type="checkbox" id="gate-reg" ${state.regCompleted ? 'checked' : ''} onchange="Pages.Simulator.toggleGate('regCompleted', this.checked)" style="width:18px; height:18px; accent-color:var(--primary);">
                            <div>
                                <span style="font-size:0.813rem; font-weight:700; display:block; color:var(--text-primary);">Registration Form & Fee Paid</span>
                                <span style="font-size:0.688rem; color:var(--text-muted);">COMEDK ₹2,000 counseling fee cleared.</span>
                            </div>
                        </label>

                        <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                            <input type="checkbox" id="gate-doc" ${state.docApproved ? 'checked' : ''} onchange="Pages.Simulator.toggleGate('docApproved', this.checked)" style="width:18px; height:18px; accent-color:var(--primary);">
                            <div>
                                <span style="font-size:0.813rem; font-weight:700; display:block; color:var(--text-primary);">Marksheets / Records Verified</span>
                                <span style="font-size:0.688rem; color:var(--text-muted);">Domicile and educational records approved online.</span>
                            </div>
                        </label>

                        <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                            <input type="checkbox" id="gate-choice" ${state.choiceCompleted ? 'checked' : ''} onchange="Pages.Simulator.toggleGate('choiceCompleted', this.checked)" style="width:18px; height:18px; accent-color:var(--primary);">
                            <div>
                                <span style="font-size:0.813rem; font-weight:700; display:block; color:var(--text-primary);">Preference Choices Filled</span>
                                <span style="font-size:0.688rem; color:var(--text-muted);">Locked standard options lists in workspace.</span>
                            </div>
                        </label>

                        <!-- KKR Verification status -->
                        <div id="kkr-gate-group" style="display:${state.category === 'HK' ? 'block' : 'none'};">
                            <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); background:rgba(67, 97, 238, 0.05); border:1.5px solid var(--primary); cursor:pointer;">
                                <input type="checkbox" id="gate-kkr" ${state.kkrApproved ? 'checked' : ''} onchange="Pages.Simulator.toggleGate('kkrApproved', this.checked)" style="width:18px; height:18px; accent-color:var(--primary);">
                                <div>
                                    <span style="font-size:0.813rem; font-weight:700; display:block; color:var(--primary);">KKR 371J Certificate Approved</span>
                                    <span style="font-size:0.688rem; color:var(--text-secondary);">Verified local Person status in Kalyana Karnataka Region.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rules & Pitfalls Compliance Declaration Wide Card -->
            <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:24px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); margin-top:20px;" class="glass-panel">
                <h3 style="font-size:1.125rem; font-weight:800; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                    🚨 COMEDK Rules & Pitfalls Compliance Declaration
                </h3>
                <p style="font-size:0.813rem; color:var(--text-secondary); line-height:1.5; margin-bottom:20px;">
                    To prevent counseling complications, automatic expulsion, or heavy financial forfeiture, you must acknowledge the core rules and verify you are avoiding these critical, common candidate mistakes:
                </p>

                <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:24px;">
                    <!-- Rule 1: Blank Choices -->
                    <label style="display:flex; align-items:start; gap:12px; padding:12px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                        <input type="checkbox" id="decl-blank" ${state.rulesDeclaration && state.rulesDeclaration.blankChoices ? 'checked' : ''} onchange="Pages.Simulator.toggleRuleDeclaration('blankChoices', this.checked)" style="width:18px; height:18px; margin-top:3px; accent-color:var(--primary);">
                        <div>
                            <span style="font-size:0.875rem; font-weight:700; display:block; color:var(--text-primary);">
                                Rule 1: No Blank Choice Lists allowed in Round 1
                            </span>
                            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:block; margin-top:2px;">
                                <strong>Common Mistake:</strong> Submitting a blank selection list. In COMEDK, failing to register any choices in Round 1 results in immediate and irreversible expulsion from all subsequent allotment rounds.
                            </span>
                        </div>
                    </label>

                    <!-- Rule 2: Fee Deadlines -->
                    <label style="display:flex; align-items:start; gap:12px; padding:12px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                        <input type="checkbox" id="decl-fee" ${state.rulesDeclaration && state.rulesDeclaration.feeDeadlines ? 'checked' : ''} onchange="Pages.Simulator.toggleRuleDeclaration('feeDeadlines', this.checked)" style="width:18px; height:18px; margin-top:3px; accent-color:var(--primary);">
                        <div>
                            <span style="font-size:0.875rem; font-weight:700; display:block; color:var(--text-primary);">
                                Rule 2: Part-Academic Fee Payment Deadlines (₹2.5L)
                            </span>
                            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:block; margin-top:2px;">
                                <strong>Common Mistake:</strong> Delaying tuition fee payment. If you choose "Accept & Freeze" or "Accept & Upgrade" and fail to successfully authorize the ₹2,50,000 fee before the round deadline, you forfeit your allotment and are barred from further rounds.
                            </span>
                        </div>
                    </label>

                    <!-- Rule 3: KKR Round Eligibility Gating -->
                    <label style="display:flex; align-items:start; gap:12px; padding:12px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                        <input type="checkbox" id="decl-kkr" ${state.rulesDeclaration && state.rulesDeclaration.kkrGating ? 'checked' : ''} onchange="Pages.Simulator.toggleRuleDeclaration('kkrGating', this.checked)" style="width:18px; height:18px; margin-top:3px; accent-color:var(--primary);">
                        <div>
                            <span style="font-size:0.875rem; font-weight:700; display:block; color:var(--text-primary);">
                                Rule 3: Round 2 Hyderabad-Karnataka Region (KKR) Gating
                            </span>
                            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:block; margin-top:2px;">
                                <strong>Common Mistake:</strong> Non-KKR candidates trying to join Round 2. Round 2 is designated exclusively for local candidates of the Kalyana Karnataka region who have approved 371J certificates. General Merit (GM) and non-verified HK candidates are waitlisted automatically and skip directly to Round 3.
                            </span>
                        </div>
                    </label>

                    <!-- Rule 4: Multi-Track Cross-Cancellation -->
                    <label style="display:flex; align-items:start; gap:12px; padding:12px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                        <input type="checkbox" id="decl-cross" ${state.rulesDeclaration && state.rulesDeclaration.crossAllotment ? 'checked' : ''} onchange="Pages.Simulator.toggleRuleDeclaration('crossAllotment', this.checked)" style="width:18px; height:18px; margin-top:3px; accent-color:var(--primary);">
                        <div>
                            <span style="font-size:0.875rem; font-weight:700; display:block; color:var(--text-primary);">
                                Rule 4: Dual Engineering/B.Arch Track Cross-Cancellation
                            </span>
                            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:block; margin-top:2px;">
                                <strong>Common Mistake:</strong> Expecting to hold two frozen seats. Freezing a seat in one track (e.g. B.Arch) automatically triggers the immediate cancellation and release of any held seat in the alternate track (Engineering). You must decide on a single final program.
                            </span>
                        </div>
                    </label>

                    <!-- Rule 5: Scan Document Quality -->
                    <label style="display:flex; align-items:start; gap:12px; padding:12px; border-radius:var(--radius-sm); background:var(--bg-secondary); border:1px solid var(--border-light); cursor:pointer;">
                        <input type="checkbox" id="decl-clarity" ${state.rulesDeclaration && state.rulesDeclaration.docClarity ? 'checked' : ''} onchange="Pages.Simulator.toggleRuleDeclaration('docClarity', this.checked)" style="width:18px; height:18px; margin-top:3px; accent-color:var(--primary);">
                        <div>
                            <span style="font-size:0.875rem; font-weight:700; display:block; color:var(--text-primary);">
                                Rule 5: High Resolution Document Scan Verification
                            </span>
                            <span style="font-size:0.75rem; color:var(--text-muted); line-height:1.4; display:block; margin-top:2px;">
                                <strong>Common Mistake:</strong> Uploading blurry photos taken on mobile phones. Document verification officers will reject registrations with unreadable text, glare, or incorrect PDF cropping. Ensure professional scans are uploaded.
                            </span>
                        </div>
                    </label>
                </div>

                <!-- Simulation Start Button inside the Rules panel at the bottom -->
                <button id="start-sim-btn" onclick="Pages.Simulator.startSimulation()" class="category-tab active" style="width:100%; font-weight:700; text-align:center; display:block; padding:14px; border-radius:var(--radius-md); font-size:0.938rem; transition:var(--transition); background:${isEligibleToStart() ? 'var(--primary)' : 'var(--text-muted)'}; color:white; border:none; cursor:${isEligibleToStart() ? 'pointer' : 'not-allowed'};" ${isEligibleToStart() ? '' : 'disabled'}>
                    ${state.isSupplementary ? 'Proceed to Marksheet Upload →' : '🚀 Start Counseling Simulation'}
                </button>
            </div>
        `;
    }

    // STEP 2 (FOR SUPPL CANDIDATES): UPLOAD MARKSHEET
    function renderSupplementaryUploadStep() {
        return `
            <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:24px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); text-align:center; max-width:600px; margin:0 auto;" class="glass-panel">
                <div style="font-size:3rem; margin-bottom:12px;">📑</div>
                <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Supplementary Document Verification Drawer</h2>
                <p style="font-size:0.813rem; color:var(--text-secondary); line-height:1.5; margin-bottom:20px;">
                    As a supplementary/compartment candidate of 2026, you must upload your qualifying passed supplementary marks card to COMEDK to claim counseling eligibility in Round 3.
                </p>

                ${state.supplementaryMarkSheetUploaded ? `
                    <div style="background:rgba(16,185,129,0.06); border:1.5px solid var(--safe-color); padding:16px; border-radius:var(--radius-md); margin-bottom:20px; text-align:left;">
                        <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--safe-color); display:block; letter-spacing:0.5px;">Document Approval Logs</span>
                        <div style="font-size:0.75rem; line-height:1.6; margin-top:8px; font-family:monospace; color:var(--text-primary);">
                            ✓ Marksheet File: <span style="font-weight:700;">${state.suppFile || 'marksheet_passed_2026.pdf'}</span><br>
                            ✓ Tahsildar Registry Query: <span style="font-weight:700;">Record Found</span><br>
                            ✓ QR Code Signature Audit: <span style="font-weight:700;">Verified & Authorized</span><br>
                            ✓ Status: <strong style="color:var(--safe-color);">SUPPLEMENTARY APPROVED</strong>
                        </div>
                    </div>
                ` : `
                    <div style="border:2px dashed var(--border-light); padding:30px; border-radius:var(--radius-md); background:rgba(0,0,0,0.02); cursor:pointer; margin-bottom:20px;" onclick="Pages.Simulator.triggerSuppUpload()">
                        <span style="font-size:1.5rem; display:block; margin-bottom:6px;">⬆️</span>
                        <span style="font-size:0.813rem; font-weight:700; color:var(--text-primary); display:block;">Click to Upload passed Mark Sheet PDF</span>
                        <span style="font-size:0.688rem; color:var(--text-muted); display:block; margin-top:4px;">Accepts JPG, JPEG, PDF up to 4MB</span>
                    </div>
                `}

                <div style="display:flex; justify-content:space-between; gap:12px; margin-top:24px;">
                    <button onclick="Pages.Simulator.goToStep('setup')" class="category-tab" style="font-size:0.813rem; padding:10px 20px;">← Back</button>
                    <button onclick="Pages.Simulator.proceedSupplementaryToRound3()" class="category-tab active" style="font-size:0.813rem; padding:10px 24px; border:none; background:${state.supplementaryMarkSheetUploaded ? 'var(--primary)' : 'var(--text-muted)'}; color:white; font-weight:700; cursor:${state.supplementaryMarkSheetUploaded ? 'pointer' : 'not-allowed'};" ${state.supplementaryMarkSheetUploaded ? '' : 'disabled'}>
                        Proceed to Round 3 Allotment →
                    </button>
                </div>
            </div>
        `;
    }

    // STEP 2 (NORMAL CANDIDATES): MOCK ROUND
    function renderMockStep() {
        const mock = state.trackSeats;
        const hasEng = state.trackMode !== 'architecture';
        const hasArch = state.trackMode !== 'engineering';

        return `
            <div class="note-item recommendation" style="margin-bottom:20px; border-left-color:var(--target-color);">
                <div style="font-weight:700; font-size:0.938rem; color:var(--text-primary); display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                    📢 Mock Allotment Trial Results
                </div>
                <p style="font-size:0.813rem; color:var(--text-secondary); line-height:1.4; margin:0;">
                    Mock allotments show trial seats. **COMEDK rules permit modifying choices** now. Review the cutoff paths below and refine your choice list before Round 1.
                </p>
            </div>

            <!-- Side by side tracks outcomes -->
            ${hasEng ? `
                <h3 style="font-size:0.938rem; font-weight:800; margin-bottom:12px; color:var(--text-primary);">📋 Engineering Mock Allotment Outcome</h3>
                <div class="scenarios-comparison-grid" style="margin-bottom:24px;">
                    ${renderTrackCard('Conservative (-10%)', 'conservative', mock.conservative.eng)}
                    ${renderTrackCard('Expected (Baseline)', 'expected', mock.expected.eng, true)}
                    ${renderTrackCard('Optimistic (+15%)', 'optimistic', mock.optimistic.eng)}
                </div>
            ` : ''}

            ${hasArch ? `
                <h3 style="font-size:0.938rem; font-weight:800; margin-bottom:12px; color:var(--text-primary);">📐 B.Arch Mock Allotment Outcome</h3>
                <div class="scenarios-comparison-grid" style="margin-bottom:24px;">
                    ${renderTrackCard('Conservative (-10%)', 'conservative', mock.conservative.arch)}
                    ${renderTrackCard('Expected (Baseline)', 'expected', mock.expected.arch, true)}
                    ${renderTrackCard('Optimistic (+15%)', 'optimistic', mock.optimistic.arch)}
                </div>
            ` : ''}

            <!-- Custom Preference Adjustments -->
            <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); margin-bottom:24px;" class="glass-panel">
                <h3 style="font-size:1.063rem; font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary);">
                    🛠️ Adjust Preferences Prior to Locking
                </h3>
                
                ${renderPreferenceAdjusters()}
            </div>

            <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                <button onclick="Pages.Simulator.goToStep('setup')" class="category-tab" style="font-size:0.813rem; padding:10px 20px;">← Back to Setup</button>
                <button onclick="Pages.Simulator.proceedToRound1()" class="category-tab active" style="font-size:0.813rem; padding:10px 24px; border:none; background:var(--primary); color:white; font-weight:700;">🔒 Save & Lock Choices. Go to Round 1 →</button>
            </div>
        `;
    }

    // STEPS 3 - 6: INTERACTIVE ROUNDS (1, 2, 3, 4)
    function renderRoundStep(roundNum) {
        const roundKey = `round${roundNum}`;
        const isFinal = roundNum === 4;
        const isKKRRound = roundNum === 2;

        const hasEng = state.trackMode !== 'architecture' && state.engineeringActive !== false;
        const hasArch = state.trackMode !== 'engineering' && state.barchActive !== false;

        // KKR Gating Rule: Waitlist GM/K candidates in Round 2
        const isWaitlisted = isKKRRound && (state.category !== 'HK' || !state.kkrApproved);

        if (isWaitlisted) {
            return `
                <div class="note-item recommendation" style="margin-bottom:20px; border-left-color:var(--target-color);">
                    <div style="font-weight:700; font-size:0.938rem; color:var(--text-primary); margin-bottom:4px;">🔒 Round 2 (KKR Region Seats Only)</div>
                    <p style="font-size:0.813rem; color:var(--text-secondary); margin:0; line-height:1.4;">
                        As per Government Order in No. DPAR 06 PLX 2012, Round 2 is designated exclusively for local persons of the Kalyana Karnataka region. General Merit and non-verified candidates do not participate.
                    </p>
                </div>

                <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:32px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); text-align:center; margin-bottom:24px;" class="glass-panel">
                    <div style="font-size:3rem; margin-bottom:12px;">⏳</div>
                    <h2 style="font-size:1.25rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">Waitlist Active — General Merit Hold</h2>
                    <p style="font-size:0.813rem; color:var(--text-secondary); max-width:480px; margin:0 auto 20px; line-height:1.5;">
                        Your Round 1 seats (if accepted) are held safely in the portal. You will automatically skip to Round 3 to check GM seat updates.
                    </p>
                    
                    <div style="background:rgba(67,97,238,0.06); border:1px dashed var(--primary); padding:14px; border-radius:var(--radius-md); font-size:0.75rem; text-align:left; max-width:400px; margin:0 auto; line-height:1.6;">
                        • held Engineering Seat: <strong>${state.heldSeats.eng ? `${state.heldSeats.eng.college.college_code} (#${state.heldSeats.eng.choiceNumber})` : 'None'}</strong><br>
                        • held B.Arch Seat: <strong>${state.heldSeats.arch ? `${state.heldSeats.arch.college.college_code} (#${state.heldSeats.arch.choiceNumber})` : 'None'}</strong>
                    </div>
                </div>

                <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                    <button onclick="Pages.Simulator.goBackFromRound(${roundNum})" class="category-tab" style="font-size:0.813rem; padding:10px 20px;">← Back</button>
                    <button onclick="Pages.Simulator.submitRound2Waitlist()" class="category-tab active" style="font-size:0.813rem; padding:10px 24px; border:none; background:var(--primary); color:white; font-weight:700;">Proceed directly to Round 3 →</button>
                </div>
            `;
        }

        return `
            <div class="note-item recommendation" style="margin-bottom:20px; border-left-color:var(--primary);">
                <div style="font-weight:700; font-size:0.938rem; color:var(--text-primary); margin-bottom:4px;">
                    🏛️ Round ${roundNum} Allotment Panel ${isKKRRound ? '(KKR Region Seats Only)' : ''}
                </div>
                <p style="font-size:0.813rem; color:var(--text-secondary); line-height:1.4; margin:0;">
                    Review current allotments. You can slide your choices *above* any allotted seat during this upgrade window before submitting decisions.
                </p>
            </div>

            <!-- Triple Outcome Display -->
            ${hasEng ? `
                <h3 style="font-size:0.938rem; font-weight:800; margin-bottom:12px; color:var(--text-primary);">📋 Engineering Cutoff Scenario Outcomes (Round ${roundNum})</h3>
                <div class="scenarios-comparison-grid" style="margin-bottom:24px;">
                    ${renderTrackCard('Conservative Path', 'conservative', state.trackSeats.conservative.eng)}
                    ${renderTrackCard('Expected (Baseline)', 'expected', state.trackSeats.expected.eng, true)}
                    ${renderTrackCard('Optimistic Path', 'optimistic', state.trackSeats.optimistic.eng)}
                </div>
            ` : ''}

            ${hasArch ? `
                <h3 style="font-size:0.938rem; font-weight:800; margin-bottom:12px; color:var(--text-primary);">📐 B.Arch Cutoff Scenario Outcomes (Round ${roundNum})</h3>
                <div class="scenarios-comparison-grid" style="margin-bottom:24px;">
                    ${renderTrackCard('Conservative Path', 'conservative', state.trackSeats.conservative.arch)}
                    ${renderTrackCard('Expected (Baseline)', 'expected', state.trackSeats.expected.arch, true)}
                    ${renderTrackCard('Optimistic Path', 'optimistic', state.trackSeats.optimistic.arch)}
                </div>
            ` : ''}

            <!-- Choice Adjustments for upgrade rounds -->
            ${!isFinal ? `
                <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); margin-bottom:24px;" class="glass-panel">
                    <h3 style="font-size:1.063rem; font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary);">
                        🔄 Option Editing Window (Reorder choices above current seat)
                    </h3>
                    ${renderPreferenceAdjusters(true)}
                </div>
            ` : ''}

            <!-- Advisor Recommendation Card -->
            ${renderAdvisorCard(roundNum)}

            <!-- Decisons Cards and Fee Gates -->
            <div style="display:grid; grid-template-columns: 1fr; gap:20px; margin-bottom:24px;" class="grid-layout-rounds">
                <div style="background:var(--glass-bg); border:1px solid var(--glass-border); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur);" class="glass-panel">
                    <h3 style="font-size:1.063rem; font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--border-light); padding-bottom:8px; color:var(--text-primary);">⚙️ Candidate Response Checklist</h3>
                    
                    ${renderDecisionForms(roundNum)}
                </div>

                <!-- Fee Gate & Cancellation Panel -->
                ${renderFeeAndCancellationPanel(roundNum)}
            </div>

            <!-- Navigation -->
            <div style="display:flex; justify-content:space-between; gap:16px; flex-wrap:wrap;">
                <button onclick="Pages.Simulator.goBackFromRound(${roundNum})" class="category-tab" style="font-size:0.813rem; padding:10px 20px;">← Back</button>
                <button onclick="Pages.Simulator.submitRound(${roundNum})" class="category-tab active" style="font-size:0.813rem; padding:10px 24px; border:none; background:${canSubmitRound(roundNum) ? 'var(--primary)' : 'var(--text-muted)'}; color:white; font-weight:700; cursor:${canSubmitRound(roundNum) ? 'pointer' : 'not-allowed'};" ${canSubmitRound(roundNum) ? '' : 'disabled'}>
                    ${isFinal ? 'Generate Final Report →' : `Submit Response & Go to next round →`}
                </button>
            </div>
        `;
    }

    // SETUP RENDER HELPERS
    function renderPreferenceAdjusters(restrictToUpgrades = false) {
        let html = '';
        const hasEng = state.trackMode !== 'architecture';
        const hasArch = state.trackMode !== 'engineering';

        if (hasEng) {
            html += `<h4 style="font-size:0.875rem; font-weight:700; margin-bottom:8px; color:var(--text-primary);">📋 Engineering Choice Priority Order</h4>`;
            html += `<div style="overflow-x:auto; margin-bottom:16px;"><table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem;" class="compare-table">
                <thead>
                    <tr style="border-bottom:1.5px solid var(--border-light); color:var(--text-secondary);">
                        <th style="padding:8px; width:50px;">Choice</th>
                        <th style="padding:8px; width:80px;">Code</th>
                        <th style="padding:8px;">College Name</th>
                        <th style="padding:8px; width:70px;">Tier</th>
                        <th style="padding:8px; width:90px;">Allotment</th>
                        <th style="padding:8px; width:80px;">Fee</th>
                        <th style="padding:8px; width:70px;">Action</th>
                    </tr>
                </thead>
                <tbody>`;
            
            const activeSeatIdx = state.heldSeats.eng ? state.choices.indexOf(state.heldSeats.eng.college.college_code) : state.choices.length;

            html += state.choices.map((code, index) => {
                const colleges = AppData.getColleges();
                const c = colleges.find(item => item.college_code === code);
                if (!c) return '';

                const isFirst = index === 0;
                // If upgrade mode is active, we cannot slide choices below the currently allotted seat
                const isLast = restrictToUpgrades ? (index >= activeSeatIdx - 1) : (index === state.choices.length - 1);
                const isLocked = restrictToUpgrades && (index >= activeSeatIdx);

                const qMult = getQuotaMultiplier(state.category);
                const cutoffs = getQuotaCutoffs(c, qMult);
                const driftMult = getMarketDriftMultiplier(c);
                const r1Cutoff = Math.round(cutoffs.r1 * driftMult);
                
                let likBadg = '';
                if (state.rank <= r1Cutoff * 0.9) likBadg = `<span class="badge badge-prob-green" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Safe</span>`;
                else if (state.rank <= r1Cutoff * 1.15) likBadg = `<span class="badge badge-prob-yellow" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Target</span>`;
                else if (state.rank <= r1Cutoff * 1.3) likBadg = `<span class="badge badge-prob-orange" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Reach</span>`;
                else likBadg = `<span class="badge badge-prob-red" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Dream</span>`;

                const feeText = c.fees ? `₹${c.fees.toFixed(2)}L` : '₹2.45L';
                const tierVal = c.tier || 'C';

                return `
                    <tr style="border-bottom:1px solid var(--border-light); opacity:${isLocked ? '0.5' : '1'}; background:${isLocked ? 'rgba(0,0,0,0.02)' : 'transparent'};">
                        <td style="padding:8px; font-weight:700;">#${index + 1}</td>
                        <td style="padding:8px;"><span style="padding:2px 6px; font-weight:700; font-size:0.688rem; background:var(--primary-glow); color:var(--primary); border-radius:4px;">${code}</span></td>
                        <td style="padding:8px; font-weight:600;">${c.college_name} ${isLocked ? '<span style="font-size:0.625rem; color:var(--text-muted);">[Locked below allotted seat]</span>' : ''}</td>
                        <td style="padding:8px;">${Badges.tierBadge(tierVal)}</td>
                        <td style="padding:8px;">${likBadg}</td>
                        <td style="padding:8px; font-weight:700; color:var(--text-primary); font-size:0.7rem;">${feeText}</td>
                        <td style="padding:8px; display:flex; gap:4px;">
                            ${!isLocked ? `
                                <button onclick="Pages.Simulator.moveChoiceUp(${index}, 'eng')" style="padding:4px; border-radius:4px; border:1px solid var(--border-light); background:var(--bg-secondary); cursor:${isFirst ? 'not-allowed' : 'pointer'};" ${isFirst ? 'disabled' : ''}>▲</button>
                                <button onclick="Pages.Simulator.moveChoiceDown(${index}, 'eng')" style="padding:4px; border-radius:4px; border:1px solid var(--border-light); background:var(--bg-secondary); cursor:${isLast ? 'not-allowed' : 'pointer'};" ${isLast ? 'disabled' : ''}>▼</button>
                                ${!restrictToUpgrades ? `<button onclick="Pages.Simulator.removeChoice('${code}', 'eng')" style="padding:4px 6px; border-radius:4px; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.02); color:var(--dream-color);">✕</button>` : ''}
                            ` : '—'}
                        </td>
                    </tr>
                `;
            }).join('');
            html += `</tbody></table></div>`;

            if (!restrictToUpgrades) {
                html += `
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; background:rgba(0,0,0,0.01); padding:8px; border-radius:var(--radius-sm); border:1px dashed var(--border-light); margin-bottom:20px; font-size:0.75rem;">
                        <label style="font-weight:700; color:var(--text-secondary);">Add College:</label>
                        <select id="sim-add-eng-select" style="flex:1; padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none;">
                            ${renderAddOptions('eng')}
                        </select>
                        <button onclick="Pages.Simulator.addChoiceFromSelect('eng')" class="category-tab active" style="font-size:0.75rem; border:none; padding:6px 12px; background:var(--primary); color:white;">Add choice</button>
                    </div>
                `;
            }
        }

        if (hasArch) {
            html += `<h4 style="font-size:0.875rem; font-weight:700; margin-top:16px; margin-bottom:8px; color:var(--text-primary);">📐 B.Arch Choice Priority Order</h4>`;
            html += `<div style="overflow-x:auto; margin-bottom:16px;"><table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.75rem;" class="compare-table">
                <thead>
                    <tr style="border-bottom:1.5px solid var(--border-light); color:var(--text-secondary);">
                        <th style="padding:8px; width:50px;">Choice</th>
                        <th style="padding:8px; width:80px;">Code</th>
                        <th style="padding:8px;">College Name</th>
                        <th style="padding:8px; width:70px;">Tier</th>
                        <th style="padding:8px; width:90px;">Allotment</th>
                        <th style="padding:8px; width:80px;">Fee</th>
                        <th style="padding:8px; width:70px;">Action</th>
                    </tr>
                </thead>
                <tbody>`;

            const activeSeatIdx = state.heldSeats.arch ? state.barchChoices.indexOf(state.heldSeats.arch.college.college_code) : state.barchChoices.length;

            html += state.barchChoices.map((code, index) => {
                const c = BARCH_COLLEGES.find(item => item.college_code === code);
                if (!c) return '';

                const isFirst = index === 0;
                const isLast = restrictToUpgrades ? (index >= activeSeatIdx - 1) : (index === state.barchChoices.length - 1);
                const isLocked = restrictToUpgrades && (index >= activeSeatIdx);

                const qMult = getQuotaMultiplier(state.category);
                const cutoffs = getBArchCutoffs(c, qMult);
                const r1Cutoff = cutoffs.r1;

                let likBadg = '';
                if (state.barchRank <= r1Cutoff * 0.9) likBadg = `<span class="badge badge-prob-green" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Safe</span>`;
                else if (state.barchRank <= r1Cutoff * 1.15) likBadg = `<span class="badge badge-prob-yellow" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Target</span>`;
                else if (state.barchRank <= r1Cutoff * 1.3) likBadg = `<span class="badge badge-prob-orange" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Reach</span>`;
                else likBadg = `<span class="badge badge-prob-red" style="font-size:0.625rem; font-weight:700; padding:2px 6px;">Dream</span>`;

                const feeText = c.fees ? `₹${c.fees.toFixed(2)}L` : '₹2.50L';
                const tierVal = getBArchTier(code);

                return `
                    <tr style="border-bottom:1px solid var(--border-light); opacity:${isLocked ? '0.5' : '1'}; background:${isLocked ? 'rgba(0,0,0,0.02)' : 'transparent'};">
                        <td style="padding:8px; font-weight:700;">#${index + 1}</td>
                        <td style="padding:8px;"><span style="padding:2px 6px; font-weight:700; font-size:0.688rem; background:rgba(16,185,129,0.12); color:var(--safe-color); border-radius:4px;">${code}</span></td>
                        <td style="padding:8px; font-weight:600;">${c.college_name} ${isLocked ? '<span style="font-size:0.625rem; color:var(--text-muted);">[Locked below allotted seat]</span>' : ''}</td>
                        <td style="padding:8px;">${Badges.tierBadge(tierVal)}</td>
                        <td style="padding:8px;">${likBadg}</td>
                        <td style="padding:8px; font-weight:700; color:var(--text-primary); font-size:0.7rem;">${feeText}</td>
                        <td style="padding:8px; display:flex; gap:4px;">
                            ${!isLocked ? `
                                <button onclick="Pages.Simulator.moveChoiceUp(${index}, 'arch')" style="padding:4px; border-radius:4px; border:1px solid var(--border-light); background:var(--bg-secondary); cursor:${isFirst ? 'not-allowed' : 'pointer'};" ${isFirst ? 'disabled' : ''}>▲</button>
                                <button onclick="Pages.Simulator.moveChoiceDown(${index}, 'arch')" style="padding:4px; border-radius:4px; border:1px solid var(--border-light); background:var(--bg-secondary); cursor:${isLast ? 'not-allowed' : 'pointer'};" ${isLast ? 'disabled' : ''}>▼</button>
                                ${!restrictToUpgrades ? `<button onclick="Pages.Simulator.removeChoice('${code}', 'arch')" style="padding:4px 6px; border-radius:4px; border:1px solid rgba(239,68,68,0.2); background:rgba(239,68,68,0.02); color:var(--dream-color);">✕</button>` : ''}
                            ` : '—'}
                        </td>
                    </tr>
                `;
            }).join('');
            html += `</tbody></table></div>`;

            if (!restrictToUpgrades) {
                html += `
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; background:rgba(0,0,0,0.01); padding:8px; border-radius:var(--radius-sm); border:1px dashed var(--border-light); margin-bottom:20px; font-size:0.75rem;">
                        <label style="font-weight:700; color:var(--text-secondary);">Add College:</label>
                        <select id="sim-add-arch-select" style="flex:1; padding:6px; border-radius:var(--radius-sm); border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); outline:none;">
                            ${renderAddOptions('arch')}
                        </select>
                        <button onclick="Pages.Simulator.addChoiceFromSelect('arch')" class="category-tab active" style="font-size:0.75rem; border:none; padding:6px 12px; background:var(--primary); color:white;">Add choice</button>
                    </div>
                `;
            }
        }

        return html;
    }

    function renderAddOptions(type) {
        if (type === 'eng') {
            const colleges = AppData.getColleges();
            return colleges
                .filter(c => !state.choices.includes(c.college_code))
                .map(c => `<option value="${c.college_code}">${c.college_code} — ${c.college_name}</option>`)
                .join('');
        } else {
            return BARCH_COLLEGES
                .filter(c => !state.barchChoices.includes(c.college_code))
                .map(c => `<option value="${c.college_code}">${c.college_code} — ${c.college_name}</option>`)
                .join('');
        }
    }

    function renderDecisionForms(roundNum) {
        let html = '';
        const roundKey = `round${roundNum}`;
        const hasEng = state.trackMode !== 'architecture' && state.engineeringActive !== false;
        const hasArch = state.trackMode !== 'engineering' && state.barchActive !== false;
        const isFinal = roundNum === 4;

        if (hasEng) {
            html += `<h4 style="font-size:0.875rem; font-weight:800; margin-bottom:10px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">📋 Engineering Choice Decision</h4>`;
            
            const seat = state.heldSeats.eng;
            if (!seat) {
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:16px; padding:10px; border-radius:4px; background:rgba(0,0,0,0.01); border:1px dashed var(--border-light);">
                        No seat allotted at this stage (Rank too high). Automatically continuing upgrade search.
                    </div>
                `;
            } else if (isFinal) {
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:12px;">
                        Allotted: <strong>${seat.college.college_name} (#${seat.choiceNumber})</strong>. Auto-Frozen by portal rule.
                    </div>
                    <label style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:var(--radius-sm); border:2px solid var(--safe-color); background:rgba(16,185,129,0.04); cursor:default; margin-bottom:16px;">
                        <input type="radio" checked disabled style="width:16px; height:16px;">
                        <div>
                            <strong style="color:var(--safe-color); font-size:0.813rem;">Accept & Freeze (Mandatory Campus Reporting)</strong>
                        </div>
                    </label>
                `;
            } else {
                const currentDec = state.decisions[roundKey];
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:12px;">
                        Allotted: <strong>${seat.college.college_name} (#${seat.choiceNumber})</strong>. Choose your response:
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                        ${renderDecisionOption(roundNum, 'eng', 'freeze', 'Accept & Freeze', 'Pay reservation fee, lock seat, cancel B.Arch seat (if any) and exit.', currentDec, 'var(--safe-color)', 'rgba(16,185,129,0.05)')}
                        ${renderDecisionOption(roundNum, 'eng', 'upgrade', 'Accept & Upgrade', 'Pay fee to hold this seat, check higher preferences in next round.', currentDec, 'var(--primary)', 'var(--primary-glow)')}
                        ${renderDecisionOption(roundNum, 'eng', 'reject', 'Reject & Upgrade', 'Release seat, participate in next round with no backup.', currentDec, 'var(--target-color)', 'var(--target-bg)')}
                        ${renderDecisionOption(roundNum, 'eng', 'withdraw', 'Reject & Withdraw', 'Exit Engineering counseling.', currentDec, 'var(--dream-color)', 'var(--dream-bg)')}
                    </div>
                `;
            }
        }

        if (hasArch) {
            html += `<h4 style="font-size:0.875rem; font-weight:800; margin-top:16px; margin-bottom:10px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">📐 B.Arch Choice Decision</h4>`;
            
            const seat = state.heldSeats.arch;
            if (!seat) {
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:16px; padding:10px; border-radius:4px; background:rgba(0,0,0,0.01); border:1px dashed var(--border-light);">
                        No B.Arch seat allotted. Automatically continuing upgrade search.
                    </div>
                `;
            } else if (isFinal) {
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:12px;">
                        Allotted: <strong>${seat.college.college_name} (#${seat.choiceNumber})</strong>. Auto-Frozen by portal rule.
                    </div>
                    <label style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:var(--radius-sm); border:2px solid var(--safe-color); background:rgba(16,185,129,0.04); cursor:default; margin-bottom:16px;">
                        <input type="radio" checked disabled style="width:16px; height:16px;">
                        <div>
                            <strong style="color:var(--safe-color); font-size:0.813rem;">Accept & Freeze (Mandatory B.Arch reporting)</strong>
                        </div>
                    </label>
                `;
            } else {
                const currentDec = state.barchDecisions[roundKey];
                html += `
                    <div style="font-size:0.813rem; color:var(--text-secondary); margin-bottom:12px;">
                        Allotted: <strong>${seat.college.college_name} (#${seat.choiceNumber})</strong>. Choose your response:
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:16px;">
                        ${renderDecisionOption(roundNum, 'arch', 'freeze', 'Accept & Freeze', 'Pay fee, lock seat, cancel Engineering seat (if any) and exit.', currentDec, 'var(--safe-color)', 'rgba(16,185,129,0.05)')}
                        ${renderDecisionOption(roundNum, 'arch', 'upgrade', 'Accept & Upgrade', 'Pay fee to hold B.Arch seat, check higher preferences in next round.', currentDec, 'var(--primary)', 'var(--primary-glow)')}
                        ${renderDecisionOption(roundNum, 'arch', 'reject', 'Reject & Upgrade', 'Release B.Arch seat, check upgrades in next round with no backup.', currentDec, 'var(--target-color)', 'var(--target-bg)')}
                        ${renderDecisionOption(roundNum, 'arch', 'withdraw', 'Reject & Withdraw', 'Exit Architecture counseling.', currentDec, 'var(--dream-color)', 'var(--dream-bg)')}
                    </div>
                `;
            }
        }

        return html;
    }

    function renderDecisionOption(roundNum, type, val, title, desc, currentVal, borderClr, bgClr) {
        const isChecked = currentVal === val;
        const borderStyle = isChecked ? `2px solid ${borderClr}` : '1px solid var(--border-light)';
        const backgroundStyle = isChecked ? bgClr : 'var(--bg-secondary)';

        return `
            <label style="display:flex; align-items:center; gap:10px; padding:10px; border-radius:var(--radius-sm); border:${borderStyle}; background:${backgroundStyle}; cursor:pointer;" onclick="Pages.Simulator.setDecisionVal(${roundNum}, '${type}', '${val}')">
                <input type="radio" name="dec-${type}-${roundNum}" value="${val}" ${isChecked ? 'checked' : ''} style="width:16px; height:16px; accent-color:${borderClr};">
                <div>
                    <span style="font-size:0.813rem; font-weight:700; display:block; color:var(--text-primary);">${title}</span>
                    <span style="font-size:0.688rem; color:var(--text-muted);">${desc}</span>
                </div>
            </label>
        `;
    }

    function renderFeeAndCancellationPanel(roundNum) {
        if (state.cancelled) {
            return `
                <div style="background:var(--glass-bg); border:2px solid var(--dream-color); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); text-align:center;" class="glass-panel">
                    <div style="font-size:2.5rem; margin-bottom:8px;">💸</div>
                    <h3 style="font-size:1.063rem; font-weight:800; color:var(--dream-color);">Seat Cancelled & Refunded</h3>
                    <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4; margin-top:8px;">
                        Refund processed successfully. Processing charge deductions (₹5,000) applied. Final receipt available.
                    </p>
                </div>
            `;
        }

        const roundKey = `round${roundNum}`;
        const engSeat = state.heldSeats.eng;
        const archSeat = state.heldSeats.arch;

        const engDec = state.decisions[roundKey];
        const archDec = state.barchDecisions[roundKey];

        const needEngPayment = engSeat && (engDec === 'freeze' || engDec === 'upgrade') && !state.feePaid;
        const needArchPayment = archSeat && (archDec === 'freeze' || archDec === 'upgrade') && !state.barchFeePaid;

        if (!needEngPayment && !needArchPayment) {
            // Already paid or no seat held
            const hasAnySeat = (engSeat && (engDec === 'freeze' || engDec === 'upgrade')) || (archSeat && (archDec === 'freeze' || archDec === 'upgrade'));
            
            return `
                <div style="background:var(--glass-bg); border:1px solid var(--border-light); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); display:flex; flex-direction:column; gap:12px;" class="glass-panel">
                    <h3 style="font-size:1.063rem; font-weight:700; color:var(--text-primary); border-bottom:1px solid var(--border-light); padding-bottom:8px;">💸 Fee Registry Clearance</h3>
                    
                    ${hasAnySeat ? `
                        <div style="background:rgba(16,185,129,0.05); border:1px solid var(--safe-color); border-radius:var(--radius-sm); padding:10px; text-align:center;">
                            <span style="font-size:0.75rem; font-weight:700; color:var(--safe-color); display:block;">✓ RESERVATION FEES CLEARED</span>
                        </div>
                        <button onclick="Pages.Simulator.openCancellationModal()" class="category-tab" style="width:100%; border:1px solid var(--dream-color); padding:10px; font-weight:700; color:var(--dream-color); background:none; font-size:0.75rem; cursor:pointer; text-align:center; border-radius:var(--radius-sm); transition:var(--transition);">
                            ⚠️ Seat Cancellation & Refund Portal
                        </button>
                    ` : `
                        <p style="font-size:0.75rem; color:var(--text-muted); text-align:center; padding:30px 0;">No active seat held requiring fee payment.</p>
                    `}
                </div>
            `;
        }

        return `
            <div style="background:var(--glass-bg); border:1px solid var(--dream-color); padding:20px; border-radius:var(--radius-lg); backdrop-filter:var(--glass-blur); display:flex; flex-direction:column; gap:12px;" class="glass-panel">
                <h3 style="font-size:1.063rem; font-weight:700; color:var(--dream-color); border-bottom:1px solid rgba(239,68,68,0.2); padding-bottom:8px;">⚠️ Part-Academic Fee Checkpoint</h3>
                <p style="font-size:0.75rem; color:var(--text-secondary); line-height:1.4;">
                    COMEDK guidelines require a ₹2,50,000 tuition fee deposit to satisfy deadlines. Failure to pay forfeits your held choices and withdraws you.
                </p>

                ${needEngPayment ? `
                    <div style="background:var(--bg-secondary); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-light); display:flex; justify-content:space-between; font-size:0.75rem;">
                        <span>📋 Engineering Fee Required:</span>
                        <strong style="color:var(--text-primary);">₹2,50,000.00</strong>
                    </div>
                    <button onclick="Pages.Simulator.triggerPayment('eng')" class="category-tab active" style="width:100%; border:none; padding:10px; font-weight:700; background:var(--primary); color:white; font-size:0.75rem; cursor:pointer; text-align:center; border-radius:var(--radius-sm);">
                        Authorize Engineering Tuition Fee
                    </button>
                ` : ''}

                ${needArchPayment ? `
                    <div style="background:var(--bg-secondary); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--border-light); display:flex; justify-content:space-between; font-size:0.75rem; margin-top:8px;">
                        <span>📐 B.Arch Fee Required:</span>
                        <strong style="color:var(--text-primary);">₹2,50,000.00</strong>
                    </div>
                    <button onclick="Pages.Simulator.triggerPayment('arch')" class="category-tab active" style="width:100%; border:none; padding:10px; font-weight:700; background:var(--primary); color:white; font-size:0.75rem; cursor:pointer; text-align:center; border-radius:var(--radius-sm);">
                        Authorize B.Arch Tuition Fee
                    </button>
                ` : ''}
            </div>
        `;
    }

    // DECISION MANAGEMENT
    function setDecisionVal(roundNum, type, val) {
        const roundKey = `round${roundNum}`;
        if (type === 'eng') {
            state.decisions[roundKey] = val;
            if (val === 'freeze' || val === 'upgrade') {
                resolveCrossAllotment('engineering');
            }
        } else {
            state.barchDecisions[roundKey] = val;
            if (val === 'freeze' || val === 'upgrade') {
                resolveCrossAllotment('architecture');
            }
        }
        render();
    }

    function triggerPayment(type) {
        if (typeof App !== 'undefined' && typeof App.playChimeSound === 'function') {
            App.playChimeSound();
        }

        if (type === 'eng') {
            state.feePaid = true;
            state.historyLog.push(`💳 Tuition Fee Paid: Authorized ₹2,50,000 for Engineering seat.`);
        } else {
            state.barchFeePaid = true;
            state.historyLog.push(`💳 Tuition Fee Paid: Authorized ₹2,50,000 for Architecture seat.`);
        }
        state.transactionId = `UTR${Math.floor(100000000000 + Math.random() * 900000000000)}`;
        state.paymentDate = new Date();

        render();
        AppData.showToast('💳 Payment cleared successfully!', 'success');
    }

    function openCancellationModal() {
        const hasEngPaid = state.heldSeats.eng && state.feePaid;
        const hasArchPaid = state.heldSeats.arch && state.barchFeePaid;
        const seatName = hasEngPaid ? state.heldSeats.eng.college.college_name : (hasArchPaid ? state.heldSeats.arch.college.college_name : 'Your Held Seat');

        const confirmed = confirm(`🚨 COMEDK Cancellation Policy Alert:\n\nAre you sure you want to cancel your seat at:\n"${seatName}"?\n\nIf you cancel, you will exit the counseling process. A processing fee of ₹5,000 will be deducted, and a refund of ₹2,45,000 will be processed to your source account.`);
        
        if (confirmed) {
            state.cancelled = true;
            state.refundAmount = 245000;
            state.heldSeats.eng = null;
            state.heldSeats.arch = null;
            state.historyLog.push(`🚨 Seat Cancelled: Candidate triggered seat cancellation portal. Refund issued: ₹2,45,000.`);
            state.step = 'receipt';
            render();
            AppData.showToast('🚨 Seat cancelled. Refund processed.', 'info');
        }
    }

    // STEPS NAVIGATION ACTIONS
    function toggleGate(gateName, isChecked) {
        state[gateName] = isChecked;
        const btn = document.getElementById('start-sim-btn');
        if (btn) {
            const elig = isEligibleToStart();
            btn.disabled = !elig;
            btn.style.background = elig ? 'var(--primary)' : 'var(--text-muted)';
            btn.style.cursor = elig ? 'pointer' : 'not-allowed';
        }
    }

    function toggleRuleDeclaration(ruleKey, isChecked) {
        if (!state.rulesDeclaration) {
            state.rulesDeclaration = {};
        }
        state.rulesDeclaration[ruleKey] = isChecked;
        const btn = document.getElementById('start-sim-btn');
        if (btn) {
            const elig = isEligibleToStart();
            btn.disabled = !elig;
            btn.style.background = elig ? 'var(--primary)' : 'var(--text-muted)';
            btn.style.cursor = elig ? 'pointer' : 'not-allowed';
        }
    }

    function handleListChange(listName) {
        state.preferenceListName = listName;
        if (Pages.Preferences) {
            const map = Pages.Preferences.getListsMap();
            state.choices = [...(map[listName] || [])];
            state.choiceCompleted = state.choices.length > 0;
            
            const label = document.querySelector('#gate-choice + div span + span');
            if (label) {
                label.textContent = state.choices.length > 0
                    ? `Loaded ${state.choices.length} choices.`
                    : 'Preference list has 0 choices.';
            }

            const gateInput = document.getElementById('gate-choice');
            if (gateInput) {
                gateInput.checked = state.choices.length > 0;
                toggleGate('choiceCompleted', state.choices.length > 0);
            }
        }
    }

    function setTrackMode(val) {
        state.trackMode = val;
        
        // Toggle rank forms display
        const engGroup = document.getElementById('eng-rank-group');
        const archGroup = document.getElementById('arch-rank-group');
        const engBudget = document.getElementById('eng-budget-group');
        const engList = document.getElementById('eng-list-group');

        if (engGroup) engGroup.style.display = (val !== 'architecture' ? 'block' : 'none');
        if (archGroup) archGroup.style.display = (val !== 'engineering' ? 'block' : 'none');
        if (engBudget) engBudget.style.display = (val !== 'architecture' ? 'block' : 'none');
        if (engList) engList.style.display = (val !== 'architecture' ? 'block' : 'none');

        // Check choice completed
        if (val === 'architecture') {
            toggleGate('choiceCompleted', true);
            const choiceInput = document.getElementById('gate-choice');
            if (choiceInput) choiceInput.checked = true;
        } else {
            toggleGate('choiceCompleted', state.choices.length > 0);
            const choiceInput = document.getElementById('gate-choice');
            if (choiceInput) choiceInput.checked = state.choices.length > 0;
        }
    }

    function setCategory(val) {
        state.category = val;
        const kkrGate = document.getElementById('kkr-gate-group');
        if (kkrGate) {
            kkrGate.style.display = (val === 'HK' ? 'block' : 'none');
        }
        if (val !== 'HK') {
            state.kkrApproved = false;
        }
        // Force evaluation of start button
        toggleGate('regCompleted', state.regCompleted);
    }

    function setSupplementary(isChecked) {
        state.isSupplementary = isChecked;
        const tracker = document.querySelector('.details-tab-bar');
        
        // Re-render tracker
        render();
    }

    function triggerSuppUpload() {
        if (typeof App !== 'undefined' && typeof App.playChimeSound === 'function') {
            App.playChimeSound();
        }
        state.supplementaryMarkSheetUploaded = true;
        state.suppFile = `passed_supplementary_sheet_2026_${Math.floor(1000 + Math.random()*9000)}.pdf`;
        state.historyLog.push(`✓ Supplementary pass marks uploaded. Document approved.`);
        render();
        AppData.showToast('📑 Supplementary Marksheet verified & approved!', 'success');
    }

    function startSimulation() {
        if (!isEligibleToStart()) return;
        
        runLoadingOverlay(() => {
            if (state.isSupplementary) {
                state.step = 'upload-supp';
                render();
                AppData.showToast('📑 Upload passed marks card to unlock Round 3.', 'info');
            } else {
                runMockSimulation();
                state.step = 'mock';
                render();
                AppData.showToast('📈 Mock round calculated side-by-side.', 'success');
            }
        }, state.isSupplementary ? 'Initializing Supplementary Portal...' : 'Launching Mock Allotment Engine...');
    }

    function proceedSupplementaryToRound3() {
        if (!state.supplementaryMarkSheetUploaded) return;

        runLoadingOverlay(() => {
            // Skip Mock, Rounds 1/2. Directly calculate GM Round 3 outcomes
            state.historyLog.push(`🏛️ Supplementary Candidate entered active counseling at Round 3.`);
            state.category = 'GM'; // Restricted to GM seats by rule

            ['conservative', 'expected', 'optimistic'].forEach(t => {
                state.trackSeats[t].eng = simulateEngineeringRound(t, 3);
                state.trackSeats[t].arch = simulateArchitectureRound(t, 3);
            });

            state.heldSeats.eng = state.trackSeats.expected.eng;
            state.heldSeats.arch = state.trackSeats.expected.arch;

            state.step = 'round3';
            state.feePaid = false;
            state.barchFeePaid = false;
            render();
            AppData.showToast('🏛️ Entered Round 3 General Merit seats.', 'success');
        }, 'Verifying PUC Credentials & Routing to Round 3...');
    }

    function proceedToRound1() {
        if (state.trackMode !== 'architecture' && state.choices.length === 0) {
            AppData.showToast('⚠️ engineering preferences list is blank!', 'error');
            return;
        }

        runLoadingOverlay(() => {
            ['conservative', 'expected', 'optimistic'].forEach(t => {
                state.trackSeats[t].eng = simulateEngineeringRound(t, 1);
                state.trackSeats[t].arch = simulateArchitectureRound(t, 1);
            });

            state.heldSeats.eng = state.trackSeats.expected.eng;
            state.heldSeats.arch = state.trackSeats.expected.arch;

            state.step = 'round1';
            state.feePaid = false;
            state.barchFeePaid = false;
            render();
            AppData.showToast('🏛️ Round 1 allotments loaded successfully.', 'success');
        }, 'Simulating Round 1 Seat Allotments...');
    }

    function submitRound2Waitlist() {
        runLoadingOverlay(() => {
            // Skip Round 2 Waitlist, carry over R1 seats to Round 3 calculations
            ['conservative', 'expected', 'optimistic'].forEach(t => {
                state.trackSeats[t].eng = simulateEngineeringRound(t, 3);
                state.trackSeats[t].arch = simulateArchitectureRound(t, 3);
            });

            state.heldSeats.eng = state.trackSeats.expected.eng;
            state.heldSeats.arch = state.trackSeats.expected.arch;

            state.step = 'round3';
            render();
            AppData.showToast('🏛️ Round 3 General Merit upgrades loaded.', 'success');
        }, 'Waitlisting GM Quota. Loading Round 3 upgrade matrices...');
    }

    function submitRound(roundNum) {
        if (!canSubmitRound(roundNum)) return;

        const roundKey = `round${roundNum}`;
        const engDec = state.decisions[roundKey] || 'upgrade';
        const archDec = state.barchDecisions[roundKey] || 'upgrade';

        // Check if candidate withdrew completely
        const isEngWithdrawn = state.trackMode === 'architecture' || engDec === 'withdraw' || state.engineeringActive === false;
        const isArchWithdrawn = state.trackMode === 'engineering' || archDec === 'withdraw' || state.barchActive === false;

        if (isEngWithdrawn && isArchWithdrawn) {
            runLoadingOverlay(() => {
                state.step = 'receipt';
                state.heldSeats.eng = null;
                state.heldSeats.arch = null;
                render();
                AppData.showToast('❌ Withdrawn from counseling portal completely.', 'info');
            }, 'Processing Portal Withdrawal...');
            return;
        }

        if (engDec === 'freeze' || archDec === 'freeze') {
            runLoadingOverlay(() => {
                // Locks the frozen seat, goes directly to receipt report
                if (engDec === 'freeze') state.heldSeats.arch = null;
                if (archDec === 'freeze') state.heldSeats.eng = null;
                state.step = 'receipt';
                render();
                AppData.showToast('🎉 Congratulations! Selected seat frozen.', 'success');
            }, 'Generating Final Allotment Receipt...');
            return;
        }

        // Proceed to next round sliding calculations
        const nextRound = roundNum + 1;
        if (nextRound > 4) {
            runLoadingOverlay(() => {
                state.step = 'receipt';
                render();
            }, 'Calculating Final Round Outcomes...');
            return;
        }

        runLoadingOverlay(() => {
            ['conservative', 'expected', 'optimistic'].forEach(t => {
                state.trackSeats[t].eng = simulateEngineeringRound(t, nextRound);
                state.trackSeats[t].arch = simulateArchitectureRound(t, nextRound);
            });

            state.heldSeats.eng = state.trackSeats.expected.eng;
            state.heldSeats.arch = state.trackSeats.expected.arch;

            // Reset fee Paid statuses if they did "reject" (forfeited seat)
            if (engDec === 'reject') {
                state.feePaid = false;
            }
            if (archDec === 'reject') {
                state.barchFeePaid = false;
            }

            state.step = `round${nextRound}`;
            render();
            AppData.showToast(`📊 Sliding updates loaded for Round ${nextRound}.`, 'success');
        }, `Processing upgrades & sliding options for Round ${nextRound}...`);
    }

    function goBackFromRound(roundNum) {
        runLoadingOverlay(() => {
            if (roundNum === 1) {
                state.step = 'mock';
            } else if (roundNum === 3 && state.isSupplementary) {
                state.step = 'upload-supp';
            } else {
                state.step = `round${roundNum - 1}`;
            }
            render();
        }, 'Routing to Previous Step...');
    }

    function restart() {
        runLoadingOverlay(() => {
            init();
            render();
            AppData.showToast('🔄 Simulator reset.', 'info');
        }, 'Resetting Counseling Portal...');
    }

    // CHOICE LIST EDIT HANDLERS
    function moveChoiceUp(index, type) {
        if (index <= 0) return;
        if (type === 'eng') {
            const temp = state.choices[index];
            state.choices[index] = state.choices[index - 1];
            state.choices[index - 1] = temp;
        } else {
            const temp = state.barchChoices[index];
            state.barchChoices[index] = state.barchChoices[index - 1];
            state.barchChoices[index - 1] = temp;
        }
        runMockSimulation();
        render();
    }

    function moveChoiceDown(index, type) {
        if (type === 'eng') {
            if (index >= state.choices.length - 1) return;
            const temp = state.choices[index];
            state.choices[index] = state.choices[index + 1];
            state.choices[index + 1] = temp;
        } else {
            if (index >= state.barchChoices.length - 1) return;
            const temp = state.barchChoices[index];
            state.barchChoices[index] = state.barchChoices[index + 1];
            state.barchChoices[index + 1] = temp;
        }
        runMockSimulation();
        render();
    }

    function removeChoice(code, type) {
        if (type === 'eng') {
            state.choices = state.choices.filter(c => c !== code);
        } else {
            state.barchChoices = state.barchChoices.filter(c => c !== code);
        }
        runMockSimulation();
        render();
    }

    function addChoiceFromSelect(type) {
        const selectId = type === 'eng' ? 'sim-add-eng-select' : 'sim-add-arch-select';
        const select = document.getElementById(selectId);
        if (!select) return;

        const code = select.value;
        if (!code) return;

        if (type === 'eng') {
            if (!state.choices.includes(code)) {
                state.choices.push(code);
            }
        } else {
            if (!state.barchChoices.includes(code)) {
                state.barchChoices.push(code);
            }
        }

        runMockSimulation();
        render();
    }

    function runLoadingOverlay(callback, message = 'Processing allotment...') {
        const overlay = document.createElement('div');
        overlay.id = 'sim-loading-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(10, 12, 22, 0.85)';
        overlay.style.backdropFilter = 'blur(8px)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '99999';
        overlay.style.color = 'white';
        overlay.style.transition = 'opacity 0.3s ease';

        overlay.innerHTML = `
            <div style="text-align:center; padding:32px; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:16px; box-shadow:0 8px 32px rgba(0,0,0,0.4);" class="glass-panel">
                <div class="sim-spinner" style="width: 48px; height: 48px; border: 4px solid rgba(255,255,255,0.1); border-top-color: var(--primary); border-radius: 50%; animation: sim-spin 1s linear infinite; margin: 0 auto 16px;"></div>
                <h3 style="font-size:1.125rem; font-weight:800; color:var(--text-primary); margin-bottom:8px;">${message}</h3>
                <p style="font-size:0.75rem; color:var(--text-secondary); margin:0;">Analyzing choice preferences & sliding seat matrices...</p>
            </div>
            <style>
                @keyframes sim-spin {
                    to { transform: rotate(360deg); }
                }
            </style>
        `;

        document.body.appendChild(overlay);

        setTimeout(() => {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                callback();
            }, 300);
        }, 850);
    }

    function renderAdvisorCard(roundNum) {
        const hasEng = state.trackMode !== 'architecture' && state.engineeringActive !== false;
        const hasArch = state.trackMode !== 'engineering' && state.barchActive !== false;
        const engSeat = state.heldSeats.eng;
        const archSeat = state.heldSeats.arch;
        const isFinal = roundNum === 4;

        let tips = [];
        
        if (isFinal) {
            tips.push(`📌 **Round 4 is the final round**: All allotted seats are automatically frozen. You must download this report and report to the allotted campus with original documents.`);
            tips.push(`💳 **Fee Clearance**: Ensure your ₹2,50,000 reservation fee shows a 'Cleared' status. Failure to pay will block admission letter printing.`);
        } else {
            if (hasEng && engSeat) {
                const choiceNum = engSeat.choiceNumber;
                if (choiceNum === 1) {
                    tips.push(`🌟 **Top Preference Allotted**: You got your #1 choice (${engSeat.college.college_code}). You cannot upgrade further. Selecting 'Accept & Freeze' is mandatory to secure this seat.`);
                } else {
                    tips.push(`💡 **Upgrade Potential**: You hold choice #${choiceNum} (${engSeat.college.college_code}). Selecting **'Accept & Upgrade'** keeps this seat as a safe backup while allowing you to slide into choices #1 to #${choiceNum - 1} in the next round.`);
                    tips.push(`⚠️ **Reject & Upgrade Risk**: Choosing 'Reject & Upgrade' releases this seat immediately. If cutoffs tighten in the next round, you might lose this backup and get no allotment.`);
                }
            } else if (hasEng && !engSeat) {
                tips.push(`🔍 **No Engineering Seat Allotted**: Your rank is higher than the current round cutoffs for your preference list. The portal is automatically sliding you to the next round to check upgrades.`);
                if (state.choices.length < 5) {
                    tips.push(`📝 **Choice List Advisory**: Your choices list is relatively short. Consider adding more backup options to avoid a 'No Seat Allotted' outcome in the final round.`);
                }
            }

            if (state.category === 'HK' && roundNum === 1 && state.kkrApproved) {
                tips.push(`🎉 **KKR Quota advantage**: Your verified 371J status unlocks local reservation seats in Round 2. Upgrades in Round 2 are historically 15-20% more likely than GM rounds.`);
            }

            if (state.trackMode === 'both' && engSeat && archSeat) {
                tips.push(`🔀 **Parallel Tracks Active**: Freezing your Engineering seat will instantly release your B.Arch seat, and vice versa. Evaluate placement records and branch preferences before freezing.`);
            }
        }

        if (tips.length === 0) return '';

        return `
            <div style="background:rgba(67,97,238,0.04); border:1px solid rgba(67,97,238,0.15); border-radius:var(--radius-lg); padding:16px; margin-bottom:24px; backdrop-filter:blur(10px);" class="glass-panel">
                <h4 style="font-size:0.875rem; font-weight:800; color:var(--primary); margin-bottom:10px; display:flex; align-items:center; gap:6px;">
                    💡 Portal Advisor Recommendations
                </h4>
                <ul style="font-size:0.75rem; color:var(--text-secondary); margin:0; padding-left:16px; line-height:1.6; display:flex; flex-direction:column; gap:6px;">
                    ${tips.map(tip => `<li>${tip.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`).join('')}
                </ul>
            </div>
        `;
    }

    // ELIGIBILITY STATUS
    function isEligibleToStart() {
        const rulesVerified = state.rulesDeclaration &&
            state.rulesDeclaration.blankChoices &&
            state.rulesDeclaration.feeDeadlines &&
            state.rulesDeclaration.kkrGating &&
            state.rulesDeclaration.crossAllotment &&
            state.rulesDeclaration.docClarity;

        if (!rulesVerified) return false;

        if (state.category === 'HK') {
            return state.regCompleted && state.docApproved && state.choiceCompleted && state.kkrApproved;
        }
        return state.regCompleted && state.docApproved && state.choiceCompleted;
    }

    function canSubmitRound(roundNum) {
        if (state.cancelled) return true;

        const roundKey = `round${roundNum}`;
        const hasEng = state.trackMode !== 'architecture' && state.engineeringActive !== false;
        const hasArch = state.trackMode !== 'engineering' && state.barchActive !== false;

        if (hasEng && state.heldSeats.eng) {
            const dec = state.decisions[roundKey];
            if (!dec) return false;
            if ((dec === 'freeze' || dec === 'upgrade') && !state.feePaid) return false;
        }

        if (hasArch && state.heldSeats.arch) {
            const dec = state.barchDecisions[roundKey];
            if (!dec) return false;
            if ((dec === 'freeze' || dec === 'upgrade') && !state.barchFeePaid) return false;
        }

        return true;
    }

    // TIMELINEoutcome render helper
    function renderTrackCard(title, track, seat, highlight = false) {
        const cardBg = highlight ? 'var(--primary-glow)' : 'var(--bg-secondary)';
        const cardBorder = highlight ? '1px solid var(--primary)' : '1px solid var(--border-light)';
        const shadow = highlight ? 'var(--card-shadow)' : 'none';

        if (!seat) {
            return `
                <div class="round-status-card no-allotment" style="background:${cardBg}; border:${cardBorder}; box-shadow:${shadow};">
                    <div class="round-card-header">
                        <span class="round-card-num">${title}</span>
                        <span class="round-card-status-badge no-allotment">⚪ No Seat</span>
                    </div>
                    <div class="round-card-college-code" style="opacity:0.6;">No Seat</div>
                    <div class="round-card-college-name">Cutoff higher than rank threshold.</div>
                </div>
            `;
        }

        const listCount = seat.type === 'Engineering' ? state.choices.length : state.barchChoices.length;
        const cutoffValue = seat.cutoff;
        const activeRank = seat.type === 'Engineering' ? state.rank : state.barchRank;
        const margin = cutoffValue - activeRank;
        const marginSign = margin >= 0 ? '+' : '';
        const marginColor = margin >= 0 ? 'var(--safe-color)' : 'var(--dream-color)';
        const marginBg = margin >= 0 ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)';

        return `
            <div class="round-status-card likely" style="background:${cardBg}; border:${cardBorder}; box-shadow:${shadow}; border-top: 4px solid ${seat.type === 'Engineering' ? 'var(--primary)' : 'var(--safe-color)'};">
                <div class="round-card-header">
                    <span class="round-card-num">${title}</span>
                    <span class="round-card-status-badge likely">${seat.type}</span>
                </div>
                <div class="round-card-college-code">${seat.college.college_code}</div>
                <div class="round-card-college-name text-truncate" title="${seat.college.college_name}">${seat.college.college_name}</div>
                
                <div class="round-card-metrics-list" style="margin-top:4px;">
                    <div class="round-card-metric-row">
                        <span>Choice Index:</span>
                        <strong>#${seat.choiceNumber} / ${listCount}</strong>
                    </div>
                    <div class="round-card-metric-row">
                        <span>Est Cutoff:</span>
                        <strong>${cutoffValue.toLocaleString()}</strong>
                    </div>
                    <div class="round-card-metric-row">
                        <span>Round:</span>
                        <strong>${seat.roundAllotted}</strong>
                    </div>
                    <div class="round-card-metric-row" style="background:${marginBg}; border-radius:4px; padding:2px 6px; margin-top:6px;">
                        <span>Rank Margin:</span>
                        <strong style="color:${marginColor}; font-weight:800;">${marginSign}${margin.toLocaleString()}</strong>
                    </div>
                </div>
            </div>
        `;
    }

    // FINAL RECEIPT REPORT
    function renderReceiptStep() {
        const docRef = `COMEDK/2026/SIM-${Math.floor(100000 + Math.random()*900000)}`;
        const utrNum = (state.feePaid || state.barchFeePaid) ? `UTR${Math.floor(100000000000 + Math.random()*900000000000)}` : 'N/A';
        const dateStr = state.paymentDate ? state.paymentDate.toLocaleString() : new Date().toLocaleString();

        let allotmentSummaryHtml = '';
        if (state.cancelled) {
            allotmentSummaryHtml = `
                <div style="border:2px solid var(--dream-color); border-radius:var(--radius-md); padding:16px; background:rgba(239,68,68,0.04); margin-bottom:20px;">
                    <strong style="color:var(--dream-color); font-size:1rem; display:block; text-transform:uppercase;">🚨 Counseling Seat Cancelled</strong>
                    <p style="font-size:0.75rem; color:#374151; margin-top:4px; line-height:1.4;">
                        The candidate holding seat triggered the online cancellation portal. As per standard refund policy, a processing fee deduction (₹5,000.00) has been applied. Refund processed successfully.
                    </p>
                    <div style="margin-top:10px; font-size:0.75rem; border-top:1px dashed #d1d5db; padding-top:8px;">
                        • Refund issued: <strong>₹${state.refundAmount.toLocaleString()}.00 INR</strong><br>
                        • Refund Status: <strong>SETTLED SUCCESS</strong>
                    </div>
                </div>
            `;
        } else {
            if (state.heldSeats.eng) {
                allotmentSummaryHtml += `
                    <div style="border:1.5px solid var(--primary); border-radius:var(--radius-md); padding:16px; background:rgba(67,97,238,0.03); margin-bottom:12px;">
                        <span style="font-size:0.65rem; font-weight:700; color:var(--primary); text-transform:uppercase; letter-spacing:0.5px;">Allotted Engineering Seat</span>
                        <h4 style="font-size:1.063rem; font-weight:800; color:#111827; margin:4px 0;">${state.heldSeats.eng.college.college_name}</h4>
                        <div style="font-size:0.72rem; color:#4b5563; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <div>Code: <strong>${state.heldSeats.eng.college.college_code}</strong> | Choice: <strong>#${state.heldSeats.eng.choiceNumber}</strong></div>
                            <div>Tuition Fee: <strong>₹${(state.heldSeats.eng.college.fees || 2.5).toFixed(2)} Lakhs/yr</strong></div>
                        </div>
                    </div>
                `;
            }
            if (state.heldSeats.arch) {
                allotmentSummaryHtml += `
                    <div style="border:1.5px solid var(--safe-color); border-radius:var(--radius-md); padding:16px; background:rgba(16,185,129,0.03); margin-bottom:12px;">
                        <span style="font-size:0.65rem; font-weight:700; color:var(--safe-color); text-transform:uppercase; letter-spacing:0.5px;">Allotted B.Arch Seat</span>
                        <h4 style="font-size:1.063rem; font-weight:800; color:#111827; margin:4px 0;">${state.heldSeats.arch.college.college_name}</h4>
                        <div style="font-size:0.72rem; color:#4b5563; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                            <div>Code: <strong>${state.heldSeats.arch.college.college_code}</strong> | Choice: <strong>#${state.heldSeats.arch.choiceNumber}</strong></div>
                            <div>Tuition Fee: <strong>₹${(state.heldSeats.arch.college.fees || 2.5).toFixed(2)} Lakhs/yr</strong></div>
                        </div>
                    </div>
                `;
            }

            if (!state.heldSeats.eng && !state.heldSeats.arch) {
                allotmentSummaryHtml = `
                    <div style="border:1.5px solid #d1d5db; border-radius:var(--radius-md); padding:16px; background:#f9fafb; text-align:center; color:#4b5563; font-size:0.813rem;">
                        No seats allotted or candidate withdrew from the process.
                    </div>
                `;
            }
        }

        return `
            <div style="background:#ffffff; border:1px solid #d1d5db; border-radius:8px; padding:32px; box-shadow:0 4px 6px rgba(0,0,0,0.04); color:#111827; max-width:800px; margin:0 auto; font-family:'Courier New', Courier, monospace;" class="receipt-print-area">
                <div style="display:flex; justify-content:space-between; align-items:start; border-bottom:3px solid #111827; padding-bottom:16px;">
                    <div>
                        <h1 style="font-size:1.375rem; font-weight:900; margin:0; text-transform:uppercase; color:#111827; letter-spacing:0.5px;">COMEDK Counseling 2026</h1>
                        <span style="font-size:0.75rem; font-weight:bold; color:#4b5563;">VIRTUAL COUNSELING REPORT PORTAL</span>
                    </div>
                    <div style="text-align:right; font-size:0.75rem; font-weight:bold;">
                        <div>REF: ${docRef}</div>
                        <div style="color:#4b5563; font-size:0.688rem; margin-top:2px;">DATE: ${new Date().toLocaleDateString()}</div>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h3 style="font-size:0.813rem; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; font-weight:bold;">1. Candidate Credentials</h3>
                    <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; font-size:0.75rem; line-height:1.4;">
                        <div>Category: <strong>${state.category} ${state.isSupplementary ? '(Supplementary)' : ''}</strong></div>
                        ${state.trackMode !== 'architecture' ? `<div>Engineering Rank: <strong>${state.rank.toLocaleString()}</strong></div>` : ''}
                        ${state.trackMode !== 'engineering' ? `<div>B.Arch Rank: <strong>${state.barchRank.toLocaleString()}</strong></div>` : ''}
                        <div>KKR 371J Status: <strong>${state.kkrApproved ? 'Approved' : 'Not Approved/None'}</strong></div>
                    </div>
                </div>

                <div style="margin-top:20px;">
                    <h3 style="font-size:0.813rem; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; font-weight:bold;">2. Seat Allocation status</h3>
                    ${allotmentSummaryHtml}
                </div>

                <div style="margin-top:20px;">
                    <h3 style="font-size:0.813rem; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; font-weight:bold;">3. Transaction Summary</h3>
                    <table style="width:100%; font-size:0.72rem; text-align:left; border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid #111827;">
                                <th style="padding:4px 0;">Item Description</th>
                                <th style="padding:4px 0;">Transaction Status</th>
                                <th style="padding:4px 0; text-align:right;">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:6px 0;">Counseling Reservation Fee</td>
                                <td>${(state.feePaid || state.barchFeePaid) ? 'SUCCESS' : 'N/A'}</td>
                                <td style="padding:6px 0; text-align:right;">${(state.feePaid || state.barchFeePaid) ? '₹2,50,000.00' : '₹0.00'}</td>
                            </tr>
                            ${state.cancelled ? `
                                <tr>
                                    <td style="padding:6px 0;">Processing charge deduction</td>
                                    <td>SUCCESS</td>
                                    <td style="padding:6px 0; text-align:right; color:var(--dream-color);">-₹5,000.00</td>
                                </tr>
                            ` : ''}
                        </tbody>
                    </table>
                    
                    ${(state.feePaid || state.barchFeePaid) ? `
                        <div style="margin-top:10px; font-size:0.688rem; color:#4b5563; background:#f9fafb; padding:8px; border-radius:4px; border:1px solid #e5e7eb;">
                            UTR Clearance UTR: <strong>${utrNum}</strong><br>
                            Authorization Date: <strong>${dateStr}</strong>
                        </div>
                    ` : ''}
                </div>

                <div style="margin-top:20px;">
                    <h3 style="font-size:0.813rem; border-bottom:1px solid #e5e7eb; padding-bottom:4px; margin-bottom:8px; text-transform:uppercase; font-weight:bold;">4. Counseling Timeline Audit Logs</h3>
                    <div style="font-size:0.688rem; line-height:1.4; color:#374151;">
                        ${state.historyLog.map(log => `• ${log}<br>`).join('')}
                    </div>
                </div>

                <div style="margin-top:24px; border-top:1px dashed #111827; padding-top:12px; font-size:0.625rem; color:#4b5563; line-height:1.4;">
                    <strong>IMPORTANT INFORMATION:</strong> This document represents a counseling logic simulation. All calculations follow AICTE / COMEDK guidelines. Cutoff drifts simulate competitive variances.
                </div>
            </div>

            <!-- Print Trigger & Simulation Restart -->
            <div style="display:flex; justify-content:center; gap:16px; margin-top:24px;">
                <button onclick="window.print()" class="category-tab active" style="font-size:0.813rem; padding:10px 24px; border:none; background:var(--primary); color:white; font-weight:700;">📄 Print Report</button>
                <button onclick="Pages.Simulator.restart()" class="category-tab" style="font-size:0.813rem; padding:10px 20px;">🔄 Simulate Again</button>
            </div>
        `;
    }

    function setupEventListeners() {
        const simRank = document.getElementById('sim-rank');
        if (simRank) {
            simRank.addEventListener('change', (e) => {
                state.rank = parseInt(e.target.value) || 12000;
            });
        }

        const simCategory = document.getElementById('sim-category');
        if (simCategory) {
            simCategory.addEventListener('change', (e) => {
                state.category = e.target.value;
            });
        }

        const simBudget = document.getElementById('sim-budget');
        if (simBudget) {
            simBudget.addEventListener('change', (e) => {
                state.maxBudget = e.target.value ? parseFloat(e.target.value) : null;
            });
        }

        const simBarchRank = document.getElementById('sim-barch-rank');
        if (simBarchRank) {
            simBarchRank.addEventListener('change', (e) => {
                state.barchRank = parseInt(e.target.value) || 450;
            });
        }
    }

    return {
        init,
        render,
        toggleGate,
        toggleRuleDeclaration,
        setTrackMode,
        setCategory,
        setSupplementary,
        triggerSuppUpload,
        startSimulation,
        proceedSupplementaryToRound3,
        proceedToRound1,
        setDecisionVal,
        triggerPayment,
        openCancellationModal,
        submitRound2Waitlist,
        submitRound,
        goBackFromRound,
        restart,
        moveChoiceUp,
        moveChoiceDown,
        removeChoice,
        addChoiceFromSelect,
        handleListChange,
        goToStep: (stepName) => {
            state.step = stepName;
            render();
        }
    };
})();
