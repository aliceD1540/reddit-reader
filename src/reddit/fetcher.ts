// Reddit Post Fetcher (RSS Feed)

import { Env, RedditRSSResponse, RedditPost } from '../types';
import { Logger } from '../utils/logger';
import { isAlreadyPosted } from '../utils/db';
import { fetchRedditJSON } from './client';

const logger = new Logger('RedditFetcher');

/**
 * Build subreddit endpoint from environment variable
 */
function getSubredditEndpoint(env: Env): string {
  const subreddits = env.REDDIT_SUBREDDITS || 'all';
  
  // Support both comma-separated (technology,programming) and plus-separated (technology+programming)
  const normalized = subreddits.replace(/,/g, '+').trim();
  
  return `/r/${normalized}/hot.json?limit=50`;
}

/**
 * Fetch a trending post from Reddit that hasn't been posted yet
 */
export async function fetchTrendingPost(env: Env): Promise<RedditPost | null> {
  logger.info('Fetching trending posts from Reddit');
  
  const minScore = parseInt(env.MIN_REDDIT_SCORE, 10);
  const endpoint = getSubredditEndpoint(env);
  const isDebugMode = env.DEBUG_MODE?.toLowerCase() === 'true';
  
  logger.info(`Using subreddits: ${env.REDDIT_SUBREDDITS || 'all'}`);
  
  // Fetch hot posts
  const response = await fetchRedditJSON(env, endpoint);
  const data: RedditRSSResponse = await response.json();
  
  // Take top 10 posts from the results
  const topPosts = data.data.children.slice(0, 10);
  const candidates: RedditPost[] = [];
  
  logger.info(`Checking top ${topPosts.length} posts for suitability`);
  
  // Find all suitable posts among the top 10
  for (const post of topPosts) {
    const postData = post.data;
    
    // Check if post meets criteria
    if (postData.score < minScore) {
      logger.debug(`Post ${postData.id} score too low: ${postData.score}`);
      continue;
    }
    
    // Check if already posted (Skip if in debug mode)
    if (isDebugMode) {
      logger.info(`DEBUG MODE: Skipping duplicate check for post ${postData.id}`);
    } else {
      const alreadyPosted = await isAlreadyPosted(env.DB, postData.id);
      if (alreadyPosted) {
        logger.debug(`Post ${postData.id} already posted`);
        continue;
      }
    }
    
    // Skip posts without meaningful content
    if (!postData.title || postData.title.length < 10) {
      logger.debug(`Post ${postData.id} title too short`);
      continue;
    }
    
    candidates.push(post);
  }
  
  if (candidates.length === 0) {
    logger.warn('No suitable posts found in top 10');
    return null;
  }
  
  // Pick one randomly
  const randomIndex = Math.floor(Math.random() * candidates.length);
  const selectedPost = candidates[randomIndex];
  
  logger.info(`Selected random post: ${selectedPost.data.id} (Candidate ${randomIndex + 1}/${candidates.length}) with score ${selectedPost.data.score}`);
  return selectedPost;
}

/**
 * Format Reddit post data for Gemini
 */
export function formatPostForGemini(post: RedditPost): string {
  const data = post.data;
  
  let content = `Title: ${data.title}\n`;
  content += `Subreddit: r/${data.subreddit}\n`;
  content += `Score: ${data.score}\n`;
  content += `Author: u/${data.author}\n`;
  content += `URL: https://reddit.com${data.permalink}\n\n`;
  
  if (data.selftext && data.selftext.length > 0) {
    // Limit selftext to avoid token limits
    const text = data.selftext.substring(0, 2000);
    content += `Content:\n${text}\n`;
    
    if (data.selftext.length > 2000) {
      content += '\n[Content truncated...]\n';
    }
  }
  
  return content;
}
