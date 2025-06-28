var map;
var geoJsonLayer;
var geoJsonLayer;

document.addEventListener("DOMContentLoaded", function () {
    // Initialize the map only once
    if (!map) {
        map = L.map('map').setView([43.6659, -79.4148], 13);

        // Add tile layer
        L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=22685591-9232-45c7-a495-cfdf0e81ab86', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        }).addTo(map);

        // Ensure the map resizes correctly
        setTimeout(() => {
            map.invalidateSize();
        }, 500);
    }

    // Loads the GeoJSON file asynchronously.
    fetch('data/to-third-places.geojson')
        //Converts the fetched response into usable JSON.
        .then(response => response.json())
        //Starts processing the loaded GeoJSON data.
        .then(data => {
            console.log(data);
            populateDropdown(data);
            //Verifies that the data is valid GeoJSON.
            if (data && data.type === 'FeatureCollection') {
                //Sorts features by their rank (ascending).
                const sorted = data.features.sort((a, b) => a.properties.rank - b.properties.rank);

                //Gets the 5 best-ranked neighbourhoods.
                top5 = sorted.slice(0, 5);
                //Gets the 5 worst-ranked neighbourhoods.
                const maxRank = Math.max(...data.features.map(f=> f.properties.rank));

                bottom6 = data.features
                    .filter(f=>f.properties.rank >= maxRank -5)
                    .map(f=> f.properties.AREA_NAME);

                //Creates a Leaflet layer from your GeoJSON.
                geoJsonLayer = L.geoJSON(data, {
                    //Applies a color and style to each feature.
                    style: function (feature) {
                        return {
                            //Sets fill color by calling a color function.
                            fillColor: getColor(feature.properties.rank),
                            color: 'white',
                            weight: 1.5,
                            opacity: 1,
                            fillOpacity: 0.9
                        };
                    },
                    //Applies events and popups to each neighbourhood.
                    onEachFeature: function (feature, layer) {
                        //Shows a tooltip on hover.
                        layer.bindTooltip(feature.properties.AREA_NAME + ' (Rank: ' + feature.properties.rank + ')', {
                            permanent: false,
                            direction: "top",
                            className: "neighbourhood-tooltip"
                        });

                        let popupContent = `
<div class="popup-card">
  <div class="popup-header">
    <img src="images/maple-leaf.svg" alt="Maple Leaf Icon" class="popup-icon" />
    <h4>${feature.properties.AREA_NAME}</h4>
  </div>
  <div class="popup-body">
    <p><strong>Rank (out of 158):</strong> ${feature.properties.rank}</p>
    <p><strong>Number of Third Places:</strong> ${feature.properties["amenity_count"]}</p>
  </div>
</div>`;

                        //Shows a popup on click.
                        layer.bindPopup(popupContent);

                        //Highlights a neighbourhood when hovered.
                        layer.on({
                            mouseover: function (e) {
                                e.target.setStyle({
                                    fillColor: '#FEFFBE',
                                    fillOpacity: 0.45,
                                    dashArray: '5, 5'
                                });
                            },
                            //Remove the highlight from the neighbourhood that was hovered.
                            mouseout: function (e) {
                                if (typeof geoJsonLayer !== 'undefined') {
                                    geoJsonLayer.resetStyle(e.target);
                                }
                            },

                            // Cosmetic UX improvement—removes default blue border.
                            click: function(e) {
                                e.target.setStyle({
                                    weight: 0,
                                    color: "transparent",
                                    stroke: false
                                });

                                // Prevent Leaflet from adding focus styles
                                setTimeout(() => {
                                    document.activeElement.blur();
                                }, 0);
                            }
                        });
                    }
                }).addTo(map);

                //Reacts to checkbox toggle for Top 5.
                document.getElementById("top5").addEventListener("change", function() {
                    if (this.checked) {
                        addTop5Markers();
                    } else {
                        removeTop5Markers();
                    }
                });

                //Same, but for Bottom 5.
                document.getElementById("bottom5").addEventListener("change", function() {
                    if (this.checked) {
                        addBottom5Markers();
                    } else {
                        removeBottom5Markers();
                    }
                });
                //Zooms the map to fit all neighbourhoods.
                map.fitBounds(geoJsonLayer.getBounds());
                //Error fallback if the GeoJSON is invalid.
            } else {
                console.error('Invalid GeoJSON data');
            }
        })
        //Catches fetch-related errors.
        .catch(error => console.error('Error loading GeoJSON', error));
});

function populateDropdown(data) {
    const dropdown = document.getElementById('neighbourhood-dropdown');

    // Sort features alphabetically by AREA_NAME
    data.features.sort((a, b) =>
        a.properties.AREA_NAME.localeCompare(b.properties.AREA_NAME)
    );

    // Create and add an <option> for each feature
    for (const feature of data.features) {
        const option = document.createElement('option');
        option.value = feature.properties._id;
        option.textContent = feature.properties.AREA_NAME;
        dropdown.appendChild(option);
    }

    // Handle dropdown selection change
    dropdown.addEventListener('change', () => {
        const selectedId = Number(dropdown.value);
        if (!isNaN(selectedId)) {
            const match = data.features.find(
                f => f.properties._id === selectedId
            );
            if (match) zoomToNeighbourhood(match);
        }
    });
}

function zoomToNeighbourhood(selectedNeighbourhood) {
    if(!geoJsonLayer) {
        console.error("Neighbourhood layer is not yet loaded.");
        return
    }
    geoJsonLayer.eachLayer(function(layer) {
          console.log("Comparing", layer.feature.properties._id, selectedNeighbourhood.properties._id);
        if(layer.feature.properties._id == selectedNeighbourhood.properties._id) {
            map.fitBounds(layer.getBounds());
            layer.openPopup();
        }
    });
}

function getColor(rank) {
    return rank <= 20 ? '#1b4e4f' :
           rank <= 40 ? '#2a6d5e' :
           rank <= 60 ? '#3f816b' :
           rank <= 80 ? '#5c9a79' :
           rank <= 100 ? '#7ab18a' :
           rank <= 120 ? '#9cc8a1' :
           rank <= 140 ? '#c1d9c0' :
                         '#dddddd';
}

    let top5Layer = L.layerGroup();
    let bottom5Layer = L.layerGroup();

    function addTop5Markers() {
        top5Layer.clearLayers();
        top5.forEach(feature => {
            let centroid = turf.centroid(feature);
            let coords = centroid.geometry.coordinates;

            let icon = L.icon({
                iconUrl: `images/top5-rank${feature.properties.rank}.svg`,
                iconSize: [36, 36],
                iconAnchor: [16, 32],
                popupAnchor: [0, 0]
            });


            let marker = L.marker([coords[1], coords[0]], { icon: icon });
            top5Layer.addLayer(marker);
        });

        map.addLayer(top5Layer);
    }

    // Toggle checkbox behavior
    document.getElementById("top5").addEventListener("change", function() {
        if (this.checked) {
            addTop5Markers();
        } else {
            map.removeLayer(top5Layer);
        }
    });

    function highlightBottom6() {
        geoJsonLayer.eachLayer(layer => {
            const name = layer.feature.properties.AREA_NAME;
            if(bottom6.includes(name)) {
                layer.setStyle ({
                    fillColor: '#8B0000',
                    color: '#ffffff',
                    weight: 2,
                    fillOpacity: 0.9,
                });
            }
        });
    }

    function resetBottom6() {
        geoJsonLayer.eachLayer(layer => {
            const name = layer.feature.properties.AREA_NAME;
            if(bottom6.includes(name)) {
                geoJsonLayer.resetStyle(layer)
            }
        });
    }

    // Toggle checkbox behavior
    document.getElementById("bottom5").addEventListener("change", function() {
        if (this.checked) {
            highlightBottom6();
        } else {
            resetBottom6();
        }
    });
