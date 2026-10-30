# Roy 2026-10-19: company gateway only; callers select later authorized shadow/on boundaries.
set +x
if ! . /home/dw/.config/nova-game-agents/environment.sh >/dev/null 2>&1; then
  echo "Nova runtime could not load; play not started" >&2
  return 78
fi
# The restored primary instance retains its authorized actor after the old checkout was retired.
if [ "${ROOT:-}" = /home/dw/Projects/agent-sts2 ]; then
  export CHARACTER=SILENT BRAIN_ENGINE=codex BRAIN_FALLBACK=none
  export BRAIN_DECISION_KNOWLEDGE=on BRAIN_DECISION_KNOWLEDGE_BYTES=8000
  # Roy: apply only when ops publishes this at the next natural new-run boundary.
  export V6_BUILD=on V6_CARD_DECIDER=brain V6_SHOP_DECIDER=brain V6_REST_DECIDER=brain V6_POTION_DECIDER=brain
  export V6_COMBAT_ENTRIES=off V6_DIRECTION_REPLAN=off
  export V6_T1_CORE_MIN=0 V6_T2_MIN_DELTA=1 V6_T3_WEIGHT_MAX=0 V6_T6_UNKNOWN_MAX=1 V6_T6_FALLBACKS=100
fi
# Roy #81: Codex brain effort is selected only at the next play boundary.
if [ "${ROOT:-}" = /home/dw/Projects/agent-sts2 ] \
  && [ "${CHARACTER:-SILENT}" = SILENT ] \
  && [ "${BRAIN_ENGINE:-codex}" = codex ]; then
  export BRAIN_CODEX_EFFORT=xhigh
fi
export V6_BUILD="${V6_BUILD:-off}" V6_REFLEX="${V6_REFLEX:-off}"
export V6_CARD_DECIDER="${V6_CARD_DECIDER:-brain}" V6_POTION_DECIDER="${V6_POTION_DECIDER:-brain}"
export V6_SHOP_DECIDER="${V6_SHOP_DECIDER:-brain}" V6_REST_DECIDER="${V6_REST_DECIDER:-brain}"
