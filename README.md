# Reddit Reader Bot

RedditのトレンドをピックアップしてGemini AIでコメントを生成し、Blueskyに投稿するCloudflare Workers Botです。

## 機能

- Redditの人気スレッドを自動取得
- Gemini AIで猫のペルソナを使った日本語コメントを生成
- Blueskyに自動投稿
- 投稿済みスレッドの重複チェック
- Cloudflare Workers Scheduled Workerとして定期実行

## 技術スタック

- **Cloudflare Workers**: サーバーレス実行環境
- **Cloudflare D1**: 投稿履歴を保存するSQLiteデータベース
- **Cloudflare KV**: Reddit OAuthトークンのキャッシュ
- **TypeScript**: 型安全な開発
- **Reddit API**: トレンド取得
- **Gemini API**: コメント生成
- **Bluesky (AT Protocol)**: 投稿先SNS

## セットアップ

### 1. 必要な認証情報の取得

> [!NOTE]
> **Reddit認証は不要です！** このBotはRedditの公開RSS Feed（JSON形式）を使用するため、Reddit APIの認証情報は必要ありません。

#### Gemini API
1. https://aistudio.google.com/app/apikey にアクセス
2. API Keyを作成してメモ

#### Bluesky
- Blueskyのハンドル（例: yourname.bsky.social）とパスワード

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Cloudflareリソースの作成

#### D1データベースの作成

```bash
npx wrangler d1 create reddit-reader-db
```

出力されたdatabase_idを `wrangler.toml` の `database_id` に設定してください。

#### KV Namespaceの作成

```bash
npx wrangler kv:namespace create REDDIT_READER_KV
```

出力されたIDを `wrangler.toml` の `kv_namespaces.id` に設定してください。

#### マイグレーションの実行

```bash
npx wrangler d1 migrations apply reddit-reader-db
```

### 4. シークレットの設定

```bash
npx wrangler secret put GEMINI_API_KEY
# プロンプトに従ってGemini API Keyを入力

npx wrangler secret put BLUESKY_HANDLE
# プロンプトに従ってBlueskyハンドルを入力

npx wrangler secret put BLUESKY_PASSWORD
# プロンプトに従ってBlueskyパスワードを入力
```

## 開発

### ローカルで実行

```bash
npm run dev
```

### Scheduled Workerのテスト

```bash
# 開発サーバーを起動
npm run dev

# 別のターミナルで手動トリガー
curl -X POST http://localhost:8787/trigger
```

### TypeScriptのビルドチェック

```bash
npm run build
```

## デプロイ

```bash
npm run deploy
```

デプロイ後、Cloudflareダッシュボード (https://dash.cloudflare.com) でWorkerのログを確認できます。

## デバッグモード

Blueskyへ実際に投稿せずに、生成されたコメントをコンソールに出力するデバッグモードがあります。

### ローカルテスト時

`wrangler.toml` の `DEBUG_MODE` を `"true"` に設定：

```toml
DEBUG_MODE = "true"
```

その後、ローカルで実行：

```bash
npm run dev

# 別のターミナルで手動トリガー
curl -X POST http://localhost:8787/trigger
```

生成されたコメントがコンソールに出力されます。

### 本番環境でのテスト

本番環境でもデバッグモードを有効にできます：

```bash
# デバッグモードを有効化してデプロイ
# wrangler.toml の DEBUG_MODE を "true" に変更してから
npm run deploy

# テスト後、DEBUG_MODE を "false" に戻して再デプロイ
```

> [!TIP]
> デバッグモードでは、Bluesky認証情報がなくても動作確認できます。Reddit取得とGemini生成のテストに便利です。

## 設定のカスタマイズ

### 監視するサブレディットの変更

`wrangler.toml` の `REDDIT_SUBREDDITS` を変更してください。

```toml
REDDIT_SUBREDDITS = "technology+programming+artificial+science+gadgets"
```

複数のサブレディットを指定する場合：
- `+` で連結: `"technology+programming+science"`
- カンマ区切りも可: `"technology,programming,science"` （内部で`+`に変換されます）

特定のサブレディット1つだけ監視する場合：
```toml
REDDIT_SUBREDDITS = "programming"
```

すべての人気投稿を監視する場合：
```toml
REDDIT_SUBREDDITS = "all"
```

### Geminiモデルの変更

`wrangler.toml` の `GEMINI_MODEL` を変更してください。

```toml
GEMINI_MODEL = "gemini-2.0-flash-exp"
```

利用可能なモデル（2026年1月時点）：
- `gemini-2.0-flash-exp` - 最新の実験版（推奨）
- `gemini-1.5-flash` - 安定版の高速モデル
- `gemini-1.5-pro` - より高品質な結果が必要な場合

> [!NOTE]
> 最新のモデル情報は [Gemini APIドキュメント](https://ai.google.dev/gemini-api/docs/models) をご確認ください。古いモデル（例: gemini-1.5-flash）はサポート終了している可能性があります。

### 最小スコアの変更

`wrangler.toml` の `MIN_REDDIT_SCORE` を変更してください（デフォルト: 100）。

### 実行頻度の変更

`wrangler.toml` の `crons` を変更してください（デフォルト: 1時間に1回）。

Cron形式の例:
- `"0 * * * *"` - 毎時0分
- `"0 */2 * * *"` - 2時間ごと
- `"0 9 * * *"` - 毎日9時

### コメントペルソナの変更

`src/gemini/client.ts` の `COMMENTATOR_PERSONA` を編集してください。

## トラブルシューティング

### "Reddit feed request failed"
- User-Agentが正しく設定されているか確認
- Redditのサービスが正常か確認
- サブレディット名が正しいか確認（存在しないサブレディットを指定していないか）

### "Gemini API request failed"
- Gemini API Keyが有効か確認
- APIの利用制限に達していないか確認

### "Failed to post to Bluesky"
- Blueskyのハンドルとパスワードが正しいか確認
- Blueskyのサービスが正常か確認

## ライセンス

MIT
