/**
 * 지자체 명칭 반환 및 예외 처리
 */
function getPrefixedName(code, name) {
    if (!code) return name;
    let prefix = String(code).substring(0, 2);
    // 군위군 코드(37310)를 대구(22) 권역으로 강제 매칭
    if (String(code).startsWith('37310')) {
        prefix = '22';
    }

    const sidoMap = {
        '11': '서울특별시', '21': '부산광역시', '22': '대구광역시',
        '23': '인천광역시', '24': '광주광역시', '25': '대전광역시',
        '26': '울산광역시', '29': '세종특별자치시', '31': '경기도',
        '32': '강원도', '33': '충청북도', '34': '충청남도',
        '35': '전라북도', '36': '전라남도', '37': '경상북도',
        '38': '경상남도', '39': '제주특별자치도'
    };
    
    const sido = sidoMap[prefix];
    return sido ? `${sido} ${name}` : name;
}

// 1. 지도 초기 설정
const bounds = L.latLngBounds(L.latLng(32.0, 123.0), L.latLng(39.0, 132.5));
const map = L.map('map', {
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 6,
    maxZoom: 11,
    zoomControl: false,
    attributionControl: false // 우측 하단 공급자 정보 제거
}).setView([36.2, 128.0], 6);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png').addTo(map);

// 2. 상태 관리
let visitedCities = JSON.parse(localStorage.getItem('visitedCities')) || [];
let wishlistCities = JSON.parse(localStorage.getItem('wishlistCities')) || [];
let totalCities = 0;

function updateStats() {
    const vCount = visitedCities.length;
    document.getElementById('visited-count').innerText = vCount;
    document.getElementById('total-count').innerText = totalCities;
    document.getElementById('wish-count').innerText = wishlistCities.length;
    
    if (totalCities > 0) {
        const percent = (vCount / totalCities) * 100;
        document.getElementById('progress-percent').innerText = percent.toFixed(1) + "%";
    }
}

// 3. 데이터 로드 및 레이어 설정
Promise.all([
    fetch('sigungu.json').then(res => res.json()),
    fetch('sido.json').then(res => res.json())
]).then(([sigunguData, sidoData]) => {
    
    totalCities = sigunguData.features.length;

    // [레이어 1] 시군구 레이어 (클릭 및 색칠용)
    L.geoJSON(sigunguData, {
        style: function(feature) {
            const fullName = getPrefixedName(feature.properties.code, feature.properties.name);
            let color = '#ffffff';
            if (visitedCities.includes(fullName)) color = '#2ecc71';
            else if (wishlistCities.includes(fullName)) color = '#3498db';
            
            return { 
                fillColor: color, 
                weight: 1.0,        // 시군구 경계 굵기
                color: '#adb5bd',   // 요청하신 진해진 시군구 경계색
                fillOpacity: 1 
            };
        },
        onEachFeature: function(feature, layer) {
            const fullName = getPrefixedName(feature.properties.code, feature.properties.name);
            const currentCode = String(feature.properties.code);
            // 대구 군위 예외처리를 반영한 소속 시도 코드 추출
            const currentSidoCode = currentCode.startsWith('37310') ? '22' : currentCode.substring(0, 2);

            layer.on('click', function() {
                const mode = document.querySelector('input[name="map-mode"]:checked').value;
                
                if (mode === 'visited') {
                    if (visitedCities.includes(fullName)) {
                        visitedCities = visitedCities.filter(c => c !== fullName);
                    } else {
                        visitedCities.push(fullName);
                        wishlistCities = wishlistCities.filter(c => c !== fullName);
                    }
                } else {
                    if (wishlistCities.includes(fullName)) {
                        wishlistCities = wishlistCities.filter(c => c !== fullName);
                    } else {
                        wishlistCities.push(fullName);
                        visitedCities = visitedCities.filter(c => c !== fullName);
                    }
                }

                this.setStyle({
                    fillColor: visitedCities.includes(fullName) ? '#2ecc71' : 
                               (wishlistCities.includes(fullName) ? '#3498db' : '#ffffff')
                });

                // --- [시도 단위 정복 체크] ---
                const sidoNames = {
                    '11': '서울특별시', '21': '부산광역시', '22': '대구광역시', '23': '인천광역시',
                    '24': '광주광역시', '25': '대전광역시', '26': '울산광역시', '29': '세종특별자치시',
                    '31': '경기도', '32': '강원도', '33': '충청북도', '34': '충청남도',
                    '35': '전라북도', '36': '전라남도', '37': '경상북도', '38': '경상남도', '39': '제주특별자치도'
                };
                
                // 현재 시도에 속한 모든 시군구 필터링
                const siblingCities = sigunguData.features.filter(f => {
                    let fCode = String(f.properties.code);
                    let fSido = fCode.startsWith('37310') ? '22' : fCode.substring(0, 2);
                    return fSido === currentSidoCode;
                });

                const siblingNames = siblingCities.map(f => getPrefixedName(f.properties.code, f.properties.name));
                const visitedInSido = siblingNames.filter(name => visitedCities.includes(name));
                const isSidoConquered = siblingNames.length > 0 && siblingNames.length === visitedInSido.length;

                // 카드 정보 업데이트
                document.getElementById('card-city-name').innerText = fullName;
                const statusText = document.getElementById('card-city-status');
                
                if (isSidoConquered && visitedCities.includes(fullName)) {
                    statusText.innerText = `🎊 ${sidoNames[currentSidoCode]} 정복! 🎊`;
                    statusText.style.animation = "congrats 0.5s ease infinite alternate";
                } else if (visitedCities.includes(fullName)) {
                    statusText.innerText = "✅ 정복 완료!";
                    statusText.style.animation = "none";
                } else if (wishlistCities.includes(fullName)) {
                    statusText.innerText = "💙 가고 싶은 곳";
                    statusText.style.animation = "none";
                } else {
                    statusText.innerText = "방문 기록 없음";
                    statusText.style.animation = "none";
                }
                
                statusText.style.color = visitedCities.includes(fullName) ? "#2ecc71" : (wishlistCities.includes(fullName) ? "#3498db" : "#888");
                document.getElementById('city-info-card').classList.add('show');

                localStorage.setItem('visitedCities', JSON.stringify(visitedCities));
                localStorage.setItem('wishlistCities', JSON.stringify(wishlistCities));
                updateStats();
            });

            layer.bindTooltip(fullName, { sticky: true });
        }
    }).addTo(map);

    // [레이어 2] 시도 레이어 (굵은 외곽선 1.2)
    L.geoJSON(sidoData, {
        interactive: false,
        style: {
            fillColor: 'transparent',
            weight: 1.2,
            color: '#495057',
            opacity: 1,
            lineJoin: 'round'
        }
    }).addTo(map);

    // [레이어 3] 독도 텍스트 (울릉도 방향으로 이동 및 크기 확대)
    const dokdoIcon = L.divIcon({
        className: 'dokdo-label-only',
        html: '독도',
        iconSize: [60, 30],
        iconAnchor: [30, 15]
    });
    L.marker([37.35, 131.65], { icon: dokdoIcon, interactive: false }).addTo(map);

    updateStats();
});

// 4. 이미지 저장 및 초기화 로직
document.getElementById('capture-btn').addEventListener('click', function() {
    const btn = this;
    btn.innerText = "📸 저장 중...";
    html2canvas(document.getElementById('capture-area'), { 
        useCORS: true, 
        backgroundColor: "#f1f3f5", 
        scale: 2 
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = '나의-여행-지도.png';
        link.href = canvas.toDataURL();
        link.click();
        btn.innerText = "📸 지도 이미지 저장";
    });
});

document.getElementById('reset-btn').addEventListener('click', function() {
    if(confirm("모든 기록을 초기화할까요?")) {
        localStorage.clear();
        location.reload();
    }
});