# Sub Task Plan: KCAR 2/3/4차 API 검증 및 관찰 문서화

## 목표
- 2차(`modelGrp`), 3차(`model`), 4차(`grd`) API를 실제 호출해 요청/응답 계약을 확정한다.

## 작업 범위
- 업스트림 API 실호출(curl) 수행
- 단계별 필수 파라미터 조합 검증
- 응답 필드 의미 정리 및 샘플 기록
- `docs/apis/kcar-category-api-observation.md` 문서 작성

## 구현 순서
1. 브랜드 코드(`mnuftrCd`)로 `modelGrp` API 호출
2. 모델군 코드(`modelGrpCd`)로 `model` API 호출
3. 세부모델 코드(`modelCd`)로 `grd` API 호출
4. 성공/빈 데이터/이상 값 케이스를 문서화
5. 프론트에서 사용할 필드만 별도 요약

## 확인 필드
- 2차: `modelGrpCd`, `modelGrpNm`, `mnuftrCd`, `count`
- 3차: `modelCd`, `modelNm`, `prdcnYear`, `modelGrpCd`, `count`
- 4차: `grdCd`, `grdNm`, `modelCd`, `count`
- 공통: `success`, `data`, `message`

## 완료 기준
- 실호출 기준 요청/응답 예시가 문서화되어 있다.
- 각 단계 UI 매핑 필드가 확정되어 있다.
- 예외/빈 데이터 처리 방향이 문서로 합의된다.

## 의존성
- 없음 (가장 먼저 수행)

## 리스크
- 업스트림 응답 필드 변동 시 문서 재검증이 필요하다.
