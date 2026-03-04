# KCAR 2/3/4차 카테고리 API 실호출 관찰 문서

## 호출 일시
- 2026-03-04 (Asia/Seoul)

## 요청/응답 요약

### 2차 카테고리 (모델군)
- Method: `POST`
- URL: `https://api.kcar.com/bc/search/group/modelGrp`
- Request Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd",
  "wr_eq_mnuftr_cd": "001"
}
```
- Response 요약
  - HTTP `200 OK`
  - `success = true`
  - `data.length = 40`
  - 첫 항목: `modelGrpCd=068`, `modelGrpNm=ST1`, `count=0`

### 3차 카테고리 (세부 모델)
- Method: `POST`
- URL: `https://api.kcar.com/bc/search/group/model`
- Request Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd",
  "wr_eq_mnuftr_cd": "001",
  "wr_eq_model_grp_cd": "004"
}
```
- Response 요약
  - HTTP `200 OK`
  - `success = true`
  - `data.length = 13`
  - 첫 항목: `modelCd=199`, `modelNm=그랜저 (GN7)`, `prdcnYear=(22년~현재)`, `count=43`

### 4차 카테고리 (등급/트림)
- Method: `POST`
- URL: `https://api.kcar.com/bc/search/group/grd`
- Request Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd",
  "wr_eq_mnuftr_cd": "001",
  "wr_eq_model_grp_cd": "004",
  "wr_eq_model_cd": "199"
}
```
- Response 요약
  - HTTP `200 OK`
  - `success = true`
  - `data.length = 6`
  - 첫 항목: `grdCd=002`, `grdNm=가솔린 2.5`, `count=32`

## 프론트 사용 필드 정리
- 2차
  - `modelGrpCd`: 모델군 식별 코드
  - `modelGrpNm`: 표시명
  - `count`: 매물 수
- 3차
  - `modelCd`: 세부 모델 식별 코드
  - `modelNm`: 표시명
  - `prdcnYear`: 세대/생산연식 안내 문자열
  - `count`: 매물 수
- 4차
  - `grdCd`: 등급/트림 식별 코드
  - `grdNm`: 표시명
  - `count`: 매물 수

## 구현 반영 메모
- 단계별 목록은 `count` 내림차순, 이름 오름차순 정렬 기준으로 표시한다.
- `count=0` 항목도 사용자 선택 가능 대상으로 유지한다.
- 상위 코드 변경 시 하위 코드 목록은 즉시 초기화한다.
