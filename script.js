// --------------------------------------------------------
// Base map setup
// --------------------------------------------------------

const map = L.map('map').setView([52.5, -3.5], 7);

// OpenStreetMap base layer
const osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);

// Optional Esri satellite layer
const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
    }
);

// Layer control
L.control.layers(
    {
        'OpenStreetMap': osm,
        'Esri Satellite': esriSat
    },
    {},
    { position: 'topright' }
).addTo(map);

// --------------------------------------------------------
// Period colours & icons
// --------------------------------------------------------

const periodColors = {
    'Prehistoric': '#D4A017',
    'Bronze Age': '#B87333',
    'Iron Age': '#B86B00',
    'Early Medieval': '#C08A35',
    'Roman': '#B22222',
    'Medieval': '#1E3A8A',
    'Post-Medieval': '#4B1D5A',
    'Unknown': '#555555'
};

// Period icons for legend (time periods, not site types)
const periodIcons = {
    'Prehistoric': 'icons/stonehenge-svgrepo-com.svg',
    'Bronze Age': null, // circle only for now
    'Iron Age': 'icons/Triskele-Symbol-spiral.svg',
    'Early Medieval': 'icons/helmet-svgrepo-com.svg',
    'Roman': 'icons/helmet-roman-svgrepo-com.svg',
    'Medieval': 'icons/medieval-knight-svgrepo-com.svg',
    'Post-Medieval': 'icons/fleur-de-lis-1-svgrepo-com.svg'
};

// Site-type icons (used on the markers)
const typeIcons = {
    'Fortification': 'icons/castle-svgrepo-com.svg',
    'Religious Site': 'icons/celtic-cross-1-svgrepo-com.svg',
    'Settlement': 'icons/home-svgrepo-com.svg'
    // Barrow, Standing Stone(s), Burial, Coin Hoard → hollow circle for now
};

// --------------------------------------------------------
// Sliders & filter controls
// --------------------------------------------------------

// These must exist in your HTML
const yearMinSlider = document.getElementById('yearMinSlider');
const yearMaxSlider = document.getElementById('yearMaxSlider');
const yearRangeLabel = document.getElementById('yearRangeLabel');
const resetYearRangeBtn = document.getElementById('resetYearRangeBtn');

const periodChecks = document.querySelectorAll('.periodCheck');
const groupChecks = document.querySelectorAll('.groupCheck');

// Choose global time bounds (matches HTML min/max)
const GLOBAL_MIN_YEAR = -4000;
const GLOBAL_MAX_YEAR = 2025;

// keep sliders valid and update label
function updateYearRange() {
    let minVal = Number(yearMinSlider.value);
    let maxVal = Number(yearMaxSlider.value);

    // ensure min <= max (swap if crossed)
    if (minVal > maxVal) {
        const tmp = minVal;
        minVal = maxVal;
        maxVal = tmp;
        yearMinSlider.value = minVal;
        yearMaxSlider.value = maxVal;
    }

    yearRangeLabel.textContent = `${minVal} – ${maxVal}`;
    filterData();
}

// reset to full range
function resetYearRange() {
    yearMinSlider.value = GLOBAL_MIN_YEAR;
    yearMaxSlider.value = GLOBAL_MAX_YEAR;
    updateYearRange();
}

// attach events
if (yearMinSlider && yearMaxSlider) {
    yearMinSlider.addEventListener('input', updateYearRange);
    yearMaxSlider.addEventListener('input', updateYearRange);
}
if (resetYearRangeBtn) {
    resetYearRangeBtn.addEventListener('click', resetYearRange);
}

periodChecks.forEach(cb => cb.addEventListener('change', filterData));
groupChecks.forEach(cb => cb.addEventListener('change', filterData));

// initialise label
if (yearMinSlider && yearMaxSlider) {
    resetYearRange();
}

// --------------------------------------------------------
// Load GeoJSON (enhanced Cadw dataset)
// --------------------------------------------------------

let siteLayer = null;

fetch('data/historic_sites.geojson') // this should be your cadw_sam_enhanced.geojson renamed
    .then(r => r.json())
    .then(data => {
        siteLayer = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => createMarker(feature, latlng),
            onEachFeature: onEachSite
        }).addTo(map);

        buildLegend();
        filterData(); // initial filter
    })
    .catch(err => {
        console.error('Error loading GeoJSON:', err);
    });

// --------------------------------------------------------
// Marker creation & popups
// --------------------------------------------------------

function createMarker(feature, latlng) {
    const p = feature.properties || {};

    const derivedPeriod = p.derived_period || p.period || 'Unknown';
    const group = p.feature_group || null;

    const color = periodColors[derivedPeriod] || periodColors['Unknown'];
    const iconUrl = typeIcons[group] || null;

    const hasIcon = !!iconUrl;
    const html =
        `<div class="marker-circle" style="border-color:${color};">
            ${hasIcon ? `<img src="${iconUrl}" class="marker-icon" />` : ''}
        </div>`;

    const className = 'custom-marker' + (hasIcon ? '' : ' hollow');

    const divIcon = L.divIcon({
        className: className,
        html: html,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });

    return L.marker(latlng, { icon: divIcon });
}

function onEachSite(feature, layer) {
    const p = feature.properties || {};

    const name = p.name || 'Unnamed site';
    const group = p.feature_group || 'Unknown group';
    const type = p.feature_type || '';
    const period = p.derived_period || p.period || 'Unknown period';

    const start = (typeof p.start_year === 'number') ? p.start_year : null;
    const end = (typeof p.end_year === 'number') ? p.end_year : null;
    const mid = (typeof p.mid_year === 'number') ? p.mid_year : null;

    let dateLine = 'Date: unknown';
    if (start !== null && end !== null) {
        dateLine = `Date range: ${start} – ${end}`;
    } else if (mid !== null) {
        dateLine = `Approx. date: ${mid}`;
    }

    let html = `<strong>${name}</strong><br>`;
    html += `${group}`;
    if (type) html += ` – ${type}`;
    html += `<br>${period}<br>${dateLine}`;

    if (p.sam_number) {
        html += `<br>SAM: ${p.sam_number}`;
    }
    if (p.report_url) {
        html += `<br><a href="${p.report_url}" target="_blank" rel="noopener">Cadw record</a>`;
    }

    layer.bindPopup(html);
}

// --------------------------------------------------------
// Filtering with dual slider (start_year–end_year range)
// --------------------------------------------------------

function filterData() {
    if (!siteLayer) return;

    const minYear = yearMinSlider ? Number(yearMinSlider.value) : GLOBAL_MIN_YEAR;
    const maxYear = yearMaxSlider ? Number(yearMaxSlider.value) : GLOBAL_MAX_YEAR;

    const activePeriods = Array.from(periodChecks)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const activeGroups = Array.from(groupChecks)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    siteLayer.eachLayer(layer => {
        const p = layer.feature.properties || {};

        const period = p.derived_period || p.period || 'Unknown';
        const group = p.feature_group || null;

        const start = (typeof p.start_year === 'number') ? p.start_year : null;
        const end = (typeof p.end_year === 'number') ? p.end_year : null;
        const mid = (typeof p.mid_year === 'number') ? p.mid_year : null;

        let matchYear = false;

        // Priority 1 — full range: [start_year, end_year] overlaps [minYear, maxYear]
        if (start !== null && end !== null) {
            const overlaps = (end >= minYear) && (start <= maxYear);
            matchYear = overlaps;
        }
        // Priority 2 — only mid_year known
        else if (mid !== null) {
            matchYear = (mid >= minYear && mid <= maxYear);
        }
        // Priority 3 — no date data: show by default (change to false to hide)
        else {
            matchYear = true;
        }

        const matchPeriod =
            activePeriods.length === 0 || activePeriods.includes(period);
        const matchGroup =
            activeGroups.length === 0 || activeGroups.includes(group);

        if (matchYear && matchPeriod && matchGroup) {
            layer.addTo(map);
        } else {
            map.removeLayer(layer);
        }
    });
}

// --------------------------------------------------------
// Legend for time periods
// --------------------------------------------------------

function buildLegend() {
    const legend = document.getElementById('legend');
    if (!legend) return;

    legend.innerHTML = '<strong>Time Periods</strong><br>';

    Object.keys(periodColors).forEach(period => {
        if (period === 'Unknown') return; // optional: skip Unknown in legend

        const color = periodColors[period];
        const iconSrc = periodIcons[period];

        const row = document.createElement('div');
        row.className = 'legend-row';

        const marker = document.createElement('div');
        marker.className = 'legend-marker';
        marker.style.borderColor = color;

        if (iconSrc) {
            const img = document.createElement('img');
            img.src = iconSrc;
            img.alt = period;
            marker.appendChild(img);
        }

        const label = document.createTextNode(period);

        row.appendChild(marker);
        row.appendChild(label);
        legend.appendChild(row);
    });
}
