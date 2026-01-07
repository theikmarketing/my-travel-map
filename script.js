const map = L.map('map').setView([36.2, 127.8], 7);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap'
}).addTo(map);

let visitedCities = JSON.parse(localStorage.getItem('visitedCities')) || [];
let totalCities = 0;

// 통계 업데이트 함수
function updateStats() {
    const countEl = document.getElementById('visited-count');
    const percentEl = document.getElementById('progress-percent');
    
    countEl.innerText = visitedCities.length;
    if (totalCities > 0) {
        const percent = Math.round((visitedCities.length / totalCities) * 100);
        percentEl.innerText = percent + "%";
    }
}

fetch('sigungu.json')
    .then(res => res.json())
    .then(data => {
        totalCities = data.features.length; // 전체 도시 개수 파악
        
        L.geoJSON(data, {
            style: function(feature) {
                const isVisited = visitedCities.includes(feature.properties.name);
                return {
                    fillColor: isVisited ? '#4a90e2' : '#ffffff',
                    weight: 1,
                    color: '#ddd',
                    fillOpacity: isVisited ? 0.7 : 0.5
                };
            },
            onEachFeature: function(feature, layer) {
                const cityName = feature.properties.name;
                layer.bindTooltip(cityName, { sticky: true, direction: 'top' });

                layer.on({
                    mouseover: function(e) {
                        const l = e.target;
                        l.setStyle({ weight: 2, color: '#4a90e2', fillOpacity: 0.9 });
                    },
                    mouseout: function(e) {
                        const isVisited = visitedCities.includes(cityName);
                        this.setStyle({
                            weight: 1,
                            color: '#ddd',
                            fillOpacity: isVisited ? 0.7 : 0.5
                        });
                    },
                    click: function(e) {
                        const index = visitedCities.indexOf(cityName);
                        if (index === -1) {
                            visitedCities.push(cityName);
                            this.setStyle({ fillColor: '#4a90e2', fillOpacity: 0.7 });
                        } else {
                            visitedCities.splice(index, 1);
                            this.setStyle({ fillColor: '#ffffff', fillOpacity: 0.5 });
                        }
                        localStorage.setItem('visitedCities', JSON.stringify(visitedCities));
                        updateStats(); // 클릭 시 통계 갱신
                    }
                });
            }
        }).addTo(map);
        
        updateStats(); // 초기 로드 시 통계 갱신
    });