// --------------------------------------------------------
// Base map
// --------------------------------------------------------

const map = L.map('map').setView([54.5, -3], 6);

// OSM base map
const osm = L.tileLayer(
    'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }
).addTo(map);

// Esri Satellite (optional)
const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
    }
);

// Layer switcher
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
    'Bronze Age': '#B87333',      // copper/bronze
    'Iron Age': '#B86B00',
    'Early Medieval': '#C08A35',
    'Roman': '#B22222',
    'Medieval': '#1E3A8A',
    'Post-Medieval': '#4B1D5A'
};

// Period icons for legend / future UI.
// Bronze Age has no agreed SVG yet → circle only in legend.
const periodIcons = {
    'Prehistoric': 'icons/stonehenge-svgrepo-com.svg',
    'Iron Age': 'icons/Triskele-Symbol-spiral.svg',
    'Early Medieval': 'icons/helmet-svgrepo-com.svg',
    'Roman': 'icons/helmet-roman-svgrepo-com.svg',
    'Medieval': 'icons/medieval-knight-svgrepo-com.svg',
    'Post-Medieval': 'icons/fleur-de-lis-1-svgrepo-com.svg'
};

// Site-type icons (used on the map for some feature groups)
const typeIcons = {
    'Fortification': 'icons/castle-svgrepo-com.svg',          // castles / forts
    'Religious Site': 'icons/celtic-cross-1-svgrepo-com.svg', // churches, abbeys etc.
    'Settlement': 'icons/home-svgrepo-com.svg'                // villas, villages, manors
    // Barrow, Standing Stone(s), Burial, Coin Hoard → hollow circle for now
};

// --------------------------------------------------------
// Period engine: derive period from year (with fallback)
// --------------------------------------------------------

function getPeriodFromYear(year) {
    if (typeof year !== 'number' || isNaN(year)) return null;

    if (year < -2500) return 'Prehistoric';
    if (year >= -2500 && year < -800) return 'Bronze Age';
    if (year >= -800 && year < 43) return 'Iron Age';
    if (year >= 43 && year < 410) return 'Roman';
    if (year >= 410 && year < 1066) return 'Early Medieval';
    if (year >= 1066 && year < 1500) return 'Medieval';
    // everything after 1500 goes into Post-Medieval for now
    return 'Post-Medieval';
}

// Prefer year-based period; fall back to properties.period if needed
function derivePeriod(props) {
    const hasNumericYear = typeof props.year === 'number' && !isNaN(props.year);
    if (hasNumericYear) {
        const p = getPeriodFromYear(props.year);
        if (p) return p;
    }
    return props.period || 'Unknown';
}

// --------------------------------------------------------
// Load GeoJSON
// --------------------------------------------------------

let siteLayer = null;

fetch('data/cadw_scheduled_monuments_points.geojson')
    .then(r => r.json())
    .then(data => {
        siteLayer = L.geoJSON(data, {
            pointToLayer: (feature, latlng) => makeMarker(feature, latlng),
            onEachFeature: onEachSite
        }).addTo(map);

        buildLegend();
        filterData(); // initial filter
    });

// Create a divIcon marker for each feature
function makeMarker(feature, latlng) {
    const p = feature.properties || {};
    const derivedPeriod = derivePeriod(p);
    const group = p.feature_group || null;

    const color = periodColors[derivedPeriod] || '#000000';
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

// Popups
function onEachSite(feature, layer) {
    const p = feature.properties || {};
    const name = p.name || 'Unnamed site';
    const group = p.feature_group || 'Unknown group';
    const type = p.feature_type || '';
    const derivedPeriod = derivePeriod(p);
    const year = (typeof p.year === 'number' && !isNaN(p.year)) ? p.year : 'Unknown';

    let html = `<strong>${name}</strong><br>`;
    html += `${group}`;
    if (type) html += ` – ${type}`;
    html += `<br>${derivedPeriod}`;
    html += `<br>Year: ${year}`;

    layer.bindPopup(html);
}

// --------------------------------------------------------
// Filters (slider + checkboxes)
// --------------------------------------------------------

const yearSlider = document.getElementById('yearSlider');
const yearLabel = document.getElementById('yearLabel');
const periodChecks = document.querySelectorAll('.periodCheck');
const groupChecks = document.querySelectorAll('.groupCheck');

yearSlider.addEventListener('input', () => {
    filterData();
});

periodChecks.forEach(cb => cb.addEventListener('change', filterData));
groupChecks.forEach(cb => cb.addEventListener('change', filterData));

function filterData() {
    if (!siteLayer) return;

    const selectedYear = Number(yearSlider.value);
    yearLabel.textContent = selectedYear;

    const activePeriods = Array.from(periodChecks)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const activeGroups = Array.from(groupChecks)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    siteLayer.eachLayer(layer => {
        const p = layer.feature.properties || {};
        const derivedPeriod = derivePeriod(p);
        const group = p.feature_group || null;
        const year = (typeof p.year === 'number' && !isNaN(p.year)) ? p.year : null;

        const matchYear = (year === null) ? true : year <= selectedYear;
        const matchPeriod = activePeriods.length === 0 || activePeriods.includes(derivedPeriod);
        const matchGroup = activeGroups.length === 0 || activeGroups.includes(group);

        if (matchYear && matchPeriod && matchGroup) {
            layer.addTo(map);
        } else {
            layer.removeFrom(map);
        }
    });
}

// --------------------------------------------------------
// Legend (uses period SVGs where available)
// --------------------------------------------------------

function buildLegend() {
    const legend = document.getElementById('legend');
    legend.innerHTML = '<strong>Time Periods</strong><br>';

    Object.entries(periodColors).forEach(([period, color]) => {
        const row = document.createElement('div');
        row.className = 'legend-row';

        const marker = document.createElement('div');
        marker.className = 'legend-marker';
        marker.style.borderColor = color;

        const iconSrc = periodIcons[period];
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
