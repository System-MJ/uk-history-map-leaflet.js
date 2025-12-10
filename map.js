const map = L.map('map').setView([52.5, -3.5], 7);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap'}).addTo(map);

let siteLayer;

fetch("data/historic_sites.geojson")
  .then(r=>{if(!r.ok){console.error("GeoJSON load failed"); throw new Error("Missing");} return r.json();})
  .then(data=>{
      siteLayer=L.geoJSON(data).addTo(map);
      filterByYear();
  })
  .catch(e=>console.error(e));

const slider=document.getElementById("yearSlider");
const yearValue=document.getElementById("yearValue");
slider.addEventListener("input",filterByYear);

function filterByYear(){
    if(!siteLayer) return;
    const year=parseInt(slider.value);
    yearValue.textContent=year;
    siteLayer.eachLayer(layer=>{
        const p=layer.feature.properties;
        if(p.PeriodStart==null||p.PeriodEnd==null){layer.remove(); return;}
        if(year>=p.PeriodStart && year<=p.PeriodEnd){layer.addTo(map);} else {layer.remove();}
    });
}
