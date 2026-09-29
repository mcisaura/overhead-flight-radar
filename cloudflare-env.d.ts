declare namespace Cloudflare {
  interface Env {
    SKY_CLIENT_LIMIT?: RateLimit;
    SKY_LOCATION_LIMIT?: RateLimit;
    AIRLABS_BUDGET?: DurableObjectNamespace;
  }
}
