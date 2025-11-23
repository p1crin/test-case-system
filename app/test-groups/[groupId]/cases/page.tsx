'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface TestCase {
  test_group_id: number;
  tid: string;
  first_layer: string;
  second_layer: string;
  third_layer: string;
  fourth_layer: string;
  purpose: string;
  request_id: string;
  check_items: string;
  test_procedure: string;
  created_at: string;
}

export default function TestCasesListPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session, status } = useSession();

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [filteredCases, setFilteredCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  // Search fields
  const [searchTid, setSearchTid] = useState('');
  const [searchLayer, setSearchLayer] = useState('');
  const [searchPurpose, setSearchPurpose] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchTestCases();
      checkPermission();
    }
  }, [status, router, groupId]);

  useEffect(() => {
    // Apply search filters
    let filtered = testCases;

    if (searchTid) {
      filtered = filtered.filter((tc) =>
        tc.tid.toLowerCase().includes(searchTid.toLowerCase())
      );
    }

    if (searchLayer) {
      filtered = filtered.filter(
        (tc) =>
          tc.first_layer?.toLowerCase().includes(searchLayer.toLowerCase()) ||
          tc.second_layer?.toLowerCase().includes(searchLayer.toLowerCase()) ||
          tc.third_layer?.toLowerCase().includes(searchLayer.toLowerCase()) ||
          tc.fourth_layer?.toLowerCase().includes(searchLayer.toLowerCase())
      );
    }

    if (searchPurpose) {
      filtered = filtered.filter((tc) =>
        tc.purpose?.toLowerCase().includes(searchPurpose.toLowerCase())
      );
    }

    setFilteredCases(filtered);
  }, [testCases, searchTid, searchLayer, searchPurpose]);

  const fetchTestCases = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}/cases`);
      if (!res.ok) {
        throw new Error('テストケースの取得に失敗しました');
      }

      const data = await res.json();
      setTestCases(data.testCases);
      setFilteredCases(data.testCases);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const checkPermission = () => {
    const userRole = (session?.user as any)?.user_role;
    setCanEdit(userRole === 0 || userRole === 1);
  };

  const handleDelete = async (tid: string) => {
    if (!confirm('このテストケースを削除してもよろしいですか?')) {
      return;
    }

    try {
      const res = await fetch(`/api/test-groups/${groupId}/cases/${tid}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '削除に失敗しました');
      }

      fetchTestCases();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const clearSearch = () => {
    setSearchTid('');
    setSearchLayer('');
    setSearchPurpose('');
  };

  if (status === 'loading' || loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">読み込み中...</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => router.push('/test-groups')}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← テストグループ一覧に戻る
            </button>
            <h1 className="text-2xl font-bold">テストケース一覧</h1>
          </div>
          {canEdit && (
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/test-groups/${groupId}/cases/import`)}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                インポート
              </button>
              <button
                onClick={() => router.push(`/test-groups/${groupId}/cases/new`)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                新規登録
              </button>
            </div>
          )}
        </div>

        {/* Search filters */}
        <div className="bg-white shadow-md rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">検索条件</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">TID</label>
              <input
                type="text"
                value={searchTid}
                onChange={(e) => setSearchTid(e.target.value)}
                placeholder="TIDで検索"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">階層</label>
              <input
                type="text"
                value={searchLayer}
                onChange={(e) => setSearchLayer(e.target.value)}
                placeholder="階層で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">目的</label>
              <input
                type="text"
                value={searchPurpose}
                onChange={(e) => setSearchPurpose(e.target.value)}
                placeholder="目的で検索"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearSearch}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded"
            >
              クリア
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {filteredCases.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded shadow">
            {testCases.length === 0
              ? 'テストケースがありません'
              : '検索条件に一致するテストケースがありません'}
          </div>
        ) : (
          <div className="bg-white shadow-md rounded overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">TID</th>
                  <th className="px-4 py-2 text-left">第1階層</th>
                  <th className="px-4 py-2 text-left">第2階層</th>
                  <th className="px-4 py-2 text-left">第3階層</th>
                  <th className="px-4 py-2 text-left">第4階層</th>
                  <th className="px-4 py-2 text-left">目的</th>
                  <th className="px-4 py-2 text-left">作成日</th>
                  <th className="px-4 py-2 text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((testCase) => (
                  <tr key={testCase.tid} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-semibold">{testCase.tid}</td>
                    <td className="px-4 py-2">{testCase.first_layer || '-'}</td>
                    <td className="px-4 py-2">{testCase.second_layer || '-'}</td>
                    <td className="px-4 py-2">{testCase.third_layer || '-'}</td>
                    <td className="px-4 py-2">{testCase.fourth_layer || '-'}</td>
                    <td className="px-4 py-2 max-w-xs truncate" title={testCase.purpose}>
                      {testCase.purpose || '-'}</td>
                    <td className="px-4 py-2">
                      {new Date(testCase.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() =>
                            router.push(
                              `/test-groups/${groupId}/cases/${testCase.tid}/results`
                            )
                          }
                          className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                        >
                          結果
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() =>
                                router.push(
                                  `/test-groups/${groupId}/cases/${testCase.tid}/edit`
                                )
                              }
                              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDelete(testCase.tid)}
                              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
              全{testCases.length}件中 {filteredCases.length}件を表示
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
