# KCAR 조회용 백엔드 프록시 서버 기능 정의서

## 기능 개요 (무엇을, 왜)
- 프론트엔드가 KCAR 외부 API를 브라우저에서 직접 호출할 때 발생하는 CORS 문제를 해결하기 위해 백엔드 프록시 서버를 도입한다.
- 프론트엔드는 이후 외부 도메인 대신 내부 API(`/api/kcar/...`)를 호출하고, 백엔드가 KCAR API를 대리 호출한다.
- 본 기능은 현재 구현된 `브랜드 선택 단계`를 안정적으로 동작시키고, 다음 단계(모델/매물 조회) 확장을 위한 공통 API 게이트웨이 기반을 만든다.

## 사용자 시나리오
1. 사용자가 첫 화면에서 `kcar` 버튼을 클릭한다.
2. 프론트엔드는 백엔드의 `/api/kcar/brands`를 호출한다.
3. 백엔드는 KCAR 브랜드 API를 호출해 결과를 받는다.
4. 백엔드는 프론트엔드에 브랜드 데이터를 반환한다.
5. 프론트엔드는 좌측 브랜드 목록을 정상 렌더링한다.
6. 외부 API 장애/지연이 있으면 백엔드는 표준 에러 응답을 반환하고, 프론트엔드는 오류 안내와 재시도를 제공한다.

## 주요 데이터/인터페이스 개요

### 프론트엔드 -> 백엔드 인터페이스
- Endpoint: `POST /api/kcar/brands`
- Request Body
```json
{
  "sellType": "ALL"
}
```
- 기본값 규칙
  - `sellType` 미전달 시 `ALL`로 처리

### 백엔드 -> KCAR 외부 API 인터페이스
- Endpoint: `POST https://api.kcar.com/bc/search/group/mnuftr`
- Headers
  - `Accept: application/json, text/plain, */*`
  - `Content-Type: application/json`
- Request Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd"
}
```

### 백엔드 응답 계약 (프론트 표준)
- 성공
```json
{
  "success": true,
  "data": [
    {
      "mnuftrCd": "001",
      "pathNm": "현대",
      "carType": "KOR",
      "count": 2640
    }
  ],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T00:00:00.000Z"
  }
}
```
- 실패
```json
{
  "success": false,
  "error": {
    "code": "UPSTREAM_ERROR",
    "message": "KCAR API 호출에 실패했습니다."
  }
}
```

### 에러 코드 규칙
- `UPSTREAM_ERROR`: KCAR API 응답 오류(5xx/비정상 body)
- `TIMEOUT`: KCAR API 타임아웃
- `BAD_REQUEST`: 잘못된 요청 파라미터
- `INTERNAL_ERROR`: 서버 내부 예외

## 예상 범위
### 포함 범위 (In Scope)
- KCAR 브랜드 조회용 백엔드 API 1개(`/api/kcar/brands`) 구현
- CORS 허용 정책 설정(프론트 개발/운영 도메인)
- 요청 타임아웃 및 예외 처리
- 표준 에러 응답 포맷 정의
- 최소 로깅(요청 ID, 응답시간, 에러 코드)
- 환경변수 기반 설정(포트, 타임아웃, KCAR base URL)

### 제외 범위 (Out of Scope)
- 인증/인가(JWT, 세션 등)
- DB 저장/캐시(Redis 등)
- ENCAR 프록시 API 구현
- 모델/매물 상세 API 프록시 구현
- 레이트리밋/서킷브레이커 고도화

## 비기능 요구사항
- 응답시간 목표: 정상 응답 기준 p95 2초 이내(외부 API 상황 제외)
- 타임아웃: 업스트림 호출 최대 5초
- 보안: CORS 허용 origin 화이트리스트 관리
- 관측성: 서버 에러 로그에서 원인 분류 가능해야 함

## 의존성 및 전제
- KCAR 외부 API 스펙은 `KCAR-API.md` 및 `docs/apis/kcar-brand-api-observation.md`를 기준으로 한다.
- 프론트엔드는 KCAR 직접 호출을 중단하고 백엔드 경로 호출로 전환한다.

## 비고
- 본 문서는 `.codex/AGENTS.md`의 1단계(Feature Spec) 산출물이다.
- 다음 단계에서 `docs/plans/`에 구현 계획서와 sub task 계획서를 작성한다.
