'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

export default function ImportUsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  // Check admin permission
  if (session && session.user.user_role !== 0) {
    router.push('/test-groups');
    return null;
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      alert('CSVファイルを選択してください');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      // Read file content
      const csvContent = await file.text();

      // Call import API
      const response = await fetch('/api/import-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvContent,
          fileName: file.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました');
      }

      setResult({
        successCount: data.successCount,
        errorCount: data.errorCount,
        errors: data.errors || [],
      });

      if (data.errorCount === 0) {
        alert(`${data.successCount}件のユーザーをインポートしました`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvTemplate = 'email,password,user_role,department,company,tags\n' +
      'user1@example.com,password123,2,開発部,ABC株式会社,tag1,tag2\n' +
      'user2@example.com,password456,1,QA部,ABC株式会社,tag2\n';

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ユーザー一括インポート</h1>
          <p className="mt-2 text-sm text-gray-600">
            CSVファイルからユーザーを一括でインポートできます
          </p>
        </div>

        {/* CSV Format Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">CSVフォーマット</h3>
          <p className="text-sm text-blue-800 mb-3">
            以下の列を含むCSVファイルを準備してください:
          </p>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside mb-3">
            <li><strong>email</strong> (必須): メールアドレス</li>
            <li><strong>password</strong>: パスワード（新規ユーザーは必須、既存ユーザーは空欄で変更なし）</li>
            <li><strong>user_role</strong> (必須): 0=管理者、1=テスト管理者、2=一般</li>
            <li><strong>department</strong> (任意): 部署名</li>
            <li><strong>company</strong> (任意): 会社名</li>
            <li><strong>tags</strong> (任意): タグ名（カンマ区切りで複数指定可能）</li>
          </ul>
          <p className="text-sm text-blue-800 mb-3">
            <strong>注意:</strong> エクスポートしたCSVをそのままインポートすると、既存ユーザーの情報が更新されます（パスワードは変更されません）。
          </p>
          <button
            onClick={downloadTemplate}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            テンプレートをダウンロード
          </button>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6">
          <div className="mb-4">
            <label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              CSVファイル
            </label>
            <input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {loading ? 'インポート中...' : 'インポート'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              キャンセル
            </button>
          </div>
        </form>

        {/* Results */}
        {result && (
          <div className="mt-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">インポート結果</h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-600 font-medium">成功</p>
                  <p className="text-2xl font-bold text-green-900">{result.successCount}件</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">エラー</p>
                  <p className="text-2xl font-bold text-red-900">{result.errorCount}件</p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-2">エラー詳細</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {result.errors.map((error, index) => (
                        <li key={index}>
                          行 {error.row}: {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.errorCount === 0 && (
                <button
                  onClick={() => router.push('/users')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  ユーザー一覧に戻る
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
