// Main entry point for Reddit Reader Bot
// Cloudflare Scheduled Worker

import { Env } from './types';
import { Logger } from './utils/logger';
import { cleanupOldThreads, savePostedThread } from './utils/db';
import { fetchTrendingPost, formatPostForGemini } from './reddit/fetcher';
import { generateComment } from './llm/client';
import { postToBluesky } from './bluesky/client';
import { stripRedditUrls } from './utils/text';

const logger = new Logger('Main');

export default {
  /**
   * Scheduled event handler
   * Triggered by cron schedule defined in wrangler.toml
   */
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<{ status: string; title?: string; comment?: string }> {
    logger.info('Scheduled worker triggered', { scheduledTime: event.scheduledTime });
    
    try {
      // Step 1: Fetch a trending Reddit post
      logger.info('Step 1: Fetching trending Reddit post');
      const redditPost = await fetchTrendingPost(env);
      
      if (!redditPost) {
        logger.warn('No suitable Reddit post found, skipping this run');
        return { status: 'SKIPPED: No suitable Reddit post found' };
      }
      
      const postTitle = redditPost.data.title;
      logger.info(`Found Reddit post: ${redditPost.data.id} - "${postTitle}"`);
      
      // Step 2: Generate comment using LLM
      logger.info('Step 2: Generating comment with LLM');
      const formattedPost = formatPostForGemini(redditPost);
      const comment = await generateComment(env, formattedPost, redditPost.data.permalink);
      
      logger.info('Generated comment', { preview: comment.substring(0, 100) });
      
      // Step 3: Post to Bluesky
      logger.info('Step 3: Posting to Bluesky');
      
      const cleanedComment = stripRedditUrls(comment);
      
      const card = {
        uri: `https://reddit.com${redditPost.data.permalink}`,
        title: redditPost.data.title,
        description: redditPost.data.selftext 
          ? (redditPost.data.selftext.length > 150 ? redditPost.data.selftext.substring(0, 147) + '...' : redditPost.data.selftext)
          : `Reddit post in r/${redditPost.data.subreddit} by u/${redditPost.data.author}`,
        thumbUrl: redditPost.data.thumbnail && redditPost.data.thumbnail.startsWith('http') ? redditPost.data.thumbnail : undefined,
      };
      
      await postToBluesky(env, cleanedComment, card);
      
      // Step 4: Save to database (Skip if in debug mode)
      const isDebugMode = env.DEBUG_MODE?.toLowerCase() === 'true';
      if (isDebugMode) {
        logger.info('DEBUG MODE: Skipping database save');
      } else {
        logger.info('Step 4: Saving to database');
        await savePostedThread(env.DB, redditPost.data.id, redditPost.data.score);
        
        // Cleanup old threads (best effort)
        try {
          await cleanupOldThreads(env.DB);
        } catch (error) {
          logger.warn('Failed to cleanup old threads', error);
        }
      }
      
      logger.info('Successfully completed Reddit Reader Bot run');
      return { 
        status: isDebugMode ? 'SUCCESS (DEBUG)' : 'SUCCESS', 
        title: postTitle, 
        comment: cleanedComment 
      };
      
    } catch (error: any) {
      logger.error('Error in scheduled worker', error);
      throw error;
    }
  },
  
  /**
   * HTTP request handler (for testing)
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    
    // Health check endpoint
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }
    
    // Manual trigger endpoint for testing
    if (url.pathname === '/trigger' && request.method === 'POST') {
      logger.info('Manual trigger received');
      
      try {
        const fakeEvent = {
          scheduledTime: Date.now(),
          cron: 'manual',
        } as ScheduledEvent;
        
        // Run the scheduled handler and capture result
        const result = await this.scheduled(fakeEvent, env, ctx);
        
        // Create descriptive response
        let responseBody = `Bot run status: ${result.status}\n`;
        if (result.title) responseBody += `Title: ${result.title}\n`;
        if (result.comment) responseBody += `\nGenerated Comment:\n------------------\n${result.comment}\n------------------\n`;
        
        return new Response(responseBody, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      } catch (error: any) {
        logger.error('Manual trigger failed', error);
        return new Response(`Error: ${error.message}`, { status: 500 });
      }
    }
    
    return new Response('Reddit Reader Bot - Use POST /trigger to test manually', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};
