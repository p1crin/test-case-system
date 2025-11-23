'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface Tag {
  id: number;
  name: string;
}

interface TagAssignment {
  tagId: number;
  tagName: string;
  testRole: number;
}

interface TestGroup {
  id: number;
  oem: string;
  model: string;
  event: string;
  variation: string | null;
  destination: string | null;
  spec: string | null;
  test_start_date: string | null;
  test_end_date: string | null;
  ng_plan_count: number | null;
  created_by: number;
  tags: Array<{ tag_id: number; tag_name: string; test_role: number }>;
}

export default function EditTestGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [oem, setOem] = useState('');
  const [model, setModel] = useState('');
  const [event, setEvent] = useState('');
  const [variation, setVariation] = useState('');
  const [destination, setDestination] = useState('');
  const [spec, setSpec] = useState('');
  const [testStartDate, setTestStartDate] = useState('');
  const [testEndDate, setTestEndDate] = useState('');
  const [ngPlanCount, setNgPlanCount] = useState('');

  // Tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagAssignment[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      const userRole = (session?.user as any)?.user_role;
      if (userRole !== 0 && userRole !== 1) {
        router.push('/test-groups');
        return;
      }

      fetchTestGroup();
      fetchTags();
    }
  }, [status, session, router, groupId]);

  const fetchTestGroup = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}`);
      if (!res.ok) {
        throw new Error('テストグループの取得に失敗しました');
      }

      const data = await res.json();
      const group: TestGroup = data.testGroup;

      setOem(group.oem);
      setModel(group.model);
      setEvent(group.event);
      setVariation(group.variation || '');
      setDestination(group.destination || '');
      setSpec(group.spec || '');
      setTestStartDate(group.test_start_date || '');
      setTestEndDate(group.test_end_date || '');
      setNgPlanCount(group.ng_plan_count?.toString() || '');

      // Map tags
      setSelectedTags(
        group.tags.map((t) => ({
          tagId: t.tag_id,
          tagName: t.tag_name,
          testRole: t.test_role,
        }))
      );

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      if (!res.ok) throw new Error('タグの取得に失敗しました');
      const data = await res.json();
      setAvailableTags(data.tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const handleAddTag = () => {
    setSelectedTags([...selectedTags, { tagId: 0, tagName: '', testRole: 1 }]);
  };

  const handleRemoveTag = (index: number) => {
    setSelectedTags(selectedTags.filter((_, i) => i !== index));
  };

  const handleTagChange = (index: number, tagId: number) => {
    const tag = availableTags.find((t) => t.id === tagId);
    if (!tag) return;

    const newTags = [...selectedTags];
    newTags[index] = { ...newTags[index], tagId, tagName: tag.name };
    setSelectedTags(newTags);
  };

  const handleRoleChange = (index: number, testRole: number) => {
    const newTags = [...selectedTags];
    newTags[index] = { ...newTags[index], testRole };
    setSelectedTags(newTags);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validation
      if (!oem || !model || !event) {
        throw new Error('OEM、モデル、イベントは必須です');
      }

      // Check for duplicate tags
      const tagIds = selectedTags.map((t) => t.tagId).filter((id) => id > 0);
      if (new Set(tagIds).size !== tagIds.length) {
        throw new Error('同じタグを複数回選択することはできません');
      }

      const payload = {
        oem,
        model,
        event,
        variation: variation || null,
        destination: destination || null,
        spec: spec || null,
        test_start_date: testStartDate || null,
        test_end_date: testEndDate || null,
        ng_plan_count: ngPlanCount ? parseInt(ngPlanCount, 10) : null,
        tags: selectedTags
          .filter((t) => t.tagId > 0)
          .map((t) => ({ tag_id: t.tagId, test_role: t.testRole })),
      };

      const res = await fetch(`/api/test-groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || '更新に失敗しました');
      }

      router.push('/test-groups');
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

  return (
    <AuthenticatedLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">テストグループ編集</h1>
            <button
              type="button"
              onClick={() => router.push('/test-groups')}
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
            {/* OEM */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                OEM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={oem}
                onChange={(e) => setOem(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            {/* Model */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                モデル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            {/* Event */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                イベント <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={event}
                onChange={(e) => setEvent(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>

            {/* Variation */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">バリエーション</label>
              <input
                type="text"
                value={variation}
                onChange={(e) => setVariation(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            {/* Destination */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">仕向地</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            {/* Spec */}
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">スペック</label>
              <input
                type="text"
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            {/* Test dates */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">テスト開始日</label>
                <input
                  type="date"
                  value={testStartDate}
                  onChange={(e) => setTestStartDate(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">テスト終了日</label>
                <input
                  type="date"
                  value={testEndDate}
                  onChange={(e) => setTestEndDate(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
            </div>

            {/* NG Plan Count */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">NG計画件数</label>
              <input
                type="number"
                value={ngPlanCount}
                onChange={(e) => setNgPlanCount(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                min="0"
              />
            </div>

            {/* Tag assignments */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 text-sm font-bold">タグ割り当て</label>
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                >
                  タグを追加
                </button>
              </div>

              {selectedTags.map((tagAssignment, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <select
                    value={tagAssignment.tagId}
                    onChange={(e) => handleTagChange(index, parseInt(e.target.value, 10))}
                    className="flex-1 shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value={0}>タグを選択</option>
                    {availableTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={tagAssignment.testRole}
                    onChange={(e) => handleRoleChange(index, parseInt(e.target.value, 10))}
                    className="w-40 shadow border rounded py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value={1}>デザイナー</option>
                    <option value={2}>実行者</option>
                    <option value={3}>閲覧者</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => handleRemoveTag(index)}
                    className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    削除
                  </button>
                </div>
              ))}
            </div>

            {/* Submit button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
              >
                {submitting ? '更新中...' : '更新'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
