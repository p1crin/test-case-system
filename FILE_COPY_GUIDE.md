# ファイルコピーガイド - Git クローン非対応環境へのインストール

このガイドは、Gitクローンが使用できない環境（例：セキュリティ制約のある企業環境）に、test-case-systemをファイルコピー方式で導入するためのものです。

**前提条件**: 既存のMockシステム（UIのみが実装されている）がある状態で、APIをコピーして統合する手順を説明します。

## 全体構成

このプロジェクトは以下の構成になっています：

```
test-case-system/
├── app/
│   ├── api/                  # バックエンドAPIエンドポイント
│   ├── lib/                  # 共有ユーティリティ（S3、認証、DB）
│   ├── components/           # 再利用可能なReactコンポーネント
│   ├── types/                # TypeScript型定義
│   ├── test-groups/          # メインのUI（ページコンポーネント）
│   ├── users/                # ユーザー管理UI
│   ├── login/                # ログインUI
│   └── layout.tsx
├── app/lib/
│   ├── s3.ts                 # AWS S3ユーティリティ
│   ├── db.ts                 # データベース接続
│   ├── auth.ts               # NextAuth認証
│   └── その他
├── package.json              # 依存パッケージ
├── tsconfig.json             # TypeScript設定
├── .env.example              # 環境変数テンプレート
└── public/                   # 静的ファイル
```

## Phase 1: 環境準備

### 1.1 Node.jsとnpmのインストール確認

```bash
node --version  # v18以上が必要
npm --version
```

### 1.2 プロジェクト依存関係のインストール

```bash
# Mock環境のプロジェクトルートで実行
npm install
```

必要なパッケージが `package.json` に既に記載されていることを確認します。

### 1.3 環境変数ファイルの作成

`.env.local` ファイルをプロジェクトルートに作成し、以下の内容を追加します：

```
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/testcase_db

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-new-value

# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET_NAME=test-case-files
AWS_S3_BUCKET_TEMP=test-case-temp

# AWS Batch Configuration (オプション)
AWS_BATCH_JOB_QUEUE=test-case-import-queue
AWS_BATCH_JOB_DEFINITION=test-case-import-job
```

**重要**: `NEXTAUTH_SECRET`の生成方法：

```bash
openssl rand -base64 32
```

### 1.4 データベーステーブルの作成

PostgreSQLデータベースに接続し、以下のテーブルを作成します：

```sql
-- テストグループテーブル
CREATE TABLE IF NOT EXISTS m_test_groups (
  group_id SERIAL PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  oem VARCHAR(100),
  model VARCHAR(100),
  event VARCHAR(100),
  variation VARCHAR(100),
  destination VARCHAR(100),
  specs TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- テストケースコンテンツテーブル
CREATE TABLE IF NOT EXISTS tt_test_contents (
  group_id INT,
  tid VARCHAR(100),
  test_case_no INT,
  test_item TEXT,
  expected_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (group_id, tid, test_case_no)
);

-- テスト結果履歴テーブル
CREATE TABLE IF NOT EXISTS tt_test_results_history (
  group_id INT,
  tid VARCHAR(100),
  test_case_no INT,
  history_count INT,
  result TEXT,
  judgment VARCHAR(20),
  software_version VARCHAR(50),
  hardware_version VARCHAR(50),
  comparator_version VARCHAR(50),
  execution_date DATE,
  executor VARCHAR(100),
  note TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (group_id, tid, test_case_no, history_count)
);

-- テスト結果テーブル
CREATE TABLE IF NOT EXISTS tt_test_results (
  group_id INT,
  tid VARCHAR(100),
  test_case_no INT,
  version INT,
  result TEXT,
  judgment VARCHAR(20),
  execution_date DATE,
  executor VARCHAR(100),
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (group_id, tid, test_case_no, version)
);

-- エビデンスファイルテーブル
CREATE TABLE IF NOT EXISTS tt_test_evidences (
  group_id INT,
  tid VARCHAR(100),
  test_case_no INT,
  history_count INT,
  evidence_no INT,
  evidence_name VARCHAR(255),
  evidence_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (group_id, tid, test_case_no, history_count, evidence_no),
  FOREIGN KEY (group_id, tid, test_case_no, history_count)
    REFERENCES tt_test_results_history(group_id, tid, test_case_no, history_count)
);

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS m_users (
  user_id SERIAL PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) UNIQUE NOT NULL,
  user_role INT DEFAULT 2,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_deleted BOOLEAN DEFAULT FALSE
);

-- ユーザーロールテーブル
CREATE TABLE IF NOT EXISTS t_user_test_group_role (
  user_id INT,
  group_id INT,
  test_role INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, group_id, test_role),
  FOREIGN KEY (user_id) REFERENCES m_users(user_id),
  FOREIGN KEY (group_id) REFERENCES m_test_groups(group_id)
);
```

## Phase 2: APIファイルのコピー（優先度順）

**重要**: 以下の順序でファイルをコピーしてください。依存関係があるため、順序を守ることが重要です。

### ステップ1: ライブラリファイルをコピー

#### 1.1 S3ユーティリティ（依存関係なし）

**ソースファイル**: `app/lib/s3.ts`
**宛先**: `<Mock環境>/app/lib/s3.ts`

このファイルはAWS S3との連携を管理します。ファイルのアップロード、削除、署名付きURL生成などを担当します。

```typescript
// S3.tsが提供する関数：
// - uploadFileToS3(file: File, folder: string): Promise<{ url: string; key: string }>
// - deleteFileFromS3(key: string): Promise<void>
// - generatePresignedUrl(key: string, expiresIn?: number): Promise<string>
// - copyFromTempToProduction(tempS3Key: string, productionFolder: string): Promise<string>
```

#### 1.2 データベース接続ユーティリティ

**ソースファイル**: `app/lib/db.ts`
**宛先**: `<Mock環境>/app/lib/db.ts`

PostgreSQLデータベースへの接続を管理します。

#### 1.3 認証ユーティリティ

**ソースファイル**: `app/lib/auth.ts`
**宛先**: `<Mock環境>/app/lib/auth.ts`

NextAuthを使用したユーザー認証とロール管理。

#### 1.4 その他のライブラリファイル

`app/lib/`ディレクトリ内の以下のファイルもコピーします：
- `next-auth.ts`
- その他の.tsファイル

### ステップ2: APIエンドポイントをコピー

#### 2.1 ユーザー認証API

**ソースファイル**: `app/api/auth/[...nextauth]/route.ts`
**宛先**: `<Mock環境>/app/api/auth/[...nextauth]/route.ts`

**依存関係**: `lib/auth.ts`が事前にコピーされていることを確認

#### 2.2 ファイルアップロードAPI

**ソースファイル**: `app/api/upload/route.ts`
**宛先**: `<Mock環境>/app/api/upload/route.ts`

**依存関係**: `lib/s3.ts`, `lib/auth.ts`

**説明**: FormDataでファイルを受け取り、AWS S3にアップロードします。
- **Route**: `POST /api/upload`
- **パラメータ**: `file` (File), `folder` (string)
- **戻り値**: `{ url: string; key: string; fileName: string; size: number }`

#### 2.3 テストグループAPI

**ソースファイル**: `app/api/test-groups/route.ts`
**宛先**: `<Mock環境>/app/api/test-groups/route.ts`

**依存関係**: `lib/db.ts`, `lib/auth.ts`

**説明**: テストグループ一覧の取得。フィルター対応。
- **Route**: `GET /api/test-groups`
- **クエリパラメータ**: `oem`, `model`, `event`, `variation`, `destination`
- **戻り値**: テストグループ配列

#### 2.4 テスト結果一覧API（重要）

**ソースファイル**: `app/api/test-groups/[groupId]/cases/[tid]/results/route.ts`
**宛先**: `<Mock環境>/app/api/test-groups/[groupId]/cases/[tid]/results/route.ts`

**依存関係**: `lib/db.ts`, `lib/auth.ts`

**説明**: 指定されたTID（テスト ID）のすべてのテスト結果を取得します。テストケースの詳細情報（テストケース内容、期待値）とエビデンスファイルも含まれます。

**重要な実装詳細**:
```typescript
// このAPIは以下の処理を行います：
// 1. tt_test_resultsテーブルからテスト結果を取得
// 2. tt_test_contentsテーブルからテストケースの詳細を取得
// 3. tt_test_evidencesテーブルからエビデンスファイル情報を取得
// 4. これらを統合してGroupedResults形式で返す

// 戻り値の例：
{
  "results": {
    "1": [
      {
        "test_case_no": 1,
        "result": "合格",
        "judgment": "OK",
        "test_item": "ログイン画面の表示",
        "expected_value": "正常に表示される",
        "evidences": [
          {
            "evidence_path": "evidence/1-screenshot.png",
            "evidence_name": "screenshot.png"
          }
        ]
      },
      // 履歴データ...
    ],
    "2": [...]
  }
}
```

#### 2.5 テスト結果登録API（重要）

**ソースファイル**: `app/api/test-groups/[groupId]/cases/[tid]/[testCaseNo]/results/route.ts`
**宛先**: `<Mock環境>/app/api/test-groups/[groupId]/cases/[tid]/[testCaseNo]/results/route.ts`

**依存関係**: `lib/db.ts`, `lib/auth.ts`, `lib/s3.ts`

**説明**: テスト結果を登録します。複数のエビデンスファイルを関連付けることができます。

**重要な実装詳細**:
```typescript
// リクエストボディの例：
{
  "result": "合格",
  "judgment": "OK",
  "software_version": "1.0.0",
  "hardware_version": "v1",
  "comparator_version": "2.1.0",
  "execution_date": "2024-11-22",
  "executor": "田中太郎",
  "note": "問題なし",
  "evidence_urls": [
    "https://test-case-files.s3.ap-northeast-1.amazonaws.com/evidence/1-screenshot.png",
    "https://test-case-files.s3.ap-northeast-1.amazonaws.com/evidence/2-log.txt"
  ]
}

// 処理フロー：
// 1. tt_test_results_historyに新しいレコードを挿入（最初）
// 2. evidence_urlsの各URLに対してtt_test_evidencesレコードを挿入
// 3. 戻り値: { message: "登録成功" }
```

**注意**: 外部キー制約のため、history記録を先に挿入してからevidenceを挿入します。順序を変えるとエラーになります。

#### 2.6 エビデンス削除API

**ソースファイル**: `app/api/test-groups/[groupId]/cases/[tid]/evidences/[testCaseNo]/[historyCount]/[evidenceNo]/route.ts`
**宛先**: `<Mock環境>/app/api/test-groups/[groupId]/cases/[tid]/evidences/[testCaseNo]/[historyCount]/[evidenceNo]/route.ts`

**依存関係**: `lib/db.ts`, `lib/auth.ts`, `lib/s3.ts`

**説明**: エビデンスファイルを削除します。S3とデータベースの両方から削除します。

- **Route**: `DELETE /api/test-groups/{groupId}/cases/{tid}/evidences/{testCaseNo}/{historyCount}/{evidenceNo}`
- **処理**:
  1. S3からファイルを削除
  2. データベースでis_deletedをTRUEに設定

#### 2.7 その他のAPIファイル

以下のAPIファイルも必要に応じてコピーします：

- `app/api/test-groups/[groupId]/cases/[tid]/route.ts` - テストケース詳細取得
- `app/api/test-groups/[groupId]/cases/route.ts` - テストケース一覧取得
- `app/api/test-groups/[groupId]/route.ts` - テストグループ詳細取得
- `app/api/test-groups/[groupId]/cases/import/route.ts` - テストケースインポート
- `app/api/users/route.ts` - ユーザー管理API

## Phase 3: フロントエンドコンポーネントのコピー

### ステップ3: 共有コンポーネントをコピー

**ソースディレクトリ**: `app/components/`
**宛先**: `<Mock環境>/app/components/`

このディレクトリ内のすべてのコンポーネント（`.tsx`ファイル）をコピーします。特に以下が重要です：

- 共有UI要素（ボタン、フォーム、テーブル）
- ナビゲーション関連コンポーネント
- データ表示コンポーネント

### ステップ4: 型定義ファイルをコピー

**ソースディレクトリ**: `app/types/`
**宛先**: `<Mock環境>/app/types/`

TypeScript型定義をコピーします。これは既存コードの型安全性を保証します。

### ステップ5: テストグループページをコピー

#### 5.1 テスト結果一覧ページ

**ソースファイル**: `app/test-groups/[groupId]/cases/[tid]/results/page.tsx`
**宛先**: `<Mock環境>/app/test-groups/[groupId]/cases/[tid]/results/page.tsx`

**説明**: テスト結果を表形式で表示します。最新結果と履歴をアコーディオンで表示します。

**APIの統合方法**:
```typescript
// useEffectで自動実行される関数
const fetchTestGroup = async () => {
  const res = await fetch(`/api/test-groups/${groupId}`);
  const data = await res.json();
  setTestGroup(data.testGroups?.[0]);
};

const fetchResults = async () => {
  const res = await fetch(`/api/test-groups/${groupId}/cases/${tid}/results`);
  const data = await res.json();
  setResults(data.results);
};

useEffect(() => {
  fetchTestGroup();
  fetchResults();
}, [groupId, tid]);
```

**表の列構成**:
- No. - テストケース番号
- テストケース内容 - test_itemフィールド
- 期待値 - expected_valueフィールド
- Ver. - テスト結果のバージョン
- 判定 - judgment（OK/NG など）
- 結果 - result値
- 実行者 - executor
- 実施日 - execution_date
- ソフトウェアVer - software_version
- ハードウェアVer - hardware_version
- コンパレータVer - comparator_version
- 備考 - note
- エビデンス - evidences配列からのファイル表示

#### 5.2 テスト結果登録ページ

**ソースファイル**: `app/test-groups/[groupId]/cases/[tid]/results/new/page.tsx`
**宛先**: `<Mock環境>/app/test-groups/[groupId]/cases/[tid]/results/new/page.tsx`

**説明**: 複数のテスト結果を一括で登録できるページです。テストケース番号を入力すると、自動的にテストケースの詳細を取得します。

**APIの統合方法**:

```typescript
// テストケース詳細の自動取得
const fetchTestCaseDetails = async (id: string, testCaseNo: string) => {
  const res = await fetch(
    `/api/test-groups/${groupId}/cases/${tid}?testCaseNo=${parseInt(testCaseNo, 10)}`
  );
  const data = await res.json();
  const testContents = data.testContents || [];
  const matching = testContents.find(
    (content: any) => content.test_case_no === parseInt(testCaseNo, 10)
  );
  // マッチしたテストケースの詳細を表に自動入力
};

// ファイルアップロード
const uploadRes = await fetch('/api/upload', {
  method: 'POST',
  body: formData // { file, folder: `evidence/${groupId}/${tid}/${testCaseNo}` }
});
const uploadData = await uploadRes.json(); // { url, key }

// テスト結果登録
const res = await fetch(
  `/api/test-groups/${groupId}/cases/${tid}/${testCaseNo}/results`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      result,
      judgment,
      software_version,
      hardware_version,
      comparator_version,
      execution_date,
      executor,
      note,
      evidence_urls: uploadedUrls // uploadで返されたURL配列
    })
  }
);
```

**入力行の構成**:
- テストケースNo. - 番号入力フィールド（自動取得トリガー）
- テストケース内容 - 読み取り専用（自動入力）
- 期待値 - 読み取り専用（自動入力）
- 結果 - ドロップダウン（合格/不合格など）
- 判定 - テキスト入力
- 実行者 - テキスト入力
- 実施日 - 日付ピッカー
- ソフトウェアVer - テキスト入力
- ハードウェアVer - テキスト入力
- コンパレータVer - テキスト入力
- 備考 - テキストエリア
- エビデンス - ファイルアップロード

## Phase 4: Mock コードへの統合

### 4.1 既存のMockページにAPI呼び出しを追加

既存のMock実装では、以下のようなダミーデータを使用していた可能性があります：

```typescript
// Mock例（変更前）
const [results, setResults] = useState<MockResult[]>([
  { testCaseNo: 1, result: 'dummy', judgment: 'dummy' }
]);
```

これを以下のように変更します：

```typescript
// API統合版（変更後）
const [results, setResults] = useState<any[]>([]);

useEffect(() => {
  const fetchResults = async () => {
    try {
      const res = await fetch(`/api/test-groups/${groupId}/cases/${tid}/results`);
      if (!res.ok) throw new Error('APIエラー');
      const data = await res.json();
      setResults(data.results);
    } catch (error) {
      console.error('フェッチエラー:', error);
      // エラー処理
    }
  };

  fetchResults();
}, [groupId, tid]);
```

### 4.2 イベントハンドラーのAPI化

Mock実装では、フォーム送信がダミー処理だった可能性があります：

```typescript
// Mock例（変更前）
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // ダミー処理
  alert('登録されました');
};
```

これを以下のように変更します：

```typescript
// API統合版（変更後）
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    // ファイルアップロード（複数ファイル対応）
    const evidenceUrls: string[] = [];
    for (const file of selectedFiles) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', `evidence/${groupId}/${tid}/${testCaseNo}`);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      evidenceUrls.push(uploadData.url);
    }

    // テスト結果登録
    const res = await fetch(
      `/api/test-groups/${groupId}/cases/${tid}/${testCaseNo}/results`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          judgment,
          executor,
          execution_date,
          software_version,
          hardware_version,
          comparator_version,
          note,
          evidence_urls: evidenceUrls
        })
      }
    );

    if (!res.ok) throw new Error('登録失敗');
    alert('登録されました');
    // ページリロードまたは結果一覧へ移動

  } catch (error) {
    console.error('エラー:', error);
    alert('エラーが発生しました');
  } finally {
    setSubmitting(false);
  }
};
```

### 4.3 フォーム入力の自動入力機能を追加

テストケース番号を入力すると、自動的に詳細情報が入力される機能：

```typescript
// テストケース詳細の自動取得
const handleTestCaseNoChange = async (testCaseNo: string) => {
  if (!testCaseNo.trim()) return;

  try {
    const res = await fetch(
      `/api/test-groups/${groupId}/cases/${tid}?testCaseNo=${parseInt(testCaseNo, 10)}`
    );
    const data = await res.json();
    const content = data.testContents?.find(
      (c: any) => c.test_case_no === parseInt(testCaseNo, 10)
    );

    if (content) {
      // フォームの該当フィールドに自動入力
      setTestItem(content.test_item);
      setExpectedValue(content.expected_value);
    }
  } catch (error) {
    console.error('テストケース取得エラー:', error);
  }
};

// onChangeハンドラーでこの関数を呼び出す
<input
  type="number"
  onChange={(e) => handleTestCaseNoChange(e.target.value)}
/>
```

## Phase 5: セットアップ確認チェックリスト

以下のチェックリストを実行して、セットアップが完了しているか確認します：

- [ ] Node.js と npm がインストールされている
- [ ] `npm install` が実行済みで、`node_modules`が存在する
- [ ] `.env.local` ファイルが作成され、すべての環境変数が設定されている
- [ ] PostgreSQL データベースが起動している
- [ ] 全テーブルがデータベースに作成されている
- [ ] AWS S3 バケットが作成され、認証情報が正しく設定されている
- [ ] `app/lib/` ディレクトリにすべてのユーティリティファイルがある
- [ ] `app/api/` ディレクトリにすべてのAPIルートがある
- [ ] `app/components/` ディレクトリに共有コンポーネントがある
- [ ] `app/test-groups/` ディレクトリにページコンポーネントがある
- [ ] TypeScript コンパイルエラーがない：`npm run build`
- [ ] ローカル開発サーバーが起動する：`npm run dev`

## Phase 6: ローカル開発サーバーでのテスト

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで以下にアクセス
http://localhost:3000

# ローカルトンネル（必要に応じて）
npx localtunnel --port 3000
```

## トラブルシューティング

### エラー: "Cannot find module 'app/lib/s3'"

**原因**: ライブラリファイルがコピーされていない、またはパスが誤っている

**解決策**:
1. `app/lib/s3.ts`ファイルの存在を確認
2. ファイルパスが正しいか確認
3. TypeScript の Path Alias 設定を確認（`tsconfig.json`の`paths`設定）

### エラー: "Cannot GET /api/test-groups/..."

**原因**: APIルートがコピーされていない

**解決策**:
1. 対応するAPIファイルが `app/api/` に存在するか確認
2. ファイル名が正確か確認（特に動的ルートの括弧 `[paramName]`）
3. サーバーを再起動：`npm run dev`

### エラー: "ENOENT: no such file or directory, open '.env.local'"

**原因**: 環境変数ファイルが作成されていない

**解決策**: `.env.local`ファイルをプロジェクトルートに作成し、Phase 1.3 の値を入力

### エラー: "Database connection failed"

**原因**: PostgreSQL が起動していない、または接続情報が誤っている

**解決策**:
```bash
# PostgreSQL が起動しているか確認
psql -U username -d testcase_db -c "SELECT 1"

# .env.local のDATABASE_URL を確認
DATABASE_URL=postgresql://username:password@localhost:5432/testcase_db
```

### エラー: "AWS S3 authentication failed"

**原因**: AWS認証情報が誤っている、またはバケットが作成されていない

**解決策**:
1. AWS コンソールでアクセスキーを確認
2. バケット名が正しいか確認
3. リージョンが正しいか確認（S3バケットのリージョンと.envのAWS_REGIONが一致していることが重要）

## 次のステップ

APIが統合できたら、以下のオプション機能も検討してください：

1. **エラーハンドリング**: より詳細なエラーメッセージ表示
2. **ローディング状態**: APIリクエスト中のUI表示
3. **キャッシング**: 重複リクエストの削減
4. **バリデーション**: クライアント側およびサーバー側の入力検証
5. **テスト**: Jest と React Testing Library を使用したユニットテスト

## 参考資料

- [Next.js API Routes Documentation](https://nextjs.org/docs/api-routes/introduction)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [AWS SDK for JavaScript Documentation](https://docs.aws.amazon.com/sdk-for-javascript/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
