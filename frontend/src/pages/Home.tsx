import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseCarId } from '../api/encar';

export default function Home() {
  const [showInput, setShowInput] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSearch() {
    const carid = parseCarId(url.trim());
    if (!carid) {
      setError('올바른 엔카 차량 링크를 입력해주세요.\n예) https://fem.encar.com/cars/detail/41031559');
      return;
    }
    navigate(`/car/${carid}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* 로고 / 타이틀 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            🚗 중고차 체크
          </h1>
          <p className="text-gray-500 text-sm">
            엔카 차량 링크 하나로 사야 할지, 말아야 할지 확인하세요
          </p>
        </div>

        {/* 소스 선택 버튼 */}
        {!showInput && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold shadow-md transition"
            >
              엔카로 검색
            </button>
            <div className="relative w-full">
              <button
                disabled
                className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 text-lg font-semibold cursor-not-allowed"
              >
                케이카로 검색
              </button>
              <span className="absolute top-2 right-4 bg-gray-300 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                준비중
              </span>
            </div>
          </div>
        )}

        {/* URL 입력 */}
        {showInput && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <p className="text-sm text-gray-500 mb-3">
              엔카 차량 상세 페이지 URL을 붙여넣으세요
            </p>
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="https://fem.encar.com/cars/detail/..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-xs mb-3 whitespace-pre-line">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowInput(false); setUrl(''); setError(''); }}
                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleSearch}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
              >
                조회하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
