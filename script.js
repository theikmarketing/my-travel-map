window.onload = function() {
    const seaColor = '#aadaff';
    let visitedCities = JSON.parse(localStorage.getItem('visitedCities')) || [];
    let wishlistCities = JSON.parse(localStorage.getItem('wishlistCities')) || [];
    let totalCities = 0;
    let sigunguLayer;
    let allSigunguData = [];

    // 1. 지도 초기화
    const map = L.map('map', {
        minZoom: 7.2, 
        maxZoom: 11,
        zoomControl: false,
        attributionControl: false,
        bounceAtZoomLimits: true,
        preferCanvas: true, // Canvas 렌더링으로 검정 박스 오류 방지
        tap: false          // 터치 간섭 방지
    });

    // 모든 이동 이벤트 발생 시 툴팁 즉시 제거 (잔상 방지)
    const forceKillTooltip = () => {
        map.eachLayer(function(layer) {
            if (layer.closeTooltip) {
                layer.closeTooltip();
            }
        });
    };

    map.on('dragstart movestart zoomstart mouseout', forceKillTooltip);

    // --- 유틸리티 함수 영역 ---
    function getSidoName(code) {
        let prefix = String(code).substring(0, 2);
        // 대구 군위군 예외 처리
        if (String(code).startsWith('37310')) prefix = '22'; 
        const sidoMap = {
            '11': '서울특별시', '21': '부산광역시', '22': '대구광역시', '23': '인천광역시', 
            '24': '광주광역시', '25': '대전광역시', '26': '울산광역시', '29': '세종특별자치시', 
            '31': '경기도', '32': '강원도', '33': '충청북도', '34': '충청남도', '35': '전라북도', 
            '36': '전라남도', '37': '경상북도', '38': '경상남도', '39': '제주특별자치도'
        };
        return sidoMap[prefix] || "알 수 없음";
    }

    function getPrefixedName(code, name) {
        const sido = getSidoName(code);
        return sido !== "알 수 없음" ? `${sido} ${name}` : name;
    }

    function checkSidoConquest(code) {
        const sidoName = getSidoName(code);
        const sigungusInSido = allSigunguData.filter(f => getSidoName(f.properties.code) === sidoName);
        const visitedInSido = sigungusInSido.filter(f => visitedCities.includes(getPrefixedName(f.properties.code, f.properties.name)));
        return {
            conquered: sigungusInSido.length > 0 && sigungusInSido.length === visitedInSido.length,
            name: sidoName
        };
    }

    function updateStats() {
        const vCount = visitedCities.length;
        document.getElementById('visited-count').innerText = vCount;
        document.getElementById('total-count').innerText = totalCities;
        document.getElementById('wish-count').innerText = wishlistCities.length;
        if (totalCities > 0) {
            document.getElementById('progress-percent').innerText = ((vCount / totalCities) * 100).toFixed(1) + "%";
        }
    }

    // 2. 데이터 로드 및 레이어 설정
    Promise.all([
        fetch('sigungu.json').then(res => res.json()),
        fetch('sido.json').then(res => res.json())
    ]).then(([sigunguData, sidoData]) => {
        allSigunguData = sigunguData.features;
        totalCities = sigunguData.features.length;

        // 바다 배경 생성
        L.polygon([
            [[-90, -180], [-90, 180], [90, 180], [90, -180], [-90, -180]],
            ...sidoData.features.flatMap(f => {
                if (f.geometry.type === 'Polygon') return [f.geometry.coordinates[0].map(c => [c[1], c[0]])];
                else return f.geometry.coordinates.map(coords => coords[0].map(c => [c[1], c[0]]));
            })
        ], { color: 'none', fillColor: seaColor, fillOpacity: 1, interactive: false }).addTo(map);

        // 시군구 레이어 생성
        sigunguLayer = L.geoJSON(sigunguData, {
            style: (f) => {
                const name = getPrefixedName(f.properties.code, f.properties.name);
                let color = visitedCities.includes(name) ? '#2ecc71' : (wishlistCities.includes(name) ? '#3498db' : '#ffffff');
                return { fillColor: color, weight: 1.0, color: '#adb5bd', fillOpacity: 1 };
            },
            onEachFeature: (feature, layer) => {
                const fullName = getPrefixedName(feature.properties.code, feature.properties.name);
                
                layer.bindTooltip(fullName, { 
                    sticky: true, 
                    direction: 'top',
                    offset: [0, -5],
                    opacity: 0.9,
                    className: 'custom-tooltip',
                    pane: 'popupPane'
                });

                layer.on({
                    click: function(e) {
                        const mode = document.querySelector('input[name="map-mode"]:checked').value;
                        if (mode === 'visited') {
                            if (visitedCities.includes(fullName)) visitedCities = visitedCities.filter(c => c !== fullName);
                            else { visitedCities.push(fullName); wishlistCities = wishlistCities.filter(c => c !== fullName); }
                        } else {
                            if (wishlistCities.includes(fullName)) wishlistCities = wishlistCities.filter(c => c !== fullName);
                            else { wishlistCities.push(fullName); visitedCities = visitedCities.filter(c => c !== fullName); }
                        }

                        sigunguLayer.setStyle((f) => {
                            const n = getPrefixedName(f.properties.code, f.properties.name);
                            return { fillColor: visitedCities.includes(n) ? '#2ecc71' : (wishlistCities.includes(n) ? '#3498db' : '#ffffff') };
                        });

                        document.getElementById('card-city-name').innerText = fullName;
                        const statusText = document.getElementById('card-city-status');
                        const conquest = checkSidoConquest(feature.properties.code);
                        
                        if (conquest.conquered && visitedCities.includes(fullName)) {
                            statusText.innerText = `🏆 ${conquest.name} 정복 완료!`;
                            statusText.style.color = "#e67e22";
                        } else {
                            statusText.innerText = visitedCities.includes(fullName) ? "✅ 가본 곳" : (wishlistCities.includes(fullName) ? "💙 가고 싶은 곳" : "방문 전이에요");
                            statusText.style.color = visitedCities.includes(fullName) ? "#2ecc71" : "#3498db";
                        }
                        
                        document.getElementById('city-info-card').classList.add('show');
                        
                        localStorage.setItem('visitedCities', JSON.stringify(visitedCities));
                        localStorage.setItem('wishlistCities', JSON.stringify(wishlistCities));
                        updateStats();
                    },
                    mousemove: function() {
                        if(map.dragging.moving()) {
                            this.closeTooltip();
                        }
                    }
                });
            }
        }).addTo(map);

        // --- 커스텀 중앙 정렬 및 바운드 고정 로직 ---
        const dataBounds = sigunguLayer.getBounds();
        
        // 조정값 설정 (latAdj: +는 아래로 이동, lngAdj: +는 왼쪽으로 이동)
        const latAdj = 0.5; 
        const lngAdj = -0.75; 

        // 실제 지형 경계(dataBounds)를 조정값만큼 이동시킨 새로운 경계를 생성
        const sw = dataBounds.getSouthWest();
        const ne = dataBounds.getNorthEast();
        const shiftedBounds = L.latLngBounds(
            [sw.lat + latAdj, sw.lng + lngAdj], 
            [ne.lat + latAdj, ne.lng + lngAdj]
        );

        // 이동시킨 경계를 최대 범위로 설정 (pad는 0으로 고정)
        map.setMaxBounds(shiftedBounds.pad(0));
        
        // 이동시킨 경계의 중심점을 초기 뷰로 설정
        map.setView(shiftedBounds.getCenter(), 7.2);

        // 시도 경계선 레이어
        L.geoJSON(sidoData, { interactive: false, style: { fillColor: 'transparent', weight: 1.5, color: '#495057', opacity: 1 } }).addTo(map);
        
        // 독도 표시
        const dokdoIcon = L.divIcon({ className: 'dokdo-label-only', html: '독도', iconSize: [60, 30], iconAnchor: [30, 15] });
        L.marker([37.35, 131.65], { icon: dokdoIcon, interactive: false }).addTo(map);
        
        updateStats();
    }).catch(err => console.error("Error:", err));

    // 3. 캡처 버튼 로직 (UI 메뉴 제외 설정 추가)
document.getElementById('capture-btn').onclick = function() {
    const btn = this;
    const captureArea = document.getElementById('capture-area');
    
    // 제외하고 싶은 요소들을 찾습니다 (예: 하단 메뉴바, 캡처 버튼 등)
    // HTML에서 하단 메뉴바의 ID가 'menu-bar'라고 가정하거나, 버튼 자체를 숨깁니다.
    const uiElements = document.querySelectorAll('.ui-overlay, button, .menu-container'); 

    btn.innerText = "📸 캡처 중...";
    btn.disabled = true;

    // 캡처 전 처리: 툴팁 제거 및 하단 UI 숨기기
    forceKillTooltip();
    uiElements.forEach(el => el.style.visibility = 'hidden'); // 숨김 (공간은 유지하여 레이아웃 방해 안함)

    html2canvas(captureArea, {
        useCORS: true,
        scale: 2,
        backgroundColor: seaColor,
        // html2canvas 옵션으로 특정 요소 제외하기
        ignoreElements: (element) => {
            // ID가 'capture-btn'이거나 'reset-btn'인 경우 캡처에서 제외
            return element.id === 'capture-btn' || element.id === 'reset-btn';
        }
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `나의_대한민국_여행지도.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).finally(() => {
        // 캡처 후 처리: UI 다시 보이기
        uiElements.forEach(el => el.style.visibility = 'visible');
        btn.innerText = "📸 지도 이미지 저장";
        btn.disabled = false;
    });
};

    // 4. 리셋 버튼 로직
    document.getElementById('reset-btn').onclick = () => {
        if(confirm("모든 기록을 초기화할까요?")) { 
            localStorage.clear(); 
            location.reload(); 
        }
    };
}