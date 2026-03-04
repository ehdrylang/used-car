# 플랫폼 선택 및 KCAR 브랜드 선택 화면 기능 정의서

## 기능 개요 (무엇을, 왜)
- 본 기능은 서비스 첫 진입 지점에서 조회 플랫폼을 선택할 수 있도록 한다.
- 현재 단계에서는 `encar`는 준비 중으로 비활성화하고, `kcar`만 활성화하여 실제 조회 플로우를 시작한다.
- `kcar` 진입 후에는 좌측 패널에서 브랜드를 선택하는 단계까지 제공하여, 다음 단계(모델 선택)로 확장 가능한 기준 상태를 만든다.

## 사용자 시나리오
1. 사용자가 첫 화면에 진입한다.
2. 화면에는 `encar`, `kcar` 버튼 2개가 표시된다.
3. 사용자가 `encar` 버튼을 보면 비활성 상태이며 `제공예정`임을 인지한다.
4. 사용자가 `kcar` 버튼을 클릭한다.
5. 시스템은 KCAR 브랜드 목록을 조회한다.
6. 화면은 좌측에 브랜드 목록(국산/수입 구분)을 표시한다.
7. 사용자가 브랜드 하나를 선택한다.
8. 시스템은 선택된 브랜드 상태를 유지하고, 우측에는 다음 단계(모델 선택 예정) 안내를 보여준다.

## 주요 데이터/인터페이스 개요

### 화면 인터페이스
- 첫 화면
  - `encar` 버튼: 비활성, 클릭 동작 없음
  - `kcar` 버튼: 활성, 클릭 시 KCAR 브랜드 선택 화면으로 이동
- KCAR 브랜드 선택 화면
  - 좌측: 브랜드 목록 패널
  - 우측: 단계 안내 영역(모델 선택은 미구현)

### 외부 API 인터페이스 (KCAR 브랜드 목록)
- Endpoint: `POST https://api.kcar.com/bc/search/group/mnuftr`
- Request Body
```json
{
  "wr_eq_sell_dcd": "ALL",
  "wr_in_multi_columns": "cntr_rgn_cd|cntr_cd"
}
```
- 주요 응답 필드
  - `success`: 요청 성공 여부
  - `data[]`: 브랜드 목록 배열
  - `data[].mnuftrCd`: 브랜드 코드
  - `data[].pathNm`: 브랜드 표시명
  - `data[].carType`: `KOR`(국산), `IMP`(수입)
  - `data[].count`: 해당 브랜드 등록 매물 수

### 화면 상태 데이터
- `platform`: `home | kcar`
- `brandLoadState`: `idle | loading | success | empty | error`
- `selectedBrand`: `{ mnuftrCd, pathNm, carType } | null`

## 예상 범위
### 포함 범위 (In Scope)
- 첫 화면 플랫폼 버튼 2개 제공
- `encar` 비활성 처리 및 제공예정 표시
- `kcar` 선택 시 KCAR 브랜드 선택 화면 전환
- KCAR 브랜드 API 연동
- 브랜드 목록 국산/수입 구분 노출
- 브랜드 1개 선택 상태 반영
- 로딩/오류/빈 데이터 상태 처리

### 제외 범위 (Out of Scope)
- 브랜드 선택 이후 모델 목록 조회/선택
- 실제 매물 리스트 조회
- 상세 필터(용도이력, 소유주 변경이력 등)
- 정렬/랭킹 계산
- 사용자 로그인/저장 기능

## 비고
- 본 문서는 `.codex/AGENTS.md`의 1단계(Feature Spec) 산출물이다.
- 다음 단계에서는 `docs/plans/` 경로에 구현 계획 문서를 별도로 작성한다.
