# Reddit Reader Bot

RedditのトレンドをピックアップしてAI（Cloudflare Workers AI/Gemini/Groq）でコメントを生成し、Blueskyに投稿するCloudflare Workers Botです。

## 機能

- Redditの人気スレッドを自動取得
- Cloudflare Workers AI、Gemini AI、またはGroqで猫のペルソナを使った日本語コメントを生成
- **複数のAIプロバイダーをサポート**し、レート制限時に自動フォールバック
- Blueskyに自動投稿
- 投稿済みスレッドの重複チェック
- Cloudflare Workers Scheduled Workerとして定期実行

## 技術スタック

- **Cloudflare Workers**: サーバーレス実行環境
- **Cloudflare Workers AI**: Cloudflare統合のAIモデル（推奨）
- **Cloudflare D1**: 投稿履歴を保存するSQLiteデータベース
- **Cloudflare KV**: Reddit OAuthトークンのキャッシュ
- **TypeScript**: 型安全な開発
- **Reddit API**: トレンド取得
- **Gemini API / Groq API**: 代替コメント生成（オプション）
- **Bluesky (AT Protocol)**: 投稿先SNS

## セットアップ

### 1. 必要な認証情報の取得

> [!NOTE]
> **Reddit認証は不要です！** このBotはRedditの公開RSS Feed（JSON形式）を使用するため、Reddit APIの認証情報は必要ありません。

#### LLM API（いずれか必須）

**Cloudflare Workers AI（推奨）**
- 追加のAPIキー不要！Cloudflare Workers環境に統合されています
- 設定は `wrangler.toml` の `CLOUDFLARE_AI_MODEL` で指定
- 利用可能なモデル: [Cloudflare Workers AIモデル一覧](https://developers.cloudflare.com/workers-ai/models/)
- 推奨モデル: `@cf/meta/llama-3.1-8b-instruct`

**Groq API**
1. https://console.groq.com にアクセス
2. アカウントを作成
3. API Keysページで新しいキーを作成してメモ
4. 無料プランでも十分な利用制限があります

**Gemini API**
1. https://aistudio.google.com/app/apikey にアクセス
2. API Keyを作成してメモ

> [!TIP]
> **Cloudflare Workers AIが推奨されています**。追加のAPIキーが不要で、Cloudflare環境に統合されているため管理が簡単です。また、複数のAIプロバイダーを設定しておけば、レート制限エラー（429）時に自動的に次のプロバイダーへフォールバックします。

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

**Cloudflare Workers AIのみを使用する場合（推奨）**

Cloudflare Workers AIは追加のAPIキーが不要です！Blueskyの認証情報のみ設定してください：

```bash
npx wrangler secret put BLUESKY_HANDLE
# プロンプトに従ってBlueskyハンドルを入力

npx wrangler secret put BLUESKY_PASSWORD
# プロンプトに従ってBlueskyパスワードを入力
```

**Groqも使用する場合（フォールバック用）**

```bash
npx wrangler secret put GROQ_API_KEY
# プロンプトに従ってGroq API Keyを入力

npx wrangler secret put BLUESKY_HANDLE
# プロンプトに従ってBlueskyハンドルを入力

npx wrangler secret put BLUESKY_PASSWORD
# プロンプトに従ってBlueskyパスワードを入力
```

**Geminiも使用する場合（フォールバック用）**

```bash
npx wrangler secret put GEMINI_API_KEY
# プロンプトに従ってGemini API Keyを入力

npx wrangler secret put BLUESKY_HANDLE
# プロンプトに従ってBlueskyハンドルを入力

npx wrangler secret put BLUESKY_PASSWORD
# プロンプトに従ってBlueskyパスワードを入力
```

> [!NOTE]
> 複数のAPI Keyを設定しておけば、`wrangler.toml`の`LLM_PRIORITY`設定で自動フォールバックが有効になります。レート制限エラー時に次のプロバイダーへ自動的に切り替わります。

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
> デバッグモードでは、Bluesky認証情報がなくても動作確認できます。Reddit取得とLLM生成のテストに便利です。

## 設定のカスタマイズ

### LLMプロバイダーの優先順位設定

`wrangler.toml` の `LLM_PRIORITY` で、使用するAIプロバイダーの優先順位を設定できます。

```toml
# Cloudflare Workers AIを最優先、レート制限時はGroq、その次にGeminiへフォールバック
LLM_PRIORITY = "cloudflare,groq,gemini"

# Groqのみ使用（フォールバックなし）
LLM_PRIORITY = "groq"

# Geminiを最優先、レート制限時はGroqへフォールバック
LLM_PRIORITY = "gemini,groq"
```

> [!IMPORTANT]
> **自動フォールバック機能**: いずれかのプロバイダーが429エラー（レート制限）を返した場合、自動的に次のプロバイダーへフォールバックします。これにより、API制限を気にせず安定稼働できます。

**利用可能なプロバイダー:**
- `cloudflare`: Cloudflare Workers AI（追加APIキー不要、推奨）
- `groq`: Groq API（外部サービス、APIキー必要）
- `gemini`: Gemini API（外部サービス、APIキー必要）

### LLMプロバイダーの変更（レガシー）

後方互換性のため、`wrangler.toml` の `LLM_PROVIDER` も使用できますが、`LLM_PRIORITY` の使用を推奨します。

```toml
# 単一プロバイダーを使用する場合（フォールバックなし）
LLM_PROVIDER = "cloudflare"
```

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

### Groqモデルの変更

`wrangler.toml` の `GROQ_MODEL` を変更してください。

```toml
GROQ_MODEL = "llama-3.3-70b-versatile"
```

利用可能なモデル：
- `llama-3.3-70b-versatile` - 高性能な70Bパラメータモデル（推奨）
- `llama-3.1-70b-versatile` - 前世代の70Bモデル
- `mixtral-8x7b-32768` - 長いコンテキストが必要な場合

> [!NOTE]
> 最新のモデル情報は [Groq Console](https://console.groq.com/docs/models) をご確認ください。

### Geminiモデルの変更

`wrangler.toml` の `GEMINI_MODEL` を変更してください。

```toml
GEMINI_MODEL = "gemini-2.5-flash"
```

利用可能なモデル（2026年2月時点）：
- `gemini-2.5-flash` - 最新の高速モデル（推奨）
- `gemini-1.5-flash` - 安定版の高速モデル
- `gemini-1.5-pro` - より高品質な結果が必要な場合

> [!NOTE]
> 最新のモデル情報は [Gemini APIドキュメント](https://ai.google.dev/gemini-api/docs/models) をご確認ください。

### Cloudflare Workers AIモデルの変更

`wrangler.toml` の `CLOUDFLARE_AI_MODEL` を変更してください。

```toml
CLOUDFLARE_AI_MODEL = "@cf/meta/llama-3.1-8b-instruct"
```

利用可能なモデル（2026年2月時点）：
- `@cf/meta/llama-3.1-8b-instruct` - LLama 3.1 8Bモデル（推奨）
- `@cf/meta/llama-3.2-3b-instruct` - より軽量なLLama 3.2 3Bモデル
- その他多数のモデルが利用可能

> [!NOTE]
> 最新のモデル情報は [Cloudflare Workers AIドキュメント](https://developers.cloudflare.com/workers-ai/models/) をご確認ください。

### 最小スコアの変更

`wrangler.toml` の `MIN_REDDIT_SCORE` を変更してください（デフォルト: 100）。

### 実行頻度の変更

`wrangler.toml` の `crons` を変更してください（デフォルト: 1時間に1回）。

Cron形式の例:
- `"0 * * * *"` - 毎時0分
- `"0 */2 * * *"` - 2時間ごと
- `"0 9 * * *"` - 毎日9時

### コメントペルソナの変更

`commentator-persona.md` を編集してください。このファイルはすべてのLLMプロバイダー（Cloudflare Workers AI、Gemini、Groq）で使用されます。

## トラブルシューティング

### "Reddit feed request failed"
- User-Agentが正しく設定されているか確認
- Redditのサービスが正常か確認
- サブレディット名が正しいか確認（存在しないサブレディットを指定していないか）

### "Gemini API request failed"
- Gemini API Keyが有効か確認
- APIの利用制限に達していないか確認
- 制限に達した場合は、`LLM_PRIORITY` に `"cloudflare,groq,gemini"` を設定して自動フォールバックを有効にすることを検討してください

### "Groq API request failed"
- Groq API Keyが有効か確認
- APIの利用制限に達していないか確認
- モデル名が正しいか確認（[利用可能なモデル](https://console.groq.com/docs/models)を確認）
- 制限に達した場合は、`LLM_PRIORITY` に `"cloudflare,groq,gemini"` を設定して自動フォールバックを有効にすることを検討してください

### "Cloudflare AI request failed"
- AI bindingが正しく設定されているか確認（`wrangler.toml` の `[ai]` セクション）
- モデル名が正しいか確認（[利用可能なモデル](https://developers.cloudflare.com/workers-ai/models/)を確認）
- Cloudflare Workersの制限に達していないか確認

### "Failed to post to Bluesky"
- Blueskyのハンドルとパスワードが正しいか確認
- Blueskyのサービスが正常か確認

## ライセンス

MIT
