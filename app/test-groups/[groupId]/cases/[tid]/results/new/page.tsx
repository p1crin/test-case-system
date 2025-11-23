'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface TestCaseData {
  id: number;
  test_case_no: number;
  test_item: string;
  expected_value: string | null;
}

interface TestGroup {
  id: number;
  oem: string | null;
  model: string | null;
  event: string | null;
  variation: string | null;
  destination: string | null;
  specs: string | null;
}

interface TestResultRow {
  id: string;
  test_case_no: string;
  test_item: string;
  expected_value: string;
  judgment: string;
  result: string;
  execution_date: string;
  executor: string;
  software_version: string;
  hardware_version: string;
  comparator_version: string;
  note: string;
  evidence_files: File[];
}

export default function BulkTestResultPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const tid = params.tid as string;
  const { data: session, status } = useSession();

  const [testGroup, setTestGroup] = useState<TestGroup | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([
    {
      id: '1',
      test_case_no: '',
      test_item: '',
      expected_value: '',
      judgment: 'OK',
      result: '',
      execution_date: '',
      executor: '',
      software_version: '',
      hardware_version: '',
      comparator_version: '',
      note: '',
      evidence_files: [],
    },
  ]);
  const [loadingTestCaseNo, setLoadingTestCaseNo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.user_role;
      if (userRole !== 0 && userRole !== 1) {
        router.push(`/test-groups/${groupId}/cases/${tid}/results`);
        return;
      }
      fetchTestGroup();
    }
  }, [status, session, router, groupId, tid]);

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

  const fetchTestCaseDetails = async (id: string, testCaseNo: string) => {
    if (!testCaseNo.trim()) {
      // Clear test case details if input is empty
      setRows(
        rows.map((row) =>
          row.id === id
            ? { ...row, test_case_no: testCaseNo, test_item: '', expected_value: '' }
            : row
        )
      );
      return;
    }

    setLoadingTestCaseNo(id);
    try {
      // Fetch all test contents for this TID
      const res = await fetch(
        `/api/test-groups/${groupId}/cases/${tid}?testCaseNo=${parseInt(testCaseNo, 10)}`
      );
      if (!res.ok) {
        throw new Error('テストケース情報の取得に失敗しました');
      }

      const data = await res.json();
      const testContents = data.testContents || [];

      // Find the test content that matches this test case number
      const matchingContent = testContents.find(
        (content: any) => content.test_case_no === parseInt(testCaseNo, 10)
      );

      if (matchingContent) {
        setRows(
          rows.map((row) =>
            row.id === id
              ? {
                  ...row,
                  test_case_no: testCaseNo,
                  test_item: matchingContent.test_item || '',
                  expected_value: matchingContent.expected_value || '',
                }
              : row
          )
        );
      } else {
        setError(`テストケース番号 ${testCaseNo} は見つかりません`);
        setRows(
          rows.map((row) =>
            row.id === id
              ? { ...row, test_case_no: testCaseNo, test_item: '', expected_value: '' }
              : row
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoadingTestCaseNo(null);
    }
  };

  const handleRowChange = (
    id: string,
    field: keyof TestResultRow,
    value: string | File[]
  ) => {
    if (field === 'test_case_no' && typeof value === 'string') {
      // When test case number changes, fetch test case details
      fetchTestCaseDetails(id, value);
    } else {
      setRows(
        rows.map((row) =>
          row.id === id
            ? { ...row, [field]: value }
            : row
        )
      );
    }
  };

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleRowChange(id, 'evidence_files', Array.from(e.target.files));
    }
  };

  const addRow = () => {
    const newId = Math.max(...rows.map((r) => parseInt(r.id) || 0), 0) + 1;
    setRows([
      ...rows,
      {
        id: newId.toString(),
        test_case_no: '',
        test_item: '',
        expected_value: '',
        judgment: 'OK',
        result: '',
        execution_date: '',
        executor: '',
        software_version: '',
        hardware_version: '',
        comparator_version: '',
        note: '',
        evidence_files: [],
      },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validate that all test case numbers are filled
      const emptyRows = rows.filter((row) => !row.test_case_no.trim());
      if (emptyRows.length > 0) {
        throw new Error('テストケース番号を入力してください');
      }

      // Submit results for all rows
      const promises = rows.map(async (row) => {
        const testCaseNo = parseInt(row.test_case_no, 10);

        // Upload evidence files to S3
        const evidenceUrls: string[] = [];

        if (row.evidence_files.length > 0) {
          for (const file of row.evidence_files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append(
              'folder',
              `evidence/${groupId}/${tid}/${testCaseNo}`
            );

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!uploadRes.ok) {
              const uploadErrorData = await uploadRes.json();
              throw new Error(
                `テストケース${testCaseNo}のファイルアップロード失敗 (${file.name}): ${uploadErrorData.error || '未知のエラー'}`
              );
            }

            const uploadData = await uploadRes.json();
            evidenceUrls.push(uploadData.url);
          }
        }

        // Submit test result
        const res = await fetch(
          `/api/test-groups/${groupId}/cases/${tid}/${testCaseNo}/results`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              result: row.result || null,
              judgment: row.judgment,
              software_version: row.software_version || null,
              hardware_version: row.hardware_version || null,
              comparator_version: row.comparator_version || null,
              execution_date: row.execution_date || null,
              executor: row.executor || null,
              note: row.note || null,
              evidence_urls: evidenceUrls,
            }),
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            `テストケース${testCaseNo}の登録失敗: ${errorData.error || '未知のエラー'}`
          );
        }

        return res.json();
      });

      await Promise.all(promises);

      alert('テスト結果を登録しました');
      router.push(`/test-groups/${groupId}/cases/${tid}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <button
          onClick={() => router.push(`/test-groups/${groupId}/cases/${tid}/results`)}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← テスト結果一覧に戻る
        </button>

        <h1 className="text-3xl font-bold mb-6">テスト結果一括登録</h1>

        {/* Test Group Info */}
        {testGroup && (
          <div className="bg-gray-50 border border-gray-300 rounded p-4 mb-6">
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

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded p-6">
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="px-3 py-2 text-left font-semibold border">No.</th>
                  <th className="px-3 py-2 text-left font-semibold border">テストケース内容</th>
                  <th className="px-3 py-2 text-left font-semibold border">期待値</th>
                  <th className="px-3 py-2 text-left font-semibold border">判定</th>
                  <th className="px-3 py-2 text-left font-semibold border">結果</th>
                  <th className="px-3 py-2 text-left font-semibold border">実行者</th>
                  <th className="px-3 py-2 text-left font-semibold border">実施日</th>
                  <th className="px-3 py-2 text-left font-semibold border">ソフトウェアVer</th>
                  <th className="px-3 py-2 text-left font-semibold border">ハードウェアVer</th>
                  <th className="px-3 py-2 text-left font-semibold border">コンパレータVer</th>
                  <th className="px-3 py-2 text-left font-semibold border">備考</th>
                  <th className="px-3 py-2 text-left font-semibold border">エビデンスファイル</th>
                  <th className="px-3 py-2 text-left font-semibold border">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 border">
                      <input
                        type="number"
                        min="1"
                        value={row.test_case_no}
                        onChange={(e) =>
                          handleRowChange(row.id, 'test_case_no', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded"
                        placeholder="例: 1"
                        disabled={loadingTestCaseNo === row.id}
                        required
                      />
                    </td>
                    <td className="px-3 py-2 border bg-gray-50 text-gray-700 text-xs max-w-xs">
                      {loadingTestCaseNo === row.id ? '読み込み中...' : row.test_item || '-'}
                    </td>
                    <td className="px-3 py-2 border bg-gray-50 text-gray-700 text-xs max-w-xs">
                      {loadingTestCaseNo === row.id ? '読み込み中...' : row.expected_value || '-'}
                    </td>
                    <td className="px-3 py-2 border">
                      <select
                        value={row.judgment}
                        onChange={(e) =>
                          handleRowChange(row.id, 'judgment', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="OK">OK</option>
                        <option value="NG">NG</option>
                        <option value="再実施対象外">再実施対象外</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.result}
                        onChange={(e) =>
                          handleRowChange(row.id, 'result', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="結果内容"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.executor}
                        onChange={(e) =>
                          handleRowChange(row.id, 'executor', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded"
                        placeholder="実行者名"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="date"
                        value={row.execution_date}
                        onChange={(e) =>
                          handleRowChange(row.id, 'execution_date', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.software_version}
                        onChange={(e) =>
                          handleRowChange(row.id, 'software_version', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="Ver."
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.hardware_version}
                        onChange={(e) =>
                          handleRowChange(row.id, 'hardware_version', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="Ver."
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.comparator_version}
                        onChange={(e) =>
                          handleRowChange(row.id, 'comparator_version', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="Ver."
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) =>
                          handleRowChange(row.id, 'note', e.target.value)
                        }
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="備考"
                      />
                    </td>
                    <td className="px-3 py-2 border">
                      <input
                        type="file"
                        multiple
                        onChange={(e) => handleFileChange(row.id, e)}
                        className="w-full text-xs"
                      />
                      {row.evidence_files.length > 0 && (
                        <div className="text-xs text-green-600 mt-1">
                          {row.evidence_files.length}件
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 border text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length === 1}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-gray-300"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={addRow}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              + 行を追加
            </button>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {submitting ? '送信中...' : '登録'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-gray-400 text-white rounded hover:bg-gray-500"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
