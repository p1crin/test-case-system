'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface Evidence {
  test_group_id: number;
  tid: string;
  test_case_no: number;
  history_count: number;
  evidence_no: number;
  evidence_name: string;
  evidence_path: string;
  created_at: string;
}

interface TestResult {
  test_group_id: number;
  tid: string;
  test_case_no: number;
  test_item: string | null;
  expected_value: string | null;
  result: string | null;
  judgment: string | null;
  software_version: string | null;
  hardware_version: string | null;
  comparator_version: string | null;
  execution_date: string | null;
  executor: string | null;
  note: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  evidences: Evidence[];
}

interface TestGroup {
  id: number;
  oem: string | null;
  model: string | null;
  event: string | null;
  variation: string | null;
  destination: string | null;
  specs: string | null;
  test_startdate: string | null;
  test_enddate: string | null;
  ng_plan_count: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export default function TestResultsListPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const tid = params.tid as string;
  const { data: session, status } = useSession();

  const [testGroup, setTestGroup] = useState<TestGroup | null>(null);
  const [results, setResults] = useState<{ [key: number]: TestResult[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canExecute, setCanExecute] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchTestGroup();
      fetchResults();
      checkPermission();
    }
  }, [status, router, groupId, tid]);

  const fetchTestGroup = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}`);
      if (!res.ok) {
        throw new Error('テストグループ情報の取得に失敗しました');
      }

      const data = await res.json();
      const group = data.testGroups?.[0];
      if (group) {
        setTestGroup(group);
      }
    } catch (err) {
      console.error('Error fetching test group:', err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}/cases/${tid}/results`);
      if (!res.ok) {
        throw new Error('テスト結果の取得に失敗しました');
      }

      const data = await res.json();
      setResults(data.results);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const checkPermission = () => {
    const userRole = (session?.user as any)?.user_role;
    // Admin, Test Manager can execute
    setCanExecute(userRole === 0 || userRole === 1);
  };

  const handleDeleteEvidence = async (evidence: Evidence) => {
    if (!confirm(`エビデンス「${evidence.evidence_name}」を削除しますか？`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/test-groups/${evidence.test_group_id}/cases/${evidence.tid}/evidences/${evidence.test_case_no}/${evidence.history_count}/${evidence.evidence_no}`,
        {
          method: 'DELETE',
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'エビデンスの削除に失敗しました');
      }

      alert('エビデンスを削除しました');
      fetchResults();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エビデンスの削除に失敗しました');
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

  const testCaseNumbers = Object.keys(results).map(Number).sort((a, b) => a - b);

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button
              onClick={() => router.push(`/test-groups/${groupId}/cases`)}
              className="text-blue-600 hover:text-blue-800 mb-2"
            >
              ← テストケース一覧に戻る
            </button>
            <h1 className="text-2xl font-bold">テスト結果一覧 (TID: {tid})</h1>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {testCaseNumbers.length === 0 ? (
          <div className="bg-white shadow-md rounded p-6">
            {/* Test Group Info */}
            {testGroup && (
              <div className="mb-6 pb-6 border-b">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-semibold">TID: </span>
                    {tid}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">OEM: </span>
                    {testGroup.oem || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">モデル: </span>
                    {testGroup.model || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">イベント: </span>
                    {testGroup.event || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">バリエーション: </span>
                    {testGroup.variation || '-'}
                  </div>
                  <div>
                    <span className="text-gray-600 font-semibold">宛先: </span>
                    {testGroup.destination || '-'}
                  </div>
                  {testGroup.specs && (
                    <div className="col-span-2">
                      <span className="text-gray-600 font-semibold">スペック: </span>
                      {testGroup.specs}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="text-center py-8 text-gray-500 mb-4">
              まだテスト結果が登録されていません
            </div>
            {canExecute && (
              <div className="text-center">
                <button
                  onClick={() =>
                    router.push(`/test-groups/${groupId}/cases/${tid}/results/new`)
                  }
                  className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  結果登録
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow-md rounded">
            <div className="flex justify-between items-center p-6 border-b flex-col gap-4">
              <div className="w-full">
                <h1 className="text-xl font-semibold mb-4">テスト結果一覧</h1>
                {/* Test Group Info */}
                {testGroup && (
                  <div className="grid grid-cols-2 gap-3 text-sm mb-4 pb-4 border-b">
                    <div>
                      <span className="text-gray-600 font-semibold">TID: </span>
                      {tid}
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">OEM: </span>
                      {testGroup.oem || '-'}
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">モデル: </span>
                      {testGroup.model || '-'}
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">イベント: </span>
                      {testGroup.event || '-'}
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">バリエーション: </span>
                      {testGroup.variation || '-'}
                    </div>
                    <div>
                      <span className="text-gray-600 font-semibold">宛先: </span>
                      {testGroup.destination || '-'}
                    </div>
                    {testGroup.specs && (
                      <div className="col-span-2">
                        <span className="text-gray-600 font-semibold">スペック: </span>
                        {testGroup.specs}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {canExecute && (
                <button
                  onClick={() =>
                    router.push(`/test-groups/${groupId}/cases/${tid}/results/new`)
                  }
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                >
                  結果登録
                </button>
              )}
            </div>

            {/* Single table for all results */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-4 py-2 text-left font-semibold min-w-fit">No.</th>
                    <th className="px-4 py-2 text-left font-semibold">テストケース内容</th>
                    <th className="px-4 py-2 text-left font-semibold">期待値</th>
                    <th className="px-4 py-2 text-left font-semibold min-w-fit">Ver.</th>
                    <th className="px-4 py-2 text-left font-semibold">判定</th>
                    <th className="px-4 py-2 text-left font-semibold">結果</th>
                    <th className="px-4 py-2 text-left font-semibold">実行者</th>
                    <th className="px-4 py-2 text-left font-semibold">実施日</th>
                    <th className="px-4 py-2 text-left font-semibold">ソフトウェアVer</th>
                    <th className="px-4 py-2 text-left font-semibold">ハードウェアVer</th>
                    <th className="px-4 py-2 text-left font-semibold">コンパレータVer</th>
                    <th className="px-4 py-2 text-left font-semibold">備考</th>
                    <th className="px-4 py-2 text-left font-semibold">登録日</th>
                    <th className="px-4 py-2 text-left font-semibold">更新日</th>
                    <th className="px-4 py-2 text-left font-semibold">エビデンス</th>
                  </tr>
                </thead>
                <tbody>
                  {testCaseNumbers.map((testCaseNo) => {
                    const testCaseResults = results[testCaseNo];
                    const latestResult = testCaseResults[0];

                    return (
                      <React.Fragment key={testCaseNo}>
                        <tr className="border-b bg-blue-50 hover:bg-blue-100">
                          <td className="px-4 py-2 font-semibold">{testCaseNo}</td>
                          <td className="px-4 py-2 text-gray-700 max-w-md" title={latestResult.test_item || ''}>
                            {latestResult.test_item || '-'}
                          </td>
                          <td className="px-4 py-2 text-gray-700 max-w-md" title={latestResult.expected_value || ''}>
                            {latestResult.expected_value || '-'}
                          </td>
                          <td className="px-4 py-2 font-semibold">{latestResult.version}</td>
                          <td className="px-4 py-2">
                            <span className={getJudgmentColor(latestResult.judgment)}>
                              {latestResult.judgment || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-2 max-w-xs truncate" title={latestResult.result || ''}>
                            {latestResult.result || '-'}
                          </td>
                          <td className="px-4 py-2">{latestResult.executor || '-'}</td>
                          <td className="px-4 py-2">
                            {latestResult.execution_date
                              ? new Date(latestResult.execution_date).toLocaleDateString('ja-JP')
                              : '-'}
                          </td>
                          <td className="px-4 py-2">{latestResult.software_version || '-'}</td>
                          <td className="px-4 py-2">{latestResult.hardware_version || '-'}</td>
                          <td className="px-4 py-2">{latestResult.comparator_version || '-'}</td>
                          <td className="px-4 py-2 max-w-xs truncate" title={latestResult.note || ''}>
                            {latestResult.note || '-'}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(latestResult.created_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-2">
                            {new Date(latestResult.updated_at).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-4 py-2">
                            {latestResult.evidences && latestResult.evidences.length > 0 ? (
                              <details className="inline-block">
                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold">
                                  {latestResult.evidences.length}件
                                </summary>
                                <div className="absolute mt-1 bg-white border border-gray-200 rounded shadow-md p-2 min-w-fit z-10">
                                  <div className="space-y-1 text-xs">
                                    {latestResult.evidences.map((evidence, index) => (
                                      <div key={index} className="flex items-center justify-between gap-2">
                                        <a
                                          href={evidence.evidence_path}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs"
                                          title={evidence.evidence_name}
                                        >
                                          {evidence.evidence_name}
                                        </a>
                                        <button
                                          onClick={() => handleDeleteEvidence(evidence)}
                                          className="px-2 py-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded whitespace-nowrap"
                                          title="削除"
                                        >
                                          削除
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </details>
                            ) : (
                              '-'
                            )}
                          </td>
                        </tr>

                        {/* History rows in accordion */}
                        {testCaseResults.length > 1 && (
                          <tr className="border-b">
                            <td colSpan={15} className="px-4 py-0">
                              <details className="w-full">
                                <summary className="px-0 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 font-semibold text-gray-700 block">
                                  履歴を表示 ({testCaseResults.length - 1}件)
                                </summary>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <tbody>
                                      {testCaseResults.slice(1).map((result, index) => (
                                        <tr key={`${result.test_case_no}-${index}`} className="border-t hover:bg-gray-50">
                                          <td className="px-4 py-2"></td>
                                          <td className="px-4 py-2 text-gray-700 text-xs max-w-md">
                                            {result.test_item || '-'}
                                          </td>
                                          <td className="px-4 py-2 text-gray-700 text-xs max-w-md">
                                            {result.expected_value || '-'}
                                          </td>
                                          <td className="px-4 py-2 font-semibold">{result.version}</td>
                                          <td className="px-4 py-2">
                                            <span className={getJudgmentColor(result.judgment)}>
                                              {result.judgment || '-'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 max-w-xs truncate" title={result.result || ''}>
                                            {result.result || '-'}
                                          </td>
                                          <td className="px-4 py-2">{result.executor || '-'}</td>
                                          <td className="px-4 py-2">
                                            {result.execution_date
                                              ? new Date(result.execution_date).toLocaleDateString('ja-JP')
                                              : '-'}
                                          </td>
                                          <td className="px-4 py-2">{result.software_version || '-'}</td>
                                          <td className="px-4 py-2">{result.hardware_version || '-'}</td>
                                          <td className="px-4 py-2">{result.comparator_version || '-'}</td>
                                          <td className="px-4 py-2 max-w-xs truncate" title={result.note || ''}>
                                            {result.note || '-'}
                                          </td>
                                          <td className="px-4 py-2">
                                            {new Date(result.created_at).toLocaleDateString('ja-JP')}
                                          </td>
                                          <td className="px-4 py-2">
                                            {new Date(result.updated_at).toLocaleDateString('ja-JP')}
                                          </td>
                                          <td className="px-4 py-2">
                                            {result.evidences && result.evidences.length > 0 ? (
                                              <details className="inline-block">
                                                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-semibold">
                                                  {result.evidences.length}件
                                                </summary>
                                                <div className="absolute mt-1 bg-white border border-gray-200 rounded shadow-md p-2 min-w-fit z-10">
                                                  <div className="space-y-1 text-xs">
                                                    {result.evidences.map((evidence, idx) => (
                                                      <div key={idx} className="flex items-center justify-between gap-2">
                                                        <a
                                                          href={evidence.evidence_path}
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                          className="text-blue-600 hover:text-blue-800 hover:underline truncate max-w-xs"
                                                          title={evidence.evidence_name}
                                                        >
                                                          {evidence.evidence_name}
                                                        </a>
                                                        <button
                                                          onClick={() => handleDeleteEvidence(evidence)}
                                                          className="px-2 py-0.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded whitespace-nowrap"
                                                          title="削除"
                                                        >
                                                          削除
                                                        </button>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              </details>
                                            ) : (
                                              '-'
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </details>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
