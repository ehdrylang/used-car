# 구현 계획 — 차량 상세 조회 (Car Detail Lookup)

> 작성일: 2026-03-01  
> 단계: 2단계 (Implementation Plan)  
> 상태: 초안 (피드백 대기)  
> 참조: `docs/features/car-detail-lookup.md`

---

## API 테스트 결과 요약

> 계획 수립 전 4개 엔드포인트를 실제 호출하여 응답 구조를 확인함

### ① 차량 검색 API (기본 정보 + 이미지)
```
GET https://api.encar.com/search/car/list/premium
    ?count=1&q=(And.Hidden.N._.CarType.A.)&sr=|ModifiedDate|0|1
```
- `carid`를 URL에서 추출한 뒤, 이 API로 기본 정보 조회 가능
- 주요 응답 필드:
  | 필드 | 설명 |
  |------|------|
  | `Id` | 차량 고유 ID |
  | `Manufacturer` | 제조사 (예: 현대, 기아) |
  | `Model` | 모델명 |
  | `Badge` | 트림 |
  | `Year` | 연식 (YYYYMM 형태의 float) |
  | `FormYear` | 형식 연도 |
  | `Mileage` | 주행거리 (km) |
  | `Price` | 가격 (만원) |
  | `FuelType` | 연료 |
  | `Transmission` | 변속기 |
  | `Photos` | 이미지 경로 배열 (`/carpictureXX/...` 형태) |
  | `OfficeCityState` | 매물 지역 |
- **이미지 베이스 URL**: `https://ci.encar.com` + Photos[].location
  - 예: `https://ci.encar.com/carpicture05/pic4125/41251057_001.jpg`

---

### ② 차량 이력 조회 API (소유자/사고/침수/전손)
```
GET https://api.encar.com/v1/readside/record/vehicle/{carid}/open
    ?vehicleNo={차량번호}
```
- **차량번호는 성능점검 API(③)에서 먼저 얻어야 함**
- 주요 응답 필드:
  | 필드 | 설명 |
  |------|------|
  | `ownerChangeCnt` | 소유자 변경 횟수 |
  | `ownerChanges` | 소유자 변경 날짜 배열 |
  | `myAccidentCnt` | 내 차 사고 횟수 |
  | `otherAccidentCnt` | 상대 차 사고 횟수 |
  | `myAccidentCost` | 내 차 사고 수리비 합계 (원) |
  | `otherAccidentCost` | 상대 차 사고 수리비 합계 (원) |
  | `totalLossCnt` | 전손 횟수 |
  | `floodTotalLossCnt` | 침수 전손 횟수 |
  | `floodPartLossCnt` | 침수 부분손 횟수 |
  | `business` | 영업용 이력 (0/1) |
  | `government` | 관용 이력 (0/1) |
  | `accidents` | 사고 상세 목록 (날짜, 수리비 세부항목) |
  | `carInfoUse1s` / `carInfoUse2s` | 용도 이력 코드 배열 |

  > ⚠️ `accidents[].type` 코드 의미:
  > - `"1"` = 내 차 피해
  > - `"2"` = 상대 차 피해
  > - `"3"` = 양쪽 피해

---

### ③ 성능점검 이력 API (외관 파츠 교환/판금 + 내부 상태)
```
GET https://api.encar.com/v1/readside/inspection/vehicle/{carid}
```
- 주요 응답 필드:
  | 필드 | 설명 |
  |------|------|
  | `master.detail.vin` | VIN (차대번호) |
  | `master.detail.mileage` | 점검 당시 주행거리 |
  | `master.detail.colorType` | 색상 |
  | `master.simpleRepair` | 단순 외판 수리 여부 |
  | `master.accdient` | 사고 이력 여부 (성능점검 기준) |
  | `master.detail.waterlog` | 침수 여부 |
  | `outers` | 외판 파츠별 상태 (`NORMAL` / `REPLACEMENT` / `PANEL_WORK`) |
  | `inners` | 엔진/변속기/조향/제동 등 내부 부품 상태 |
  | `inspectionSource.registrantId` | 판매자 ID → 판매자 API에 활용 |

  > ⚠️ VIN으로 차량번호를 직접 얻을 수는 없음. `record/open` API 호출 시 vehicleNo가 필요하나,
  > 성능점검 `master.detail.recordNo` 또는 차량 목록 API의 조건으로 우회 가능성 검토 필요.
  > **→ 우선은 carid만으로 record API 호출 가능한지 테스트 예정 (vehicleNo 없이 호출)**

---

### ④ 판매자 정보 API
```
GET https://api.encar.com/v1/readside/user/{userId}
```
- `userId`는 성능점검 API의 `inspectionSource.registrantId` 에서 추출
- 주요 응답 필드:
  | 필드 | 설명 |
  |------|------|
  | `userName` | 판매자 이름 |
  | `userType` | 딜러/개인 구분 |
  | `joinedDatetime` | 엔카 가입일 (오래될수록 신뢰도 ↑) |
  | `companyList[].companyName` | 소속 업체명 |
  | `companyList[].address` | 주소 |
  | `salesStatus.totalSales` | 총 판매 대수 |
  | `salesStatus.currentlyOnSales` | 현재 판매 중 대수 |

---

## 기술 스택

| 구분 | 선택 | 이유 |
|------|------|------|
| 프론트엔드 | Vite + React + TypeScript | 결정된 스택 |
| 스타일 | Tailwind CSS | 빠른 UI 구성, 유틸리티 퍼스트 |
| 백엔드 | Node.js + Express | CORS 우회 프록시 서버 역할 |
| HTTP 클라이언트 | axios | 프론트·백 공통 사용 |

> **백엔드가 필요한 이유**: 엔카 API는 브라우저에서 직접 호출 시 CORS 차단될 가능성이 높음.
> 백엔드가 엔카 API를 호출하고 프론트에 전달하는 프록시 역할을 담당.

---

## 프로젝트 파일 구조

```
used-car/
├── frontend/                   # Vite + React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx        # 홈화면 (엔카/케이카 선택)
│   │   │   └── CarDetail.tsx   # 차량 상세 조회 결과 페이지
│   │   ├── components/
│   │   │   ├── SearchInput.tsx       # URL 입력 폼
│   │   │   ├── CarBasicInfo.tsx      # 기본 차량 정보 카드
│   │   │   ├── AccidentHistory.tsx   # 사고/보험 이력 섹션
│   │   │   ├── InspectionPanel.tsx   # 외판/내부 성능점검 섹션
│   │   │   └── SellerInfo.tsx        # 판매자 정보 카드
│   │   ├── api/
│   │   │   └── encar.ts        # 백엔드 API 호출 함수 모음
│   │   ├── types/
│   │   │   └── encar.ts        # 엔카 API 응답 타입 정의
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
│
├── backend/                    # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   │   └── encar.ts        # /api/encar/* 라우트
│   │   ├── services/
│   │   │   └── encarService.ts # 엔카 API 호출 로직
│   │   └── index.ts            # Express 서버 진입점
│   └── package.json
│
├── docs/
│   ├── features/
│   └── plans/
├── ENCAR-API.md
├── Agents.md
└── README.md
```

---

## 구현 순서 (Task List)

### Task 1 — 프로젝트 초기화
- [ ] `frontend/` — Vite + React + TypeScript 프로젝트 생성
- [ ] `frontend/` — Tailwind CSS 설치 및 설정
- [ ] `backend/` — Express + TypeScript 프로젝트 생성
- [ ] `backend/` — axios, cors 패키지 설치

### Task 2 — 백엔드: 엔카 API 프록시
- [ ] `GET /api/encar/car/:carid` → 차량 기본 정보 (검색 API 활용)
- [ ] `GET /api/encar/record/:carid` → 차량 이력 (소유자/사고/침수/전손)
- [ ] `GET /api/encar/inspection/:carid` → 성능점검 이력
- [ ] `GET /api/encar/seller/:userId` → 판매자 정보

### Task 3 — 프론트엔드: 홈화면
- [ ] 엔카/케이카 선택 버튼 2개 UI
- [ ] 케이카 버튼 "준비중" 비활성화 처리
- [ ] 엔카 선택 시 URL 입력창 표시

### Task 4 — 프론트엔드: URL 파싱 및 API 연동
- [ ] `https://fem.encar.com/cars/detail/{carid}` 에서 carid 추출 로직
- [ ] 4개 API 병렬 호출 (Promise.all)
- [ ] 로딩 상태 및 에러 처리 UI

### Task 5 — 프론트엔드: 차량 상세 결과 페이지 UI
- [ ] 차량 대표 이미지 + 기본 정보 카드
- [ ] 사고/보험 이력 섹션 (사고 횟수, 비용, 소유자 변경, 영업용 이력)
- [ ] 외판 상태 섹션 (교환/판금 파츠 시각화)
- [ ] 판매자 정보 카드 (가입일, 총 판매 수)

---

## 데이터 흐름

```
사용자 URL 입력
  https://fem.encar.com/cars/detail/41031559
          ↓ carid 추출: 41031559
          ↓
프론트엔드 (React)
  ↓ 백엔드에 4개 API 요청 (병렬)
          ↓
백엔드 (Express 프록시)
  ├── 엔카 검색 API → 기본 정보 + 이미지
  ├── 성능점검 API → 외판 상태 + 판매자 ID 추출
  ├── 이력 API    → 사고/소유자/침수/전손
  └── 판매자 API  → 판매자 신뢰도 정보
          ↓
프론트엔드에서 조합하여 UI 렌더링
```

---

## 리스크 및 고려사항

| 항목 | 내용 | 대응 방안 |
|------|------|-----------|
| `record` API vehicleNo 필수 여부 | 차량번호 없이 호출 가능한지 미확인 | Task 2에서 vehicleNo 없이 먼저 테스트 |
| 이미지 CORS | `ci.encar.com` 이미지 직접 사용 시 차단 가능성 | 원본 URL 그대로 사용 (결정된 사항), 차단 시 img referrerpolicy 속성으로 우회 |
| carid가 판매 종료된 경우 | 이미 삭제된 매물 조회 시 API 오류 | 각 API별 404/에러 개별 처리 |
| 비공개 API 변경 가능성 | 엔카 내부 API는 공식 지원 아님 | 에러 핸들링을 넉넉히, API 변경 시 빠른 수정 대응 |

---

## 미결 사항 (피드백 요청)

- [ ] **`record` API를 vehicleNo 없이 호출 가능한지** → Task 2 시작 전 테스트 진행 예정, 결과 공유 후 구현
- [x] **외판 파츠 시각화 수준** — 차량 도식 이미지 위에 오버레이로 표시 시도해보고 이상하면 텍스트 목록으로 표시
- [x] **백엔드 포트** — frontend: 5173, backend: 3000 으로 기본값 사용
