"""Parameter checks and distributions for the frozen abstract model only."""
import ast
import itertools
import json
import math
import statistics
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
SOURCE = ROOT / 'paper/materials/silent/20261011-core-cycle-quantitative-learning/inputs/abstract-calculate.py'
tree = ast.parse(SOURCE.read_text())
# Keep original functions and imports byte-semantically; skip its report-producing top level.
tree.body = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef))]
ns = {'TURNS': 12, 'BASE_DRAW': 5, 'SAMPLES': 10000}
exec(compile(tree, str(SOURCE), 'exec'), ns)

def spread(values):
    ordered = sorted(values)
    def quantile(q):
        at = (len(ordered) - 1) * q
        lo = math.floor(at)
        return ordered[lo] + (ordered[math.ceil(at)] - ordered[lo]) * (at - lo)
    return {'n': len(values), 'mean': statistics.mean(values),
            'sd': statistics.stdev(values) if len(values) > 1 else None,
            'meanSe': statistics.stdev(values) / math.sqrt(len(values)) if len(values) > 1 else None,
            'min': min(values), 'max': max(values), 'p10': quantile(.1), 'p50': quantile(.5), 'p90': quantile(.9),
            'frequencies': dict(sorted(__import__('collections').Counter(values).items()))}

enumerated = 0
for n in range(1, 13):
    for b in range(1, 8):
        for m in range(1, min(4, n) + 1):
            h = min(b, n)
            positions = list(itertools.combinations(range(n), m))
            measured = sum(all(x < h for x in p) for p in positions) / len(positions)
            formula = math.comb(h, m) / math.comb(n, m) if m <= h else 0
            assert math.isclose(measured, formula, abs_tol=1e-15)
            enumerated += 1

original = json.loads((OUT / 'abstract-reproduced.json').read_text())
rows = []
raw_by_label = {}
for row in original['discrete_card_flow_samples']:
    samples = [ns['simulate'](row['cards'], row['draw_two_cards'], row['draw_card_cost'], row['core_cost'],
                              row['energy_per_turn'], row['action_cap'], seed) for seed in range(10000)]
    values = [s['core_plays'] for s in samples]
    raw_by_label[row['label']] = values
    assert statistics.mean(values) == row['mean_counts']['core_plays']
    rows.append({'id': row['label'], 'core_plays': spread(values), 'guard_hits': sum(s['guard_hit'] for s in samples),
                 'samples': 10000, 'sample_identity': 'seed=0..9999', 'completed': 10000,
                 'game_wins': None, 'game_hp': None})
pairs = []
for option in ['19_after_removing_inert', '21_with_one_free_draw_two', '21_with_one_cost_one_draw_two']:
    base = raw_by_label['20_card_baseline']
    values = raw_by_label[option]
    pairs.append({'base': '20_card_baseline', 'option': option, 'paired_difference': spread([b-a for a,b in zip(base, values)]),
                  'limitation': '同seed和预算，不保证候选改变后每个随机事件同位；仅抽象模型计数差，不是游戏收益。'})
variants = []
for horizon, draw, energy, core_cost, draw_cost, cap in [
    (1, 1, 0, 1, 0, 10), (3, 2, 1, 1, 0, 10), (6, 3, 2, 1, 1, 10),
    (12, 5, 3, 2, 0, 3), (12, 5, 3, 0, 0, 1), (12, 5, 3, 0, 0, 6),
]:
    ns.update(TURNS=horizon, BASE_DRAW=draw)
    samples = [ns['simulate'](3, 2, draw_cost, core_cost, energy, cap, seed) for seed in range(1024)]
    assert all(s['guard_hit'] == 0 for s in samples)
    variants.append({'horizon': horizon, 'base_draw': draw, 'energy': energy, 'core_cost': core_cost,
                     'draw_cost': draw_cost, 'action_cap': cap, 'core_plays': spread([s['core_plays'] for s in samples])})
ns.update(TURNS=12, BASE_DRAW=5)
bound_checks = 0
for m, energy, c, d, cap in itertools.product(range(1,5), range(0,8), range(0,4), range(0,4), range(0,12)):
    energy_bound = (energy+d)//(c+d) if c+d else None
    action_bound = (cap+1)//(m+1)
    bound = min(energy_bound, action_bound) if energy_bound is not None else action_bound
    feasible = [k for k in range(cap+1) if k == 0 or (k*c+(k-1)*d <= energy and k*m+k-1 <= cap)]
    assert max(feasible) == bound
    bound_checks += 1
result = {'kind': 'abstract_model_verification_only', 'uniform_hand_enumerations': enumerated,
          'resource_bound_enumerations': bound_checks, 'original_result_equal': True,
          'scenarios': rows, 'paired': pairs, 'changed_parameters': variants,
          'closed_state_witnesses': [ns['loop_witness'](m) for m in (1,2,3)],
          'unverified_game_constraints': ['封抽/手位/耗尽/状态牌/实际费用/存活不在原抽象模型中；见原帧反例，未给抽象模拟添加臆测机制。'],
          'uncertainty': 'p10-p90是此模型结果分布；meanSe只为均值蒙特卡洛误差。未校准为真实游戏区间。'}
(OUT / 'math-verification.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
print(json.dumps({'uniform_hand_enumerations': enumerated, 'resource_bound_enumerations': bound_checks,
                  'original_samples': 120000, 'variant_samples': 6144}, ensure_ascii=False))
