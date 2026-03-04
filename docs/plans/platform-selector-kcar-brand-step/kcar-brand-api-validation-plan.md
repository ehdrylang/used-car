# Sub Task Plan: KCAR 브랜드 API 검증 및 계약 문서화

## 목표
- KCAR 브랜드 조회 API를 실제 호출하여 요청/응답 계약을 검증하고 문서화한다.

## 작업 범위
- API 테스트 호출 수행
- 요청 헤더/바디/응답 구조 문서화
- 응답 필드 의미를 값 기반으로 주석 정리
- 이상 응답/예외 케이스 정리

## 구현 순서
1. `curl`로 브랜드 API 호출 (성공/실패 케이스 확인)
2. 응답 샘플 JSON 저장
3. `docs/apis/kcar-brand-api-observation.md` 작성
4. 필드별 의미와 UI 매핑 포인트 정리

## 확인 필드
- `success`, `message`, `data`
- `data[].mnuftrCd`, `data[].pathNm`, `data[].carType`, `data[].count`

## 완료 기준
- 최신 호출 결과가 문서로 기록되어 있다.
- UI 구현에 필요한 필드 계약이 확정되었다.
- 예외 상황 처리 방향(오류/빈 데이터)이 문서로 합의되었다.

## 의존성
- 없음 (Task 2와 병행 가능)

## 리스크
- 네트워크/CORS 제한으로 직접 호출이 불가능할 수 있음.
- API 응답 포맷 변동 시 재검증 필요.
