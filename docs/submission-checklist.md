# Final submission checklist

## Technical checks

- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] With `npm run dev` running, `npm run verify:mcp` ends with `MCP SMOKE TEST PASSED`.
- [ ] Manually complete options → eligibility → draft → confirm → refresh → case still present.
- [ ] MCP activity drawer shows actual tool names and truthful inputs/results.
- [ ] Restart with a clean demo dataset before recording; do not record leftover cases from testing.
- [ ] README startup commands work from a fresh clone.

## Devpost materials

- [ ] Select the Alexa+ primary track.
- [ ] Provide a working repository according to Devpost's public-license/private-collaborator rules.
- [ ] Check repository contains no `.env`, `node_modules`, `dist`, or personal data.
- [ ] Record a public English demo video under 3 minutes.
- [ ] Describe only capabilities that are present in the submitted code.
- [ ] Complete required product feedback for each tool/API/SDK actually used.
- [ ] If submitting a friction log, include only issues genuinely experienced, with expectation, actual behavior, severity, workaround, and actionable suggestion.
- [ ] Double-check the exact deadline on the official Devpost submission page before final submit.

## Honest positioning

AfterCart is a working prototype with a deterministic intent router and a real Streamable HTTP MCP server. It uses seeded, local sample purchase records. It does not connect to Amazon orders or retailers, determine binding warranty coverage, or submit real returns. Case confirmation changes a local demo record only.
