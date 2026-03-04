# Sub Task Plan: KCAR 2/3/4차 상태 관리 및 데이터 흐름 확장

## 목표
- 프론트 `appState`를 4단계 선택 플로우에 맞게 확장하고, 상태 전이 규칙을 명확히 한다.

## 작업 범위
- 선택 상태 추가
  - `selectedModelGroupCode`, `selectedModelCode`, `selectedGradeCode`
- 목록 상태 추가
  - `modelGroups`, `models`, `grades`
- 로딩 상태 추가
  - `modelGroupLoadState`, `modelLoadState`, `gradeLoadState`
- 단계별 fetch 함수 추가
  - `fetchModelGroups`, `fetchModels`, `fetchGrades`
- 상위 선택 변경 시 하위 초기화 유틸 추가

## 구현 순서
1. 상태 스키마 확장 및 초기값 정의
2. 2차 fetch 성공 시 3/4차 상태 초기화 규칙 구현
3. 3차 fetch 성공 시 4차 상태 초기화 규칙 구현
4. 비동기 응답 역전 방지를 위한 현재 선택값 검증 추가
5. 에러 메시지/빈 상태 메시지 단계별 분리

## 완료 기준
- 브랜드 선택 후 2차 목록이 로드된다.
- 2차 선택 후 3차, 3차 선택 후 4차 목록이 순차 로드된다.
- 상위 값을 바꾸면 하위 선택/목록이 즉시 초기화된다.
- 잘못된 순서로 도착한 응답이 현재 화면 상태를 덮어쓰지 않는다.

## 의존성
- Task 2 백엔드 프록시 엔드포인트

## 리스크
- 상태 초기화 타이밍이 잘못되면 깜빡임/오선택 표시가 발생할 수 있다.
