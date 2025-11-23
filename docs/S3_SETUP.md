# S3ファイルアップロード設定ガイド

このドキュメントでは、test-case-systemにおけるS3を使用したファイルアップロードの設定方法を説明します。

## アーキテクチャ概要

### temp/フォルダを使った2段階アップロード方式

1. **アップロード時**: ファイルを `temp/` フォルダに一時保存
2. **登録時**: API側で `temp/` から本番フォルダにコピー
3. **自動削除**: S3ライフサイクルポリシーで `temp/` を24時間後に自動削除

### メリット

- ✅ ファイル差し替え時も古いファイルは自動削除される
- ✅ バックエンドでの削除処理が不要
- ✅ S3の標準機能で完全自動化
- ✅ 追加コストなし
- ✅ 未使用ファイルの自動クリーンアップ

## 1. 環境変数の設定

`.env` ファイルに以下の環境変数を追加してください：

```bash
# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_S3_BUCKET_NAME=your-bucket-name
```

## 2. S3バケットの作成

AWS CLIまたはAWSコンソールでS3バケットを作成してください：

```bash
aws s3 mb s3://your-bucket-name --region ap-northeast-1
```

## 3. S3ライフサイクルポリシーの設定

**重要**: `temp/` フォルダ内のファイルを自動削除するために、必ずライフサイクルポリシーを設定してください。

### 方法1: AWSコンソール

1. S3バケットを開く
2. 「管理」タブ → 「ライフサイクルルール」→ 「ルールを作成」
3. 以下の設定を入力:
   - ルール名: `DeleteTempFiles`
   - プレフィックス: `temp/`
   - ライフサイクルルールアクション: 「現在のバージョンのオブジェクトを期限切れにする」
   - オブジェクト作成後の日数: `1日`

### 方法2: Terraform

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "testcase_bucket" {
  bucket = aws_s3_bucket.testcase_bucket.id

  rule {
    id     = "delete-temp-files"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 1
    }
  }
}
```

### 方法3: AWS CLI

`lifecycle.json` ファイルを作成:

```json
{
  "Rules": [
    {
      "Id": "DeleteTempFiles",
      "Status": "Enabled",
      "Prefix": "temp/",
      "Expiration": {
        "Days": 1
      }
    }
  ]
}
```

コマンドを実行:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket your-bucket-name \
  --lifecycle-configuration file://lifecycle.json
```

## 4. コードの有効化

### 4-1. S3署名付きURL生成APIの有効化

`app/api/s3-presigned-url/route.ts` のコメントアウトを解除:

```typescript
// コメント化されている部分を解除してください
// 該当箇所: 31-67行目
```

### 4-2. S3ユーティリティ関数の使用

API RouteでS3ユーティリティ関数を使用する例:

```typescript
import { copyMultipleFromTempToProduction } from '@/app/lib/s3';

// テスト結果登録時の例
export async function POST(req: NextRequest) {
  const { temp_evidence_files } = await req.json();

  // temp/ から evidence/ にコピー
  const productionKeys = await copyMultipleFromTempToProduction(
    temp_evidence_files,
    'evidence'
  );

  // データベースに本番S3キーを保存
  for (const productionKey of productionKeys) {
    await db.query(
      'INSERT INTO tt_evidence_files (test_result_id, file_url) VALUES ($1, $2)',
      [testResultId, productionKey]
    );
  }
}
```

## 5. フロントエンドの実装例

### ファイルアップロードのフロー

```typescript
// 1. 署名付きURLを取得
const response = await fetch('/api/s3-presigned-url', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: file.name,
    fileType: file.type,
    folder: 'evidence', // または 'test-cases'
  }),
});

const { presignedUrl, tempS3Key } = await response.json();

// 2. S3に直接アップロード
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type },
});

// 3. tempS3Keyを保存して登録APIに送信
const tempKeys = [tempS3Key];

// 4. 登録時にtempKeysを送信
await fetch('/api/test-groups/1/cases/TC-001/1/results', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    result: 'OK',
    temp_evidence_files: tempKeys,
  }),
});
```

## 6. フォルダ構成

```
S3 Bucket
├── temp/                    # 一時フォルダ (24時間後に自動削除)
│   ├── test-cases/          # テストケース添付ファイル (一時)
│   │   └── 1234567890-spec.pdf
│   └── evidence/            # エビデンスファイル (一時)
│       └── 1234567890-screenshot.png
│
├── test-cases/              # 本番: テストケース添付ファイル
│   └── 1234567890-spec.pdf
│
└── evidence/                # 本番: エビデンスファイル
    └── 1234567890-screenshot.png
```

## 7. トラブルシューティング

### S3機能が有効にならない

- 環境変数が正しく設定されているか確認
- AWSクレデンシャルが有効か確認
- S3バケットが存在するか確認

### ファイルが削除されない

- S3ライフサイクルポリシーが正しく設定されているか確認
- ライフサイクルポリシーのステータスが `Enabled` になっているか確認

### ファイルのコピーが失敗する

- S3バケット名が正しいか確認
- tempS3Keyのパスが正しいか確認（例: `temp/evidence/123-file.png`）
- IAMポリシーで `s3:CopyObject` 権限が付与されているか確認

## 8. 必要なIAMポリシー

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:CopyObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::your-bucket-name"
    }
  ]
}
```

## 参考資料

- [Notionドキュメント: S3操作シーケンス図](https://www.notion.so/test-case-system-S3-PlantUML-2b2280c86ab081ffbceac76adc5c53d6)
- [AWS S3 ライフサイクルポリシー](https://docs.aws.amazon.com/ja_jp/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
