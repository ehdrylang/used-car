# KCAR 2차/3차/4차 카테고리 선택 구현 계획서

## 문서 목적
- `docs/features/platform-selector-kcar-category-2to4-step.md`를 구현 가능한 작업 단위로 분해한다.
- 본 문서는 `.codex/AGENTS.md`의 2단계(Implementation Plan) 산출물이다.

## 기술 스택 및 선택 이유
- 현재 저장소는 다음 스택으로 동작 중이며, 기존 구조를 유지해 최소 변경으로 확장한다.

### 현재 스택 기준
- Frontend: Vanilla JavaScript + HTML + CSS
  - 이유: `frontend/app.js` 중심 단일 상태/렌더링 구조를 그대로 확장 가능.
- Backend: Node.js `node:http` 서버
  - 이유: 이미 `/api/kcar/brands`가 해당 방식으로 구현되어 있어 패턴 재사용이 가장 안전.
- Fetch API
  - 이유: 프론트-백엔드, 백엔드-업스트림 호출 모두 동일 방식으로 일관성 유지 가능.

## 파일/모듈 구조 (계획)
- `backend/src/server.js`
  - 2/3/4차 프록시 엔드포인트 추가
  - 공통 파라미터 검증 및 응답 정규화 함수 확장
- `frontend/app.js`
  - 2/3/4차 상태, fetch 함수, 상태 초기화 규칙, 렌더링 이벤트 처리 확장
- `frontend/styles.css`
  - 4단계 선택 UI를 위한 레이아웃/상태 스타일 추가
- `docs/apis/kcar-category-api-observation.md`
  - 업스트림 2/3/4차 API 실호출 결과 기록
- `docs/apis/kcar-backend-api-contract.md`
  - 내부 프록시 2/3/4차 엔드포인트 계약 확장

## 구현 순서 및 단계별 할 일 (Task List)
1. Task 1: 2/3/4차 KCAR 업스트림 API 검증 및 관찰 문서화
- 계획 파일: `docs/plans/platform-selector-kcar-category-2to4-step/kcar-category-api-validation-plan.md`
- 목표: `modelGrp`, `model`, `grd` 요청/응답 필드를 실호출 기준으로 확정

2. Task 2: 백엔드 프록시 엔드포인트 확장
- 계획 파일: `docs/plans/platform-selector-kcar-category-2to4-step/kcar-category-backend-endpoints-plan.md`
- 목표: `/api/kcar/model-groups`, `/api/kcar/models`, `/api/kcar/grades` 구현 및 입력 검증

3. Task 3: 프론트 상태/데이터 흐름 확장
- 계획 파일: `docs/plans/platform-selector-kcar-category-2to4-step/kcar-category-state-flow-plan.md`
- 목표: 단계별 로딩/선택 상태 관리, 상위 단계 변경 시 하위 초기화 규칙 반영

4. Task 4: 2/3/4차 선택 UI 및 상호작용 구현
- 계획 파일: `docs/plans/platform-selector-kcar-category-2to4-step/kcar-category-selection-ui-plan.md`
- 목표: 좌측 4단계 선택 UI + 우측 선택 요약 UI 구현

5. Task 5: QA/접근성/회귀 검증
- 계획 파일: `docs/plans/platform-selector-kcar-category-2to4-step/qa-accessibility-plan.md`
- 목표: 단계 전이, 오류 처리, 키보드 접근성, 모바일 레이아웃 검증

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. 업스트림 API를 `curl`로 호출하여 2/3/4차 응답 구조 확인
2. 로컬 백엔드 `/api/kcar/model-groups|models|grades` 호출 검증
3. 잘못된 요청 바디로 `BAD_REQUEST` 검증
4. 프론트에서 단계별 선택 시 API 체인 호출과 하위 상태 초기화 검증
5. 결과를 `docs/apis` 문서에 최신 기준으로 기록

### 필수 확인 필드
- 2차(모델군)
  - `modelGrpCd`, `modelGrpNm`, `mnuftrCd`, `count`
- 3차(세부 모델)
  - `modelCd`, `modelNm`, `prdcnYear`, `modelGrpCd`, `count`
- 4차(등급/트림)
  - `grdCd`, `grdNm`, `modelCd`, `count`
- 공통
  - `success`, `data[]`, `meta.source`, `meta.fetchedAt`
  - 실패 시 `error.code`, `error.message`

## 리스크 및 고려 사항
- 상위 단계 재선택 시 하위 단계 stale 상태가 남을 수 있어 명시적 초기화가 필요
- 단계가 늘어나면서 비동기 응답 순서 역전(race condition) 가능성 존재
- `count=0` 항목 노출 정책이 단계별로 일관되지 않으면 UX 혼란 발생
- 모바일에서 4단계 목록이 길어져 스크롤 사용성이 저하될 수 있음

## 완료 정의 (Definition of Done)
- 브랜드 선택 이후 2/3/4차까지 단계적으로 선택 가능
- 상위 선택 변경 시 하위 선택/목록이 올바르게 초기화됨
- 단계별 로딩/오류/빈 데이터 상태가 모두 동작
- 백엔드 API 계약 문서와 업스트림 관찰 문서가 최신 상태로 업데이트됨
