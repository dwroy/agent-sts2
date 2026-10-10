"""Exact abstract draw probabilities; not a game simulator or learned policy."""
import json
from math import comb


def probability_both(n, a, b, draws):
    denominator = comb(n, draws)
    numerator = (denominator - comb(n - a, draws) - comb(n - b, draws)
                 + comb(n - a - b, draws))
    return {"numerator": numerator, "denominator": denominator,
            "probability": numerator / denominator}


cases = [
    ("baseline", 20, 1, 1),
    ("one_extra_A", 21, 2, 1),
    ("one_extra_A_and_B", 22, 2, 2),
    ("extra_tool_before_its_effect", 21, 1, 1),
    ("ten_extra_noncore_without_draw_effect", 30, 1, 1),
]
result = {
    "kind": "ops_abstract_probability_discussion_not_game_evidence",
    "assumptions": [
        "Uniform random order of distinct physical cards, sampled without replacement.",
        "A and B are disjoint labels; count seeing at least one of each.",
        "Draw window is fixed at five or ten distinct cards; no redraw or shuffle.",
        "No card effects, energy, retention, timing, survival, or play legality modeled.",
        "Extra tool row only describes its pre-effect access cost, not total value.",
        "Seeing both does not establish simultaneous availability or completed execution.",
    ],
    "rows": [{"label": label, "cards": n, "A": a, "B": b,
              "draws": {str(k): probability_both(n, a, b, k) for k in (5, 10)}}
             for label, n, a, b in cases],
    "learned_game_policy": False,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
