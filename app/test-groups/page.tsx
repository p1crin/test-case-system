'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface TestGroup {
  id: number;
  oem: string;
  model: string;
  event: string;
  variation: string;
  destination: string;
  test_startdate: string;
  test_enddate: string;
  created_at: string;
}

export default function TestGroupsPage() {
  const { data: session } = useSession();
  const [testGroups, setTestGroups] = useState<TestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Search fields
  const [searchOem, setSearchOem] = useState('');
  const [searchModel, setSearchModel] = useState('');
  const [searchEvent, setSearchEvent] = useState('');
  const [searchVariation, setSearchVariation] = useState('');
  const [searchDestination, setSearchDestination] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchTestGroups();
  }, []);

  const fetchTestGroups = async (oem?: string, model?: string, event?: string, variation?: string, destination?: string, page: number = 1, limit: number = 10) => {
    try {
      const params = new URLSearchParams();
      if (oem) params.append('oem', oem);
      if (model) params.append('model', model);
      if (event) params.append('event', event);
      if (variation) params.append('variation', variation);
      if (destination) params.append('destination', destination);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const queryString = params.toString();
      const url = `/api/test-groups?${queryString}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch test groups');
      }

      const data = await response.json();
      setTestGroups(data.testGroups || []);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError('テストグループの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setLoading(true);
    setSearching(true);
    fetchTestGroups(searchOem, searchModel, searchEvent, searchVariation, searchDestination, 1, pageSize);
  };

  const handleClearSearch = () => {
    setSearchOem('');
    setSearchModel('');
    setSearchEvent('');
    setSearchVariation('');
    setSearchDestination('');
    setCurrentPage(1);
    setLoading(true);
    fetchTestGroups(undefined, undefined, undefined, undefined, undefined, 1, pageSize);
  };

  const canCreateTestGroup = () => {
    return session && (session.user.user_role === 0 || session.user.user_role === 1);
  };

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">テストグループ一覧</h1>
          {canCreateTestGroup() && (
            <Link
              href="/test-groups/new"
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              新規登録
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Search Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">検索</h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OEM
                </label>
                <input
                  type="text"
                  value={searchOem}
                  onChange={(e) => setSearchOem(e.target.value)}
                  placeholder="OEM を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  モデル
                </label>
                <input
                  type="text"
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  placeholder="モデル を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  イベント
                </label>
                <input
                  type="text"
                  value={searchEvent}
                  onChange={(e) => setSearchEvent(e.target.value)}
                  placeholder="イベント を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  バリエーション
                </label>
                <input
                  type="text"
                  value={searchVariation}
                  onChange={(e) => setSearchVariation(e.target.value)}
                  placeholder="バリエーション を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  仕向
                </label>
                <input
                  type="text"
                  value={searchDestination}
                  onChange={(e) => setSearchDestination(e.target.value)}
                  placeholder="仕向 を入力"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleClearSearch}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-md"
              >
                クリア
              </button>
              <button
                type="submit"
                disabled={searching}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md disabled:bg-gray-400"
              >
                {searching ? '検索中...' : '検索'}
              </button>
            </div>
          </form>
        </div>

        {loading ? (
          <div className="text-center py-8">読み込み中...</div>
        ) : testGroups.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            テストグループがありません
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    OEM
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    モデル
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    イベント
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    バリエーション
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    仕向
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {testGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.oem}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.model}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.event}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.variation}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {group.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/test-groups/${group.id}/report`}
                        className="text-green-600 hover:text-green-900"
                      >
                        集計
                      </Link>
                      <Link
                        href={`/test-groups/${group.id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        編集
                      </Link>
                      <Link
                        href={`/test-groups/${group.id}/cases`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        テストケース
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                全 {totalCount} 件 (ページ {currentPage} / {Math.ceil(totalCount / pageSize)})
              </span>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => prev - 1);
                    fetchTestGroups(searchOem, searchModel, searchEvent, searchVariation, searchDestination, currentPage - 1, pageSize);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  前へ
                </button>
                <button
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    fetchTestGroups(searchOem, searchModel, searchEvent, searchVariation, searchDestination, currentPage + 1, pageSize);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  次へ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
