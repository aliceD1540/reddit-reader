// TypeScript type definitions for Reddit Reader Bot

// Cloudflare Worker Environment
export interface Env {
  // D1 Database binding
  DB: D1Database;
  
  // KV Namespace binding (not used anymore, but kept for future use)
  KV: KVNamespace;
  
  // Secrets (set via wrangler secret)
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  BLUESKY_HANDLE: string;
  BLUESKY_PASSWORD: string;
  
  // Environment variables
  MIN_REDDIT_SCORE: string;
  REDDIT_USER_AGENT: string;
  REDDIT_SUBREDDITS: string; // Comma or plus-separated list of subreddits
  LLM_PROVIDER: string; // LLM provider to use: "gemini" or "groq" (default: gemini)
  GEMINI_MODEL: string; // Gemini model name (e.g., gemini-2.5-flash)
  GROQ_MODEL: string; // Groq model name (e.g., llama-3.3-70b-versatile)
  DEBUG_MODE?: string; // Set to "true" to skip Bluesky posting and output to console
}

// Reddit RSS Feed Types (no authentication needed)
export interface RedditRSSResponse {
  kind: string;
  data: {
    children: RedditPost[];
  };
}

export interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    score: number;
    permalink: string;
    url: string;
    subreddit: string;
    author: string;
    created_utc: number;
    thumbnail?: string;
  };
}

// Bluesky Link Card Data
export interface CardData {
  uri: string;
  title: string;
  description: string;
  thumbUrl?: string; // Optional URL for thumbnail
}



// Gemini API Types
export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  systemInstruction?: {
    parts: { text: string }[];
  };
}

export interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
  }[];
}

// Groq API Types
export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqRequest {
  model: string;
  messages: GroqMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface GroqResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

// Database Types
export interface PostedThread {
  id: number;
  reddit_id: string;
  score: number;
  posted_at: string;
}
