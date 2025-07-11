let map;
let geoJsonLayer;
let top5 = [];
let bottom6 = [];

// Utility functions
function getColor(rank) {
  return rank <= 20 ? "#1b4e4f"
    : rank <= 40 ? "#2a6d5e"
    : rank <= 60 ? "#3f816b"
    : rank <= 80 ? "#5c9a79"
    : rank <= 100 ? "#7ab18a"
    : rank <= 120 ? "#9cc8a1"
    : rank <= 140 ? "#c1d9c0"
    : "#dddddd";
}

function populateDropdown(data) {
  const dropdown = document.getElementById("neighbourhood-dropdown");
  dropdown.innerHTML = "";
  data.features.sort((a, b) => a.properties.AREA_NAME.localeCompare(b.properties.AREA_NAME));
  data.features.forEach(f => {
    const option = document.createElement("option");
    option.value = f.properties._id;
    option.textContent = f.properties.AREA_NAME;
    dropdown.appendChild(option);
  });
  dropdown.addEventListener("change", () => {
    const id = Number(dropdown.value);
    const match = data.features.find(f => f.properties._id === id);
    if (match) zoomToNeighbourhood(match);
  });
}

function zoomToNeighbourhood(f) {
  geoJsonLayer.eachLayer(layer => {
    if (layer.feature.properties._id === f.properties._id) {
      map.fitBounds(layer.getBounds());
      layer.openPopup();
    }
  });
}

// Highlight logic
function highlightTop5() {
  geoJsonLayer.eachLayer(layer => {
    if (top5.includes(layer.feature.properties.AREA_NAME)) {
      layer.setStyle({ fillColor: "#FFD700", color: "#fff", weight: 2, fillOpacity: 0.9 });
      layer.isTop5 = true;
    }
  });
}
function resetTop5() {
  geoJsonLayer.eachLayer(layer => {
    if (top5.includes(layer.feature.properties.AREA_NAME)) {
      layer.isTop5 = false;
      geoJsonLayer.resetStyle(layer);
    }
  });
}
function highlightBottom6() {
  geoJsonLayer.eachLayer(layer => {
    if (bottom6.includes(layer.feature.properties.AREA_NAME)) {
      layer.setStyle({ fillColor: "#8B0000", color: "#fff", weight: 2, fillOpacity: 0.9 });
      layer.isBottom6 = true;
    }
  });
}
function resetBottom6() {
  geoJsonLayer.eachLayer(layer => {
    if (bottom6.includes(layer.feature.properties.AREA_NAME)) {
      layer.isBottom6 = false;
      geoJsonLayer.resetStyle(layer);
    }
  });
}

// Load data first
document.addEventListener("DOMContentLoaded", function () {
  fetch("data/to-third-places_v2.geojson")
    .then(res => res.json())
    .then(data => {
      if (!data || data.type !== "FeatureCollection") {
        console.error("Invalid GeoJSON");
        return;
      }

      // Create map now, zoom later
      map = L.map("map");
      L.tileLayer("https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=22685591-9232-45c7-a495-cfdf0e81ab86", {
        maxZoom: 18,
        attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, ' +
                     '&copy; <a href="https://stamen.com/">Stamen Design</a>, ' +
                     '&copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, ' +
                     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(map);

      populateDropdown(data);

      const sorted = data.features.sort((a, b) => a.properties.rank_am_np_1000 - b.properties.rank_am_np_1000);
      top5 = sorted.slice(0, 5).map(f => f.properties.AREA_NAME);
      const maxRank = Math.max(...data.features.map(f => f.properties.rank_am_np_1000));
      bottom6 = data.features.filter(f => f.properties.rank_am_np_1000 >= maxRank - 5).map(f => f.properties.AREA_NAME);

      geoJsonLayer = L.geoJSON(data, {
        style: f => ({
          fillColor: getColor(f.properties.rank_am_np_1000),
          color: "white",
          weight: 1.5,
          opacity: 1,
          fillOpacity: 0.9,
        }),
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(`${feature.properties.AREA_NAME} (Rank: ${feature.properties.rank_am_np_1000})`, {
            direction: "top",
            className: "neighbourhood-tooltip"
          });

          layer.bindPopup(`
            <div class="popup-card">
              <div class="popup-header">
                <img src="images/maple-leaf.svg" class="popup-icon" />
                <h4>${feature.properties.AREA_NAME}</h4>
              </div>
              <div class="popup-body">
                <p><strong>Rank:</strong> ${feature.properties.rank_am_np_1000}</p>
                <p><strong>3rd Places / 1000:</strong> ${feature.properties.amen_np_per_1000}</p>
                <p><strong>With Parks:</strong> ${feature.properties.amen_per_1000}</p>
              </div>
            </div>
          `);

          layer.on({
            mouseover: e => e.target.setStyle({
              fillColor: "#FEFFBE",
              fillOpacity: 0.45,
              dashArray: "5,5"
            }),
            mouseout: e => {
              const l = e.target;
              if (l.isTop5) {
                l.setStyle({ fillColor: "#FFD700", color: "#fff", weight: 2, fillOpacity: 0.9 });
              } else if (l.isBottom6) {
                l.setStyle({ fillColor: "#8B0000", color: "#fff", weight: 2, fillOpacity: 0.9 });
              } else {
                geoJsonLayer.resetStyle(l);
              }
            },
            click: e => {
              e.target.setStyle({ weight: 0, color: "transparent", stroke: false });
              setTimeout(() => document.activeElement.blur(), 0);
            }
          });
        }
      }).addTo(map);

      // Wait a tick to apply zoom properly
setTimeout(() => {
  map.invalidateSize();  // ← forces Leaflet to recalculate the map size
  const bounds = geoJsonLayer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [20, 20] });
  } else {
    console.warn("GeoJSON bounds not valid.");
  }
}, 300);

      // Reset Button
      const resetControl = L.control({ position: "topleft" });
      resetControl.onAdd = () => {
        const div = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-custom");
        div.innerHTML = "🔄";
        Object.assign(div.style, {
          backgroundColor: "white",
          width: "1.875rem",
          height: "1.875rem",
          lineHeight: "1.875rem",
          textAlign: "center",
          cursor: "pointer",
          fontSize: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
        });
        div.onclick = () => {
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        };
        return div;
      };
      resetControl.addTo(map);

      // Legend
      const legend = L.control({ position: "bottomright" });
      legend.onAdd = () => {
        const div = L.DomUtil.create("div", "info legend");
        const grades = [1, 21, 41, 61, 81, 101, 121, 141];
        div.innerHTML = "<h4>Neighbourhood Rank<br><small>(1 = Best)</small></h4>" +
          grades.map((from, i) => {
            const to = grades[i + 1] - 1;
            return `<i style="background:${getColor(from)}"></i> ${from}${to ? "–" + to : "+"}`;
          }).join("<br>");
        return div;
      };
      legend.addTo(map);
    })
    .catch(err => console.error("GeoJSON load error:", err));
});

// Checkbox listeners
document.getElementById("top5").addEventListener("change", function () {
  this.checked ? highlightTop5() : resetTop5();
});
document.getElementById("bottom5").addEventListener("change", function () {
  this.checked ? highlightBottom6() : resetBottom6();
});
