// -------------------------------------------------------
// INITIALISE MAP
// -------------------------------------------------------

const map = L.map('map').setView([52.5, -3.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// -------------------------------------------------------
// LOAD GEOJSON DATA
// -------------------------------------------------------

let siteLayer;

fetch("data/historic_sites.geojson")
    .then(response => {
        if (!response.ok) {
            console.error("❌ GeoJSON failed to load:", response.status, response.statusText);
            alert("GeoJSON file not found.\nMake sure data/historic_sites.geojson exists in GitHub.");
            throw new Error("File not found");
        }
        return response.json();
    })
    .then(data => {
        console.log("✅ GeoJSON loaded:", data);

        siteLayer = L.geoJSON(data, {
            pointToLayer: pointIcon,
            onEachFeature: bindPopup
        }).addTo(map);

        filterByYear();
    })
    .catch(err => {
        console.error("❌ Error loading GeoJSON:", err);
    });


// -------------------------------------------------------
// ICONS
// -------------------------------------------------------

function pointIcon(feature, latlng) {
    const period = feature.properties.Period || "Unknown";

    const icon = L.icon({
        iconUrl: `icons/${period}.svg`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
    });

    return L.marker(latlng, { icon: icon });
}


// -------------------------------------------------------
// POPUPS
// -------------------------------------------------------

function bindPopup(feature, layer) {
    const p = feature.properties;

    layer.bindPopup(`
        <strong>${p.Name || "Unnamed site"}</strong><br>
        Type: ${p.SiteType}<br>
        Period: ${p.Period}<br>
        ${p.PeriodStart ? `Dates: ${p.PeriodStart} → ${p.PeriodEnd}` : ""}
    `);
}


// -------------------------------------------------------
// SLIDER FILTER
// -------------------------------------------------------

const slider = document.getElementById("yearSlider");
const yearValue = document.getElementById("yearValue");

slider.addEventListener("input", filterByYear);

function filterByYear() {
    if (!siteLayer) return;

    const year = parseInt(slider.value, 10);
    yearValue.textContent = year;

    siteLayer.eachLayer(layer => {
        const p = layer.feature.properties;

        const start = p.PeriodStart;
        const end = p.PeriodEnd;

        // Hide missing periods
        if (start == null || end == null) {
            layer.remove();
            return;
        }

        if (year >= start && year <= end) {
            layer.addTo(map);
        } else {
            layer.remove();
        }
    });
}
