# C1 scripted gate answers (EVAL MODE ONLY — in production a human answers)

- **GATE A · ruling:** "Invoiced revenue everywhere — the dashboard is right; summary is wrong at
  source." · **strategy:** "patch summary.js to read invoices, honor the window, exclude DRAFT"
  · discriminators: none apply.
- **GATE B:** approve IF the primary is red on `summary === 10` expecting 10, actual 1110.
  Reject any red caused by setup (module resolution, wrong path, node version).
