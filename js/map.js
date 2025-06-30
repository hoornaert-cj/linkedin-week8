var map;
var geoJsonLayer;
var geoJsonLayer;

document.addEventListener("DOMContentLoaded", function() {
	// Initialize the map only once
	if (!map) {
		map = L.map('map').setView([43.6659, -79.4148], 13);

		// Add tile layer
		L.tileLayer('https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png?api_key=22685591-9232-45c7-a495-cfdf0e81ab86', {
			maxZoom: 18,
			attribution: '&copy; <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://stamen.com/" target="_blank">Stamen Design</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
		}).addTo(map);


		const legend = L.control({
			position: 'bottomright'
		});

		legend.onAdd = function(map) {
			const div = L.DomUtil.create('div', 'info legend');

			const grades = [1, 21, 41, 61, 81, 101, 121, 141];
			const labels = [];

			// Create legend items dynamically
			for (let i = 0; i < grades.length; i++) {
				const from = grades[i];
				const to = grades[i + 1] - 1;

				labels.push(
					`<i style="background:${getColor(from)}"></i> ${from}${to ? '–' + to : '+'}`
				);
			}

			div.innerHTML = `<h4>Neighbourhood Rank<br><small>(1 = Best)</small></h4>` + labels.join('<br>');
			return div;
		};

		legend.addTo(map);

		const resetControl = L.control({ position: 'topleft' }); // You can also try 'topright'

resetControl.onAdd = function () {
    const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
    div.innerHTML = '🔄';
    div.style.backgroundColor = 'white';
    div.style.width = '1.875rem';
    div.style.height = '1.875rem';
    div.style.lineHeight = '1.875rem';
    div.style.textAlign = 'center';
    div.style.cursor = 'pointer';
    div.style.fontSize = '1.25rem';
    div.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';

    div.onclick = function () {
        if (geoJsonLayer) {
            map.fitBounds(geoJsonLayer.getBounds());
        } else {
            map.setView([43.6659, -79.4148], 13);
        }
    };

    return div;
};

resetControl.addTo(map);


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
				const maxRank = Math.max(...data.features.map(f => f.properties.rank));
				top5 = data.features
					.sort((a, b) => a.properties.rank - b.properties.rank)
					.slice(0, 5)
					.map(f => f.properties.AREA_NAME);
				bottom6 = data.features
					.filter(f => f.properties.rank >= maxRank - 5)
					.map(f => f.properties.AREA_NAME);

				//Creates a Leaflet layer from your GeoJSON.
				geoJsonLayer = L.geoJSON(data, {
					//Applies a color and style to each feature.
					style: function(feature) {
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
					onEachFeature: function(feature, layer) {
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
							mouseover: function(e) {
								e.target.setStyle({
									fillColor: '#FEFFBE',
									fillOpacity: 0.45,
									dashArray: '5, 5'
								});
							},
							//Remove the highlight from the neighbourhood that was hovered.
							mouseout: function(e) {
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
	if (!geoJsonLayer) {
		console.error("Neighbourhood layer is not yet loaded.");
		return
	}
	geoJsonLayer.eachLayer(function(layer) {
		if (layer.feature.properties._id == selectedNeighbourhood.properties._id) {
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

function highlightTop5() {
	geoJsonLayer.eachLayer(layer => {
		const name = layer.feature.properties.AREA_NAME;
		if (top5.includes(name)) {
			layer.setStyle({
				fillColor: '#FFD700',
				color: '#ffffff',
				weight: 2,
				fillOpacity: 0.9,
			});
		}
	});
}

function resetTop5() {
	geoJsonLayer.eachLayer(layer => {
		const name = layer.feature.properties.AREA_NAME;
		if (top5.includes(name)) {
			geoJsonLayer.resetStyle(layer)
		}
	});
}

// Toggle checkbox behavior
document.getElementById("top5").addEventListener("change", function() {
	if (this.checked) {
		highlightTop5();
	} else {
		resetTop5();
	}
});

function highlightBottom6() {
	geoJsonLayer.eachLayer(layer => {
		const name = layer.feature.properties.AREA_NAME;
		if (bottom6.includes(name)) {
			layer.setStyle({
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
		if (bottom6.includes(name)) {
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
