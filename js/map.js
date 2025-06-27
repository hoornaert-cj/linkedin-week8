var map;
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

            //Verifies that the data is valid GeoJSON.
            if (data && data.type === 'FeatureCollection') {
                //Sorts features by their rank (ascending).
                const sorted = data.features.sort((a, b) => a.properties.rank - b.properties.rank);

                //Gets the 5 best-ranked neighbourhoods.
                top5 = sorted.slice(0, 5);
                //Gets the 5 worst-ranked neighbourhoods.
                bottom5 = sorted.slice(-6);

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

                        let popupContent =
                        `<img src="images/maple-leaf.svg" alt="Maple Leaf" style="display: block; margin: 0 auto; width: 1.5rem; height: 1.5rem;">
                        <strong>${feature.properties.AREA_NAME}</strong><br>
                        Rank: ${feature.properties.rank} <br>
                        3rd Places: ${feature.properties["amenity_count"]}`;

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

    function addBottom5Markers() {
        bottom5Layer.clearLayers();
        bottom5.forEach(feature => {
            let rank = feature.properties.rank;
            let bottomRank = 159 - rank;

            let centroid = turf.centroid(feature); // Get centroid
            let coords = centroid.geometry.coordinates; // Extract coordinates

            let icon = L.icon({
                iconUrl: `images/bottom5-rank${feature.properties.rank}.svg`,
                iconSize: [36, 36],
                iconAnchor: [16, 32],
                popupAnchor: [0, 0]
            });


            let marker = L.marker([coords[1], coords[0]], { icon: icon });
            bottom5Layer.addLayer(marker);
        });

        map.addLayer(bottom5Layer);
    }

    // Toggle checkbox behavior
    document.getElementById("bottom5").addEventListener("change", function() {
        if (this.checked) {
            addBottom5Markers();
        } else {
            map.removeLayer(bottom5Layer);
        }
    });
