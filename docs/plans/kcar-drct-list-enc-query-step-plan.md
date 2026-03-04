# KCAR 판매상품 리스트(`drct`) `enc` 조회 구현 계획서

## 문서 목적
- `docs/features/kcar-drct-list-enc-query-step.md`를 구현 가능한 작업 단위로 분해한다.
- 본 문서는 `.codex/AGENTS.md`의 2단계(Implementation Plan) 산출물이다.

## 기술 스택 및 선택 이유
- 현재 저장소의 구조를 유지하며 최소 변경으로 구현한다.

### 현재 스택 기준
- Frontend: Vanilla JavaScript + HTML + CSS
  - 이유: 현재 `frontend/app.js` 트리 선택 상태를 그대로 활용해 `drct` 조회를 연결할 수 있다.
- Frontend Crypto: Web Crypto API (`crypto.subtle`, AES-CBC)
  - 이유: 별도 패키지 추가 없이 브라우저 내장 기능으로 AES-CBC 암호화를 구현 가능하다.
- Backend: Node.js `node:http` 프록시
  - 이유: 브라우저 CORS 이슈 없이 `/api/kcar/*` 경로로 일관된 호출이 가능하다.

## 구현 정책
- `enc` 생성은 프론트에서 수행한다.
- 암호화 규칙은 KCAR 번들과 동일하게 고정한다.
  - Key: `SKFJ2424DasfaJRI`
  - IV: `sfq241sf3dscs321`
  - Mode: AES-128-CBC, Padding: PKCS7
- Falsy 값 제거(`setParam`) 후 JSON 직렬화하여 암호화한다.
- 카테고리 선택 정책 유지
  - `count=0` 항목은 트리에서 계속 비노출
  - 기존 1~4차 선택/요약/오류 처리 기능은 회귀 없이 유지

## 파일/모듈 구조 (계획)
- `frontend/app.js`
  - 4차 선택 시 `drct` 조회 트리거 연결
  - 리스트 상태(`loading|success|empty|error`) 및 렌더링 상태 추가
- `frontend/kcar-enc.js` (신규)
  - `setParam`, JSON 직렬화, AES-CBC 암호화, Base64 변환 유틸
- `backend/src/server.js`
  - `POST /api/kcar/drct-list` 프록시 엔드포인트 추가
  - `{ enc }` 바디 검증 및 업스트림 `/bc/search/list/drct` 전달
- `docs/apis/kcar-backend-api-contract.md`
  - 신규 `drct-list` 엔드포인트 계약/예시 추가
- `docs/apis/kcar-category-api-observation.md` (필요 시)
  - `drct` 응답 필드 관찰 항목 추가

## 구현 순서 및 단계별 할 일 (Task List)
1. Task 1: `enc` 생성 유틸 및 샘플 재현 검증
- 계획 파일: `docs/plans/kcar-drct-list-enc-query-step/frontend-enc-builder-plan.md`
- 목표: 샘플 입력 대비 동일 `enc` 생성 또는 복호화 검증 가능한 기준 확보

2. Task 2: `drct` 백엔드 프록시 엔드포인트 구현
- 계획 파일: `docs/plans/kcar-drct-list-enc-query-step/backend-drct-proxy-plan.md`
- 목표: `/api/kcar/drct-list` 추가 및 요청 검증/에러 포맷 일관화

3. Task 3: 트리 선택과 `drct` 조회 흐름 연결
- 계획 파일: `docs/plans/kcar-drct-list-enc-query-step/tree-selection-drct-flow-plan.md`
- 목표: 4차 선택 완료 시 조회 실행, 상위 재선택 시 결과 초기화

4. Task 4: 판매상품 리스트 UI 렌더링
- 계획 파일: `docs/plans/kcar-drct-list-enc-query-step/drct-list-ui-plan.md`
- 목표: 로딩/오류/빈 데이터/성공 상태를 우측 패널에 표시

5. Task 5: QA/접근성/회귀 검증
- 계획 파일: `docs/plans/kcar-drct-list-enc-query-step/qa-accessibility-plan.md`
- 목표: 기존 카테고리 기능 유지 + 신규 `drct` 조회 동작 검증

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. 프론트 유틸로 생성한 `enc`를 백엔드 `/api/kcar/drct-list`에 전달한다.
2. 정상 응답(`200`) 및 에러 응답(`400`, `502`, `504`)을 확인한다.
3. 동일 카테고리 입력에서 조회 결과 재현성을 확인한다.
4. 상위 카테고리 변경 시 기존 리스트가 초기화되는지 확인한다.

### 확인 필드
- 요청
  - `enc` (Base64 문자열)
- 응답(공통)
  - `success`, `data`, `meta.source`, `meta.fetchedAt`
- 실패
  - `error.code`, `error.message`

## 리스크 및 고려 사항
- Web Crypto 구현 결과가 KCAR CryptoJS 결과와 일부 환경에서 차이날 가능성
- `setParam`의 Falsy 제거 규칙이 달라지면 `enc` 값이 달라질 수 있음
- `drct` 응답 데이터량이 많아 렌더링 성능 이슈 가능성

## 완료 정의 (Definition of Done)
- 4차 카테고리 선택 시 `drct` 리스트가 실제 조회된다.
- 기존 트리 카테고리 기능(선택/재탐색/요약/오류)이 정상 유지된다.
- `enc` 생성 규칙이 문서화된 기준과 일치한다.
- 신규 API 계약이 `docs/apis`에 최신 상태로 기록된다.
