# API 예시 목록

- 판매자정보 조회 GET https://api.encar.com/v1/readside/user/{userId}
    + userId 부분이 엔카 판매자의 아이디(예시: nss38604270)로 응답에서 joinedDatetime 값은 언제부터 엔카 플랫폼에서 판매를 해왔는지는 알 수 있고 오랜기간 엔카에서 영업활동을 해왔으므로 비교적 신뢰할 수 있는 판매자일 확률이 높은 척도가 됨

- 파츠별 수리 이력 조회 GET https://api.encar.com/v1/readside/diagnosis/vehicle/{vehicleId}
    + vehicleId 가 차량 아이디(예시: 41031559)고 응답의 items는 파츠별로 교환 또는 판금이력이 있는지 확인할 수 있어서 프레임에 피해가 있었는지를 확인해볼 수 있고 피해가 있는 경우 레이팅에 변화를 줄 수 있음.

- 차량 정보 조회 GET https://api.encar.com/v1/readside/record/vehicle/{vehicleId}/open
    + 차량 번호와 소유주 변경 횟수와 보험 처리 이력과 금액 정보가 제공됨

- 성능점검 이력 조회 GET https://api.encar.com/v1/readside/inspection/vehicle/{vehicleId}
    + 마일리지 KM, 변속기유형 , 차량 컬러 등 성능점검과 관련된 내용을 조회할 수 있음. 파츠별 수리 이력과 성능점검 이력에서 나오는 수리부위가 다르게 표시된 경우 부적절한 차량으로 의심해볼 수 있음