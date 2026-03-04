# KCAR 카테고리 트리형 선택 UI 구현 계획서

## 문서 목적
- `docs/features/platform-selector-kcar-category-tree-step.md`를 구현 가능한 작업 단위로 분해한다.
- 본 문서는 `.codex/AGENTS.md`의 2단계(Implementation Plan) 산출물이다.

## 기술 스택 및 선택 이유
- 기존 코드 구조를 유지하며 최소 변경으로 트리 UI를 도입한다.

### 현재 스택 기준
- Frontend: Vanilla JavaScript + HTML + CSS
  - 이유: 현재 `frontend/app.js`의 상태 기반 렌더링 구조를 트리 노드 렌더링으로 확장 가능.
- Backend: Node.js `node:http`
  - 이유: 기존 카테고리 API 프록시(`/api/kcar/*`)를 재사용하며 계약 변경 최소화 가능.
- Fetch API
  - 이유: 노드 확장 시점 lazy load 호출을 단순하게 구성 가능.

## 기능 정책 (이번 사이클 추가)
- `count=0` 항목은 카테고리 트리에서 표시하지 않는다.
- 필터링 기준은 1~4차 공통이며, 실제 렌더링 이전 단계에서 제거한다.
- API 원본 응답은 유지하고 UI 표시 데이터만 필터링한다.

## 파일/모듈 구조 (계획)
- `frontend/app.js`
  - 트리 노드 상태 모델/선택 경로/펼침 상태/노드별 로딩 상태 추가
  - depth별 lazy load 및 count 필터링 로직 구현
- `frontend/styles.css`
  - 들여쓰기 트리 스타일, compact 행 높이, 패널 고정 높이/내부 스크롤, 선택 경로 강조
- `docs/apis/kcar-category-api-observation.md`
  - count=0 데이터 존재 여부와 필터링 기준 문서화 보강
- `README.md`
  - 트리형 카테고리 UI 및 count=0 미노출 정책 반영

## 구현 순서 및 단계별 할 일 (Task List)
1. Task 1: 트리 노드 모델 및 count 필터링 정책 확정
- 계획 파일: `docs/plans/platform-selector-kcar-category-tree-step/tree-node-model-and-filter-plan.md`
- 목표: depth/노드 키/선택 경로/펼침 상태 모델과 `count > 0` 필터 기준 확정

2. Task 2: 노드 단위 lazy load 상태 흐름 구현
- 계획 파일: `docs/plans/platform-selector-kcar-category-tree-step/tree-lazy-loading-state-plan.md`
- 목표: 1차 클릭 시 2차, 2차 클릭 시 3차, 3차 클릭 시 4차 로드 및 race condition 방지

3. Task 3: 트리 렌더링/들여쓰기/y축 최적화 UI 구현
- 계획 파일: `docs/plans/platform-selector-kcar-category-tree-step/tree-rendering-layout-plan.md`
- 목표: 단일 트리 패널에서 많은 항목을 읽기 좋게 표시하고 스크롤 사용성 확보

4. Task 4: 선택 경로/재탐색 상호작용 및 요약 연동
- 계획 파일: `docs/plans/platform-selector-kcar-category-tree-step/tree-selection-summary-flow-plan.md`
- 목표: 선택 경로 강조, 접기/펼치기 재탐색, 우측 요약 동기화

5. Task 5: QA/접근성/회귀 검증
- 계획 파일: `docs/plans/platform-selector-kcar-category-tree-step/qa-accessibility-plan.md`
- 목표: 트리 상호작용, count=0 미노출, 키보드 접근성, 모바일 스크롤 동작 검증

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. `/api/kcar/brands|model-groups|models|grades` 실호출로 `count=0` 포함 데이터를 확인한다.
2. 프론트 트리 빌드 단계에서 `count <= 0` 항목이 제거되는지 확인한다.
3. 노드 확장/접기 반복 시 하위 데이터 재사용/재호출 정책이 의도대로 동작하는지 검증한다.
4. 상위 노드 변경 시 하위 선택 경로가 올바르게 갱신되는지 확인한다.

### 필수 확인 필드
- 공통: `success`, `data[]`, `count`
- 2차: `modelGrpCd`, `modelGrpNm`
- 3차: `modelCd`, `modelNm`, `prdcnYear`
- 4차: `grdCd`, `grdNm`

## 리스크 및 고려 사항
- 트리 항목 수가 많아지면 DOM 렌더링 비용과 스크롤 점프 이슈가 발생할 수 있음
- 노드 펼침/접기 상태와 선택 경로 동기화가 어긋나면 UX 혼란 가능성
- `count=0` 제거 정책으로 특정 브랜드에서 하위 카테고리가 비어 보일 수 있어 안내 문구 필요

## 완료 정의 (Definition of Done)
- 1~4차 카테고리가 단일 트리 UI에서 들여쓰기 형태로 탐색 가능
- `count=0` 항목이 어느 depth에서도 표시되지 않음
- 노드별 로딩/오류/빈 상태와 재시도 동작이 정상
- 선택 경로와 우측 요약이 항상 일치
