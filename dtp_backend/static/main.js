let map;
let mainChart;
let currentMode = 'choropleth';
let currentType = 'dtp';
let geojsonData = null;
let windowRegionData = {};

const API_BASE = 'http://localhost:8000/api';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initMap();
        setupEventListeners();
        setTimeout(() => loadData(), 500);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        hideLoading();
        showError('Ошибка загрузки: ' + error.message);
    }
});

async function initMap() {
    map = L.map('map', {
        center: [64.0, 100.0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 10,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

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
                const response = await fetch(url, { timeout: 5000 });
                geojsonData = await response.json();
                renderMap();
                return;
            } catch (e) {
                continue;
            }
        }

        console.log('GeoJSON не загрузился ни с одного источника');
    } catch (error) {
        console.error('Ошибка загрузки GeoJSON:', error);
    }
}

async function loadData() {
    const month = document.getElementById('monthFilter').value;
    const year = document.getElementById('yearFilter').value;
    const region = document.getElementById('regionFilter').value;
    const category = document.getElementById('categoryFilter').value;

    try {
        const response = await fetch(`${API_BASE}/map/getMainMapData?month=${month}&year=${year}&region=${region}&category=${category}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        updateStats(data.stats);
        updateChart(data);

        if (data.regions) {
            windowRegionData = data.regions;
            if (geojsonData) {
                updateMapData(data.regions);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        loadTestData();
    }
}

function loadTestData() {
    const testData = {
        stats: {
            dtp: 6929,
            dead: 1187,
            injured: 8912
        },
        regions: generateRandomRegionData(),
        chart: {
            labels: ['ДТП', 'Погибло', 'Ранено'],
            data: [8500, 795, 10200]
        }
    };

    updateStats(testData.stats);
    updateChart(testData);
    windowRegionData = testData.regions;

    if (geojsonData) {
        updateMapData(testData.regions);
    }

    hideLoading();
}

function generateRandomRegionData() {
    const regions = {};
    const regionCodes = ['77', '78', '54', '66', '23', '16', '52', '74', '61', '34'];

    regionCodes.forEach(code => {
        regions[code] = {
            dtp: Math.floor(Math.random() * 500) + 50,
            dead: Math.floor(Math.random() * 50) + 5,
            injured: Math.floor(Math.random() * 400) + 40
        };
    });

    return regions;
}

function renderMap() {
    if (!geojsonData) return;

    map.eachLayer((layer) => {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });

    const geojsonLayer = L.geoJSON(geojsonData, {
        style: getRegionStyle,
        onEachFeature: onEachFeature
    }).addTo(map);

    map.fitBounds(geojsonLayer.getBounds());
}

function getRegionStyle(feature) {
    const regionCode = feature.properties.id || feature.properties.iso_3166_2 || feature.properties.code;
    const data = windowRegionData[regionCode] || { dtp: 0, dead: 0, injured: 0 };

    let value = 0;
    if (currentType === 'dtp') value = data.dtp;
    else if (currentType === 'dead') value = data.dead;
    else if (currentType === 'injured') value = data.injured;

    const color = getColorByValue(value);

    return {
        fillColor: color,
        weight: currentMode === 'choropleth' ? 1 : 0,
        opacity: 1,
        color: currentMode === 'choropleth' ? '#fff' : 'transparent',
        dashArray: currentMode === 'choropleth' ? '3' : '',
        fillOpacity: currentMode === 'choropleth' ? 0.7 : 0
    };
}

function getColorByValue(value) {
    if (value > 300) return '#ff0000';
    if (value > 200) return '#ff6b35';
    if (value > 100) return '#ffa502';
    if (value > 50) return '#7bed9f';
    return '#2ed573';
}

function onEachFeature(feature, layer) {
    const regionCode = feature.properties.id || feature.properties.iso_3166_2 || feature.properties.code || 'unknown';
    const regionName = feature.properties.name || feature.properties.admin || 'Регион';
    const data = windowRegionData[regionCode] || { dtp: 0, dead: 0, injured: 0 };

    const popupContent = `
        <div style="min-width: 150px; color: #000;">
            <h3 style="margin: 0 0 10px 0; font-size: 14px; border-bottom: 2px solid #ff6b35; padding-bottom: 5px;">
                ${regionName}
            </h3>
            <div style="font-size: 12px;">
                <div style="margin: 5px 0;">🚗 <strong>ДТП:</strong> ${data.dtp}</div>
                <div style="margin: 5px 0;">💀 <strong>Погибло:</strong> ${data.dead}</div>
                <div style="margin: 5px 0;">🏥 <strong>Ранено:</strong> ${data.injured}</div>
            </div>
        </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
        mouseover: function(e) {
            const layer = e.target;
            if (currentMode === 'choropleth') {
                layer.setStyle({
                    weight: 3,
                    color: '#ff6b35',
                    fillOpacity: 0.9
                });
            } else {
                addPointMarker(layer.getBounds().getCenter(), data);
            }
            layer.bringToFront();
        },
        mouseout: function(e) {
            const layer = e.target;
            if (currentMode === 'choropleth') {
                geojsonLayer.resetStyle(layer);
            }
        }
    });
}

function addPointMarker(center, data) {
    const intensity = data.dtp;
    let radius = 5;
    let color = '#2ed573';

    if (intensity > 300) { radius = 20; color = '#ff0000'; }
    else if (intensity > 200) { radius = 15; color = '#ff6b35'; }
    else if (intensity > 100) { radius = 10; color = '#ffa502'; }
    else if (intensity > 50) { radius = 7; color = '#7bed9f'; }

    L.circleMarker(center, {
        radius: radius,
        fillColor: color,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    }).addTo(map);
}

function updateMapData(regionsData) {
    windowRegionData = regionsData;
    if (geojsonData) {
        renderMap();
    }
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

    const start = 0;
    const duration = 1000;
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const value = Math.floor(start + (end - start) * progress);
        obj.innerHTML = value.toLocaleString('ru-RU');

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function updateChart(data) {
    const ctx = document.getElementById('mainChart');
    if (!ctx) return;

    const context = ctx.getContext('2d');

    if (mainChart) {
        mainChart.destroy();
    }

    const chartData = data.chart || {
        labels: ['ДТП', 'Погибло', 'Ранено'],
        data: [0, 0, 0]
    };

    mainChart = new Chart(context, {
        type: 'bar',
        data: {
            labels: chartData.labels || ['ДТП', 'Погибло', 'Ранено'],
            datasets: [{
                label: 'Статистика',
                data: chartData.data || [0, 0, 0],
                backgroundColor: [
                    'rgba(0, 184, 148, 0.8)',
                    'rgba(71, 85, 105, 0.8)',
                    'rgba(255, 165, 2, 0.8)'
                ],
                borderColor: [
                    'rgba(0, 184, 148, 1)',
                    'rgba(71, 85, 105, 1)',
                    'rgba(255, 165, 2, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ff6b35',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#8892b0'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#8892b0'
                    }
                }
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
            if (geojsonData) {
                renderMap();
            }
        });
    });

    document.querySelectorAll('.map-mode-btn[data-mode]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.map-mode-btn[data-mode]').forEach(b => b.classList.remove('active'));
            e.target.closest('.map-mode-btn').classList.add('active');
            currentMode = e.target.closest('.map-mode-btn').dataset.mode;
            if (geojsonData) {
                renderMap();
            }
        });
    });

    const applyBtn = document.getElementById('applyBtn');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            updatePeriodText();
            loadData();
        });
    }

    const monthFilter = document.getElementById('monthFilter');
    const yearFilter = document.getElementById('yearFilter');
    const categoryFilter = document.getElementById('categoryFilter');

    if (monthFilter) monthFilter.addEventListener('change', updatePeriodText);
    if (yearFilter) yearFilter.addEventListener('change', updatePeriodText);
    if (categoryFilter) categoryFilter.addEventListener('change', loadData);
}

function updatePeriodText() {
    const months = ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'];
    const monthSelect = document.getElementById('monthFilter');
    const yearSelect = document.getElementById('yearFilter');
    const periodText = document.getElementById('periodText');

    if (!monthSelect || !yearSelect || !periodText) return;

    const month = parseInt(monthSelect.value) - 1;
    const year = yearSelect.value;

    periodText.innerText = `${months[month]} ${year}`;
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.classList.add('hidden');
    }
}

function showError(message) {
    alert('Ошибка: ' + message);
    hideLoading();
}

async function exportData() {
    try {
        const response = await fetch(`${API_BASE}/export/all`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dtp_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        alert('Ошибка экспорта данных');
    }
}