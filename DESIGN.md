# Reddit Reader

## 概要

Redditのトレンドを取得

## 動作環境

CloudflareのPages, Worker, KV, D1

## 処理の流れ

1. RedditのAPIを利用して人気スレッドを1件ピックアップ
  - envに持たせた認証情報でユーザ認証をした上で reddit.front.hot のAPIを使用
  - すでに投稿済みのIDでないか、スコアは十分かをチェック
2. Geminiに読み込ませてコメントを生成
  - commentator-persona.md を読み込んで生成
3. BlueskyのAPIを利用して投稿する
