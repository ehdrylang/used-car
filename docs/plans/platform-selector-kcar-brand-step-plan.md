# 플랫폼 선택 및 KCAR 브랜드 선택 화면 구현 계획서

## 문서 목적
- `docs/features/platform-selector-kcar-brand-step.md`를 구현 가능한 작업 단위로 분해한다.
- 본 문서는 2단계(Implementation Plan) 산출물이며, 코드 작성 전 합의용 계획 문서다.

## 기술 스택 및 선택 이유
- 현재 저장소에는 프론트엔드 런타임/프레임워크가 아직 없다.
- 구현 계획은 아래 "초기 스택 가정" 기준으로 작성하며, 구현 시작 전 개발자가 최종 확정한다.

### 초기 스택 가정
- React + TypeScript + Vite
  - 이유: 초기 화면/상태 기반 UI를 빠르게 구성하고 타입 안정성을 확보하기 쉬움.
- React Router
  - 이유: `home`(플랫폼 선택)와 `kcar`(브랜드 선택) 화면 전환을 명확히 분리 가능.
- Fetch API (또는 axios)
  - 이유: KCAR API 호출 1건 중심의 단순 네트워크 계층 구현 가능.
- 테스트: Vitest + React Testing Library
  - 이유: 컴포넌트 렌더링/상호작용/상태 전이를 단위 테스트로 검증 가능.

## 파일/모듈 구조 (계획)
- `src/pages/HomePlatformPage.tsx`
- `src/pages/KcarBrandPage.tsx`
- `src/components/PlatformSelector.tsx`
- `src/components/BrandSidebar.tsx`
- `src/services/kcarApi.ts`
- `src/types/kcar.ts`
- `src/state/kcarBrandState.ts` (혹은 페이지 로컬 상태)
- `docs/apis/kcar-brand-api-observation.md` (실제 호출 기반 응답 관찰 문서)

## 구현 순서 및 단계별 할 일 (Task List)
1. Task 1: 프로젝트 초기 구조 및 라우팅 골격 준비
- 산출물 계획: `docs/plans/platform-selector-kcar-brand-step/setup-routing-plan.md`
- 목표: Home/KCAR 페이지 라우팅 가능한 최소 앱 뼈대 확보

2. Task 2: 첫 화면 플랫폼 선택 UI 구현 계획
- 산출물 계획: `docs/plans/platform-selector-kcar-brand-step/home-platform-selector-plan.md`
- 목표: `encar` 비활성 + `kcar` 활성 동작 명세대로 반영

3. Task 3: KCAR 브랜드 API 계약 검증 및 문서화
- 산출물 계획: `docs/plans/platform-selector-kcar-brand-step/kcar-brand-api-validation-plan.md`
- 목표: 실제 호출 기준 요청/응답 스펙 문서화 및 예외 케이스 합의

4. Task 4: KCAR 브랜드 선택 화면/상태 처리 구현 계획
- 산출물 계획: `docs/plans/platform-selector-kcar-brand-step/kcar-brand-selection-ui-plan.md`
- 목표: 좌측 브랜드 목록(국산/수입), 선택 상태, 로딩/오류/빈 상태 처리

5. Task 5: 테스트/접근성/완료 기준 검증
- 산출물 계획: `docs/plans/platform-selector-kcar-brand-step/qa-accessibility-plan.md`
- 목표: AC 충족 여부, 접근성, 회귀 검증

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. `curl`로 KCAR 브랜드 API를 호출한다.
2. 상태코드/응답시간/응답 바디를 저장한다.
3. `docs/apis/kcar-brand-api-observation.md`에 요청/응답 예시를 기록한다.
4. 필드별 의미를 응답 값 기반으로 주석 처리한다.

### 필수 확인 필드
- 최상위: `success`, `message`, `data`
- 브랜드 항목: `mnuftrCd`, `pathNm`, `carType`, `count`
- 그룹값 검증: `carType`가 `KOR`/`IMP`로만 오는지 확인
- 예외값 검증: `count = 0` 데이터 존재 여부 확인

## 리스크 및 고려 사항
- CORS/차단 이슈: 브라우저에서 직접 호출 실패 가능성이 있어 프록시 또는 서버 중계 필요 가능성.
- API 응답 변동: 문서와 실제 필드가 불일치할 수 있어 사전 검증 필수.
- 무코드베이스 상태: 현재 프로젝트에 앱 골격이 없어서 초기 셋업 공수가 예상보다 클 수 있음.
- 브랜드 0건 정책: `count = 0` 노출 여부는 UX 정책 확정 필요.

## 완료 정의 (Definition of Done)
- Task 1~5 계획 문서 합의 완료
- 구현 시 AC 9개 항목을 모두 통과할 수 있는 검증 경로 확보
- API 관찰 문서가 최신 응답 기준으로 작성됨
