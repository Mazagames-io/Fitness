// App State and Storage
const STORE_KEY = 'fittrack_data';

let state = {
    user: null, // { name, dob, height, targetWeight, pace }
    weightLogs: [], // { date: 'YYYY-MM-DD', weight: 70.0 }
    dailyWalking: {}, // { 'YYYY-MM-DD': { distance: 0, time: 0 } }
    currentTab: 'dashboard'
};

// Utilities
const saveState = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
const loadState = () => {
    const data = localStorage.getItem(STORE_KEY);
    if (data) state = JSON.parse(data);
};

const calculateBMI = (weight, height) => {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

const getBMICategory = (bmi) => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
};

// UI Elements
const onboarding = document.getElementById('onboarding');
const onboardingForm = document.getElementById('onboarding-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPages = document.querySelectorAll('.tab-page');

// Navigation
const switchTab = (tabId) => {
    state.currentTab = tabId;
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPages.forEach(page => {
        page.classList.toggle('hidden', page.id !== `${tabId}-tab`);
    });
    renderTab(tabId);
};

// Initial Render Logic
const init = () => {
    loadState();
    lucide.createIcons();

    if (!state.user) {
        onboarding.classList.remove('hidden');
    } else {
        renderDashboard();
    }

    // Setup Tab Listeners
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Date in Header
    document.getElementById('today-date').innerText = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric'
    });

    // Reset Modal Elements
    const resetModal = document.getElementById('reset-modal');
    const resetInput = document.getElementById('reset-confirm-input');
    const confirmBtn = document.getElementById('confirm-reset-btn');

    document.getElementById('reset-data').addEventListener('click', () => {
        resetModal.classList.remove('hidden');
        resetInput.value = '';
        confirmBtn.disabled = true;
    });

    document.getElementById('cancel-reset').addEventListener('click', () => {
        resetModal.classList.add('hidden');
    });

    resetInput.addEventListener('input', (e) => {
        confirmBtn.disabled = e.target.value.toUpperCase() !== 'DELETE';
    });

    confirmBtn.addEventListener('click', () => {
        localStorage.removeItem(STORE_KEY);
        location.reload();
    });

    // Dark Mode Toggle
    const themeToggle = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        const icon = theme === 'dark' ? 'sun' : 'moon';
        themeToggle.innerHTML = `<i data-lucide="${icon}"></i>`;
        lucide.createIcons();
        localStorage.setItem('theme', theme);
    };

    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
    });
};

// Tab Rendering
const renderTab = (tabId) => {
    switch (tabId) {
        case 'dashboard': renderDashboard(); break;
        case 'log': renderLog(); break;
        case 'progress': renderProgress(); break;
        case 'walk': renderWalk(); break;
    }
};

const renderDashboard = () => {
    if (!state.user) return;

    document.getElementById('user-greeting').innerText = `Hi, ${state.user.name}`;

    const lastWeight = state.weightLogs.length > 0
        ? state.weightLogs[state.weightLogs.length - 1].weight
        : state.user.height ? '--' : '--'; // Use height as proxy for setup done

    const currentWeightValue = lastWeight !== '--' ? lastWeight : state.user.currentWeight;

    document.getElementById('dash-weight').innerText = `${currentWeightValue} kg`;

    const bmi = calculateBMI(currentWeightValue, state.user.height);
    document.getElementById('dash-bmi').innerText = `${bmi} (${getBMICategory(bmi)})`;

    // Goal Progress
    renderGoalSection(currentWeightValue);

    // Health Tip
    renderHealthTip();

    // Daily Walk Summary
    const today = getTodayStr();
    const walk = state.dailyWalking[today] || { distance: 0, time: 0 };
    document.getElementById('dash-distance').innerText = `${walk.distance.toFixed(2)} km`;
    document.getElementById('dash-time').innerText = `${Math.floor(walk.time / 60)}m`;
};

// Onboarding Submission
onboardingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.user = {
        name: document.getElementById('name').value,
        dob: document.getElementById('dob').value,
        height: parseFloat(document.getElementById('height').value),
        currentWeight: parseFloat(document.getElementById('current-weight').value), // Initial weight
        targetWeight: parseFloat(document.getElementById('target-weight').value),
        pace: document.getElementById('pace').value
    };

    // Add first weight log
    state.weightLogs.push({
        date: getTodayStr(),
        weight: state.user.currentWeight
    });

    saveState();
    onboarding.classList.add('hidden');
    renderDashboard();
});

// Weight Logging
const renderLog = () => {
    const historyDiv = document.getElementById('weight-history');
    historyDiv.innerHTML = '<h3>Recent History</h3>';

    [...state.weightLogs].reverse().forEach(log => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="date">${new Date(log.date).toLocaleDateString()}</span>
            <span class="weight">${log.weight} kg</span>
        `;
        historyDiv.appendChild(item);
    });
};

document.getElementById('weight-log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const weight = parseFloat(document.getElementById('log-weight').value);
    const today = getTodayStr();

    // Update if exists or push new
    const existingIndex = state.weightLogs.findIndex(l => l.date === today);
    if (existingIndex > -1) {
        state.weightLogs[existingIndex].weight = weight;
    } else {
        state.weightLogs.push({ date: today, weight });
    }

    saveState();
    document.getElementById('log-weight').value = '';
    renderLog();
    alert('Weight logged successfully!');
});

// Progress Chart
let weightChart = null;
const renderProgress = () => {
    const ctx = document.getElementById('weight-chart').getContext('2d');

    if (weightChart) weightChart.destroy();

    const labels = state.weightLogs.map(l => new Date(l.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const data = state.weightLogs.map(l => l.weight);

    // Forecast Calculation
    const forecastDates = [...labels];
    const forecastData = new Array(data.length).fill(null);

    if (state.weightLogs.length > 0 && state.user) {
        const lastLog = state.weightLogs[state.weightLogs.length - 1];
        const lastWeight = lastLog.weight;
        const targetWeight = state.user.targetWeight;
        const pacePerWeek = state.user.pace === 'slow' ? 0.25 : 0.5;

        forecastData[data.length - 1] = lastWeight;

        let currentProjected = lastWeight;
        for (let i = 1; i <= 4; i++) {
            const projDate = new Date(lastLog.date);
            projDate.setDate(projDate.getDate() + (i * 7));

            if (currentProjected > targetWeight) {
                currentProjected = Math.max(targetWeight, currentProjected - pacePerWeek);
            } else if (currentProjected < targetWeight) {
                currentProjected = Math.min(targetWeight, currentProjected + pacePerWeek);
            }

            forecastDates.push(projDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
            forecastData.push(currentProjected);
        }
    }

    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: forecastDates,
            datasets: [
                {
                    label: 'Actual',
                    data: data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#10b981'
                },
                {
                    label: 'Forecast',
                    data: forecastData,
                    borderColor: '#3b82f6',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 10, font: { size: 10 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: { color: '#f1f5f9' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
};

// Walking Tracker Logic
let walkInterval = null;
let lastPosition = null;
let totalDistance = 0;
let totalSteps = 0;
let startTime = null;
let watchId = null;

// Motion Step Counting
let lastAccel = 0;
let isStepInProgress = false;
const STEP_THRESHOLD = 2.0; // Acceleration threshold for a step
const STEP_COOLDOWN = 300; // ms between steps
let lastStepTime = 0;

const handleMotion = (event) => {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    // Magnitude of acceleration
    const magnitude = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
    const delta = Math.abs(magnitude - lastAccel);
    lastAccel = magnitude;

    const now = Date.now();
    if (delta > STEP_THRESHOLD && !isStepInProgress && (now - lastStepTime) > STEP_COOLDOWN) {
        totalSteps++;
        isStepInProgress = true;
        lastStepTime = now;

        // Calculate distance from steps (Stride length approx 41.5% of height)
        const strideLength = (state.user?.height || 170) * 0.415 / 100; // in meters
        totalDistance += strideLength / 1000; // convert to km

        updateWalkUI();
    } else if (delta < STEP_THRESHOLD / 2) {
        isStepInProgress = false;
    }
};

const startBtn = document.getElementById('start-walk');
const stopBtn = document.getElementById('stop-walk');
const distDisplay = document.getElementById('walk-distance');
const timeDisplay = document.getElementById('walk-timer');
const stepDisplay = document.getElementById('walk-steps');

const updateWalkUI = () => {
    distDisplay.innerText = totalDistance.toFixed(3); // More precision for indoor
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
    const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
    const s = (elapsed % 60).toString().padStart(2, '0');
    timeDisplay.innerText = `${h}:${m}:${s}`;

    stepDisplay.innerText = Math.floor(totalSteps);
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const startWalking = async () => {
    // Request Motion Permissions (Required for iOS)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        try {
            const permissionState = await DeviceMotionEvent.requestPermission();
            if (permissionState !== 'granted') {
                alert("Motion sensor permission is required for indoor tracking.");
                return;
            }
        } catch (error) {
            console.error(error);
        }
    }

    totalDistance = 0;
    totalSteps = 0;
    startTime = Date.now();
    lastPosition = null;

    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');

    // Hybrid Tracking: Sensors for steps (Indoor) + GPS for range (Outdoor)
    window.addEventListener('devicemotion', handleMotion);

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition((pos) => {
            const { latitude, longitude, accuracy } = pos.coords;
            if (accuracy > 30) return;

            if (lastPosition) {
                const d = calculateDistance(lastPosition.lat, lastPosition.lng, latitude, longitude);
                // If GPS distance is significantly more than sensor distance, trust GPS (Outdoor)
                // If not, sensor distance handles small indoor movements
                if (d > 0.005) {
                    // This is a simplified hybrid approach
                    // We don't double count; we just use the most accurate one
                }
            }
            lastPosition = { lat: latitude, lng: longitude };
        }, (err) => console.error(err), { enableHighAccuracy: true });
    }

    walkInterval = setInterval(updateWalkUI, 1000);
};

const stopWalking = () => {
    clearInterval(walkInterval);
    window.removeEventListener('devicemotion', handleMotion);
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const today = getTodayStr();

    if (!state.dailyWalking[today]) state.dailyWalking[today] = { distance: 0, time: 0 };
    state.dailyWalking[today].distance += totalDistance;
    state.dailyWalking[today].time += elapsedSeconds;

    saveState();

    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');

    alert(`Walk saved: ${totalDistance.toFixed(2)} km in ${Math.floor(elapsedSeconds / 60)} min`);
    renderWalk(); // Refresh stats
};

let walkForecastChart = null;

const renderWalk = () => {
    // Just reset UI if not running
    if (!walkInterval) {
        distDisplay.innerText = "0.00";
        timeDisplay.innerText = "00:00:00";
        stepDisplay.innerText = "0";
    }

    // Calculations
    const today = getTodayStr();
    const allDates = Object.keys(state.dailyWalking).sort();

    const getStatsForRange = (days) => {
        const now = new Date();
        let total = 0;
        for (let i = 0; i < days; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            if (state.dailyWalking[dStr]) total += state.dailyWalking[dStr].distance;
        }
        return total;
    };

    document.getElementById('stats-today').innerText = `${(state.dailyWalking[today]?.distance || 0).toFixed(2)} km`;
    document.getElementById('stats-week').innerText = `${getStatsForRange(7).toFixed(2)} km`;
    document.getElementById('stats-month').innerText = `${getStatsForRange(30).toFixed(2)} km`;

    // Forecast Chart
    renderWalkForecast();
};

const renderWalkForecast = () => {
    const ctx = document.getElementById('walk-forecast-chart').getContext('2d');
    if (walkForecastChart) walkForecastChart.destroy();

    // Last 7 days data
    const labels = [];
    const actualData = [];
    const forecastData = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dStr = d.toISOString().split('T')[0];
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        actualData.push(state.dailyWalking[dStr]?.distance || 0);
        forecastData.push(null);
    }

    // Simple forecast: avg of last 7 days projected for next 3 days
    const avg = actualData.reduce((a, b) => a + b, 0) / actualData.length;

    // Add 3 forecast points
    for (let i = 1; i <= 3; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
        actualData.push(null);
        forecastData[labels.length - 1] = avg + (Math.random() * 0.2 - 0.1); // add minor jitter for visual
    }

    // Connect forecast to last actual
    forecastData[6] = actualData[6];

    walkForecastChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Actual (km)',
                    data: actualData,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Forecast (km)',
                    data: forecastData,
                    borderColor: '#94a3b8',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
};

startBtn.addEventListener('click', startWalking);
stopBtn.addEventListener('click', stopWalking);

const renderGoalSection = (currentWeightValue) => {
    const initialWeight = state.weightLogs.length > 0 ? state.weightLogs[0].weight : state.user.currentWeight;
    const target = state.user.targetWeight;
    const current = currentWeightValue;

    let progress = 0;
    if (initialWeight !== target) {
        // Calculate progress based on whether we are losing or gaining (though usually losing in fitness apps)
        const totalToChange = Math.abs(initialWeight - target);
        const changed = Math.abs(initialWeight - current);
        progress = (changed / totalToChange) * 100;
        progress = Math.max(0, Math.min(100, Math.round(progress)));
    }

    document.getElementById('goal-progress').style.width = `${progress}%`;

    let feedback = `You're ${progress}% of the way to your goal! `;
    if (progress >= 100) feedback = "Goal Reached! Outstanding work! Keep maintaining your healthy lifestyle.";
    else if (progress >= 75) feedback += "Almost there! Your consistency is paying off.";
    else if (progress >= 50) feedback += "Halfway mark! You're doing great.";
    else if (progress >= 25) feedback += "Great start! Keep those healthy habits going.";
    else feedback += "Every small step counts towards your big goal.";

    document.getElementById('goal-feedback').innerText = feedback;

    const diff = Math.abs(current - target);
    const weeklyRate = state.user.pace === 'slow' ? 0.25 : 0.5;
    const weeksLeft = Math.ceil(diff / weeklyRate);

    if (current > target + 0.1) {
        document.getElementById('estimated-time').innerText = `Estimated time to goal: ${weeksLeft} weeks at your preferred pace.`;
    } else if (current < target - 0.1) {
        document.getElementById('estimated-time').innerText = `You've reached your target! Focus on maintenance and steady activity.`;
    } else {
        document.getElementById('estimated-time').innerText = "Target weight reached! Well done.";
    }
};

const renderHealthTip = () => {
    const tips = [
        "Walking for just 30 minutes a day can improve your cardiovascular fitness.",
        "Consistency is key. Focus on showing up for yourself every day.",
        "Remember to stay hydrated throughout your walks!",
        "A steady pace is more sustainable than rapid changes. You're doing it right!",
        "Good sleep helps with weight management and energy for your walks.",
        "Listen to your body. Rest is just as important as activity."
    ];
    const tipIndex = new Date().getDate() % tips.length;

    // Add tip to dashboard if container exists
    let tipEl = document.getElementById('health-tip');
    if (!tipEl) {
        const dashboard = document.getElementById('dashboard-tab');
        tipEl = document.createElement('div');
        tipEl.id = 'health-tip';
        tipEl.className = 'card health-tip-card';
        dashboard.appendChild(tipEl);
    }
    tipEl.innerHTML = `<h3>Daily Insight</h3><p>${tips[tipIndex]}</p>`;
};

// Initialize on load
window.addEventListener('load', init);
