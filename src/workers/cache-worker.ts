export interface Env {
  BUCKET: R2Bucket;
  CLOUDFLARE_TOKEN: string;
}

const CACHE_TIME = 60 * 5; // 5 minutes cache

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Handle API requests
    if (path.startsWith('/api/')) {
      return await handleApiRequest(request, env, ctx);
    }
    
    // Handle asset caching for static files
    if (path.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
      return await handleAssetRequest(request, env, ctx);
    }
    
    // Forward other requests to origin
    return fetch(request);
  },
  
  // Handle scheduled cache purge
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Purge expired cache items
    const purged = await purgeExpiredCache(env);
    console.log(`Purged ${purged} expired cache items`);
    
    // Call the maintenance endpoint
    await fetch('https://w2aw.vercel.app/api/edge/maintenance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${env.CLOUDFLARE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
  }
};

async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Check cache first
  const cacheKey = new URL(request.url).pathname;
  const cachedResponse = await getCachedResponse(cacheKey, env);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Forward to origin if not in cache
  const response = await fetch(request);
  
  // Cache successful responses
  if (response.status === 200) {
    const clonedResponse = response.clone();
    ctx.waitUntil(cacheResponse(cacheKey, clonedResponse, env));
  }
  
  return response;
}

async function handleAssetRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const cacheKey = url.pathname;
  
  // Check if the asset is in R2
  const r2Object = await env.BUCKET.get(cacheKey);
  
  if (r2Object) {
    // Return the cached asset
    const headers = new Headers();
    headers.set('Content-Type', r2Object.httpMetadata?.contentType || 'application/octet-stream');
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    headers.set('ETag', r2Object.httpEtag);
    
    return new Response(r2Object.body, {
      headers
    });
  }
  
  // Get the asset from the origin
  const response = await fetch(request);
  
  // Cache successful responses
  if (response.status === 200) {
    const clonedResponse = response.clone();
    const contentType = clonedResponse.headers.get('Content-Type') || 'application/octet-stream';
    
    // Store in R2
    ctx.waitUntil(
      clonedResponse.arrayBuffer().then(buffer => {
        return env.BUCKET.put(cacheKey, buffer, {
          httpMetadata: {
            contentType
          }
        });
      })
    );
  }
  
  return response;
}

async function getCachedResponse(key: string, env: Env): Promise<Response | null> {
  try {
    const object = await env.BUCKET.get(`api:${key}`);
    
    if (object === null) {
      return null;
    }
    
    const data = await object.json();
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    headers.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    headers.set('X-Cache', 'HIT');
    
    return new Response(JSON.stringify(data), {
      headers
    });
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

async function cacheResponse(key: string, response: Response, env: Env): Promise<void> {
  try {
    const data = await response.json();
    await env.BUCKET.put(`api:${key}`, JSON.stringify(data), {
      expirationTtl: 300, // Expire after 5 minutes
      httpMetadata: {
        contentType: 'application/json'
      }
    });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

async function purgeExpiredCache(env: Env): Promise<number> {
  let purged = 0;
  
  // Get a list of all objects
  const objects = await env.BUCKET.list();
  
  // Filter objects older than 1 day
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  
  // Delete expired objects
  for (const object of objects.objects) {
    if (object.uploaded < oneDayAgo && object.key.startsWith('api:')) {
      await env.BUCKET.delete(object.key);
      purged++;
    }
  }
  
  return purged;
}

