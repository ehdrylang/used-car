# API 예시 목록

- 판매자정보 조회 GET https://api.encar.com/v1/readside/user/nss38604270
    + nss38604270 부분이 엔카 판매자의 아이디로 추정되고 응답에서 joinedDatetime 로 언제부터 엔카 플랫폼에서 판매를 해왔는지는 알 수 있고 오래될수록 신뢰할 수 있는 판매자일 확률이 높은 척도가 됨

- 파츠별 수리 이력 조회 GET https://api.encar.com/v1/readside/diagnosis/vehicle/41031559
    + 41031559 가 차량 아이디로 추정되고 응답에서 items에 등장하는 파츠별로 교환했는지 판금이력이 있는지 확인할 수 있어서 프레임에 충격이 있는지 없는지 확인해볼 수 있음

- 차량 정보 조회 GET https://api.encar.com/v1/readside/record/vehicle/41031559/open?vehicleNo=21%EB%AC%B44758
    + 소유주 변경 횟수와 보험처리시 금액 정보 같은게 제공됨

- 성능점검 이력 조회 GET https://api.encar.com/v1/readside/inspection/vehicle/41031559
    + 이건 정확하지 않은데 내용을 보고 유추해보아야함