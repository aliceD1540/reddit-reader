// Reddit RSS Feed Client (No authentication required)

import { Env } from '../types';
import { Logger } from '../utils/logger';

const logger = new Logger('RedditClient');

/**
 * Fetch Reddit posts from RSS feed (JSON format)
 * No authentication required
 */
export async function fetchRedditJSON(env: Env, endpoint: string): Promise<Response> {
  logger.info(`Fetching Reddit feed through old.reddit.com: ${endpoint}`);
  
  // Use a stable, descriptive User-Agent
  const userAgent = env.REDDIT_USER_AGENT || 'cloudflare:reddit-reader:v1.1 (by /u/grimoire13th)';

  // Use old.reddit.com which often has lighter security for JSON/RSS feeds
  const url = `https://old.reddit.com${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://old.reddit.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'DNT': '1'
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    const cfRay = response.headers.get('cf-ray');
    logger.error('Reddit feed request failed', { 
      url,
      status: response.status, 
      statusText: response.statusText,
      userAgent,
      cfRay,
      error: errorText.substring(0, 500)
    });
    
    if (response.status === 403) {
      logger.error('Received 403 Forbidden from Reddit. This is a Network Security block. The User-Agent or IP range is likely being flagged.');
    }
    
    throw new Error(`Reddit feed request failed: ${response.status}`);
  }
  
  logger.info('Successfully fetched Reddit feed');
  return response;
}
