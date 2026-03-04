# KCAR 백엔드 프록시 API 계약 문서

## 검증 일시
- 2026-03-04 (Asia/Seoul)

## 서버 정보
- Base URL: `http://127.0.0.1:8787`
- 공통 성공 응답
```json
{
  "success": true,
  "data": [],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T08:23:34.273Z"
  }
}
```
- 공통 실패 응답
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "요청 오류 메시지"
  }
}
```

## CORS 검증
### 허용 Origin preflight
- Request
```http
OPTIONS /api/kcar/model-groups
Origin: http://localhost:4173
Access-Control-Request-Method: POST
```
- Response
  - Status: `204 No Content`
  - `Access-Control-Allow-Origin: http://localhost:4173`
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, X-Request-Id`

### 비허용 Origin preflight
- Request
```http
OPTIONS /api/kcar/grades
Origin: http://evil.local
Access-Control-Request-Method: POST
```
- Response
  - Status: `403 Forbidden`
  - Body: `CORS origin denied`

## 엔드포인트 계약

### 1) 브랜드 목록
- Endpoint: `POST /api/kcar/brands`
- Request
```json
{
  "sellType": "ALL"
}
```
- Response `200 OK` (예시)
```json
{
  "success": true,
  "data": [
    {
      "mnuftrCd": "001",
      "pathNm": "현대",
      "carType": "KOR",
      "count": 2676
    }
  ],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T08:23:34.273Z"
  }
}
```

### 2) 2차 카테고리(모델군)
- Endpoint: `POST /api/kcar/model-groups`
- Request
```json
{
  "sellType": "ALL",
  "mnuftrCd": "001"
}
```
- Response `200 OK` (예시)
```json
{
  "success": true,
  "data": [
    {
      "mnuftrCd": "001",
      "modelGrpCd": "068",
      "modelGrpNm": "ST1",
      "count": 0
    }
  ],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T08:23:34.273Z"
  }
}
```
- 필드 의미
  - `modelGrpCd`: 모델군 코드
  - `modelGrpNm`: 모델군 표시명
  - `count`: 해당 모델군 등록 매물 수

### 3) 3차 카테고리(세부 모델)
- Endpoint: `POST /api/kcar/models`
- Request
```json
{
  "sellType": "ALL",
  "mnuftrCd": "001",
  "modelGrpCd": "004"
}
```
- Response `200 OK` (예시)
```json
{
  "success": true,
  "data": [
    {
      "mnuftrCd": "001",
      "modelGrpCd": "004",
      "modelCd": "199",
      "modelNm": "그랜저 (GN7)",
      "prdcnYear": "(22년~현재)",
      "count": 43
    }
  ],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T08:23:35.188Z"
  }
}
```
- 필드 의미
  - `modelCd`: 세부 모델 코드
  - `modelNm`: 세부 모델명
  - `prdcnYear`: 생산연식/세대 문자열
  - `count`: 해당 세부 모델 등록 매물 수

### 4) 4차 카테고리(등급/트림)
- Endpoint: `POST /api/kcar/grades`
- Request
```json
{
  "sellType": "ALL",
  "mnuftrCd": "001",
  "modelGrpCd": "004",
  "modelCd": "199"
}
```
- Response `200 OK` (예시)
```json
{
  "success": true,
  "data": [
    {
      "mnuftrCd": "001",
      "modelGrpCd": "004",
      "modelCd": "199",
      "grdCd": "002",
      "grdNm": "가솔린 2.5",
      "count": 32
    }
  ],
  "meta": {
    "source": "kcar",
    "fetchedAt": "2026-03-04T08:23:35.962Z"
  }
}
```
- 필드 의미
  - `grdCd`: 등급/트림 코드
  - `grdNm`: 등급/트림 표시명
  - `count`: 해당 등급 등록 매물 수

## 실패 응답 검증
### 필수 파라미터 누락
- Request
```http
POST /api/kcar/model-groups
Content-Type: application/json

{"sellType":"ALL"}
```
- Response
  - Status: `400 Bad Request`
  - Body
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "mnuftrCd은(는) 필수입니다."
  }
}
```

## 추가 엔드포인트
### 헬스체크
- Request: `GET /health`
- Response
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "timestamp": "2026-03-04T08:23:33.954Z"
  }
}
```

## 운영 메모
- 프론트는 외부 KCAR URL이 아닌 내부 프록시(`/api/kcar/*`)를 호출한다.
- 허용 origin은 `ALLOWED_ORIGINS` 환경변수로 관리한다.
