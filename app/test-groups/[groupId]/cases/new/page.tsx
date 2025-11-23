'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface TestContent {
  test_case_no: number;
  test_case: string;
  expected_value: string;
  is_target: boolean;
}

export default function NewTestCasePage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session, status } = useSession();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Test case fields
  const [tid, setTid] = useState('');
  const [firstLayer, setFirstLayer] = useState('');
  const [secondLayer, setSecondLayer] = useState('');
  const [thirdLayer, setThirdLayer] = useState('');
  const [fourthLayer, setFourthLayer] = useState('');
  const [purpose, setPurpose] = useState('');
  const [requestId, setRequestId] = useState('');
  const [checkItems, setCheckItems] = useState('');
  const [testProcedure, setTestProcedure] = useState('');

  // Test contents
  const [testContents, setTestContents] = useState<TestContent[]>([
    { test_case_no: 1, test_case: '', expected_value: '', is_target: true },
  ]);

  // Files
  const [newControlSpecFiles, setNewControlSpecFiles] = useState<File[]>([]);
  const [newDataFlowFiles, setNewDataFlowFiles] = useState<File[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.user_role;
      if (userRole !== 0 && userRole !== 1) {
        router.push(`/test-groups/${groupId}/cases`);
      }
    }
  }, [status, session, router, groupId]);

  const handleAddTestContent = () => {
    const maxNo = Math.max(...testContents.map((tc) => tc.test_case_no), 0);
    setTestContents([
      ...testContents,
      { test_case_no: maxNo + 1, test_case: '', expected_value: '', is_target: true },
    ]);
  };

  const handleRemoveTestContent = (index: number) => {
    setTestContents(testContents.filter((_, i) => i !== index));
  };

  const handleTestContentChange = (
    index: number,
    field: keyof TestContent,
    value: string | number | boolean
  ) => {
    const newContents = [...testContents];
    newContents[index] = { ...newContents[index], [field]: value };
    setTestContents(newContents);
  };

  const handleControlSpecFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewControlSpecFiles([...newControlSpecFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleDataFlowFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewDataFlowFiles([...newDataFlowFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveNewFile = (fileType: number, index: number) => {
    if (fileType === 0) {
      setNewControlSpecFiles(newControlSpecFiles.filter((_, i) => i !== index));
    } else {
      setNewDataFlowFiles(newDataFlowFiles.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!tid) {
        throw new Error('TIDは必須です');
      }

      if (testContents.some((tc) => !tc.test_case)) {
        throw new Error('すべてのテストケース内容を入力してください');
      }

      const payload = {
        tid,
        first_layer: firstLayer || null,
        second_layer: secondLayer || null,
        third_layer: thirdLayer || null,
        fourth_layer: fourthLayer || null,
        purpose: purpose || null,
        request_id: requestId || null,
        check_items: checkItems || null,
        test_procedure: testProcedure || null,
        contents: testContents,
      };

      // Create test case
      const res = await fetch(`/api/test-groups/${groupId}/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '登録に失敗しました');
      }

      // Upload control spec files
      if (newControlSpecFiles.length > 0) {
        const formData = new FormData();
        newControlSpecFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('file_type', '0');

        await fetch(`/api/test-groups/${groupId}/cases/${tid}/files`, {
          method: 'POST',
          body: formData,
        });
      }

      // Upload data flow files
      if (newDataFlowFiles.length > 0) {
        const formData = new FormData();
        newDataFlowFiles.forEach((file) => {
          formData.append('files', file);
        });
        formData.append('file_type', '1');

        await fetch(`/api/test-groups/${groupId}/cases/${tid}/files`, {
          method: 'POST',
          body: formData,
        });
      }

      router.push(`/test-groups/${groupId}/cases`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <AuthenticatedLayout>
        <div className="p-8">読み込み中...</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">テストケース新規登録</h1>
            <button
              type="button"
              onClick={() => router.push(`/test-groups/${groupId}/cases`)}
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

          <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8">
            {/* TID */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                TID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tid}
                onChange={(e) => setTid(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="例：TC001"
                required
              />
            </div>

            {/* Hierarchical Layers */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">第1階層</label>
                <input
                  type="text"
                  value={firstLayer}
                  onChange={(e) => setFirstLayer(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">第2階層</label>
                <input
                  type="text"
                  value={secondLayer}
                  onChange={(e) => setSecondLayer(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">第3階層</label>
                <input
                  type="text"
                  value={thirdLayer}
                  onChange={(e) => setThirdLayer(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">第4階層</label>
                <input
                  type="text"
                  value={fourthLayer}
                  onChange={(e) => setFourthLayer(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>

            {/* Purpose */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">目的</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={3}
              />
            </div>

            {/* Request ID */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">リクエストID</label>
              <input
                type="text"
                value={requestId}
                onChange={(e) => setRequestId(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            {/* Check Items */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">チェック項目</label>
              <textarea
                value={checkItems}
                onChange={(e) => setCheckItems(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={3}
              />
            </div>

            {/* Test Procedure */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">テスト手順</label>
              <textarea
                value={testProcedure}
                onChange={(e) => setTestProcedure(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={3}
              />
            </div>

            {/* File Uploads */}
            <div className="mb-6 grid grid-cols-2 gap-6">
              {/* Control Spec Files */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">制御仕様書</label>

                {/* New files to upload */}
                {newControlSpecFiles.map((file, index) => (
                  <div key={`new-0-${index}`} className="mb-2 p-2 bg-blue-50 rounded flex justify-between items-center">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(0, index)}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      削除
                    </button>
                  </div>
                ))}

                <input
                  type="file"
                  onChange={handleControlSpecFileChange}
                  multiple
                  className="mt-2 text-sm"
                />
              </div>

              {/* Data Flow Files */}
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">データフロー</label>

                {/* New files to upload */}
                {newDataFlowFiles.map((file, index) => (
                  <div key={`new-1-${index}`} className="mb-2 p-2 bg-blue-50 rounded flex justify-between items-center">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveNewFile(1, index)}
                      className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                    >
                      削除
                    </button>
                  </div>
                ))}

                <input
                  type="file"
                  onChange={handleDataFlowFileChange}
                  multiple
                  className="mt-2 text-sm"
                />
              </div>
            </div>

            {/* Test Contents */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">
                  テストケース内容 <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddTestContent}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  追加
                </button>
              </div>

              {testContents.map((content, index) => (
                <div key={index} className="mb-4 p-4 border rounded bg-gray-50">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">テストケース No.{content.test_case_no}</h3>
                    {testContents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTestContent(index)}
                        className="px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        削除
                      </button>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="block text-gray-700 text-sm font-bold mb-1">
                      テストケース内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={content.test_case}
                      onChange={(e) =>
                        handleTestContentChange(index, 'test_case', e.target.value)
                      }
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="block text-gray-700 text-sm font-bold mb-1">
                      期待値
                    </label>
                    <textarea
                      value={content.expected_value}
                      onChange={(e) =>
                        handleTestContentChange(index, 'expected_value', e.target.value)
                      }
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="flex items-center text-gray-700 text-sm">
                      <input
                        type="checkbox"
                        checked={content.is_target}
                        onChange={(e) =>
                          handleTestContentChange(index, 'is_target', e.target.checked)
                        }
                        className="mr-2"
                      />
                      <span className="font-semibold">対象フラグ</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
              >
                {submitting ? '登録中...' : '登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
