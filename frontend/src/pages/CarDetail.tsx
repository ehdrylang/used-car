import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchCarDetail } from '../api/encar';
import type { CarDetailResponse } from '../types/encar';
import CarBasicInfoCard from '../components/CarBasicInfoCard';
import AccidentHistory from '../components/AccidentHistory';
import InspectionPanel from '../components/InspectionPanel';
import SellerInfoCard from '../components/SellerInfoCard';

export default function CarDetail() {
  const { carid } = useParams<{ carid: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<CarDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!carid) return;
    setLoading(true);
    fetchCarDetail(carid)
      .then(setData)
      .catch(() => setError('차량 정보를 불러오는 데 실패했습니다.'))
      .finally(() => setLoading(false));
  }, [carid]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">차량 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || '데이터를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm"
          >
            홈으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-gray-700 transition text-xl"
          >
            ←
          </button>
          <span className="font-bold text-gray-800">차량 상세 조회</span>
          <span className="ml-auto text-xs text-gray-400">carid: {carid}</span>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {data.basicInfo && <CarBasicInfoCard data={data.basicInfo} />}
        {data.record && <AccidentHistory data={data.record} />}
        {data.inspection && <InspectionPanel data={data.inspection} />}
        {data.seller && <SellerInfoCard data={data.seller} />}

        {!data.basicInfo && !data.record && !data.inspection && (
          <div className="bg-white rounded-2xl shadow-md p-8 text-center text-gray-400">
            조회된 정보가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
