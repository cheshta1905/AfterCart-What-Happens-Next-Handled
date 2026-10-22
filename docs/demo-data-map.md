# Demo data map

AfterCart is a hackathon prototype. Its four purchases are fictional, seeded records designed to exercise different states; they are not connected to Amazon or any retailer account.

| Purchase | Scenario it demonstrates | Intended demo value |
|---|---|---|
| EchoTone Wireless Headphones | Return window closes soon; an issue is noted | Show the deadline radar and check return eligibility |
| BrewMate Mini Coffee Maker | Listed return window has passed; warranty period remains | Show that the next step can be warranty/repair rather than assuming a return is possible |
| LumaDesk LED Task Lamp | No issue reported; return window remains open | Show a normal purchase state and that the app does not invent an issue |
| CloudRest Wireless Mouse | An issue is noted and the return deadline is approaching | Show a purchase-specific options flow and draft preparation |

Dates are generated relative to the day the local demo database is first seeded. The displayed policy dates and eligibility conclusions are demo-only and should not be presented as verified retailer policy.

## Why four records are enough for this demo

The dataset is intentionally small and curated so every record can be explained during a short judging video. A coherent set of edge cases makes the workflow repeatable and lets judges see different behaviors without waiting for live services. The demo should explicitly say that it uses seeded sample data.
