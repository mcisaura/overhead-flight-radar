# Development notes

Overhead is a personal React/vinext app with Live aircraft data and three fictional Houston Demo flights. See the README for setup, structure, and credits.

## Working here

- The app repository is `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only. Leave `../unused-assets/` outside the repository.
- Run `npm run check` to test, type-check, lint, and build. The suite currently has 66 tests. Existing warnings concern an airline logo `<img>` and the separate large 3D bundle.
- Prefer `/?mode=demo` for browser testing. Every uncached Live AirLabs request spends part of the shared 900-call rolling 31-day budget; there is no periodic polling.
- The real AirLabs key is in ignored `.env.local`. Never print it, commit it, or overwrite an existing configured key.

## Current state (6 October 2026)

- GitHub `mcisaura/overhead-flight-radar`, branch `main`, is the source of truth. Fetch and reconcile it before making local changes. Preserve uncommitted work; do not overwrite GitHub with a stale copy.
- Cloudflare Worker: `overhead-flight-radar` in the owner’s account. GitHub pushes to `main` run checks and deploy automatically; preview builds are disabled.
- Worker secrets hold the shared AirLabs key. Keep it out of build variables. Application error logs are enabled; request URL logs and automatic traces are disabled to avoid recording locations or the upstream key.
- README and these notes are now concise; older session logs and the resolved September code review remain available in Git history.
- Removed unused font/aircraft assets, the obsolete `/preview/mode-toggle` route, and the toggle wrapper. The main Live/Demo toggle keeps its existing markup and styles.
- One GitHub workflow runs `npm run check` on pushes to `main`, or manually. Keep the existing local regression tests.
- After this cleanup, all 66 tests, type checks, lint, and production build pass with the existing warnings. The toggle markup is identical to its previous implementation.
- Keep the supplied fonts and do not add a code license, per the owner’s preference. The supplied Frutiger files have no accompanying license file; redistribution rights have not been independently verified.

## Hosting verification

- The hosted Live and Demo endpoints returned 200 with weather and no warnings. Cloudflare confirms the Worker secret, rate-limit bindings, and `AirLabsBudget` namespace.
- Desktop browser verification covered Demo aircraft rendering, map loading, playback/pause, and switching to Live. Phone-width verification remains optional.
- The owner confirmed AirLabs allowance on 6 October 2026. The shared budget cannot include earlier usage or other apps on the account.

## Owner’s Git conventions

- Author and committer: `mcisaura <sankarpete@gmail.com>`.
- Code commits: no `Co-authored-by` or other AI attribution. Disable the tool’s default commit attribution.
- Keep README/docs changes in separate docs-only commits, with `Co-authored-by: Codex <noreply@openai.com>` or `Co-authored-by: Claude <noreply@anthropic.com>`, matching the tool making the change. Use `docs: <topic>` messages.
- The owner writes commit messages. Ask for one or propose a short lowercase message in their style.
- Do not push, add a remote, or rewrite history without the owner’s authorization. The September history was rebuilt and must not be rewritten again without asking.
