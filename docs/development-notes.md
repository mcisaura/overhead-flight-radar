# Development notes

Overhead is a personal React/vinext app with Live aircraft data and three fictional Houston Demo flights. See the README for setup, structure, and credits.

## Working here

- The app repository is `flight-overhead/` inside the “Flight Proj” ChatGPT project mirror. The parent `AGENTS.md` makes `sources/` read-only. Leave `../unused-assets/` outside the repository.
- Run `npm run check` to test, type-check, lint, and build. The suite currently has 66 tests. Existing warnings concern an airline logo `<img>` and the separate large 3D bundle.
- Prefer `/?mode=demo` for browser testing. Every uncached Live AirLabs request spends part of the shared 900-call rolling 31-day budget; there is no periodic polling.
- The real AirLabs key is in ignored `.env.local`. Never print it, commit it, or overwrite an existing configured key.

## Current state (6 October 2026)

- Branch: `main`. No remote or public deployment configured.
- README and these notes are now concise; older session logs and the resolved September code review remain available in Git history.
- Removed unused font/aircraft assets, the obsolete `/preview/mode-toggle` route, and the toggle wrapper. The main Live/Demo toggle keeps its existing markup and styles.
- One GitHub workflow runs `npm run check` on pushes to `main`, or manually. Keep the existing local regression tests.
- After this cleanup, all 66 tests, type checks, lint, and production build pass with the existing warnings. The toggle markup is identical to its previous implementation.
- Keep the supplied fonts and do not add a code license, per the owner’s preference. The supplied Frutiger files have no accompanying license file; redistribution rights have not been independently verified.

## Remaining checks

- Visually check Live and Demo at desktop and phone widths. Recent automated checks passed, but recent browser interaction verification was unavailable.
- Before hosting Live publicly, check AirLabs account usage, store the Worker secret, and verify deployed rate limits and the budget Durable Object. The counter cannot include earlier usage or other apps on the account.

## Owner’s Git conventions

- Author and committer: `mcisaura <sankarpete@gmail.com>`.
- Code commits: no `Co-authored-by` or other AI attribution. Disable the tool’s default commit attribution.
- Keep README/docs changes in separate docs-only commits, with `Co-authored-by: Codex <noreply@openai.com>` or `Co-authored-by: Claude <noreply@anthropic.com>`, matching the tool making the change. Use `docs: <topic>` messages.
- The owner writes commit messages. Ask for one or propose a short lowercase message in their style.
- Do not push, add a remote, or rewrite history without the owner’s authorization. The September history was rebuilt and must not be rewritten again without asking.
