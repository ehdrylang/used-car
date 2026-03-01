import type { CarInspection } from '../types/encar';

interface Props {
  data: CarInspection;
}

// 외판 파츠 한글 이름 매핑
const PART_NAMES: Record<string, string> = {
  HOOD: '후드',
  FRONT_FENDER_LEFT: '앞 펜더(좌)',
  FRONT_FENDER_RIGHT: '앞 펜더(우)',
  FRONT_DOOR_LEFT: '앞 도어(좌)',
  FRONT_DOOR_RIGHT: '앞 도어(우)',
  BACK_DOOR_LEFT: '뒷 도어(좌)',
  BACK_DOOR_RIGHT: '뒷 도어(우)',
  TRUNK_LID: '트렁크 리드',
  ROOF_PANEL: '루프 패널',
  QUARTER_PANEL_LEFT: '쿼터 패널(좌)',
  QUARTER_PANEL_RIGHT: '쿼터 패널(우)',
  SIDE_PANEL_LEFT: '사이드 패널(좌)',
  SIDE_PANEL_RIGHT: '사이드 패널(우)',
};

const STATUS_COLOR: Record<string, string> = {
  REPLACEMENT: 'bg-red-100 text-red-700 border-red-200',
  PANEL_WORK: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  NORMAL: 'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABEL: Record<string, string> = {
  REPLACEMENT: '교환',
  PANEL_WORK: '판금',
  NORMAL: '정상',
};

export default function InspectionPanel({ data }: Props) {
  const { master, outers } = data;

  // NORMAL이 아닌 외판 파츠만 별도 추출
  const abnormalOuters = outers?.filter((o) =>
    o.statusTypes.some((s) => s.code !== 'NORMAL' && s.code !== 'N')
  ) ?? [];

  const allNormal = abnormalOuters.length === 0;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">🔧 성능점검 이력</h3>

      {/* 종합 상태 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <SummaryBadge
          label="사고 여부"
          value={master.accdient ? '사고 있음' : '이상 없음'}
          danger={master.accdient}
        />
        <SummaryBadge
          label="단순 외판수리"
          value={master.simpleRepair ? '있음' : '없음'}
          warn={master.simpleRepair}
        />
        <SummaryBadge
          label="침수 여부"
          value={master.detail?.waterlog ? '침수 있음' : '이상 없음'}
          danger={master.detail?.waterlog}
        />
      </div>

      {/* 외판 파츠 상태 */}
      <div>
        <p className="text-sm font-semibold text-gray-600 mb-3">외판 파츠 상태</p>
        {allNormal ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            ✅ 모든 외판 파츠 정상
          </div>
        ) : (
          <div className="space-y-2">
            {abnormalOuters.map((outer, i) => {
              const partName =
                PART_NAMES[outer.type.code] ??
                outer.type.title ??
                outer.type.code;
              const status = outer.statusTypes[0]?.code ?? 'NORMAL';
              const colorClass = STATUS_COLOR[status] ?? STATUS_COLOR.NORMAL;
              const label = STATUS_LABEL[status] ?? status;
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between border rounded-xl px-4 py-3 text-sm ${colorClass}`}
                >
                  <span className="font-medium">{partName}</span>
                  <span className="font-bold">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 색상 & VIN */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-xs mb-1">색상</p>
          <p className="font-medium text-gray-800">
            {master.detail?.colorType?.title ?? '-'}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-xs mb-1">차대번호(VIN)</p>
          <p className="font-medium text-gray-800 text-xs break-all">
            {master.detail?.vin ?? '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryBadge({
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
    : 'bg-green-50 border-green-200';
  const text = danger
    ? 'text-red-700'
    : warn
    ? 'text-yellow-700'
    : 'text-green-700';
  return (
    <div className={`border rounded-xl p-3 text-center ${bg}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${text}`}>{value}</p>
    </div>
  );
}
