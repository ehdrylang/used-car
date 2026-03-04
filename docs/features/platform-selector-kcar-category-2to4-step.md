# KCAR 2차/3차/4차 카테고리 선택 기능 정의서

## 기능 개요 (무엇을, 왜)
- 현재 구현된 1차 카테고리(브랜드) 선택 이후, KCAR 조회 플로우를 2차/3차/4차 카테고리까지 확장한다.
- 2차는 `모델군(modelGrp)`, 3차는 `세부 모델(model)`, 4차는 `등급/트림(grd)` 선택 단계로 제공한다.
- 사용자가 브랜드만 선택한 상태에서 멈추지 않고, 실제 매물 조회 직전까지 필요한 상세 조건을 단계적으로 좁힐 수 있게 한다.

## 사용자 시나리오
1. 사용자가 `kcar` 화면에서 브랜드를 선택한다.
2. 시스템은 선택한 브랜드 기준 2차 카테고리(모델군) 목록을 조회해 표시한다.
3. 사용자가 모델군을 선택한다.
4. 시스템은 브랜드+모델군 기준 3차 카테고리(세부 모델) 목록을 조회해 표시한다.
5. 사용자가 세부 모델을 선택한다.
6. 시스템은 브랜드+모델군+세부 모델 기준 4차 카테고리(등급/트림) 목록을 조회해 표시한다.
7. 사용자가 등급/트림을 선택하면, 우측 요약 영역에 1~4차 선택값이 모두 반영된다.

## 주요 데이터/인터페이스 개요

### 화면 인터페이스
- KCAR 화면 좌측 패널을 4단계 선택 UI로 확장
  - 1차: 브랜드 (`mnuftrCd`, 기존 구현)
  - 2차: 모델군 (`modelGrpCd`, `modelGrpNm`)
  - 3차: 세부 모델 (`modelCd`, `modelNm`, `prdcnYear`)
  - 4차: 등급/트림 (`grdCd`, `grdNm`)
- 우측 패널
  - 현재 선택된 1~4차 조건 요약
  - 아직 선택되지 않은 단계 안내 문구 표시

### 외부 API 인터페이스 (KCAR Upstream)
- 2차 카테고리 (모델군)
  - Endpoint: `POST https://api.kcar.com/bc/search/group/modelGrp`
  - 필수 요청값: `wr_eq_sell_dcd`, `wr_in_multi_columns`, `wr_eq_mnuftr_cd`
  - 주요 응답 필드: `modelGrpCd`, `modelGrpNm`, `mnuftrCd`, `count`
- 3차 카테고리 (세부 모델)
  - Endpoint: `POST https://api.kcar.com/bc/search/group/model`
  - 필수 요청값: `wr_eq_sell_dcd`, `wr_in_multi_columns`, `wr_eq_mnuftr_cd`, `wr_eq_model_grp_cd`
  - 주요 응답 필드: `modelCd`, `modelNm`, `prdcnYear`, `modelGrpCd`, `count`
- 4차 카테고리 (등급/트림)
  - Endpoint: `POST https://api.kcar.com/bc/search/group/grd`
  - 필수 요청값: `wr_eq_sell_dcd`, `wr_in_multi_columns`, `wr_eq_mnuftr_cd`, `wr_eq_model_grp_cd`, `wr_eq_model_cd`
  - 주요 응답 필드: `grdCd`, `grdNm`, `modelCd`, `count`

### 내부 API 인터페이스 (백엔드 프록시 확장)
- `POST /api/kcar/model-groups`
  - Request: `{ "sellType": "ALL", "mnuftrCd": "001" }`
- `POST /api/kcar/models`
  - Request: `{ "sellType": "ALL", "mnuftrCd": "001", "modelGrpCd": "004" }`
- `POST /api/kcar/grades`
  - Request: `{ "sellType": "ALL", "mnuftrCd": "001", "modelGrpCd": "004", "modelCd": "199" }`
- 공통 응답 형태
  - `success`, `data[]`, `meta.source`, `meta.fetchedAt`
- 공통 에러 형태
  - `success: false`, `error.code`, `error.message`

### 화면 상태 데이터
- 선택 상태
  - `selectedBrandCode: string | null`
  - `selectedModelGroupCode: string | null`
  - `selectedModelCode: string | null`
  - `selectedGradeCode: string | null`
- 로딩 상태(단계별 분리)
  - `modelGroupLoadState: idle | loading | success | empty | error`
  - `modelLoadState: idle | loading | success | empty | error`
  - `gradeLoadState: idle | loading | success | empty | error`
- 상태 초기화 규칙
  - 브랜드 변경 시 2/3/4차 선택 및 목록 초기화
  - 모델군 변경 시 3/4차 선택 및 목록 초기화
  - 세부 모델 변경 시 4차 선택 및 목록 초기화

## 예상 범위
### 포함 범위 (In Scope)
- 2차/3차/4차 카테고리 API 프록시 엔드포인트 추가
- 단계별 파라미터 검증(`mnuftrCd`, `modelGrpCd`, `modelCd`) 및 에러 응답 처리
- 프론트엔드 단계별 목록 조회/선택 UI 구현
- 단계별 로딩/오류/빈 데이터 상태 처리
- 상위 선택 변경 시 하위 단계 초기화 처리
- 우측 영역 1~4차 선택 요약 표시

### 제외 범위 (Out of Scope)
- `drct` 매물 리스트 API 연동 및 실제 차량 목록 조회
- 복수 선택(멀티 셀렉트), 고급 필터(연식/주행거리/사고이력) 연동
- 정렬/추천 점수 계산 및 랭킹 로직
- 사용자 계정/저장/공유 기능

## 비고
- 본 문서는 `.codex/AGENTS.md`의 1단계(Feature Spec) 산출물이다.
- 다음 단계에서 `docs/plans/platform-selector-kcar-category-2to4-step-plan.md` 및 하위 Task 계획 문서를 작성한다.
