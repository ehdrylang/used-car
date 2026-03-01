import type { CarBasicInfo } from '../types/encar';

interface Props {
  data: CarBasicInfo;
}

export default function CarBasicInfoCard({ data }: Props) {
  const mainPhoto = data.photos?.[0]?.url ?? null;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      {mainPhoto && (
        <img
          src={mainPhoto}
          alt="차량 대표 이미지"
          className="w-full h-64 object-cover"
          referrerPolicy="no-referrer"
        />
      )}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">
          {data.manufacturer} {data.model}
        </h2>
        <p className="text-gray-500 text-sm mb-4">{data.badge}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="가격" value={`${data.price?.toLocaleString()}만원`} />
          <InfoRow label="연식" value={data.year ?? '-'} />
          <InfoRow label="주행거리" value={`${data.mileage?.toLocaleString()}km`} />
          <InfoRow label="연료" value={data.fuelType ?? '-'} />
          <InfoRow label="변속기" value={data.transmission ?? '-'} />
          <InfoRow label="색상" value={data.color ?? '-'} />
          <InfoRow label="지역" value={data.region ?? '-'} />
        </div>

        {/* 사진 갤러리 (최대 5장) */}
        {data.photos?.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {data.photos.slice(1, 6).map((photo, i) => (
              <img
                key={i}
                src={photo.url}
                alt={`차량 사진 ${i + 2}`}
                className="h-20 w-28 object-cover rounded-lg flex-shrink-0"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}
