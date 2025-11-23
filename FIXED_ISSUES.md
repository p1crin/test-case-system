# 修正済みの問題

## 2025-11-17: ビルドエラーの修正

### 問題

初回の `npm run dev` 実行時に以下のエラーが発生しました:

1. **Tailwind CSS v4の問題**
   ```
   Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin.
   The PostCSS plugin has moved to a separate package...
   ```

2. **モジュール形式の不一致**
   ```
   Specified module format (CommonJs) is not matching the module format
   of the source code (EcmaScript Modules)
   ```

### 原因

- Tailwind CSS v4 がインストールされていたが、Next.js 16との互換性に問題があった
- `package.json` に `"type": "commonjs"` が設定されており、ES Modules構文と競合していた
- `tailwind.config.ts` がTypeScript形式で、設定の競合が発生していた

### 修正内容

#### 1. Tailwind CSS v4 → v3にダウングレード

**変更前** (`package.json`):
```json
"tailwindcss": "^4.1.17"
```

**変更後**:
```json
"tailwindcss": "^3.4.17"
```

#### 2. package.jsonから `"type": "commonjs"` を削除

**変更前**:
```json
{
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
```

**変更後**:
```json
{
  "license": "ISC",
  "dependencies": {
```

#### 3. TypeScript型定義をdevDependenciesに移動

**変更前**:
```json
"dependencies": {
  "@types/node": "^24.10.1",
  "@types/react": "^19.2.5",
  "@types/react-dom": "^19.2.3",
```

**変更後**:
```json
"devDependencies": {
  "@types/node": "^24.10.1",
  "@types/react": "^19.2.5",
  "@types/react-dom": "^19.2.3",
```

#### 4. Tailwind設定をJavaScriptに変更

**削除**: `tailwind.config.ts`

**作成**: `tailwind.config.js`
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 修正手順

```bash
# 1. package.jsonを修正 (上記の変更を適用)

# 2. Tailwind設定ファイルを置き換え
rm tailwind.config.ts
# tailwind.config.js を作成

# 3. 依存関係を再インストール
rm -rf node_modules package-lock.json
npm install

# 4. 開発サーバーを起動
npm run dev
```

### 結果

✅ すべてのエラーが解決され、開発サーバーが正常に起動
✅ ページが正常にレンダリング (`GET / 200`, `GET /login 200`)
✅ NextAuth.jsのセッションAPIも正常動作 (`GET /api/auth/session 200`)

### 残っている警告 (無視可能)

以下の警告は出ていますが、動作に影響はありません:

1. **Turbopackワークスペート警告**
   ```
   ⚠ Warning: Next.js inferred your workspace root...
   ```
   → `.env` を設定する際に自然に解決されます

2. **NextAuth.js設定警告**
   ```
   [next-auth][warn][NEXTAUTH_URL]
   [next-auth][warn][NO_SECRET]
   ```
   → `.env` ファイルを作成して以下を設定すれば解決:
   ```bash
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-key
   DATABASE_URL=postgresql://postgres:password@localhost:5432/testcase_db
   ```

## 次のステップ

プロジェクトは正常に動作するようになりました。以下の手順でセットアップを完了してください:

1. **データベースのセットアップ**
   ```bash
   cd scripts
   ./setup-database.sh
   ```

2. **環境変数の設定**
   ```bash
   cp .env.example .env
   # .env を編集して必要な値を設定
   ```

3. **開発サーバーの起動**
   ```bash
   npm run dev
   ```

4. **ブラウザでアクセス**
   - URL: http://localhost:3000
   - Email: admin@example.com
   - Password: admin123

詳細は [QUICK_START.md](QUICK_START.md) を参照してください。
