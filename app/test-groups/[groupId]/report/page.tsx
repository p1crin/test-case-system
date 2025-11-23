'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface ReportData {
  testGroup: any;
  statistics: {
    totalTestCases: number;
    totalTestContents: number;
    testedCount: number;
    untestedCount: number;
    okCount: number;
    ngCount: number;
    notApplicableCount: number;
    passRate: number;
    progress: number;
  };
  testCases: Array<{
    tid: string;
    first_layer: string;
    second_layer: string;
    third_layer: string;
    fourth_layer: string;
    purpose: string;
    contents: Array<{
      test_case_no: number;
      test_case: string;
      expected_value: string;
    }>;
    results: Array<{
      test_case_no: number;
      judgment: string | null;
      executor: string | null;
      execution_date: string | null;
    }>;
  }>;
}

export default function ReportPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { status } = useSession();

  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchReportData();
    }
  }, [status, router, groupId]);

  const fetchReportData = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}/report-data`);
      if (!res.ok) {
        throw new Error('レポートデータの取得に失敗しました');
      }

      const data = await res.json();
      setReportData(data);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const getJudgmentColor = (judgment: string | null) => {
    if (!judgment) return 'text-gray-600';

    switch (judgment) {
      case 'OK':
        return 'text-green-600 font-semibold';
      case 'NG':
        return 'text-red-600 font-semibold';
      case '再実施対象外':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">読み込み中...</div>
      </AuthenticatedLayout>
    );
  }

  if (!reportData) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">
          <div className="text-red-600">{error || 'データが見つかりません'}</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  const { testGroup, statistics, testCases } = reportData;

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/test-groups')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← テストグループ一覧に戻る
          </button>
          <h1 className="text-2xl font-bold">テスト集計レポート</h1>
        </div>

        {/* Test Group Info */}
        <div className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">テストグループ情報</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600">OEM: </span>
              {testGroup.oem}
            </div>
            <div>
              <span className="text-gray-600">モデル: </span>
              {testGroup.model}
            </div>
            <div>
              <span className="text-gray-600">イベント: </span>
              {testGroup.event}
            </div>
            <div>
              <span className="text-gray-600">バリエーション: </span>
              {testGroup.variation || '-'}
            </div>
            <div>
              <span className="text-gray-600">仕向地: </span>
              {testGroup.destination || '-'}
            </div>
            <div>
              <span className="text-gray-600">スペック: </span>
              {testGroup.spec || '-'}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="bg-white shadow-md rounded p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">集計結果</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded">
              <div className="text-3xl font-bold text-blue-600">{statistics.progress}%</div>
              <div className="text-sm text-gray-600">進捗率</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded">
              <div className="text-3xl font-bold text-green-600">{statistics.passRate}%</div>
              <div className="text-sm text-gray-600">合格率</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded">
              <div className="text-3xl font-bold text-gray-600">{statistics.totalTestCases}</div>
              <div className="text-sm text-gray-600">テストケース数</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded">
              <div className="text-3xl font-bold text-purple-600">{statistics.totalTestContents}</div>
              <div className="text-sm text-gray-600">総テスト数</div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-100 rounded">
              <div className="text-2xl font-bold">{statistics.testedCount}</div>
              <div className="text-sm text-gray-600">実施済み</div>
            </div>
            <div className="text-center p-3 bg-gray-100 rounded">
              <div className="text-2xl font-bold">{statistics.untestedCount}</div>
              <div className="text-sm text-gray-600">未実施</div>
            </div>
            <div className="text-center p-3 bg-green-100 rounded">
              <div className="text-2xl font-bold text-green-700">{statistics.okCount}</div>
              <div className="text-sm text-gray-600">OK</div>
            </div>
            <div className="text-center p-3 bg-red-100 rounded">
              <div className="text-2xl font-bold text-red-700">{statistics.ngCount}</div>
              <div className="text-sm text-gray-600">NG</div>
            </div>
            <div className="text-center p-3 bg-gray-100 rounded">
              <div className="text-2xl font-bold text-gray-700">{statistics.notApplicableCount}</div>
              <div className="text-sm text-gray-600">再実施対象外</div>
            </div>
          </div>
        </div>

        {/* Test Cases Detail */}
        <div className="bg-white shadow-md rounded p-6">
          <h2 className="text-xl font-semibold mb-4">テストケース詳細</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">TID</th>
                  <th className="px-3 py-2 text-left">階層</th>
                  <th className="px-3 py-2 text-left">No.</th>
                  <th className="px-3 py-2 text-left">テストケース</th>
                  <th className="px-3 py-2 text-center">判定</th>
                  <th className="px-3 py-2 text-left">実行者</th>
                </tr>
              </thead>
              <tbody>
                {testCases.map((testCase) => {
                  const layers = [
                    testCase.first_layer,
                    testCase.second_layer,
                    testCase.third_layer,
                    testCase.fourth_layer,
                  ]
                    .filter(Boolean)
                    .join(' > ');

                  return testCase.contents.map((content, idx) => {
                    const result = testCase.results.find(
                      (r) => r.test_case_no === content.test_case_no
                    );

                    return (
                      <tr key={`${testCase.tid}-${content.test_case_no}`} className="border-t hover:bg-gray-50">
                        {idx === 0 && (
                          <>
                            <td className="px-3 py-2" rowSpan={testCase.contents.length}>
                              {testCase.tid}
                            </td>
                            <td className="px-3 py-2" rowSpan={testCase.contents.length}>
                              {layers || '-'}
                            </td>
                          </>
                        )}
                        <td className="px-3 py-2">{content.test_case_no}</td>
                        <td className="px-3 py-2">{content.test_case}</td>
                        <td className="px-3 py-2 text-center">
                          {result ? (
                            <span className={getJudgmentColor(result.judgment)}>
                              {result.judgment || '-'}
                            </span>
                          ) : (
                            <span className="text-gray-400">未実施</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{result?.executor || '-'}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
