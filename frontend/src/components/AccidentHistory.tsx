import type { CarRecord } from '../types/encar';

interface Props {
  data: CarRecord;
}

const ACCIDENT_TYPE: Record<string, string> = {
  '1': '내 차 피해',
  '2': '상대 차 피해',
  '3': '양쪽 피해',
};

export default function AccidentHistory({ data }: Props) {
  const hasRisk =
    data.totalLossCnt > 0 ||
    data.floodTotalLossCnt > 0 ||
    data.business > 0 ||
    data.government > 0;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">📋 보험·이력 정보</h3>

      {/* 핵심 지표 그리드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <StatBadge
          label="소유자 변경"
          value={`${data.ownerChangeCnt}회`}
          danger={data.ownerChangeCnt >= 3}
        />
        <StatBadge
          label="내 차 사고"
          value={`${data.myAccidentCnt}회`}
          danger={data.myAccidentCnt > 0}
        />
        <StatBadge
          label="상대 차 사고"
          value={`${data.otherAccidentCnt}회`}
          warn={data.otherAccidentCnt > 0}
        />
        <StatBadge
          label="전손"
          value={data.totalLossCnt > 0 ? `${data.totalLossCnt}회` : '없음'}
          danger={data.totalLossCnt > 0}
        />
        <StatBadge
          label="침수"
          value={data.floodTotalLossCnt > 0 ? '있음' : '없음'}
          danger={data.floodTotalLossCnt > 0}
        />
        <StatBadge
          label="영업용 이력"
          value={data.business > 0 ? '있음' : '없음'}
          danger={data.business > 0}
        />
      </div>

      {/* 전체 사고 수리비 */}
      <div className="bg-gray-50 rounded-xl p-4 mb-4 text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-gray-500">내 차 수리비 합계</span>
          <span className="font-semibold text-gray-800">
            {data.myAccidentCost?.toLocaleString()}원
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">상대 차 수리비 합계</span>
          <span className="font-semibold text-gray-800">
            {data.otherAccidentCost?.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* 경고 배너 */}
      {hasRisk && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-700 font-medium">
          ⚠️ 주의가 필요한 이력이 있습니다 (전손/침수/영업용/관용)
        </div>
      )}

      {/* 사고 상세 목록 */}
      {data.accidents?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-600 mb-2">사고 상세 내역</p>
          <div className="space-y-2">
            {data.accidents.map((acc, i) => (
              <div
                key={i}
                className="flex items-start justify-between text-sm border border-gray-100 rounded-lg px-4 py-3"
              >
                <div>
                  <span className="font-medium text-gray-700">
                    {ACCIDENT_TYPE[acc.type] ?? '기타'}
                  </span>
                  <span className="text-gray-400 ml-2">{acc.date}</span>
                </div>
                <span className="text-gray-800 font-semibold">
                  {acc.insuranceBenefit?.toLocaleString()}원
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 소유자 변경 날짜 */}
      {data.ownerChanges?.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold text-gray-600 mb-1">소유자 변경 날짜</p>
          <div className="flex flex-wrap gap-2">
            {data.ownerChanges.map((date, i) => (
              <span
                key={i}
                className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full"
              >
                {date}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
  danger,
  warn,
}: {
  label: string;
  value: string;
  danger?: boolean;
  warn?: boolean;
}) {
  const bg = danger
    ? 'bg-red-50 border-red-200'
    : warn
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-gray-50 border-gray-200';
  const text = danger
    ? 'text-red-700'
    : warn
    ? 'text-yellow-700'
    : 'text-gray-700';

  return (
    <div className={`border rounded-xl p-3 text-center ${bg}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-base font-bold ${text}`}>{value}</p>
    </div>
  );
}
