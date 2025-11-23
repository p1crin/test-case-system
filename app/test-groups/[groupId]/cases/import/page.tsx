'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

export default function ImportTestCasesPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    successCount: number;
    errorCount: number;
    errors: { row: number; message: string }[];
  } | null>(null);

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
      const response = await fetch('/api/import-cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          testGroupId: parseInt(groupId),
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
        alert(`${data.successCount}件のテストケースをインポートしました`);
      }
    } catch (error) {
      console.error('Import error:', error);
      alert(error instanceof Error ? error.message : 'インポートに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csvTemplate =
      'tid,first_layer,second_layer,third_layer,fourth_layer,purpose,request_id,check_items,test_procedure,test_case_no,test_case,expected_value,is_target\n' +
      'TC001,Layer1,Layer2,Layer3,Layer4,テスト目的,REQ001,チェック項目,手順,1,テストケース1,期待値1,TRUE\n' +
      'TC001,Layer1,Layer2,Layer3,Layer4,テスト目的,REQ001,チェック項目,手順,2,テストケース2,期待値2,TRUE\n' +
      'TC002,Layer1,Layer2,Layer3,,別のテスト目的,REQ002,チェック項目2,手順2,1,テストケース3,期待値3,TRUE\n';

    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test_cases_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">テストケース一括インポート</h1>
          <p className="mt-2 text-sm text-gray-600">
            CSVファイルからテストケースを一括でインポートできます
          </p>
        </div>

        {/* CSV Format Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">CSVフォーマット</h3>
          <p className="text-sm text-blue-800 mb-3">
            以下の列を含むCSVファイルを準備してください:
          </p>
          <div className="grid grid-cols-2 gap-x-4 text-sm text-blue-800 mb-3">
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>tid</strong> (必須): テストID</li>
              <li><strong>first_layer</strong>: 第1層</li>
              <li><strong>second_layer</strong>: 第2層</li>
              <li><strong>third_layer</strong>: 第3層</li>
              <li><strong>fourth_layer</strong>: 第4層</li>
              <li><strong>purpose</strong>: 目的</li>
              <li><strong>request_id</strong>: リクエストID</li>
            </ul>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>check_items</strong>: チェック項目</li>
              <li><strong>test_procedure</strong>: 手順</li>
              <li><strong>test_case_no</strong> (必須): ケース番号</li>
              <li><strong>test_case</strong>: テストケース</li>
              <li><strong>expected_value</strong>: 期待値</li>
              <li><strong>is_target</strong>: TRUE/FALSE</li>
            </ul>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            注意: 同じTIDの行は1つのテストケースとしてグループ化されます。
            最初の行のfirst_layer等のメタデータが使用されます。
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
              onClick={() => router.push(`/test-groups/${groupId}/cases`)}
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
                          {error.row > 0 ? `行 ${error.row}: ` : ''}{error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.errorCount === 0 && (
                <button
                  onClick={() => router.push(`/test-groups/${groupId}/cases`)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  テストケース一覧に戻る
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
