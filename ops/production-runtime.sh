# Roy 2026-10-19: company gateway only; callers select later authorized shadow/on boundaries.
set +x
if ! . /home/dw/.config/nova-game-agents/environment.sh >/dev/null 2>&1; then
  echo "Nova runtime could not load; play not started" >&2
  return 78
fi
# The restored primary instance retains its authorized actor after the old checkout was retired.
if [ "${ROOT:-}" = /home/dw/Projects/agent-sts2 ]; then
  export CHARACTER=SILENT BRAIN_ENGINE=codex BRAIN_FALLBACK=none
fi
export V6_BUILD="${V6_BUILD:-off}" V6_REFLEX="${V6_REFLEX:-off}"
export V6_CARD_DECIDER="${V6_CARD_DECIDER:-brain}" V6_POTION_DECIDER="${V6_POTION_DECIDER:-brain}"
export V6_SHOP_DECIDER="${V6_SHOP_DECIDER:-brain}" V6_REST_DECIDER="${V6_REST_DECIDER:-brain}"
