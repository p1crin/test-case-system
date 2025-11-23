# クイックスタートガイド

このガイドに従って、テストケース管理システムを5分でセットアップして起動できます。

## 前提条件

- ✅ Node.js 18以上がインストールされていること
- ✅ PostgreSQL 14以上がインストールされて実行中であること
- ✅ ターミナルまたはコマンドプロンプトが使用できること

## セットアップ手順

### ステップ1: プロジェクトディレクトリに移動

```bash
cd /Users/matsuishi_t/Documents/src/test-case-system
```

### ステップ2: データベースのセットアップ

#### オプションA: 自動セットアップスクリプトを使用 (推奨)

```bash
cd scripts
./setup-database.sh
cd ..
```

#### オプションB: 手動セットアップ

```bash
# PostgreSQLにログイン
psql -U postgres

# データベースを作成
CREATE DATABASE testcase_db;
\q

# スキーマを適用
psql -U postgres -d testcase_db -f database/schema.sql
```

### ステップ3: 環境変数の設定

```bash
# .env.example を .env にコピー
cp .env.example .env
```

`.env` ファイルを編集して、最低限以下を設定してください:

```bash
# 必須項目
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/testcase_db
NEXTAUTH_SECRET=your-random-secret-key-change-this-in-production
NEXTAUTH_URL=http://localhost:3000

# オプション (S3やBatch機能を使う場合のみ)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=test-case-files
```

**重要**: `NEXTAUTH_SECRET` は以下のコマンドでランダムな文字列を生成できます:

```bash
openssl rand -base64 32
```

### ステップ4: 依存関係のインストール

```bash
npm install
```

### ステップ5: 開発サーバーの起動

```bash
npm run dev
```

### ステップ6: ブラウザでアクセス

ブラウザで以下のURLを開きます:

```
http://localhost:3000
```

## デフォルトログイン情報

```
Email: admin@example.com
Password: admin123
```

**セキュリティ警告**: 本番環境では必ずデフォルトパスワードを変更してください！

## 動作確認

1. ✅ ログインページが表示される
2. ✅ admin@example.com でログインできる
3. ✅ ダッシュボード (テストグループ一覧) が表示される
4. ✅ サイドバーに「テストグループ一覧」と「ユーザー管理」 (管理者のみ) が表示される

## トラブルシューティング

### データベース接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解決方法**:
- PostgreSQLが起動しているか確認: `pg_ctl status` または `brew services list` (Mac)
- `.env` の `DATABASE_URL` が正しいか確認

### 認証エラー

```
Error: NEXTAUTH_SECRET must be set
```

**解決方法**:
- `.env` ファイルに `NEXTAUTH_SECRET` が設定されているか確認

### ビルドエラー

```
Error: Cannot find module 'next'
```

**解決方法**:
```bash
rm -rf node_modules package-lock.json
npm install
```

## 次のステップ

システムが起動したら、以下の機能を試してみてください:

1. **ユーザー管理** (管理者のみ)
   - サイドバーの「ユーザー管理」をクリック
   - 新しいユーザーを作成

2. **テストグループ作成**
   - 「新規登録」ボタンをクリック
   - ※このページは未実装のため、実装が必要です

詳細な実装ガイドは [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) を参照してください。

## 開発モード

```bash
npm run dev      # 開発サーバー起動 (ホットリロード有効)
npm run build    # プロダクションビルド
npm run start    # プロダクションサーバー起動
npm run lint     # ESLint実行
```

## 本番環境へのデプロイ

1. `.env` の `NEXTAUTH_URL` を本番URLに変更
2. `NEXTAUTH_SECRET` を強力なランダム文字列に変更
3. PostgreSQLの本番用データベースを作成
4. `npm run build` でビルド
5. `npm run start` で起動

または、Vercel / AWS / Dockerなどにデプロイできます。

## サポート

問題が発生した場合:
1. [`README.md`](README.md) を確認
2. [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) を確認
3. GitHubのIssueを作成

## プロジェクト構造の理解

主要なディレクトリ:

```
test-case-system/
├── app/
│   ├── api/          # バックエンドAPI (REST)
│   ├── components/   # Reactコンポーネント
│   ├── lib/          # ユーティリティ関数
│   ├── types/        # TypeScript型定義
│   └── */page.tsx    # フロントエンドページ
├── database/         # SQLスキーマ
└── scripts/          # セットアップスクリプト
```

## 完成状況

- ✅ 認証システム (ログイン/ログアウト)
- ✅ テストグループ一覧表示
- ✅ 権限管理 (管理者/テスト管理者/一般)
- ⏳ テストグループ作成/編集 (API完成、UI未実装)
- ⏳ テストケース管理 (API完成、UI未実装)
- ⏳ テスト結果登録 (API/UI未実装)
- ⏳ レポート機能 (API/UI未実装)

詳細は [`PROJECT_SUMMARY.md`](PROJECT_SUMMARY.md) を参照してください。
