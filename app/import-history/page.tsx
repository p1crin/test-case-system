'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface ImportResult {
  id: number;
  file_name: string;
  import_date: string;
  import_status: number; // 0: Error, 1: In Progress, 3: Completed
  executor_name: string;
  import_type: number; // 0: Test Case, 1: User
  count: number;
  errors?: { error_details: string; error_row: number }[];
}

export default function ImportHistoryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [imports, setImports] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImport, setSelectedImport] = useState<ImportResult | null>(null);

  // Only admin can access
  if (session && session.user.user_role !== 0) {
    router.push('/test-groups');
    return null;
  }

  useEffect(() => {
    fetchImports();
  }, []);

  const fetchImports = async () => {
    try {
      const response = await fetch('/api/import-results');
      if (!response.ok) throw new Error('Failed to fetch imports');
      const data = await response.json();
      setImports(data.imports || []);
    } catch (error) {
      console.error('Error fetching imports:', error);
      alert('インポート履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">エラー</span>;
      case 1:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">処理中</span>;
      case 3:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完了</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">不明</span>;
    }
  };

  const getTypeName = (type: number) => {
    return type === 0 ? 'テストケース' : 'ユーザー';
  };

  const viewDetails = async (importItem: ImportResult) => {
    // Fetch errors if status is error
    if (importItem.import_status === 0) {
      try {
        const response = await fetch(`/api/import-results/${importItem.id}/errors`);
        if (response.ok) {
          const data = await response.json();
          setSelectedImport({ ...importItem, errors: data.errors });
        } else {
          setSelectedImport(importItem);
        }
      } catch (error) {
        console.error('Error fetching import errors:', error);
        setSelectedImport(importItem);
      }
    } else {
      setSelectedImport(importItem);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">インポート履歴</h1>
            <p className="mt-2 text-sm text-gray-600">
              過去のインポート処理の履歴を確認できます
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/users/import')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              ユーザーをインポート
            </button>
          </div>
        </div>

        {/* Import History Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ファイル名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日時
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実行者
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  件数
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {imports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    インポート履歴がありません
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.file_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getTypeName(item.import_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.import_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.executor_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.import_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => viewDetails(item)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        詳細
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Details Modal */}
        {selectedImport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900">インポート詳細</h2>
                  <button
                    onClick={() => setSelectedImport(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">ファイル名</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedImport.file_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">タイプ</p>
                      <p className="text-sm font-semibold text-gray-900">{getTypeName(selectedImport.import_type)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">日時</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {new Date(selectedImport.import_date).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">実行者</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedImport.executor_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">件数</p>
                      <p className="text-sm font-semibold text-gray-900">{selectedImport.count}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">ステータス</p>
                      <div className="mt-1">{getStatusBadge(selectedImport.import_status)}</div>
                    </div>
                  </div>
                </div>

                {selectedImport.errors && selectedImport.errors.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">エラー詳細</h3>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <ul className="text-sm text-red-800 space-y-1">
                        {selectedImport.errors.map((error, index) => (
                          <li key={index}>
                            {error.error_row > 0 ? `行 ${error.error_row}: ` : ''}{error.error_details}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedImport(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
