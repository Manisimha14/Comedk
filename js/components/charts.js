/* ============================================
   Chart Components (Chart.js wrappers)
   ============================================ */

const Charts = (function () {
    const chartInstances = {};

    function destroyChart(id) {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
            delete chartInstances[id];
        }
    }

    function renderCutoffChart(canvasId, college) {
        destroyChart(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Build data points from available cutoffs
        const labels = [];
        const data = [];

        if (college.cutoff_2024_r4 !== null) {
            labels.push('2024 R4');
            data.push(college.cutoff_2024_r4);
        }
        if (college.cutoff_2025_r1 !== null) {
            labels.push('2025 R1');
            data.push(college.cutoff_2025_r1);
        }
        if (college.cutoff_2025_r3 !== null) {
            labels.push('2025 R3');
            data.push(college.cutoff_2025_r3);
        }
        if (college.cutoff_2025_r4 !== null) {
            labels.push('2025 R4');
            data.push(college.cutoff_2025_r4);
        }
        if (college.predicted_r1_2026_mid !== null) {
            labels.push('2026 R1*');
            data.push(college.predicted_r1_2026_mid);
        }
        if (college.predicted_r4_2026_mid !== null) {
            labels.push('2026 R4*');
            data.push(college.predicted_r4_2026_mid);
        }

        if (data.length < 2) return;

        // Student rank line
        const studentRankData = new Array(data.length).fill(AppData.getStudentProfile().rank);

        const gradient = ctx.createLinearGradient(0, 0, 0, 280);
        gradient.addColorStop(0, 'rgba(67, 97, 238, 0.2)');
        gradient.addColorStop(1, 'rgba(67, 97, 238, 0.01)');

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Cutoff Rank',
                        data: data,
                        borderColor: '#4361ee',
                        backgroundColor: gradient,
                        borderWidth: 2.5,
                        pointRadius: 5,
                        pointBackgroundColor: '#4361ee',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointHoverRadius: 7,
                        fill: true,
                        tension: 0.35,
                    },
                    {
                        label: `Your Rank (${AppData.getStudentProfile().rank.toLocaleString()})`,
                        data: studentRankData,
                        borderColor: '#ef4444',
                        borderWidth: 2,
                        borderDash: [8, 4],
                        pointRadius: 0,
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 16,
                            font: { family: "'Inter', sans-serif", size: 11, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        padding: 12,
                        cornerRadius: 10,
                        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif", size: 11 },
                        callbacks: {
                            label: function(ctx) {
                                return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                            color: '#94a3b8'
                        }
                    },
                    y: {
                        reverse: false,
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: {
                            font: { family: "'Inter', sans-serif", size: 11 },
                            color: '#94a3b8',
                            callback: val => val.toLocaleString()
                        },
                        title: {
                            display: true,
                            text: 'Cutoff Rank',
                            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }

    function renderRoiChart(canvasId, selectedColleges) {
        destroyChart(canvasId);
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const validColleges = selectedColleges.filter(c => c.fees && c.average_package);
        if (validColleges.length === 0) {
            canvas.style.display = 'none';
            return;
        }
        canvas.style.display = '';

        const datasets = validColleges.map((c, idx) => {
            const colors = [
                { border: '#4361ee', bg: 'rgba(67, 97, 238, 0.7)' },
                { border: '#10b981', bg: 'rgba(16, 185, 129, 0.7)' },
                { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.7)' },
                { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.7)' }
            ];
            const color = colors[idx % colors.length];

            return {
                label: `${c.college_code} (${c.average_package} LPA / ₹${c.fees}L)`,
                data: [{ x: c.fees, y: c.average_package }],
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 2,
                pointRadius: 10,
                pointHoverRadius: 12,
            };
        });

        chartInstances[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            font: { family: "'Inter', sans-serif", size: 11, weight: '500' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        padding: 12,
                        cornerRadius: 10,
                        titleFont: { family: "'Inter', sans-serif", size: 12, weight: '600' },
                        bodyFont: { family: "'Inter', sans-serif", size: 11 },
                        callbacks: {
                            title: (tooltipItems) => {
                                const datasetIndex = tooltipItems[0].datasetIndex;
                                const college = validColleges[datasetIndex];
                                return college.college_name;
                            },
                            label: (context) => {
                                const x = context.parsed.x;
                                const y = context.parsed.y;
                                return `Fees: ₹${x} Lakhs | Avg Package: ₹${y} LPA`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Total Fees (₹ Lakhs) — Lower is Better',
                            font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                            color: '#94a3b8'
                        },
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: { font: { family: "'Inter', sans-serif", size: 10 } }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Average Package (₹ LPA) — Higher is Better',
                            font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                            color: '#94a3b8'
                        },
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: { font: { family: "'Inter', sans-serif", size: 10 } }
                    }
                }
            }
        });
    }

    return { renderCutoffChart, destroyChart, renderRoiChart };
})();
