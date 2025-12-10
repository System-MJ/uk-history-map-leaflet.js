// -------------------------------------------------------
// INITIALISE MAP
// -------------------------------------------------------

const map = L.map('map').setView([52.5, -3.5], 7);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);


// -------------------------------------------------------
// LOAD GEOJSON (NEW processed file)
// -------------------------------------------------------

let siteLayer;

fetch("data/historic_sites.geojson")
    .then(r => r.json())
    .then(data => {
        siteLayer = L.geoJSON(data, {
            pointToLayer: pointIcon,
            onEachFeature: bindPopup
        }).addTo(map);

        filterByYear();
    });


// -------------------------------------------------------
// POINT ICONS BASED ON PERIOD
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
// POPUP CONTENT
// -------------------------------------------------------

function bindPopup(feature, layer) {
    const p = feature.properties;

    layer.bindPopup(`
        <strong>${p.Name || "Unnamed Site"}</strong><br>
        Type: ${p.SiteType}<br>
        Period: ${p.Period}<br>
        ${p.PeriodStart != null ? `Dates: ${p.PeriodStart} → ${p.PeriodEnd}` : ""}
    `);
}


// -------------------------------------------------------
// SLIDER HANDLING
// -------------------------------------------------------

const slider = document.getElementById("yearSlider");
const yearValue = document.getElementById("yearValue");

slider.addEventListener("input", filterByYear);

function filterByYear() {
    const year = parseInt(slider.value);
    yearValue.textContent = year;

    siteLayer.eachLayer(layer => {
        const p = layer.feature.properties;

        const start = p.PeriodStart;
        const end = p.PeriodEnd;

        // If no valid range, hide
        if (start === null || end === null) {
            layer.remove();
            return;
        }

        // Visible only if the site covers the selected year
        if (year >= start && year <= end) {
            layer.addTo(map);
        } else {
            layer.remove();
        }
    });
}
