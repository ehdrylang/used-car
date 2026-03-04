# Sub Task Plan: 프론트 `enc` 생성 유틸 구현

## 목표
- KCAR 번들 규칙과 동일한 `enc` 생성 로직을 프론트에 구현한다.

## 작업 범위
- `setParam` 구현 (Falsy 값 제거)
- JSON 직렬화
- AES-128-CBC(PKCS7) 암호화
- Base64 문자열 반환
- 샘플 기준 검증 유틸/테스트 코드 추가

## 구현 순서
1. `frontend/kcar-enc.js` 생성
2. `setParam`/`buildDrctPlainParam` 함수 구현
3. `encryptToEnc(plainJson)` 구현
4. 샘플 파라미터로 생성된 `enc` 결과 검증
5. `frontend/app.js`에서 호출 가능한 인터페이스로 노출

## 완료 기준
- 입력 파라미터로부터 `{ enc }` 생성이 가능하다.
- 키/IV/모드/패딩 규칙이 명세와 일치한다.
- 예외(암호화 실패) 발생 시 에러 메시지가 상위로 전달된다.

## 의존성
- 없음

## 리스크
- 브라우저 호환성 이슈가 있으면 CryptoJS fallback이 필요할 수 있다.
