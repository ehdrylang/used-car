# Sub Task Plan: KCAR 2/3/4차 백엔드 프록시 엔드포인트 확장

## 목표
- 기존 `/api/kcar/brands` 패턴을 재사용해 2/3/4차 카테고리 프록시 API를 추가한다.

## 작업 범위
- 엔드포인트 추가
  - `POST /api/kcar/model-groups`
  - `POST /api/kcar/models`
  - `POST /api/kcar/grades`
- 요청 바디 검증
  - `sellType`, `mnuftrCd`, `modelGrpCd`, `modelCd`
- 업스트림 호출/타임아웃/에러 처리
- 응답 정규화 및 `meta` 필드 일관성 유지

## 구현 순서
1. 공통 문자열 코드 검증 함수 추가
2. `modelGrp` 업스트림 호출 함수 구현
3. `model` 업스트림 호출 함수 구현
4. `grd` 업스트림 호출 함수 구현
5. 각 라우트에 요청 파싱/검증/응답 포맷 적용
6. API 계약 문서(`docs/apis/kcar-backend-api-contract.md`) 확장

## 완료 기준
- 3개 신규 엔드포인트가 200/400/502/504 케이스를 일관되게 반환한다.
- 입력 누락/타입 오류 시 `BAD_REQUEST`가 반환된다.
- 성공 응답이 프론트에서 바로 사용할 최소 필드 구조를 가진다.

## 의존성
- Task 1 API 관찰 문서

## 리스크
- 검증 규칙이 너무 엄격하면 정상 데이터도 거부될 수 있다.
