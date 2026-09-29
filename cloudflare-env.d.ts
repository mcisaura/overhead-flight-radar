declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    SKY_CLIENT_LIMIT?: RateLimit;
    SKY_LOCATION_LIMIT?: RateLimit;
    AIRLABS_BUDGET?: DurableObjectNamespace;
  }
}
