# デバッグモード使用ガイド

## 概要

デバッグモードを有効にすると、Blueskyへの投稿をスキップして、生成されたコメントをコンソールに出力します。Bluesky認証情報なしで、Reddit取得とGemini生成機能をテストできます。

## 設定方法

### 1. wrangler.toml を編集

```toml
DEBUG_MODE = "true"
```

### 2. ローカルで実行

```bash
# 開発サーバー起動
npm run dev
```

別のターミナルで：

```bash
# 手動トリガー
curl -X POST http://localhost:8787/trigger
```

## 出力例

デバッグモードで実行すると、以下のような出力が表示されます：

```
[BlueskyClient] INFO: DEBUG MODE: Skipping Bluesky post, outputting to console instead

================================================================================
DEBUG MODE - Generated Comment:
================================================================================
今日はAIの新しいモデルで盛り上がってたみたいニャ！

このモデルは以前より◯◯%性能が向上してるみたいだニャ～。
でも本当に実用的なのかどうかはまだわからないニャ。

https://reddit.com/r/technology/comments/xxxxxxx/new_ai_model/
================================================================================

[BlueskyClient] INFO: Comment output complete (not posted to Bluesky)
```

## 本番環境でのテスト

本番にデプロイした状態でもデバッグモードを使用できます：

```bash
# 1. wrangler.toml の DEBUG_MODE を "true" に設定
# 2. デプロイ
npm run deploy

# 3. Cloudflare ダッシュボードでログを確認
# 4. テスト完了後、DEBUG_MODE を "false" に戻して再デプロイ
```

## 注意事項

- デバッグモード時でも、**Reddit APIとGemini APIは実際に呼び出されます**
  - Reddit RSS Feedは無料ですが、Gemini APIは使用量に応じた課金があります
- デバッグモード時は、**D1データベースへの投稿履歴も保存されません**（実装により異なる場合があります）
- 本番環境でデバッグモードを有効にしたまま忘れないようにしてください

## デバッグモードを無効化

テスト完了後は必ず無効化してください：

```toml
DEBUG_MODE = "false"
```

または、環境変数を削除：

```toml
# DEBUG_MODE = "false"  # コメントアウト
```
