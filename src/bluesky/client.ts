// Bluesky API Client

import { BskyAgent, RichText } from '@atproto/api';
import { Env, CardData } from '../types';
import { Logger } from '../utils/logger';
import { stripRedditUrls } from '../utils/text';

const logger = new Logger('BlueskyClient');

/**
 * Post to Bluesky (or output to console in debug mode)
 */
export async function postToBluesky(env: Env, text: string, card?: CardData): Promise<void> {
  // Check if debug mode is enabled
  const isDebugMode = env.DEBUG_MODE?.toLowerCase() === 'true';
  
  if (isDebugMode) {
    logger.info('DEBUG MODE: Skipping Bluesky post, outputting to console instead');
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG MODE - Generated Comment:');
    console.log('='.repeat(80));
    console.log(stripRedditUrls(text));
    if (card) {
      console.log('\nDEBUG MODE - Link Card:');
      console.log(`URI: ${card.uri}`);
      console.log(`Title: ${card.title}`);
      console.log(`Description: ${card.description}`);
      console.log(`Thumbnail URL: ${card.thumbUrl || 'None'}`);
    }
    console.log('='.repeat(80) + '\n');
    logger.info('Comment output complete (not posted to Bluesky)');
    return;
  }
  
  logger.info('Posting to Bluesky');
  
  try {
    // Create Bluesky agent
    const agent = new BskyAgent({
      service: 'https://bsky.social',
    });
    
    // Login
    await agent.login({
      identifier: env.BLUESKY_HANDLE,
      password: env.BLUESKY_PASSWORD,
    });
    
    logger.info('Successfully logged in to Bluesky');
    
    // Process text for facets (links, mentions)
    const cleanedText = stripRedditUrls(text);
    const rt = new RichText({ text: cleanedText });
    await rt.detectFacets(agent);
    
    // Build post record
    const postRecord: any = {
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    };
    
    // Handle link card if provided
    if (card) {
      let thumbBlob;
      
      // Upload thumbnail if available
      if (card.thumbUrl && card.thumbUrl.startsWith('http')) {
        try {
          logger.info(`Fetching thumbnail: ${card.thumbUrl}`);
          const thumbResp = await fetch(card.thumbUrl);
          if (thumbResp.ok) {
            const arrayBuffer = await thumbResp.arrayBuffer();
            const { data } = await agent.uploadBlob(new Uint8Array(arrayBuffer), {
              encoding: thumbResp.headers.get('content-type') || 'image/jpeg',
            });
            thumbBlob = data.blob;
            logger.info('Thumbnail uploaded successfully');
          } else {
            logger.warn(`Failed to fetch thumbnail: ${thumbResp.status}`);
          }
        } catch (error) {
          logger.warn('Error uploading thumbnail, proceeding without it', error);
        }
      }
      
      postRecord.embed = {
        $type: 'app.bsky.embed.external',
        external: {
          uri: card.uri,
          title: card.title,
          description: card.description,
          thumb: thumbBlob,
        },
      };
      
      logger.info('External embed (link card) added to post');
    }
    
    // Post
    const result = await agent.post(postRecord);
    
    logger.info('Successfully posted to Bluesky', { uri: result.uri });
  } catch (error) {
    logger.error('Failed to post to Bluesky', error);
    throw error;
  }
}
