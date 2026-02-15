-- Migration: Initialize database schema for Reddit Reader Bot

-- Table to track posted Reddit threads
CREATE TABLE IF NOT EXISTS posted_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reddit_id TEXT NOT NULL UNIQUE,
  score INTEGER NOT NULL,
  posted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reddit_id ON posted_threads(reddit_id);
CREATE INDEX IF NOT EXISTS idx_posted_at ON posted_threads(posted_at);
