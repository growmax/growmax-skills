On the payments screen both cards say "Payments Collected". The second one is the pending card —
it's showing the wrong title. The counts underneath are right (2 and 1), it's just the heading.

App is at <SANDBOX PATH>. Labels come from `src/labels.js` reading `locales/en.json`; the screen is
`src/payments.js`. Run `node -e "console.log(require('./src/payments').cards())"` to see it.
