# GitHub Upload Guide

このガイドでは、test-case-systemプロジェクトをGitHubにアップロードする手順を説明します。

## 前提条件

- GitHubアカウントを持っていること
- コンピュータにGitがインストールされていること
- ターミナル/コマンドプロンプトの基本的な使い方を理解していること

## ステップ1: 新しいGitHubリポジトリを作成

1. https://github.com/new にアクセス
2. 以下の情報を入力：
   - **Repository name**: `test-case-system`
   - **Description**: `Test case management system for QA testing`
   - **Visibility**: Private（秘密プロジェクトの場合）または Public（公開プロジェクトの場合）
3. 「Create repository」ボタンをクリック

リポジトリ作成後、GitHubから提供される指示が画面に表示されます。

## ステップ2: ローカルリポジトリを初期化

プロジェクトのルートディレクトリで以下のコマンドを実行：

```bash
cd /Users/matsuishi_t/Documents/src/test-case-system
git init
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

## ステップ3: .gitignoreファイルを作成

プロジェクトルートに`.gitignore`ファイルを作成し、以下の内容を追加します：

```
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js build output
/.next/
/out/

# Production build
/build

# Misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
Thumbs.db
.DS_Store
```

**重要**: `.env`ファイルは絶対にGitHubにアップロードしないでください。AWS認証情報やデータベース接続情報などの機密情報が含まれています。

## ステップ4: ファイルをステージングエリアに追加

すべてのファイルをステージングエリアに追加します：

```bash
git add .
```

特定のファイルのみを追加する場合：

```bash
git add app/ package.json tsconfig.json
```

ステージングされたファイルを確認：

```bash
git status
```

## ステップ5: 初期コミットを作成

```bash
git commit -m "Initial commit: Test case management system with Next.js 15, PostgreSQL, and AWS S3"
```

## ステップ6: ブランチをmainに設定

```bash
git branch -M main
```

## ステップ7: リモートリポジトリを追加

GitHubの新しいリポジトリページで表示されたURLを使用します：

```bash
git remote add origin https://github.com/YOUR_USERNAME/test-case-system.git
```

`YOUR_USERNAME`をあなたのGitHubユーザー名に置き換えてください。

## ステップ8: GitHubにプッシュ

```bash
git push -u origin main
```

初回プッシュ時はGitHub認証が求められる場合があります。以下のいずれかの方法で認証します：

### 方法A: 個人アクセストークンを使用（推奨）

1. https://github.com/settings/tokens にアクセス
2. 「Generate new token」→「Generate new token (classic)」をクリック
3. スコープで `repo` を選択
4. トークンを生成してコピー
5. ターミナルでパスワード入力時にトークンを貼り付け

### 方法B: GitHubのウェブUIで認証

最初のプッシュ後、GitHubブラウザで認証画面が表示されます。指示に従って認証を完了します。

## ステップ9: アップロード完了を確認

ブラウザで https://github.com/YOUR_USERNAME/test-case-system にアクセスして、ファイルがアップロードされたことを確認します。

## トラブルシューティング

### エラー: "fatal: The current branch main has no upstream branch"

以下のコマンドを実行：

```bash
git push -u origin main
```

### エラー: "Authentication failed"

個人アクセストークンを使用して再度試してください。パスワードではなく、生成したトークンを貼り付けます。

### エラー: ".env is tracked"

`.env`ファイルが誤ってGitで追跡されている場合：

```bash
git rm --cached .env
git commit -m "Remove .env from tracking"
git push origin main
```

その後、`.gitignore`に`.env`が含まれていることを確認します。

## その後の更新

開発を続ける場合は、変更をコミットしてプッシュします：

```bash
git add .
git commit -m "説明的なコミットメッセージ"
git push origin main
```

## ブランチ保護設定（オプション）

重要なプロジェクトの場合、ブランチ保護ルールを設定することをお勧めします：

1. リポジトリの Settings → Branches をクリック
2. 「Add rule」をクリック
3. ルール名に「main」を入力
4. 以下を有効化：
   - Require a pull request before merging
   - Dismiss stale pull request approvals when new commits are pushed
   - Require status checks to pass before merging

## 参考リンク

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Docs](https://docs.github.com)
- [Generating a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
