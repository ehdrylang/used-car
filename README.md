# 대한민국 대표 중고차 사이트 2곳(엔카, 케이카)에서 제공하는 수많은 중고차 목록 중 옥석을 가리기 위한 필터를 제공하고 기준에 적합한 수준에 따라 랭킹을 제공하여 살지 말지에 대한 가이드를 해주는 웹사이트를 만든다.

## 배경
- 중고차 검색 사이트 2곳이 존재하는데 검색 필터에 영업용 용도이력 필터나 소유주 변경이력 횟수 필터 등의 구매자의 편의를 제공하는 필터를 일부러 제공하지 않음
    + [kcar](https://www.kcar.com)
    + [encar](https://www.encar.com)
- 어떤 중고차를 감히 좋다 나쁘다 하기는 어려울 수 있으나 좋을 확률이 높은 요인 또는 나쁠 확률이 높은 요인들은 여러가지가 존재하여 해당 기준으로 점수를 매기고 사라! 마라! 를 점수로 표현해주는 사이트를 제공하기로 함

## 개발
- 일부 문서를 제외하고 코드는 100% AI agent 로 개발한다.

## 현재 구현 상태 (2026-03-04)
- 첫 화면 플랫폼 선택 UI 구현
  - `encar`: 비활성 + `제공예정`
  - `kcar`: 활성, 클릭 시 KCAR 브랜드 선택 화면 진입
- KCAR 브랜드 선택 단계 구현
  - 좌측 `국산/수입` 탭
  - 백엔드 프록시(`/api/kcar/brands`) 연동
  - 브랜드 단일 선택
  - 로딩/오류/빈 데이터 상태 처리
- KCAR 백엔드 프록시 서버 구현
  - CORS 허용 origin 화이트리스트
  - `POST /api/kcar/brands` (KCAR 업스트림 대리 호출)
  - `GET /health`
  - 표준 에러 포맷(`BAD_REQUEST`, `UPSTREAM_ERROR`, `TIMEOUT`, `INTERNAL_ERROR`)

## 실행 방법
1. 백엔드 서버 실행 (프로젝트 루트 기준)
```bash
node backend/src/server.js
```
2. 별도 터미널에서 프론트 정적 서버 실행
```bash
cd /Users/east.bridge/Documents/used-car
python3 -m http.server 4173
```
3. 브라우저에서 `http://localhost:4173/frontend/` 접속
