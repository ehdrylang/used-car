# KCAR 카테고리 트리/판매상품 리스트 UX 개선 구현 계획서

## 문서 목적
- `docs/features/kcar-drct-list-ux-improvements.md`의 5개 요구사항을 구현 가능한 독립 단위로 분해한다.
- 본 문서는 `.codex/AGENTS.md`의 2단계(Implementation Plan) 산출물이다.

## 기술 스택 및 선택 이유
- 기존 스택 유지, 최소 변경 원칙을 적용한다.

### Frontend
- Vanilla JavaScript (`frontend/app.js`)
  - 이유: 현재 트리 상태/이벤트/렌더링이 단일 상태 객체 중심으로 구성되어 있어 페이징과 선택 정책을 같은 흐름에서 확장하기 적합하다.
- CSS (`frontend/styles.css`)
  - 이유: 리스트 카드/페이징 컨트롤 UI는 기존 컴포넌트 스타일 체계 내에서 확장 가능하다.

### Backend
- Node.js `node:http` 프록시 (`backend/src/server.js`)
  - 이유: 현재 `/api/kcar/drct-list`가 KCAR 원본 `data`를 전달하므로, 프론트 페이징 UI에 필요한 필드를 이미 제공한다.
  - 계획 범위에서는 백엔드 계약 변경 없이 진행한다.

## 구현 정책
- 기능을 Unit A~E로 분할해 순차 구현하되, 각 Unit은 단독 검증 가능해야 한다.
- 기존 트리 단계/요약/오류 상태의 회귀를 방지한다.
- 신규 로직은 가능한 한 `appState`와 기존 `requestSeq` 패턴을 재사용한다.

## 파일/모듈 구조 (계획)
- `frontend/app.js`
  - `drct` 페이징 상태 추가 (`currentPage`, `totalCount`, `totalPageCount`, `pageLimit`)
  - `fetchDrctList`에 페이지 인자 반영
  - 트리 정렬 함수 교체(이름 오름차순)
  - 상위 카테고리 재선택 시 하위 해제 규칙 정교화
  - 리스트 헤더 총건수/카드 메타 표시 확장
- `frontend/kcar-enc.js`
  - `createDrctPlainParam`에 `pageno` 주입 가능하도록 인터페이스 확장
- `frontend/styles.css`
  - 페이지 네비게이션, 카드 썸네일/메타 2줄 레이아웃 스타일 추가
- `docs/apis/kcar-backend-api-contract.md` (필요 시)
  - `drct` 응답의 페이징 관련 필드 사용 기준 보강

## 구현 순서 및 단계별 할 일 (Task List)
1. Unit A: 판매상품 리스트 페이징 연동
- 계획 파일: `docs/plans/kcar-drct-list-ux-improvements/drct-pagination-plan.md`
- 목표: `pageno` 기반 조회 + 페이지 이동 UI + 상태 동기화

2. Unit B: 카테고리 트리 오름차순 정렬
- 계획 파일: `docs/plans/kcar-drct-list-ux-improvements/tree-sort-asc-plan.md`
- 목표: 1~4차 노드 정렬 기준을 이름 오름차순으로 통일

3. Unit C: 카테고리 자유 선택(상위 재선택)
- 계획 파일: `docs/plans/kcar-drct-list-ux-improvements/tree-reselect-reset-plan.md`
- 목표: 상위 노드 클릭 시 하위 선택 해제와 트리 노출 상태 일관성 보장

4. Unit D: 총 수량 표시 정확화
- 계획 파일: `docs/plans/kcar-drct-list-ux-improvements/drct-total-count-plan.md`
- 목표: 리스트 헤더를 `rows.length` 기준에서 `totalCnt` 기준으로 전환

5. Unit E: 판매상품 카드 핵심 정보 확장
- 계획 파일: `docs/plans/kcar-drct-list-ux-improvements/drct-card-info-plan.md`
- 목표: 가격 외 식별 핵심 정보(이미지/차번호/연식/주행거리/연료/변속기) 노출

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. 4차 카테고리 선택 후 1페이지를 조회한다.
2. 페이지 이동 버튼으로 2페이지 이상을 조회한다.
3. 상위 카테고리를 다시 선택해 페이지/결과 초기화를 확인한다.
4. 각 상태(loading, success, empty, error)에서 UI가 일관되게 표시되는지 확인한다.

### 확인 필드
- 요청 평문 파라미터(암호화 전)
  - `pageno`, `limit`, `wr_in_multi_mnuftr_modelGrp_model_grd`
- 응답 필드
  - `data.totalCnt`, `data.pageNo`, `data.limit`, `data.totalPageCnt`, `data.rows[]`
- 카드 표시 후보 필드
  - `msizeImgPath`, `ssizeImgPath`, `carWhlNm`, `prc`, `cno`, `prdcnYr`, `milg`, `fuelNm`, `trnsmsnNm`

## 리스크 및 고려 사항
- 페이징 버튼 연타 시 요청 경합(race condition) 가능성
  - 대응: `requestSeq.drct`로 최신 요청만 반영
- 정렬 기준 변경으로 사용자가 체감하는 목록 순서가 크게 바뀔 수 있음
  - 대응: 명시적으로 오름차순 정책 고정
- 필드 누락 차량의 카드 렌더링 품질 저하 가능성
  - 대응: 필드별 fallback 규칙 정의
- 이미지 로드 실패 시 UI 깨짐 위험
  - 대응: 기본 플레이스홀더/텍스트 fallback 적용

## 완료 정의 (Definition of Done)
- Unit A~E가 각각 단독으로 검증 가능하고, 통합 시 요구사항 5개를 모두 만족한다.
- 기존 트리 조회 플로우(브랜드→모델군→모델→등급)가 회귀 없이 유지된다.
- `drct` 결과의 페이지/총건수/핵심 메타가 사용자 관점에서 명확히 보인다.
