# KCAR 브랜드 API 실호출 관찰 문서

## 호출 일시
- 2026-03-04 (Asia/Seoul)

## 요청 정보
- Method: `POST`
- URL: `https://api.kcar.com/bc/search/group/mnuftr`
- Headers
  - `Accept: application/json, text/plain, */*`
  - `Content-Type: application/json`
- Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd"
}
```

## 응답 정보
- HTTP Status: `200 OK`
- Content-Type: `application/json`
- 최상위 구조
  - `message`: null
  - `data`: array
  - `extraData`: object
  - `extraString`: null
  - `returnCode`: null
  - `success`: boolean

## 관찰 결과 요약
- `success = true`
- `data.length = 59`
- `carType` 값은 `KOR`, `IMP` 두 종류만 확인됨
- `count = 0` 인 항목도 다수 존재 (29개)

## 응답 필드 주석 (UI 사용 대상)
- `data[].mnuftrCd`:
  - 브랜드 식별 코드
  - 예: `"001"` (현대), `"012"` (BMW)
- `data[].pathNm`:
  - 화면 표시용 브랜드명
  - 예: `"현대"`, `"벤츠"`
- `data[].carType`:
  - 브랜드 그룹 구분값
  - `KOR`: 국산, `IMP`: 수입
- `data[].count`:
  - 해당 브랜드의 현재 등록 매물 수
  - 예: 현대 `2640`, BMW `816`, 폴스타 `0`

## 샘플 응답 (일부)
```json
{
  "message": null,
  "data": [
    {
      "path": "001",
      "carType": "KOR",
      "mnuftrNm": "현대",
      "mnuftrEnm": "Hyundai",
      "mnuftrType": "MAKE_TYPE010",
      "count": 2640,
      "mnuftrCd": "001",
      "pathNm": "현대"
    },
    {
      "path": "012",
      "carType": "IMP",
      "mnuftrNm": "BMW",
      "mnuftrEnm": "BMW",
      "mnuftrType": "MAKE_TYPE020",
      "count": 816,
      "mnuftrCd": "012",
      "pathNm": "BMW"
    }
  ],
  "extraData": {},
  "extraString": null,
  "returnCode": null,
  "success": true
}
```

## 구현 반영 메모
- UI에는 `mnuftrCd`, `pathNm`, `carType`, `count`만 우선 사용한다.
- `count=0` 브랜드도 표시 대상으로 유지한다.
- 그룹별 정렬은 `count` 내림차순, 동률 시 `pathNm` 오름차순으로 처리한다.
