# AfterCart demo: 2 minutes 45 seconds

Keep the browser window and VS Code terminals arranged before recording. Start from a clean demo dataset (`npm run reset:demo` while the server is stopped, then `npm run dev`). Keep the MCP activity drawer closed until the designated step so the product remains visually clear.

## Spoken and on-screen run of show

- **0:00–0:15 — The problem.** “Checkout is not the end of shopping. Return windows, faults, and warranty questions can become another job to remember.”
- **0:15–0:35 — Show the workspace.** Point out the purchase list, upcoming deadlines, MCP-connected status, and the explicit sample-data disclaimer.
- **0:35–0:55 — Ask a real question.** Type “What needs attention this week?” Show the returned deadline summary and the `get_attention_summary` provenance chip.
- **0:55–1:15 — Explore before acting.** Type “Show my warranties and repair options.” Show that the read-only options tool returns possible next steps without creating a case.
- **1:15–1:32 — Check the facts in the sample record.** Ask “Can I return EchoTone Wireless Headphones?” Point to the deadline and the limitation that this is a local estimate, not a retailer decision.
- **1:32–1:55 — Prepare a draft.** Ask “Prepare a return for EchoTone Wireless Headphones.” Show the case ID and the explicit confirmation button.
- **1:55–2:12 — Confirm in demo.** Click “Confirm in demo.” Show the status update and explain that no retailer was contacted.
- **2:12–2:32 — Prove the tool path.** Open “MCP activity log.” Point to the actual tool name, input, result, status, and elapsed time. Mention the server uses Streamable HTTP and that `npm run verify:mcp` has passed.
- **2:32–2:45 — Close.** “AfterCart turns forgotten purchases into next steps, while keeping the person in control.”

## Never claim

- Do not claim an actual Amazon/retailer order integration, an actual return submission, or a warranty decision.
- Do not claim LLM-powered reasoning. Intent routing is deterministic in this version; calls to the MCP server are real.
- Do not show real personal purchase data. The app uses seeded sample records only.

## Last check before recording

1. Stop the server and run `npm run reset:demo`.
2. Start `npm run dev` and verify the UI says MCP connected.
3. Run `npm test`, `npm run build`, and (with the app running) `npm run verify:mcp`.
4. Record in English, keep the video public, and keep the final duration under three minutes.
