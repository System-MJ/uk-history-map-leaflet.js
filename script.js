// -------------------------
// Base map setup
// -------------------------

// Create main map
const map = L.map('map').setView([54.5, -3], 6);  // UK centre

// OSM Standard
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Esri Satellite
const esriSat = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri'
    }
);

// Layer switcher
const baseMaps = {
    "OpenStreetMap": osm,
    "Esri Satellite": esriSat
};

L.control.layers(baseMaps).addTo(map);


// -------------------------
// Load historical data
// -------------------------

let historicalLayer;

fetch("data/sample.geojson")
    .then(response => response.json())
    .then(data => {
        historicalLayer = L.geoJSON(data, {
            onEachFeature: function (feature, layer) {
                let props = feature.properties;
                layer.bindPopup(`
                    <strong>${props.name}</strong><br>
                    Category: ${props.category}<br>
                    Built: ${props.year}
                `);
            }
        }).addTo(map);

        filterData();  // Apply initial filter
    });


// -------------------------
// Timeline + Filter Logic
// -------------------------

const yearSlider = document.getElementById("yearSlider");
const yearLabel = document.getElementById("yearLabel");
const categoryFilter = document.getElementById("categoryFilter");

yearSlider.oninput = () => {
    yearLabel.textContent = yearSlider.value;
    filterData();
};

categoryFilter.onchange = filterData;

function filterData() {
    if (!historicalLayer) return;

    const selectedYear = Number(yearSlider.value);
    const selectedCategory = categoryFilter.value;

    historicalLayer.eachLayer(layer => {
        const props = layer.feature.properties;

        const matchYear = props.year <= selectedYear;
        const matchCategory = (selectedCategory === "all" || props.category === selectedCategory);

        if (matchYear && matchCategory) {
            layer.addTo(map);
        } else {
            map.removeLayer(layer);
        }
    });
}
