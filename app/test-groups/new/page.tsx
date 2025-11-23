'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface Tag {
  id: number;
  name: string;
}

interface TagAssignment {
  tag_id: number;
  tag_name: string;
  test_role: number;
}

export default function NewTestGroupPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagAssignments, setTagAssignments] = useState<TagAssignment[]>([]);

  // フォームデータ
  const [formData, setFormData] = useState({
    oem: '',
    model: '',
    event: '',
    variation: '',
    destination: '',
    specs: '',
    test_startdate: '',
    test_enddate: '',
    ng_plan_count: 0,
  });

  // 権限チェック
  useEffect(() => {
    if (session && session.user.user_role !== 0 && session.user.user_role !== 1) {
      router.push('/test-groups');
    }
  }, [session, router]);

  // タグ一覧取得
  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || []);
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTagAssignment = () => {
    if (tags.length === 0) return;
    setTagAssignments(prev => [
      ...prev,
      { tag_id: tags[0].id, tag_name: tags[0].name, test_role: 3 }
    ]);
  };

  const handleTagAssignmentChange = (index: number, field: string, value: any) => {
    setTagAssignments(prev => {
      const newAssignments = [...prev];
      if (field === 'tag_id') {
        const selectedTag = tags.find(t => t.id === parseInt(value));
        newAssignments[index] = {
          ...newAssignments[index],
          tag_id: parseInt(value),
          tag_name: selectedTag?.name || ''
        };
      } else {
        newAssignments[index] = { ...newAssignments[index], [field]: value };
      }
      return newAssignments;
    });
  };

  const handleRemoveTagAssignment = (index: number) => {
    setTagAssignments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/test-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: tagAssignments.map(ta => ({ tag_id: ta.tag_id, test_role: ta.test_role })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'テストグループの作成に失敗しました');
      }

      router.push('/test-groups');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">テストグループ新規作成</h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="oem">
                OEM <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="oem"
                name="oem"
                value={formData.oem}
                onChange={handleChange}
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="model">
                モデル <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event">
                イベント
              </label>
              <input
                type="text"
                id="event"
                name="event"
                value={formData.event}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="variation">
                バリエーション
              </label>
              <input
                type="text"
                id="variation"
                name="variation"
                value={formData.variation}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="destination">
                仕向地
              </label>
              <input
                type="text"
                id="destination"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="ng_plan_count">
                計画NG件数
              </label>
              <input
                type="number"
                id="ng_plan_count"
                name="ng_plan_count"
                value={formData.ng_plan_count}
                onChange={handleChange}
                min="0"
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="test_startdate">
                テスト開始日
              </label>
              <input
                type="date"
                id="test_startdate"
                name="test_startdate"
                value={formData.test_startdate}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="test_enddate">
                テスト終了日
              </label>
              <input
                type="date"
                id="test_enddate"
                name="test_enddate"
                value={formData.test_enddate}
                onChange={handleChange}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="specs">
              仕様詳細
            </label>
            <textarea
              id="specs"
              name="specs"
              value={formData.specs}
              onChange={handleChange}
              rows={4}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 text-sm font-bold">
                タグ割り当て
              </label>
              <button
                type="button"
                onClick={handleAddTagAssignment}
                className="bg-green-500 hover:bg-green-700 text-white text-sm font-bold py-1 px-3 rounded"
              >
                + 追加
              </button>
            </div>

            {tagAssignments.map((assignment, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <select
                  value={assignment.tag_id}
                  onChange={(e) => handleTagAssignmentChange(index, 'tag_id', e.target.value)}
                  className="shadow border rounded py-2 px-3 text-gray-700 flex-1"
                >
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>

                <select
                  value={assignment.test_role}
                  onChange={(e) => handleTagAssignmentChange(index, 'test_role', parseInt(e.target.value))}
                  className="shadow border rounded py-2 px-3 text-gray-700 w-40"
                >
                  <option value={1}>設計者</option>
                  <option value={2}>実施者</option>
                  <option value={3}>閲覧者</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleRemoveTagAssignment(index)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                  削除
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
            >
              {loading ? '作成中...' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
