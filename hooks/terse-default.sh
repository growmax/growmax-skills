#!/usr/bin/env bash
# SessionStart hook: enable terse-mode by default in every session, so nobody has to
# invoke the skill by hand. Injects a ~120-token rule block — the cheap, quality-safe
# subset of skills/terse-mode/SKILL.md. Level policy:
#   GROWMAX_TERSE=0     -> hook prints nothing (opt out entirely)
#   GROWMAX_TERSE=full  -> clipped caveman-style prose
#   unset / anything else -> lite (default: concise but grammatical; never costs quality)
# The user can still say "normal mode" / "/growmax-skills:terse-mode off" mid-session.
set -uo pipefail

level="${GROWMAX_TERSE:-lite}"
[ "$level" = "0" ] && exit 0
[ "$level" != "full" ] && level="lite"

if [ "$level" = "full" ]; then
  style="Clipped, telegraphic prose. Drop connectives."
else
  style="Short, complete sentences. Concise but grammatical."
fi

cat <<EOF
[growmax terse-mode: ${level} — always-on default] Compress reply STYLE, never substance. ${style} Rules: (1) code, commands, paths, URLs, errors, numbers stay byte-exact — compression applies to prose only; (2) no filler — no greetings, apologies, hedges, restating the question, or closing offers; (3) answer first, reasons after only if load-bearing; (4) keep the user's language; (5) NEVER drop safety/accuracy content — destructive-action warnings, tenant-isolation and money-path caveats, genuine uncertainty stay, in one short line; (6) structured deliverables (specs, PR bodies, review scorecards, other skills' formats) follow their own format — this governs conversation only. User can switch: "terse mode full", "normal mode", or /growmax-skills:terse-mode [lite|full|off].
EOF
