import vinext from "vinext";
import { defineConfig } from "vite";

// Local Worker bindings. Deployment uses the same names from the generated
// dist/server/wrangler.json.
const localBindingConfig = {
  main: "./worker.ts",
  compatibility_flags: ["nodejs_compat"],
  ratelimits: [
    { name: "SKY_CLIENT_LIMIT", namespace_id: "2718281801", simple: { limit: 12, period: 60 as const } },
    { name: "SKY_LOCATION_LIMIT", namespace_id: "2718281802", simple: { limit: 120, period: 60 as const } },
  ],
  durable_objects: { bindings: [{ name: "AIRLABS_BUDGET", class_name: "AirLabsBudget" }] },
  migrations: [{ tag: "airlabs-budget-v1", new_sqlite_classes: ["AirLabsBudget"] }],
};

// Some macOS sandboxes block FSEvents; fall back to polling so HMR still works.
const pollForChanges = process.env.CODEX_SANDBOX === "seatbelt";

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. Application secrets
  // belong in the ignored .env.local file.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: pollForChanges ? { watch: { useFsEvents: false, usePolling: true } } : {},
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
