// D1 Database helper functions

import { Env } from '../types';
import { Logger } from './logger';

const logger = new Logger('DB');

/**
 * Check if a Reddit post has already been posted
 */
export async function isAlreadyPosted(db: D1Database, redditId: string): Promise<boolean> {
  try {
    const result = await db
      .prepare('SELECT id FROM posted_threads WHERE reddit_id = ?')
      .bind(redditId)
      .first();
    
    return result !== null;
  } catch (error) {
    logger.error('Failed to check if post exists', error);
    throw error;
  }
}

/**
 * Save a posted thread to the database
 */
export async function savePostedThread(
  db: D1Database,
  redditId: string,
  score: number
): Promise<void> {
  try {
    await db
      .prepare('INSERT INTO posted_threads (reddit_id, score) VALUES (?, ?)')
      .bind(redditId, score)
      .run();
    
    logger.info(`Saved posted thread: ${redditId} with score ${score}`);
  } catch (error) {
    logger.error('Failed to save posted thread', error);
    throw error;
  }
}

/**
 * Clean up old posted threads (older than 30 days)
 */
export async function cleanupOldThreads(db: D1Database): Promise<void> {
  try {
    const result = await db
      .prepare("DELETE FROM posted_threads WHERE posted_at < datetime('now', '-30 days')")
      .run();
    
    logger.info(`Cleaned up old threads: ${result.meta.changes} rows deleted`);
  } catch (error) {
    logger.error('Failed to cleanup old threads', error);
    // Don't throw, this is not critical
  }
}
