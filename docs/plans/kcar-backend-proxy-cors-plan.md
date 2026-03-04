# KCAR 조회용 백엔드 프록시 서버 구현 계획서

## 문서 목적
- `docs/features/kcar-backend-proxy-cors.md`를 구현 가능한 작업 단위로 분해한다.
- 본 문서는 `.codex/AGENTS.md`의 2단계(Implementation Plan) 산출물이다.

## 기술 스택 및 선택 이유
- 현재 저장소는 백엔드 실행 환경이 아직 없다.
- 구현 계획은 아래 가정 스택 기준으로 작성하며, 실제 구현 시작 전 확정한다.

### 가정 스택
- Node.js 20+
  - 이유: `fetch` 내장으로 업스트림 호출 구현 단순화.
- Express
  - 이유: API 라우팅, 미들웨어(CORS/에러 처리) 구성 속도와 가독성이 좋음.
- `cors` 미들웨어
  - 이유: 허용 origin 화이트리스트 정책을 안전하게 적용 가능.
- `zod` (또는 경량 validator)
  - 이유: 요청 바디 검증과 에러 코드(`BAD_REQUEST`) 일관성 확보.
- 테스트
  - `vitest` + `supertest`: API 단위 테스트
  - `nock` (선택): KCAR 업스트림 모킹

## 파일/모듈 구조 (계획)
- `backend/package.json`
- `backend/src/server.js` 또는 `backend/src/server.ts`
- `backend/src/app.js` (앱 조립)
- `backend/src/routes/kcar.routes.js`
- `backend/src/controllers/kcar.controller.js`
- `backend/src/services/kcar.service.js`
- `backend/src/lib/http-client.js`
- `backend/src/middlewares/error-handler.js`
- `backend/src/config/env.js`
- `backend/.env.example`
- `backend/tests/kcar-brands.spec.js`
- `docs/apis/kcar-backend-api-contract.md`

## 구현 순서 및 단계별 할 일 (Task List)
1. Task 1: 백엔드 프로젝트 골격 및 실행 환경 준비
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/bootstrap-backend-plan.md`
- 목표: 실행 가능한 서버 뼈대와 환경변수 체계 구성

2. Task 2: CORS/공통 미들웨어 및 에러 포맷 기반 구축
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/cors-and-error-baseline-plan.md`
- 목표: 허용 origin 정책과 표준 에러 응답 형식 확보

3. Task 3: KCAR 브랜드 프록시 API 구현
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/kcar-brands-endpoint-plan.md`
- 목표: `POST /api/kcar/brands` 요청 검증, 업스트림 호출, 응답 정규화

4. Task 4: API 계약 검증 및 관찰 문서 작성
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/api-validation-and-observation-plan.md`
- 목표: 로컬 API 실호출 결과와 응답 필드 의미 문서화

5. Task 5: 프론트 연동 전환 및 동작 확인
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/frontend-integration-switch-plan.md`
- 목표: 프론트 호출 경로를 내부 API로 전환하고 CORS 이슈 해소 확인

6. Task 6: 테스트/운영 준비 문서화
- 계획 파일: `docs/plans/kcar-backend-proxy-cors/testing-and-runbook-plan.md`
- 목표: 테스트 스위트, 실행 절차, 장애 대응 포인트 정리

## API 연동 테스트 방법 및 확인 필드
### 테스트 방법
1. 업스트림 KCAR API 테스트 호출로 최신 응답 형식 확인
2. 로컬 서버 실행 후 `POST /api/kcar/brands` 호출
3. CORS preflight(`OPTIONS`) 요청 동작 확인
4. 실패 시나리오(타임아웃/업스트림 실패/잘못된 바디) 확인
5. 결과를 `docs/apis/kcar-backend-api-contract.md`에 기록

### 확인할 응답 필드
- 성공 응답
  - `success` (boolean)
  - `data[]`
  - `data[].mnuftrCd`
  - `data[].pathNm`
  - `data[].carType`
  - `data[].count`
  - `meta.source`, `meta.fetchedAt`
- 실패 응답
  - `success`
  - `error.code` (`UPSTREAM_ERROR|TIMEOUT|BAD_REQUEST|INTERNAL_ERROR`)
  - `error.message`

## 리스크 및 고려 사항
- KCAR 업스트림 응답 변동 시 파싱 오류 가능성
- 운영 환경에서 허용 origin 설정 누락 시 재발 가능성
- 업스트림 지연/장애가 사용자 체감 품질에 직접 영향
- 타임아웃을 너무 짧게 잡으면 정상 요청도 실패할 수 있음
- 로깅에 민감 정보가 남지 않도록 마스킹 기준 필요

## 완료 정의 (Definition of Done)
- `/api/kcar/brands`가 CORS 환경에서 프론트 호출 가능
- 정상/오류 응답이 기능 정의서 계약과 일치
- API 실호출 관찰 문서와 실행 가이드가 최신화됨
- 프론트엔드에서 직접 KCAR 호출 코드가 제거 또는 비활성화됨
