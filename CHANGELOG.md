# Changelog

## 0.4.0
- Added a visible provenance chip to assistant responses that came from MCP tools.
- Expanded the activity drawer into a clearer tool trace with arguments, concise result summaries, status, timestamps, and elapsed time when available.
- Recorded dashboard hydration as the three underlying MCP tool calls rather than a generic connection event.
- Aligned UI, client, server and package version labels at 0.4.0.
- Added a local MCP Origin allowlist and unit tests; missing Origin is permitted for command-line MCP clients.
- Tightened the timed demo script and added a final submission checklist.

## 0.3.0
- Added `npm run verify:mcp` using the official MCP TypeScript client.
- Validates initialization, tool discovery, and four read-only tool calls over Streamable HTTP.


## 0.5.0 — Signature visual pass
- Replaced the generic pastel dashboard styling with AfterCart’s deep-ink, warm-paper, electric-lime visual identity.
- Increased hierarchy and legibility for hero, dashboard metrics, purchase rows, assistant cards, status states, and activity traces.
- Added a persistent sample-workspace indicator and concise benefit proof in the hero.
- Added restrained transitions, hover/focus affordances, and reduced-motion support.
- No MCP tool, server, data-store, or intent-routing behavior intentionally changed.
