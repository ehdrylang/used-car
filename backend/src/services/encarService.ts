import axios from 'axios';

const ENCAR_BASE = 'https://api.encar.com';
const IMAGE_BASE = 'https://ci.encar.com';

const encarHeaders = {
  'Referer': 'https://fem.encar.com',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
};

// ① 차량 기본 정보 + 이미지 (차량 상세 전용 API)
export async function getCarBasicInfo(carid: string) {
  const { data } = await axios.get(`${ENCAR_BASE}/v1/readside/vehicle/${carid}`, {
    headers: encarHeaders,
  });

  // 이미지 경로에 베이스 URL 붙이기
  const photos = (data.photos ?? []).map((p: { path: string; code: string; type: string }) => ({
    ...p,
    url: `${IMAGE_BASE}${p.path}`,
  }));

  return { ...data, photos };
}

// ② 차량 이력 (소유자/사고/침수/전손) - vehicleNo 없이도 동작 확인됨
export async function getCarRecord(carid: string) {
  const { data } = await axios.get(
    `${ENCAR_BASE}/v1/readside/record/vehicle/${carid}/open`,
    { headers: encarHeaders }
  );
  return data;
}

// ③ 성능점검 이력 (외판 파츠 + 내부 상태 + 판매자 ID)
export async function getCarInspection(carid: string) {
  const { data } = await axios.get(
    `${ENCAR_BASE}/v1/readside/inspection/vehicle/${carid}`,
    { headers: encarHeaders }
  );
  return data;
}

// ④ 판매자 정보
export async function getSellerInfo(userId: string) {
  const { data } = await axios.get(
    `${ENCAR_BASE}/v1/readside/user/${userId}`,
    { headers: encarHeaders }
  );
  return data;
}
