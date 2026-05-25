let map;
let mainChart;
let currentMode = 'choropleth';
let currentType = 'dtp';
let geojsonData = null;
let windowRegionData = {};
let geojsonLayer = null;
let selectedRegionCode = null;
let pointMarkers = []; // Храним точки, чтобы очищать при смене режима

const API_BASE = 'http://localhost:8000/api';

// Расширенная карта соответствия кодов и возможных названий в GeoJSON
const regionNameMap = {
    '77': ['Москва', 'г. Москва', 'Московская область', 'Moscow'],
    '78': ['Санкт-Петербург', 'г. Санкт-Петербург', 'Санкт-Петербург г.', 'Saint Petersburg'],
    '54': ['Новосибирская область', 'Новосибирская обл.'],
    '66': ['Свердловская область', 'Свердловская обл.'],
    '23': ['Краснодарский край'],
    '16': ['Татарстан', 'Республика Татарстан'],
    '52': ['Нижегородская область', 'Нижегородская обл.'],
    '74': ['Челябинская область', 'Челябинская обл.'],
    '61': ['Ростовская область', 'Ростовская обл.'],
    '34': ['Волгоградская область', 'Волгоградская обл.']
};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initMap();
        setupEventListeners();
        setTimeout(() => loadData(), 500);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        hideLoading();
    }
});

async function initMap() {
    map = L.map('map', {
        center: [64.0, 100.0], zoom: 3, minZoom: 2, maxZoom: 10,
        zoomControl: false, attributionControl: false
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    loadTestData();
    loadGeoJSON();
}

async function loadGeoJSON() {
    try {
        const urls = [
            'https://raw.githubusercontent.com/codeforgermany/click_that_hood/main/public/data/russia.geojson',
            'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/countries/Russia.geojson'
        ];
        for (const url of urls) {
            try {
                const res = await fetch(url);
                geojsonData = await res.json();
                renderMap();
                return;
            } catch (e) { continue; }
        }
    } catch (err) { console.error('GeoJSON ошибка:', err); }
}

function findRegionCode(featureName) {
    if (!featureName) return null;
    const cleanName = featureName.replace(/\s+/g, ' ').trim();
    for (const [code, names] of Object.entries(regionNameMap)) {
        if (names.some(n => cleanName.includes(n) || n.includes(cleanName))) {
            return code;
        }
    }
    return null;
}

async function loadData() {
    const month = document.getElementById('monthFilter').value;
    const year = document.getElementById('yearFilter').value;
    const region = document.getElementById('regionFilter').value;
    const category = document.getElementById('categoryFilter').value;

    selectedRegionCode = region === 'all' ? null : region;

    try {
        const res = await fetch(`${API_BASE}/map/getMainMapData?month=${month}&year=${year}&region=${region}&category=${category}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({})
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        updateStats(data.stats);
        updateChart(data);
        if (data.regions) {
            windowRegionData = data.regions;
            if (currentMode === 'points') renderPoints();
            else applyRegionStyles();
        }
    } catch (err) {
        console.error('Ошибка данных:', err);
        loadTestData();
    }
}

function loadTestData() {
    const testData = {
        stats: { dtp: 6929, dead: 1187, injured: 8912 },
        regions: {},
        chart: { labels: ['ДТП', 'Погибло', 'Ранено'], data: [8500, 795, 10200] }
    };
    Object.keys(regionNameMap).forEach(code => {
        testData.regions[code] = {
            dtp: Math.floor(Math.random() * 500) + 50,
            dead: Math.floor(Math.random() * 50) + 5,
            injured: Math.floor(Math.random() * 400) + 40
        };
    });
    updateStats(testData.stats);
    updateChart(testData);
    windowRegionData = testData.regions;
    if (currentMode === 'points') renderPoints();
    else applyRegionStyles();
    hideLoading();
}

function renderMap() {
    if (!geojsonData) return;
    clearPoints(); // Очищаем точки при перерисовке
    if (geojsonLayer) map.removeLayer(geojsonLayer);

    geojsonLayer = L.geoJSON(geojsonData, {
        style: getRegionStyle,
        onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());

    if (currentMode === 'points') {
        renderPoints();
    } else {
        applyRegionStyles();
    }
}

function getRegionStyle(feature) {
    const regionName = feature.properties.name || '';
    const regionCode = findRegionCode(regionName);
    const data = windowRegionData[regionCode] || { dtp: 0, dead: 0, injured: 0 };
    let value = currentType === 'dtp' ? data.dtp : currentType === 'dead' ? data.dead : data.injured;
    const isSelected = selectedRegionCode === regionCode;

    return {
        fillColor: isSelected ? '#6B7280' : getColorByValue(value),
        weight: 2, opacity: 1, color: '#ffffff', dashArray: '',
        fillOpacity: isSelected ? 0.9 : 0.65
    };
}

function applyRegionStyles() {
    if (!geojsonLayer) return;
    geojsonLayer.eachLayer(layer => {
        const name = layer.feature.properties.name || '';
        const code = findRegionCode(name);
        const data = windowRegionData[code] || { dtp: 0, dead: 0, injured: 0 };
        let value = currentType === 'dtp' ? data.dtp : currentType === 'dead' ? data.dead : data.injured;
        const isSelected = selectedRegionCode === code;

        layer.setStyle({
            fillColor: isSelected ? '#6B7280' : getColorByValue(value),
            fillOpacity: isSelected ? 0.9 : 0.65,
            weight: 2, color: '#ffffff'
        });
    });
}

function renderPoints() {
    clearPoints();
    if (!geojsonLayer) return;

    geojsonLayer.eachLayer(layer => {
        const feature = layer.feature;
        const name = feature.properties.name || '';
        const code = findRegionCode(name);
        const data = windowRegionData[code] || { dtp: 0, dead: 0, injured: 0 };

        if (code && data.dtp > 0) {
            try {
                const center = layer.getBounds().getCenter();
                const radius = Math.max(6, Math.min(30, data.dtp / 8));
                const color = getColorByValue(data.dtp);

                const marker = L.circleMarker(center, {
                    radius: radius, fillColor: color, color: '#fff',
                    weight: 1, opacity: 1, fillOpacity: 0.85
                }).addTo(map);

                marker.bindPopup(`<b>${name}</b><br>ДТП: ${data.dtp}<br>Погибло: ${data.dead}<br>Ранено: ${data.injured}`);
                pointMarkers.push(marker);
            } catch (e) { /* Пропускаем регионы без корректных границ */ }
        }
    });
}

function clearPoints() {
    pointMarkers.forEach(m => map.removeLayer(m));
    pointMarkers = [];
}

function getColorByValue(value) {
    if (value > 300) return '#ff0000';
    if (value > 200) return '#ff6b35';
    if (value > 100) return '#ffa502';
    if (value > 50) return '#7bed9f';
    return '#2ed573';
}

function onEachFeature(feature, layer) {
    const regionName = feature.properties.name || 'Регион';
    const regionCode = findRegionCode(regionName);
    const data = windowRegionData[regionCode] || { dtp: 0, dead: 0, injured: 0 };

    layer.bindPopup(`
        <div style="min-width: 150px; color: #000;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; border-bottom: 2px solid #ff6b35; padding-bottom: 5px;">${regionName}</h3>
            <div style="font-size: 12px;">
                <div>🚗 <strong>ДТП:</strong> ${data.dtp}</div>
                <div>💀 <strong>Погибло:</strong> ${data.dead}</div>
                <div> <strong>Ранено:</strong> ${data.injured}</div>
            </div>
        </div>
    `);

    layer.on({
        click: () => {
            if (regionCode) {
                document.getElementById('regionFilter').value = regionCode;
                selectedRegionCode = regionCode;
                loadData();
            }
        },
        mouseover: (e) => {
            if (currentMode === 'choropleth') {
                e.target.setStyle({ weight: 3, color: '#ff6b35', fillOpacity: 0.95 });
                e.target.bringToFront();
            }
        },
        mouseout: (e) => {
            if (currentMode === 'choropleth') {
                geojsonLayer.resetStyle(e.target);
                const name = e.target.feature.properties.name || '';
                const code = findRegionCode(name);
                if (selectedRegionCode === code) {
                    e.target.setStyle({ fillColor: '#6B7280', fillOpacity: 0.9, weight: 2, color: '#ffffff' });
                }
            }
        }
    });
}

function updateStats(stats) {
    if (!stats) return;
    animateValue('dtpCount', stats.dtp || 0);
    animateValue('deadCount', stats.dead || 0);
    animateValue('injuredCount', stats.injured || 0);
}

function animateValue(id, end) {
    const obj = document.getElementById(id);
    if (!obj) return;
    const start = 0, duration = 1000, startTime = performance.now();
    function update(currentTime) {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        obj.innerHTML = Math.floor(start + (end - start) * progress).toLocaleString('ru-RU');
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function updateChart(data) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;
    if (mainChart) mainChart.destroy();
    const chartData = data.chart || { labels: ['ДТП', 'Погибло', 'Ранено'], data: [0, 0, 0] };
    mainChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [{
                data: chartData.data,
                backgroundColor: ['rgba(0, 184, 148, 0.8)', 'rgba(71, 85, 105, 0.8)', 'rgba(255, 165, 2, 0.8)'],
                borderColor: ['rgba(0, 184, 148, 1)', 'rgba(71, 85, 105, 1)', 'rgba(255, 165, 2, 1)'],
                borderWidth: 2, borderRadius: 8
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#8892b0' } },
                x: { grid: { display: false }, ticks: { color: '#8892b0' } }
            }
        }
    });
}

function setupEventListeners() {
    document.querySelectorAll('.filter-btn[data-type]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn[data-type]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentType = e.target.dataset.type;
            if (currentMode === 'points') renderPoints();
            else applyRegionStyles();
        });
    });

    document.querySelectorAll('.map-mode-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.map-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
            e.target.closest('.map-mode-btn').classList.add('active');
            currentMode = e.target.closest('.map-mode-btn').dataset.mode;
            renderMap(); // Перерисовка карты с учётом режима
        });
    });

    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) applyBtn.addEventListener('click', () => { updatePeriodText(); loadData(); });

    const regionFilter = document.getElementById('regionFilter');
    if (regionFilter) {
        regionFilter.addEventListener('change', (e) => {
            selectedRegionCode = e.target.value === 'all' ? null : e.target.value;
            if (currentMode === 'points') renderPoints();
            else applyRegionStyles();
            loadData();
        });
    }

    ['monthFilter', 'yearFilter', 'categoryFilter'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => { if(id !== 'categoryFilter') updatePeriodText(); loadData(); });
    });
}

function updatePeriodText() {
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    const m = document.getElementById('monthFilter');
    const y = document.getElementById('yearFilter');
    const t = document.getElementById('periodText');
    if (m && y && t) t.innerText = `${months[parseInt(m.value)-1]} ${y.value}`;
}

function hideLoading() {
    const l = document.getElementById('loading');
    if (l) l.classList.add('hidden');
}

async function exportData() {
    try {
        const res = await fetch(`${API_BASE}/map/export/all`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `dtp_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    } catch (err) { console.error('Экспорт ошибка:', err); }
}
