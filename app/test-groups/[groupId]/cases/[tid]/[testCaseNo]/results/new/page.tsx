'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface TestContentRow {
  id: number;
  test_case_no: number;
  test_item: string;
  expected_value: string | null;
  result: string;
  judgment: string;
  execution_date: string;
  executor: string;
  software_version: string;
  hardware_version: string;
  comparator_version: string;
  note: string;
  evidence_files: File[];
}

interface TestCase {
  id: number;
  test_group_id: number;
  tid: string;
  first_layer: string | null;
  second_layer: string | null;
  third_layer: string | null;
  fourth_layer: string | null;
  purpose: string | null;
  test_procedure: string | null;
}

export default function NewTestResultPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const tid = params.tid as string;
  const { data: session, status } = useSession();

  const [testCase, setTestCase] = useState<TestCase | null>(null);
  const [testContents, setTestContents] = useState<TestContentRow[]>([]);
  const [loading, setLoading] = useState(true);
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
      fetchTestCase();
    }
  }, [status, session, router, groupId, tid]);

  const fetchTestCase = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}/cases/${tid}`);
      if (!res.ok) {
        throw new Error('テストケースの取得に失敗しました');
      }

      const data = await res.json();
      setTestCase(data.testCase);

      // Initialize test contents with default values for each row
      const initializedContents = data.testContents.map((content: any) => ({
        id: content.id,
        test_case_no: content.test_case_no,
        test_item: content.test_item,
        expected_value: content.expected_value,
        result: '',
        judgment: 'OK',
        execution_date: '',
        executor: '',
        software_version: '',
        hardware_version: '',
        comparator_version: '',
        note: '',
        evidence_files: [],
      }));
      setTestContents(initializedContents);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const handleContentChange = (
    index: number,
    field: keyof TestContentRow,
    value: string
  ) => {
    const updated = [...testContents];
    updated[index] = { ...updated[index], [field]: value };
    setTestContents(updated);
  };

  const handleFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const updated = [...testContents];
      updated[index] = {
        ...updated[index],
        evidence_files: Array.from(e.target.files),
      };
      setTestContents(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Submit results for all test contents with file uploads
      const promises = testContents.map(async (content) => {
        // Upload evidence files to S3
        const evidenceUrls: string[] = [];

        if (content.evidence_files.length > 0) {
          for (const file of content.evidence_files) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append(
              'folder',
              `evidence/${groupId}/${tid}/${content.test_case_no}`
            );

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!uploadRes.ok) {
              const uploadErrorData = await uploadRes.json();
              throw new Error(
                `ファイルアップロード失敗 (${file.name}): ${uploadErrorData.error || '未知のエラー'}`
              );
            }

            const uploadData = await uploadRes.json();
            evidenceUrls.push(uploadData.url);
          }
        }

        const payload = {
          result: content.result || null,
          judgment: content.judgment || 'OK',
          software_version: content.software_version || null,
          hardware_version: content.hardware_version || null,
          comparator_version: content.comparator_version || null,
          execution_date: content.execution_date || null,
          executor: content.executor || null,
          note: content.note || null,
          evidence_urls: evidenceUrls,
        };

        const res = await fetch(
          `/api/test-groups/${groupId}/cases/${tid}/${content.test_case_no}/results`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }
        );

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            `テストケース No.${content.test_case_no}: ${errorData.error || '登録に失敗しました'}`
          );
        }

        return res.json();
      });

      await Promise.all(promises);

      alert(`${testContents.length}件のテスト結果を登録しました`);
      router.push(`/test-groups/${groupId}/cases/${tid}/results`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">読み込み中...</div>
      </AuthenticatedLayout>
    );
  }

  if (!testCase) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">
          <div className="text-red-600">テストケースが見つかりません</div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">テスト結果一括登録 (TID: {tid})</h1>
            <button
              type="button"
              onClick={() => router.push(`/test-groups/${groupId}/cases/${tid}/results`)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              キャンセル
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Test Case Information */}
          <div className="bg-white shadow-md rounded p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">テスト情報</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {testCase.first_layer && (
                <div>
                  <span className="font-semibold text-gray-700">第1階層: </span>
                  <span className="text-gray-900">{testCase.first_layer}</span>
                </div>
              )}
              {testCase.second_layer && (
                <div>
                  <span className="font-semibold text-gray-700">第2階層: </span>
                  <span className="text-gray-900">{testCase.second_layer}</span>
                </div>
              )}
              {testCase.third_layer && (
                <div>
                  <span className="font-semibold text-gray-700">第3階層: </span>
                  <span className="text-gray-900">{testCase.third_layer}</span>
                </div>
              )}
              {testCase.fourth_layer && (
                <div>
                  <span className="font-semibold text-gray-700">第4階層: </span>
                  <span className="text-gray-900">{testCase.fourth_layer}</span>
                </div>
              )}
            </div>
            {testCase.purpose && (
              <div className="mt-4">
                <span className="font-semibold text-gray-700">目的: </span>
                <span className="text-gray-900">{testCase.purpose}</span>
              </div>
            )}
            {testCase.test_procedure && (
              <div className="mt-2">
                <span className="font-semibold text-gray-700">テスト手順: </span>
                <span className="text-gray-900 whitespace-pre-wrap">{testCase.test_procedure}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            {/* Test Contents Table */}
            <div className="bg-white shadow-md rounded p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">テストケース一覧</h2>

              <div className="overflow-x-auto max-w-full">
                <table className="min-w-full border-collapse border border-gray-300 text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">No.</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">テストケース</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">期待値</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">結果</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">判定</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">実施日</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">実行者</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">SW Ver</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">HW Ver</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">Comp Ver</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">備考</th>
                      <th className="border border-gray-300 px-2 py-2 text-left text-xs font-semibold whitespace-nowrap">エビデンス</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testContents.map((content, index) => (
                      <tr key={content.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-2 py-2 text-xs">{content.test_case_no}</td>
                        <td className="border border-gray-300 px-2 py-2 text-xs">{content.test_item}</td>
                        <td className="border border-gray-300 px-2 py-2 text-xs">{content.expected_value || '-'}</td>
                        <td className="border border-gray-300 px-2 py-2">
                          <textarea
                            value={content.result}
                            onChange={(e) => handleContentChange(index, 'result', e.target.value)}
                            className="w-full min-w-[150px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                            placeholder="結果を入力"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <select
                            value={content.judgment}
                            onChange={(e) => handleContentChange(index, 'judgment', e.target.value)}
                            className="w-full min-w-[100px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="OK">OK</option>
                            <option value="NG">NG</option>
                            <option value="再実施対象外">再実施対象外</option>
                          </select>
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="date"
                            value={content.execution_date}
                            onChange={(e) => handleContentChange(index, 'execution_date', e.target.value)}
                            className="w-full min-w-[140px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="text"
                            value={content.executor}
                            onChange={(e) => handleContentChange(index, 'executor', e.target.value)}
                            className="w-full min-w-[100px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="実行者"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="text"
                            value={content.software_version}
                            onChange={(e) => handleContentChange(index, 'software_version', e.target.value)}
                            className="w-full min-w-[80px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="v1.0.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="text"
                            value={content.hardware_version}
                            onChange={(e) => handleContentChange(index, 'hardware_version', e.target.value)}
                            className="w-full min-w-[80px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="v2.0"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="text"
                            value={content.comparator_version}
                            onChange={(e) => handleContentChange(index, 'comparator_version', e.target.value)}
                            className="w-full min-w-[80px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="v3.1"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <textarea
                            value={content.note}
                            onChange={(e) => handleContentChange(index, 'note', e.target.value)}
                            className="w-full min-w-[150px] border rounded py-1 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                            placeholder="備考"
                          />
                        </td>
                        <td className="border border-gray-300 px-2 py-2">
                          <input
                            type="file"
                            multiple
                            onChange={(e) => handleFileChange(index, e)}
                            className="w-full min-w-[150px] text-xs border rounded cursor-pointer bg-gray-50 focus:outline-none p-1"
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                          />
                          {content.evidence_files.length > 0 && (
                            <div className="mt-1 text-xs text-gray-600">
                              {content.evidence_files.length}ファイル選択中
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                ※ エビデンスファイルのアップロード機能は今後実装予定です
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
              >
                {submitting ? '登録中...' : `${testContents.length}件のテスト結果を一括登録`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
