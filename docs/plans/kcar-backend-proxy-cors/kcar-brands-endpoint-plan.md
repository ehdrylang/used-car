# Sub Task Plan: KCAR 브랜드 프록시 API 구현

## 목표
- `POST /api/kcar/brands` 엔드포인트를 구현해 프론트의 KCAR 직접 호출을 대체한다.

## 작업 범위
- 요청 바디 검증 (`sellType` 기본값 포함)
- KCAR 업스트림 호출 서비스 구현
- 업스트림 응답에서 UI 필요 필드만 정규화
- 타임아웃/업스트림 실패 에러 매핑

## 구현 순서
1. 라우트와 컨트롤러 작성
2. 서비스 계층에서 KCAR API 호출
3. 응답 필드 매핑 (`mnuftrCd`, `pathNm`, `carType`, `count`)
4. `meta.source`, `meta.fetchedAt` 생성
5. 실패 코드 매핑(`UPSTREAM_ERROR`, `TIMEOUT`, `BAD_REQUEST`, `INTERNAL_ERROR`)

## 완료 기준
- 정상 요청에서 표준 성공 포맷 반환
- 실패 케이스에서 정의된 에러 코드 반환

## 의존성
- Task 2 CORS/에러 베이스라인

## 리스크
- 업스트림의 비정형 응답으로 런타임 파싱 실패 가능성.
