# KCAR 백엔드 프록시 API 계약 문서

## 검증 일시
- 2026-03-04 (Asia/Seoul)

## 서버 정보
- Base URL: `http://127.0.0.1:8787`
- Endpoint: `POST /api/kcar/brands`

## CORS 검증
### Preflight 요청
- Request
```http
OPTIONS /api/kcar/brands
Origin: http://localhost:4173
Access-Control-Request-Method: POST
```
- Response
  - Status: `204 No Content`
  - `Access-Control-Allow-Origin: http://localhost:4173`
  - `Access-Control-Allow-Methods: GET,POST,OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, X-Request-Id`

## 성공 응답 검증
### Request
```http
POST /api/kcar/brands
Content-Type: application/json
Origin: http://localhost:4173

{"sellType":"ALL"}
```

### Response
- Status: `200 OK`
- Body 구조
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
    "fetchedAt": "2026-03-04T07:10:36.787Z"
  }
}
```

### 필드 의미
- `success`: 요청 처리 성공 여부
- `data[]`: 브랜드 배열
- `data[].mnuftrCd`: 브랜드 코드
- `data[].pathNm`: 화면 표시명
- `data[].carType`: `KOR`(국산), `IMP`(수입)
- `data[].count`: 해당 브랜드 등록 매물 수
- `meta.source`: 업스트림 소스 식별자 (`kcar`)
- `meta.fetchedAt`: 백엔드가 응답 생성한 시각(ISO-8601)

## 실패 응답 검증
### 잘못된 파라미터
- Request
```http
POST /api/kcar/brands
Content-Type: application/json

{"sellType":123}
```
- Response
  - Status: `400 Bad Request`
  - Body
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "sellType은 문자열이어야 합니다."
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
    "timestamp": "2026-03-04T07:10:36.309Z"
  }
}
```

## 운영 메모
- 브라우저 CORS 해결을 위해 프론트는 외부 KCAR URL 대신 백엔드 `/api/kcar/brands`를 호출해야 한다.
- 허용 origin은 `ALLOWED_ORIGINS` 환경변수로 관리한다.
