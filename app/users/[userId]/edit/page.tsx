'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CreatableSelect from 'react-select/creatable';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

interface Tag {
  id: number;
  name: string;
}

interface TagOption {
  value: number;
  label: string;
}

interface User {
  id: number;
  email: string;
  user_role: number;
  department?: string;
  company?: string;
  tags: Tag[];
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const { data: session } = useSession();

  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<number>(2);
  const [department, setDepartment] = useState('');
  const [company, setCompany] = useState('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<TagOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Check admin permission
    if (session && session.user.user_role !== 0) {
      router.push('/test-groups');
      return;
    }

    fetchUser();
    fetchTags();
  }, [session, userId]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        throw new Error('ユーザーの取得に失敗しました');
      }

      const data = await response.json();
      const userData = data.user;

      setUser(userData);
      setEmail(userData.email);
      setUserRole(userData.user_role);
      setDepartment(userData.department || '');
      setCompany(userData.company || '');
      setSelectedTags(userData.tags?.map((t: Tag) => ({ value: t.id, label: t.name })) || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching user:', error);
      alert('ユーザーの取得に失敗しました');
      router.push('/users');
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.tags || []);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      alert('メールアドレスは必須です');
      return;
    }

    setSubmitting(true);

    try {
      const body: any = {
        email,
        user_role: userRole,
        department: department || null,
        company: company || null,
        tag_ids: selectedTags.map(tag => tag.value),
      };

      // Only include password if it's provided
      if (password) {
        body.password = password;
      }

      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'ユーザーの更新に失敗しました');
      }

      alert('ユーザーを更新しました');
      router.push('/users');
    } catch (error) {
      console.error('Error updating user:', error);
      alert(error instanceof Error ? error.message : 'ユーザーの更新に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const tagOptions: TagOption[] = availableTags.map(tag => ({
    value: tag.id,
    label: tag.name,
  }));

  const handleCreateTag = async (inputValue: string) => {
    try {
      const response = await fetch('/api/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: inputValue }),
      });

      if (!response.ok) {
        throw new Error('タグの作成に失敗しました');
      }

      const data = await response.json();
      const newTag = data.tag;

      // Add to available tags
      setAvailableTags([...availableTags, newTag]);

      // Add to selected tags
      const newOption: TagOption = { value: newTag.id, label: newTag.name };
      setSelectedTags([...selectedTags, newOption]);

      return newOption;
    } catch (error) {
      console.error('Error creating tag:', error);
      alert(error instanceof Error ? error.message : 'タグの作成に失敗しました');
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="p-8">読み込み中...</div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">ユーザー編集</h1>

        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          {/* Email */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              required
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              パスワード（変更する場合のみ入力）
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              minLength={6}
            />
            <p className="text-gray-600 text-xs mt-1">
              空欄のままにするとパスワードは変更されません
            </p>
          </div>

          {/* User Role */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="userRole">
              権限 <span className="text-red-500">*</span>
            </label>
            <select
              id="userRole"
              value={userRole}
              onChange={(e) => setUserRole(parseInt(e.target.value))}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value={0}>管理者</option>
              <option value={1}>テスト管理者</option>
              <option value={2}>一般</option>
            </select>
          </div>

          {/* Department */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="department">
              部署
            </label>
            <input
              id="department"
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Company */}
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company">
              会社
            </label>
            <input
              id="company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">タグ</label>
            <Select
              isMulti
              options={tagOptions}
              value={selectedTags}
              onChange={(newValue) => setSelectedTags(newValue as TagOption[])}
              placeholder="タグを選択してください"
              noOptionsMessage={() => 'タグが見つかりません'}
              className="text-sm"
              classNamePrefix="react-select"
            />
            <p className="text-gray-600 text-xs mt-2">
              複数選択可能です。検索して選択してください。
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:bg-gray-400"
            >
              {submitting ? '更新中...' : '更新'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/users')}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  );
}
