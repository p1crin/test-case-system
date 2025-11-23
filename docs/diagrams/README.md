# シーケンス図ドキュメント

このディレクトリには、テストケース管理システムのシーケンス図（PlantUML形式）が格納されています。

## ファイル一覧

| ファイル名 | 説明 | 実装状態 |
|-----------|------|---------|
| `01-login-sequence.puml` | ログイン画面のシーケンス図 | ✅ 実装済み |
| `02-test-groups-list-sequence.puml` | テストグループ一覧画面のシーケンス図 | ✅ 実装済み |

## PlantUMLの表示方法

### 方法1: オンラインビューワー

1. [PlantUML Web Server](http://www.plantuml.com/plantuml/uml/) にアクセス
2. `.puml` ファイルの内容をコピー＆ペースト
3. 「Submit」をクリックして図を生成

### 方法2: VSCode拡張機能

1. VSCodeに [PlantUML拡張機能](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) をインストール
2. `.puml` ファイルを開く
3. `Alt + D` (または `Option + D`) でプレビュー表示

### 方法3: ローカルでPNG生成

```bash
# PlantUMLをインストール (Java必須)
brew install plantuml

# PNG画像を生成
plantuml docs/diagrams/01-login-sequence.puml
plantuml docs/diagrams/02-test-groups-list-sequence.puml

# 出力: 同じディレクトリに .png ファイルが生成される
```

### 方法4: オンラインエディタ

- [PlantText](https://www.planttext.com/)
- [PlantUML Editor](https://plantuml-editor.kkeisuke.com/)

## シーケンス図の概要

### 01. ログインシーケンス図

**フロー:**
1. ユーザーがログイン画面にアクセス
2. セッション確認（既にログイン済みならリダイレクト）
3. メールアドレス・パスワード入力
4. NextAuth.js経由で認証API呼び出し
5. データベースでユーザー検証
6. bcryptでパスワード検証
7. JWTトークン生成・保存
8. テストグループ一覧にリダイレクト

**主要コンポーネント:**
- LoginPage (Client Component)
- NextAuth.js Client
- `/api/auth/[...nextauth]` (認証API)
- PostgreSQL Database

**実装ファイル:**
- [app/login/page.tsx](../../app/login/page.tsx)
- [app/api/auth/[...nextauth]/route.ts](../../app/api/auth/[...nextauth]/route.ts)

---

### 02. テストグループ一覧シーケンス図

**フロー:**
1. 認証済みユーザーがテストグループ一覧にアクセス
2. AuthenticatedLayoutでセッション確認
3. Header/Sidebarレンダリング（権限に応じたメニュー表示）
4. `/api/test-groups` にGETリクエスト
5. JWTトークン検証
6. ユーザーロールに応じたアクセス権限チェック:
   - **管理者 (role=0)**: 全グループ取得
   - **テスト管理者 (role=1)**: 自分が作成したグループ + 割り当てられたグループ
   - **一般 (role=2)**: 割り当てられたグループのみ
7. テーブル表示（権限に応じて「新規登録」ボタン表示）

**主要コンポーネント:**
- TestGroupsPage (Client Component)
- AuthenticatedLayout
- `/api/test-groups` (テストグループAPI)
- lib/auth.ts (権限管理ロジック)

**実装ファイル:**
- [app/test-groups/page.tsx](../../app/test-groups/page.tsx)
- [app/api/test-groups/route.ts](../../app/api/test-groups/route.ts)
- [app/lib/auth.ts](../../app/lib/auth.ts)

---

## 権限モデルの詳細

### 静的ロール (user_role)

| 値 | ロール名 | 権限 |
|---|---------|-----|
| 0 | 管理者 | すべてのテストグループにアクセス可能<br>ユーザー管理機能が使用可能 |
| 1 | テスト管理者 | 自分が作成したグループ + 割り当てられたグループにアクセス<br>新規テストグループ作成が可能 |
| 2 | 一般 | 割り当てられたグループのみアクセス可能 |

### 動的ロール (test_role)

テストグループごとにタグ経由で割り当てられる:

| 値 | ロール名 | 権限 |
|---|---------|-----|
| 1 | 設計者 | テストケースの作成・編集が可能 |
| 2 | 実施者 | テスト結果の登録が可能 |
| 3 | 閲覧者 | 閲覧のみ |

## データベースクエリ例

### 管理者の場合

```sql
SELECT id FROM tt_test_groups
WHERE is_deleted = FALSE;
```

### テスト管理者の場合

```sql
SELECT DISTINCT tg.id
FROM tt_test_groups tg
LEFT JOIN tt_test_group_tags tgt ON tg.id = tgt.test_group_id
LEFT JOIN mt_user_tags ut ON tgt.tag_id = ut.tag_id
WHERE tg.is_deleted = FALSE
  AND (tg.created_by = '1' OR ut.user_id = 1);
```

### 一般ユーザーの場合

```sql
SELECT DISTINCT tgt.test_group_id
FROM tt_test_group_tags tgt
JOIN mt_user_tags ut ON tgt.tag_id = ut.tag_id
WHERE ut.user_id = 1;
```

## 今後追加予定のシーケンス図

以下のシーケンス図も追加予定です:

- [ ] テストグループ作成
- [ ] テストケース一覧表示
- [ ] テストケース作成
- [ ] テスト結果登録
- [ ] 集計レポート表示
- [ ] ユーザー管理
- [ ] ファイルアップロード (S3)
- [ ] データインポート (AWS Batch)

## 関連ドキュメント

- [API仕様書](../api-specification.yml) - Swagger/OpenAPI仕様
- [実装ガイド](../../IMPLEMENTATION_GUIDE.md) - 詳細な実装方法
- [データベーススキーマ](../../database/schema.sql) - PostgreSQLスキーマ
