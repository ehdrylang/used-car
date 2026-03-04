# KCAR 판매상품 리스트(`drct`) 조회용 `enc` 생성 기능 정의서

## 기능 개요 (무엇을, 왜)
- 카테고리 트리에서 4차(등급/트림)까지 선택되면 KCAR 판매상품 리스트 API(`/bc/search/list/drct`)를 호출한다.
- 이 API는 평문 JSON이 아니라 `enc` 필드(암호문 문자열)만 받기 때문에, 프론트에서 동일한 규칙으로 암호문을 생성해야 한다.
- 본 기능은 실제 KCAR 프론트 번들 동작과 동일한 인코딩 규칙으로 `enc`를 생성해, 선택 조건에 맞는 판매상품 리스트를 안정적으로 조회하는 것을 목표로 한다.

## 사용자 시나리오
1. 사용자가 카테고리 트리에서 브랜드(1차)~등급(4차)까지 선택한다.
2. 시스템은 선택값으로 조회 파라미터 객체를 구성한다.
3. 시스템은 파라미터 객체의 빈 값(Falsy)을 제거한다.
4. 시스템은 JSON 문자열을 AES-CBC(PKCS7)로 암호화한다.
5. 시스템은 Base64 문자열을 `{ enc: "<cipher>" }` 형태로 `drct` API에 전송한다.
6. 시스템은 응답된 판매상품 리스트를 화면에 반영한다.

## 주요 데이터/인터페이스 개요

### 인코딩 규칙 (확정)
- 직렬화: `JSON.stringify(setParam(param))`
  - `setParam` 규칙: 값이 Falsy(`""`, `null`, `undefined`, `0`, `false`)인 키는 제거
- 암호화 알고리즘: `AES-128-CBC`
- 패딩: `PKCS7`
- Key(UTF-8): `SKFJ2424DasfaJRI`
- IV(UTF-8): `sfq241sf3dscs321`
- 출력: Base64 문자열 (`CryptoJS.AES.encrypt(...).toString()`)

### 리스트 조회 요청 인터페이스
- Endpoint: `POST /bc/search/list/drct` (KCAR 사이트 기준)
- Request Body
```json
{
  "enc": "Base64 암호문"
}
```

### 평문 파라미터 구조 (최소 필수)
- `pageno`: `1`
- `limit`: `26` (KCAR 프론트 기본값)
- `orderFlag`: `true`
- `orderBy`: `time_deal_yn:desc|time_deal_end_dt:asc|event_ordr:asc|sort_ordr:asc`
- `wr_eq_sell_dcd`: `ALL`
- `wr_in_multi_columns`: `cntr_rgn_cd|cntr_cd`
- `wr_in_multi_mnuftr_modelGrp_model_grd`: `{mnuftrCd},{modelGrpCd},{modelCd},{grdCd}`

### 샘플 검증 결과 (복호화 기준)
- `현대 > 그랜저 > 그랜저(GN7) > 가솔린 2.5`
  - `wr_in_multi_mnuftr_modelGrp_model_grd = "001,004,199,002"`
- `현대 > 그랜저 > 그랜저(GN7) > 가솔린 3.5 2WD`
  - `wr_in_multi_mnuftr_modelGrp_model_grd = "001,004,199,003"`
- `현대 > 그랜저 > 더 뉴 그랜저 > 가솔린 2.5`
  - `wr_in_multi_mnuftr_modelGrp_model_grd = "001,004,171,001"`

## 예상 범위
### 포함 범위 (In Scope)
- 트리 선택값을 `drct` 평문 파라미터로 매핑
- Falsy 제거 후 JSON 직렬화
- AES-CBC(PKCS7) 기반 `enc` 생성
- `drct` API 호출 및 응답 리스트 렌더링 연결
- 암호화 실패/응답 실패 시 오류 처리

### 제외 범위 (Out of Scope)
- 정렬/페이징/추가 필터 UI 고도화
- KCAR 암호화 규칙 변경 대응 자동화
- 백엔드 대체 암호화 서비스 도입(이번 단계는 프론트 생성 유지)

## 비고
- 본 문서는 `.codex/AGENTS.md`의 1단계(Feature Spec) 산출물이다.
- 인코딩 규칙은 KCAR 프론트 번들의 `setEncParam -> setEncDef -> setEnc` 로직과 샘플 복호화 결과로 교차 검증했다.
