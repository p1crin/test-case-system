# テストケース管理システム (Test Case Management System)

Next.js (App Router), TypeScript, PostgreSQL, NextAuth.js, AWS S3を使用したテストケース管理Webシステム。

## 主な機能

- **認証・認可**: NextAuth.js (JWT戦略) による認証
- **ユーザー管理**: 管理者専用のユーザーCRUD機能
- **テストグループ管理**: テストプロジェクトのグループ作成・編集・削除
- **テストケース管理**: テストケースと内容の作成・編集
- **テスト結果管理**: テスト実施結果の登録と履歴管理
- **集計・レポート**: テスト進捗のグラフ表示
- **ファイル管理**: AWS S3によるエビデンスファイルの保存
- **非同期インポート**: AWS Batchによる大量データのインポート

## アーキテクチャ

### REST APIベース設計

- **フロントエンド**: Next.js App Router (クライアントコンポーネント)
  - すべてのページは `"use client"` ディレクティブを使用
  - データ取得は `fetch` または `SWR` でバックエンドAPIを呼び出し

- **バックエンド**: Next.js API Routes
  - すべてのロジックは `/app/api/**/route.ts` に実装
  - JWT検証による認証
  - 複雑な権限チェック (静的ロール + 動的ロール)

### 権限システム

#### 静的ロール (`mt_users.user_role`)
- **0: 管理者** - すべての操作が可能
- **1: テスト管理者** - テストグループの作成が可能
- **2: 一般** - 割り当てられたテストグループのみアクセス可能

#### 動的ロール (`tt_test_group_tags.test_role`)
- **1: 設計者** - テストケースの作成・編集が可能
- **2: 実施者** - テスト結果の登録が可能
- **3: 閲覧者** - 閲覧のみ

## 技術スタック

- **フロントエンド**:
  - Next.js 16 (App Router)
  - TypeScript
  - Tailwind CSS
  - React Hook Form
  - SWR (データフェッチ)
  - Recharts (グラフ表示)

- **バックエンド**:
  - Next.js API Routes
  - NextAuth.js (認証)
  - PostgreSQL (データベース)
  - bcryptjs (パスワードハッシュ)

- **インフラ**:
  - AWS S3 (ファイルストレージ)
  - AWS Batch (非同期インポート)

## セットアップ

### 1. 前提条件

- Node.js 18以上
- PostgreSQL 14以上
- AWS アカウント (S3, Batch)

### 2. データベースのセットアップ

```bash
# PostgreSQLにログイン
psql -U postgres

# データベースを作成
CREATE DATABASE testcase_db;

# スキーマを適用
\i database/schema.sql
```

### 3. 環境変数の設定

`.env.example` を `.env` にコピーして、以下の値を設定してください:

```bash
cp .env.example .env
```

必要な環境変数:
- `DATABASE_URL`: PostgreSQL接続文字列
- `NEXTAUTH_URL`: アプリケーションのURL (開発時は http://localhost:3000)
- `NEXTAUTH_SECRET`: JWT署名用のシークレット (ランダムな文字列)
- `AWS_*`: AWS S3とBatchの設定

### 4. 依存関係のインストール

```bash
npm install
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### 6. デフォルトログイン情報

```
Email: admin@example.com
Password: admin123
```

**注意**: 本番環境では必ずデフォルトパスワードを変更してください。

## プロジェクト構造

```
test-case-system/
├── app/
│   ├── api/                          # REST APIエンドポイント
│   │   ├── auth/[...nextauth]/       # NextAuth認証
│   │   ├── test-groups/              # テストグループAPI
│   │   ├── users/                    # ユーザー管理API
│   │   ├── s3-presigned-url/         # S3署名付きURL発行
│   │   └── import-*/                 # インポートAPI
│   ├── components/                   # Reactコンポーネント
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── AuthenticatedLayout.tsx
│   │   └── Providers.tsx
│   ├── lib/                          # ユーティリティ
│   │   ├── db.ts                     # DB接続
│   │   └── auth.ts                   # 認証・認可ヘルパー
│   ├── types/                        # TypeScript型定義
│   │   └── database.ts
│   ├── login/                        # ログインページ
│   ├── test-groups/                  # テストグループページ
│   ├── users/                        # ユーザー管理ページ
│   ├── layout.tsx                    # ルートレイアウト
│   ├── page.tsx                      # ホームページ (リダイレクト)
│   └── globals.css
├── database/
│   └── schema.sql                    # データベーススキーマ
├── .env.example                      # 環境変数サンプル
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

## API エンドポイント

### 認証
- `POST /api/auth/signin` - ログイン
- `POST /api/auth/signout` - ログアウト

### テストグループ
- `GET /api/test-groups` - 一覧取得 (アクセス可能なグループのみ)
- `POST /api/test-groups` - 新規作成 (管理者・テスト管理者のみ)
- `GET /api/test-groups/[groupId]` - 詳細取得
- `PUT /api/test-groups/[groupId]` - 更新
- `DELETE /api/test-groups/[groupId]` - 削除 (ソフトデリート)

### テストケース
- `GET /api/test-groups/[groupId]/cases` - テストケース一覧
- `POST /api/test-groups/[groupId]/cases` - テストケース作成 (設計者ロール必要)
- `PUT /api/test-groups/[groupId]/cases/[tid]` - テストケース更新

### ユーザー管理 (管理者のみ)
- `GET /api/users` - ユーザー一覧
- `POST /api/users` - ユーザー作成
- `PUT /api/users/[userId]` - ユーザー更新
- `DELETE /api/users/[userId]` - ユーザー削除

### S3ファイルアップロード
- `POST /api/s3-presigned-url` - 署名付きURL取得

### インポート
- `POST /api/import-users` - ユーザー一括インポート (AWS Batch)
- `POST /api/import-cases` - テストケース一括インポート (AWS Batch)
- `GET /api/import-results` - インポート結果一覧
- `GET /api/import-results/[jobId]` - インポートエラー詳細

## データベーススキーマ

詳細は [`database/schema.sql`](database/schema.sql) を参照してください。

主要テーブル:
- `mt_users` - ユーザー
- `mt_tags` - タグ
- `tt_test_groups` - テストグループ
- `tt_test_group_tags` - テストグループとタグの関連 (動的権限)
- `tt_test_cases` - テストケース
- `tt_test_contents` - テスト内容
- `tt_test_results` - テスト結果
- `tt_test_results_history` - テスト結果履歴
- `tt_test_evidences` - エビデンスファイル

## セキュリティ

- パスワードは bcrypt でハッシュ化
- JWT による認証 (30日間有効)
- APIエンドポイントは全て認証必須
- 動的権限による細かいアクセス制御
- ソフトデリート (`is_deleted` フラグ)

## 開発中の機能

以下の機能は基本実装が完了していますが、フロントエンドページの追加実装が必要です:

- [ ] テストケース詳細ページ
- [ ] テスト結果登録ページ
- [ ] レポート・集計ページ
- [ ] ユーザー管理ページ (完全版)
- [ ] インポート結果ページ

これらのページのスケルトンコードは作成済みで、対応するAPIエンドポイントも実装されています。

## ライセンス

ISC

## サポート

問題が発生した場合は、GitHubのIssueを作成してください。
