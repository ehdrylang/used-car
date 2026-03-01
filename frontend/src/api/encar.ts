import axios from 'axios';
import type { CarDetailResponse } from '../types/encar';

export async function fetchCarDetail(carid: string): Promise<CarDetailResponse> {
  const { data } = await axios.get<CarDetailResponse>(`/api/encar/car/${carid}`);
  return data;
}

export function parseCarId(url: string): string | null {
  // https://fem.encar.com/cars/detail/41031559
  const match = url.match(/fem\.encar\.com\/cars\/detail\/(\d+)/);
  return match ? match[1] : null;
}
