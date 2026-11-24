/**
 * IMPORTANT VERCEL SERVERLESS LIMITATION:
 * This is an instance-local, best-effort in-memory rate limiter running inside process memory.
 * Because Vercel serverless functions run across isolated, ephemeral containers, each instance maintains
 * its own process memory and counters reset on cold starts. Different serverless instances do not share
 * state, so this cannot guarantee a globally synchronized rate limit.
 *
 * This provides a lightweight, code-only defense against casual/accidental abuse without introducing
 * external infrastructure dependencies (Redis, Upstash, or databases), preserving PocketFlow's local-first architecture.
 */

const WINDOW_MS = 60 * 1000; // 60 seconds
const MAX_REQUESTS = 10; // 10 requests per window

// Map of IP address -> array of timestamp numbers (ms)
const memoryStore = new Map<string, number[]>();

/**
 * Periodically sweeps the memory store to prevent memory leaks from inactive IPs.
 */
function cleanupStaleEntries(now: number) {
  if (memoryStore.size < 500) return;

  memoryStore.forEach((timestamps, ip) => {
    const validTimestamps = timestamps.filter((ts: number) => now - ts < WINDOW_MS);
    if (validTimestamps.length === 0) {
      memoryStore.delete(ip);
    } else {
      memoryStore.set(ip, validTimestamps);
    }
  });
}

export async function checkRateLimit(ip: string): Promise<{ ok: boolean; retryAfter: number }> {
  const now = Date.now();

  // Run lightweight sweep if store size grows large
  cleanupStaleEntries(now);

  // Retrieve existing timestamps for IP and filter out timestamps older than WINDOW_MS (60s)
  const existingTimestamps = memoryStore.get(ip) || [];
  const validTimestamps = existingTimestamps.filter((ts: number) => now - ts < WINDOW_MS);

  // If no active timestamps remain, clean up empty map entry
  if (validTimestamps.length === 0) {
    memoryStore.delete(ip);
  }

  // Check rate limit threshold (10 requests per 60s)
  if (validTimestamps.length >= MAX_REQUESTS) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldestTimestamp + WINDOW_MS - now) / 1000));
    
    // Save cleaned timestamps back to memory store
    memoryStore.set(ip, validTimestamps);
    return { ok: false, retryAfter };
  }

  // Record current request timestamp
  validTimestamps.push(now);
  memoryStore.set(ip, validTimestamps);

  return { ok: true, retryAfter: 0 };
}
