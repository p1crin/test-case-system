# 実装ガイド - テストケース管理システム

## プロジェクト概要

このドキュメントは、テストケース管理システムの実装詳細と、残りの作業について説明します。

## 完成している機能

### ✅ 基盤実装 (100%)

1. **プロジェクト構成**
   - Next.js 16 + TypeScript
   - Tailwind CSS
   - 必要な依存関係のインストール

2. **データベース**
   - 完全なPostgreSQLスキーマ ([database/schema.sql](database/schema.sql))
   - 15テーブル + インデックス + トリガー
   - サンプルデータ (管理者ユーザー)

3. **TypeScript型定義**
   - 全テーブルの型定義 ([app/types/database.ts](app/types/database.ts))
   - Enum型 (UserRole, TestRole, Judgment, ImportStatus など)

4. **認証システム**
   - NextAuth.js設定 ([app/api/auth/[...nextauth]/route.ts](app/api/auth/[...nextauth]/route.ts))
   - JWT戦略
   - bcryptによるパスワードハッシュ化

5. **データベースユーティリティ**
   - PostgreSQL接続プール ([app/lib/db.ts](app/lib/db.ts))
   - トランザクション処理
   - クエリヘルパー関数

6. **権限管理システム**
   - 認証ミドルウェア ([app/lib/auth.ts](app/lib/auth.ts))
   - 静的ロールチェック (管理者、テスト管理者、一般)
   - 動的ロールチェック (設計者、実施者、閲覧者)
   - テストグループごとの権限制御

### ✅ APIエンドポイント (主要部分完成)

1. **認証API**
   - `POST /api/auth/signin` - ログイン
   - `POST /api/auth/signout` - ログアウト

2. **テストグループAPI**
   - `GET /api/test-groups` - 一覧取得 (権限フィルタ付き)
   - `POST /api/test-groups` - 作成 (管理者・テスト管理者のみ)
   - `GET /api/test-groups/[groupId]` - 詳細取得
   - `PUT /api/test-groups/[groupId]` - 更新
   - `DELETE /api/test-groups/[groupId]` - 削除

3. **テストケースAPI**
   - `GET /api/test-groups/[groupId]/cases` - 一覧取得
   - `POST /api/test-groups/[groupId]/cases` - 作成 (設計者ロール必要)

4. **ユーザー管理API**
   - `GET /api/users` - 一覧取得 (管理者のみ)
   - `POST /api/users` - 作成 (管理者のみ)

### ✅ フロントエンド (基本部分完成)

1. **共通コンポーネント**
   - [app/components/Header.tsx](app/components/Header.tsx) - ヘッダー (ユーザー情報表示)
   - [app/components/Sidebar.tsx](app/components/Sidebar.tsx) - サイドバー (ナビゲーション)
   - [app/components/AuthenticatedLayout.tsx](app/components/AuthenticatedLayout.tsx) - 認証レイアウト
   - [app/components/Providers.tsx](app/components/Providers.tsx) - SessionProvider

2. **ページ**
   - [app/login/page.tsx](app/login/page.tsx) - ログインページ
   - [app/test-groups/page.tsx](app/test-groups/page.tsx) - テストグループ一覧ページ

## 未完成の機能と実装方法

以下の機能はAPIは準備されていますが、フロントエンドページの実装が必要です。

### 🔨 テストグループ関連ページ

#### 1. テストグループ作成ページ (`/test-groups/new`)

**作成ファイル**: `app/test-groups/new/page.tsx`

**実装内容**:
```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthenticatedLayout from '@/app/components/AuthenticatedLayout';

export default function NewTestGroupPage() {
  // React Hook Form を使用してフォームを作成
  // 以下のフィールドが必要:
  // - oem, model, event, variation, destination, specs
  // - test_startdate, test_enddate, ng_plan_count
  // - tags (react-select で複数選択)

  // 送信時: POST /api/test-groups
  // 成功時: /test-groups にリダイレクト
}
```

#### 2. テストグループ編集ページ (`/test-groups/[groupId]/edit`)

**作成ファイル**: `app/test-groups/[groupId]/edit/page.tsx`

**実装内容**:
- `GET /api/test-groups/[groupId]` で現在のデータを取得
- `PUT /api/test-groups/[groupId]` で更新

### 🔨 テストケース関連ページ

#### 3. テストケース一覧ページ (`/test-groups/[groupId]/cases`)

**作成ファイル**: `app/test-groups/[groupId]/cases/page.tsx`

**実装内容**:
```typescript
'use client';

export default function TestCasesPage({ params }: { params: { groupId: string } }) {
  // GET /api/test-groups/[groupId]/cases でテストケース取得
  // テーブル表示:
  //   - TID
  //   - first_layer, second_layer, third_layer, fourth_layer
  //   - 目的 (purpose)
  //   - テストケース数 (contents.length)
  //   - 操作ボタン (編集、結果確認)

  // 権限による「新規登録」ボタンの表示/非表示
}
```

#### 4. テストケース作成/編集ページ

**作成ファイル**:
- `app/test-groups/[groupId]/cases/new/page.tsx`
- `app/test-groups/[groupId]/cases/[tid]/edit/page.tsx`

**実装内容**:
- フォームフィールド:
  - TID (テストケースID)
  - first_layer, second_layer, third_layer, fourth_layer
  - purpose, request_id, check_items, test_procedure
  - **動的フォーム**: test_contents (配列)
    - test_case_no, test_case, expected_value, is_target
  - **ファイルアップロード**: test_case_files
    - S3署名付きURL取得 → アップロード → パス保存

### 🔨 テスト結果関連ページ

#### 5. テスト結果一覧/確認ページ

**作成ファイル**: `app/test-groups/[groupId]/cases/[tid]/results/page.tsx`

**必要なAPI**:
```typescript
// 作成必要: app/api/test-groups/[groupId]/cases/[tid]/results/route.ts
GET /api/test-groups/[groupId]/cases/[tid]/results
// - tt_test_contents と tt_test_results を結合
// - 最新のjudgment, execution_date, executor を表示
// - history_countも取得
```

#### 6. テスト結果登録ページ

**作成ファイル**: `app/test-groups/[groupId]/cases/[tid]/[testCaseNo]/results/new/page.tsx`

**必要なAPI**:
```typescript
// 作成必要: app/api/test-groups/[groupId]/cases/[tid]/[testCaseNo]/results/route.ts
POST /api/test-groups/[groupId]/cases/[tid]/[testCaseNo]/results
// トランザクション内で:
//   1. tt_test_results に INSERT or UPDATE
//   2. tt_test_results_history に INSERT (history_countインクリメント)
//   3. tt_test_evidences に複数ファイルパスを INSERT
```

**フォームフィールド**:
- result (テスト結果テキスト)
- judgment (OK/NG/再実施対象外)
- software_version, hardware_version, comparator_version
- execution_date, executor, note
- **複数ファイルアップロード** (エビデンス)

### 🔨 集計・レポートページ

#### 7. テストグループ集計ページ (`/test-groups/[groupId]/report`)

**作成ファイル**: `app/test-groups/[groupId]/report/page.tsx`

**必要なAPI**:
```typescript
// 作成必要: app/api/test-groups/[groupId]/report-data/route.ts
GET /api/test-groups/[groupId]/report-data
// 返すデータ:
{
  totalCases: number, // is_target=trueの総数
  completedCases: number, // judgment がnullでない数
  okCases: number,
  ngCases: number,
  progressRate: number, // 進捗率
  bugCurve: [ // バグ曲線用データ
    { date: '2024-01-01', ngCount: 5 },
    ...
  ]
}
```

**表示内容**:
- Recharts を使用:
  - 円グラフ: OK/NG/未実施の割合
  - 折れ線グラフ: バグ曲線 (日付ごとのNG件数)
  - 進捗バー

### 🔨 ユーザー管理ページ (完全版)

#### 8. ユーザー一覧ページ (`/users`)

**作成ファイル**: `app/users/page.tsx`

**実装内容**:
```typescript
'use client';

export default function UsersPage() {
  // 管理者チェック:
  //   useSession() で user_role === 0 確認
  //   そうでなければ /test-groups にリダイレクト

  // GET /api/users でユーザー一覧取得
  // 検索フィルタ:
  //   - email, department, tagId

  // テーブル表示:
  //   - ID, email, user_role, department, company, tags
  //   - 操作: 編集、削除

  // 「新規登録」ボタン
}
```

#### 9. ユーザー作成/編集ページ

**作成ファイル**:
- `app/users/new/page.tsx`
- `app/users/[userId]/edit/page.tsx`

**実装内容**:
- フォーム:
  - email, password (作成時のみ), user_role, department, company
  - **react-select (Creatable)** でタグ選択
    - 存在しないタグ名を入力すると自動で新規作成 (API側で対応済み)

**必要なAPI**:
```typescript
// 作成必要: app/api/users/[userId]/route.ts
GET /api/users/[userId]
PUT /api/users/[userId]
DELETE /api/users/[userId]
```

### 🔨 インポート関連ページ

#### 10. インポート結果一覧ページ (`/import-results`)

**作成ファイル**: `app/import-results/page.tsx`

**必要なAPI**:
```typescript
// 作成必要: app/api/import-results/route.ts
GET /api/import-results
// tt_import_results から一覧取得
// user_role === 0 (管理者) の場合のみ import_type=1 (ユーザー) を表示
```

#### 11. インポート詳細/エラーページ

**作成ファイル**: `app/import-results/[jobId]/page.tsx`

**必要なAPI**:
```typescript
// 作成必要: app/api/import-results/[jobId]/route.ts
GET /api/import-results/[jobId]
// tt_import_result_errors から error_details, error_row を取得
```

### 🔨 S3ファイルアップロード

**必要なAPI**:
```typescript
// 作成必要: app/api/s3-presigned-url/route.ts
POST /api/s3-presigned-url
// リクエスト: { fileName: string, fileType: string }
// レスポンス: { url: string, fields: object }

// 実装:
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// 署名付きPOSTを生成してフロントエンドに返す
// フロントエンドはFormDataで直接S3にアップロード
```

**フロントエンド使用例**:
```typescript
// 1. 署名付きURL取得
const { url, fields } = await fetch('/api/s3-presigned-url', {
  method: 'POST',
  body: JSON.stringify({ fileName: file.name, fileType: file.type })
}).then(r => r.json());

// 2. S3にアップロード
const formData = new FormData();
Object.entries(fields).forEach(([key, value]) => {
  formData.append(key, value as string);
});
formData.append('file', file);
await fetch(url, { method: 'POST', body: formData });

// 3. S3パスを本体のAPIリクエストに含める
const s3Path = `${fields.key}`;
```

### 🔨 AWS Batchインポート

**必要なAPI**:
```typescript
// 作成必要: app/api/import-users/route.ts
POST /api/import-users
// 1. CSVファイルをS3の一時バケットにアップロード
// 2. tt_import_results に status=1 (実施中) で登録
// 3. AWS Batch ジョブをキック
// 4. 202 Accepted を即座に返す

// 作成必要: app/api/import-cases/route.ts
POST /api/import-cases
// (同様の処理)
```

## 実装の優先順位

### Phase 1: 基本フロー (最優先)

1. ✅ ログイン
2. ✅ テストグループ一覧
3. 🔨 テストグループ作成/編集
4. 🔨 テストケース一覧
5. 🔨 テストケース作成/編集

### Phase 2: テスト実施

6. 🔨 テスト結果一覧
7. 🔨 テスト結果登録 (エビデンスアップロード含む)
8. 🔨 S3署名付きURL API

### Phase 3: 管理・分析

9. 🔨 ユーザー管理 (完全版)
10. 🔨 集計レポート
11. 🔨 インポート結果表示

### Phase 4: 高度な機能

12. 🔨 AWS Batchインポート
13. 🔨 テスト結果履歴表示
14. 🔨 高度な検索・フィルタ

## 開発のヒント

### データフェッチパターン

```typescript
'use client';

import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function Page() {
  const { data, error, mutate } = useSWR('/api/test-groups', fetcher);

  if (error) return <div>エラー</div>;
  if (!data) return <div>読み込み中...</div>;

  return <div>{/* データ表示 */}</div>;
}
```

### APIリクエスト (POST/PUT)

```typescript
const handleSubmit = async (formData: any) => {
  const response = await fetch('/api/test-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });

  if (!response.ok) {
    const error = await response.json();
    alert(error.error);
    return;
  }

  const result = await response.json();
  router.push('/test-groups');
};
```

### 権限チェック (フロントエンド)

```typescript
'use client';

import { useSession } from 'next-auth/react';

export default function Page() {
  const { data: session } = useSession();

  const canEdit = session?.user.user_role === 0 ||
                  session?.user.user_role === 1;

  return (
    <div>
      {canEdit && <button>編集</button>}
    </div>
  );
}
```

## テスト方法

### 1. データベーステスト

```bash
# PostgreSQLに接続
psql -U postgres -d testcase_db

# テーブル確認
\dt

# サンプルデータ確認
SELECT * FROM mt_users;
```

### 2. APIテスト (curl)

```bash
# ログイン
curl -X POST http://localhost:3000/api/auth/signin \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"admin123"}'

# テストグループ取得
curl http://localhost:3000/api/test-groups \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### 3. E2Eテスト

1. ログイン → テストグループ一覧
2. テストグループ作成
3. テストケース作成
4. テスト結果登録
5. 集計レポート確認

## まとめ

- ✅ **完成**: 基盤、認証、主要API、基本ページ
- 🔨 **未完成**: フロントエンドページの大部分、一部API

次のステップとして、Phase 1の残りのページ (テストグループ作成/編集、テストケース一覧/作成) の実装を推奨します。
