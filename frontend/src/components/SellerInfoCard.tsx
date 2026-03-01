import type { SellerInfo } from '../types/encar';

interface Props {
  data: SellerInfo;
}

export default function SellerInfoCard({ data }: Props) {
  const company = data.companyList?.[0];
  const joinedYear = data.joinedDatetime
    ? new Date(data.joinedDatetime).getFullYear()
    : null;
  const yearsActive = joinedYear ? new Date().getFullYear() - joinedYear : null;

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">🏢 판매자 정보</h3>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
          {data.userName?.[0] ?? '?'}
        </div>
        <div>
          <p className="font-semibold text-gray-800">{data.userName}</p>
          <p className="text-sm text-gray-400">
            {data.userType === 'DEALER' ? '딜러' : '개인 판매자'}
            {company ? ` · ${company.companyName}` : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-xs mb-1">엔카 가입</p>
          <p className="font-medium text-gray-800">
            {joinedYear ?? '-'}년
            {yearsActive !== null && (
              <span className="text-gray-400 ml-1">({yearsActive}년차)</span>
            )}
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-xs mb-1">누적 판매</p>
          <p className="font-medium text-gray-800">
            {data.salesStatus?.totalSales?.toLocaleString()}대
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-gray-400 text-xs mb-1">현재 판매 중</p>
          <p className="font-medium text-gray-800">
            {data.salesStatus?.currentlyOnSales?.toLocaleString()}대
          </p>
        </div>
        {company?.address && (
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-gray-400 text-xs mb-1">지역</p>
            <p className="font-medium text-gray-800">
              {company.address.sido} {company.address.sigungu}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
