"""Pooled independent-run estimates. No game rules or learned card claims."""
from collections import Counter, defaultdict
import random
import statistics

from combo_metrics import numeric, statistic


def unique_runs(rows):
    """A direction is the union of its runs, never the sum of combo memberships."""
    groups = defaultdict(list)
    for r in rows:
        if numeric(r.get('value')):
            groups[r['run_id']].append(r)
    return [dict(rs[0], value=statistics.mean(r['value'] for r in rs)) for rs in groups.values()]


def offset_fit(rows):
    """Weighted within-combo OLS: combo intercept + ONE shared ascension offset.

    Repeated membership in different combos shares a run's weight. Ascension is
    centered at A10. Binary values use a linear probability model, not log odds.
    The caller rejects out-of-range predictions instead of clipping them.
    """
    usable = [r for r in rows if numeric(r.get('value')) and isinstance(r.get('ascension'), int)
              and not isinstance(r['ascension'], bool) and 0 <= r['ascension'] <= 100]
    if not usable:
        raise ValueError('没有同时含实测值与实际进阶的独立局')
    memberships = Counter(r['run_id'] for r in usable)
    groups = defaultdict(list)
    for r in usable:
        groups[(r['combo'], r.get('target', 'overall'))].append(r)
    means = {}
    for group, rs in groups.items():
        weight = sum(1/memberships[r['run_id']] for r in rs)
        means[group] = (sum((r['ascension']-10)/memberships[r['run_id']] for r in rs)/weight,
                        sum(r['value']/memberships[r['run_id']] for r in rs)/weight)
    xx = xy = 0.0
    for r in usable:
        mx, my = means[(r['combo'], r.get('target', 'overall'))]
        dx = r['ascension']-10-mx
        xx += dx*dx/memberships[r['run_id']]
        xy += dx*(r['value']-my)/memberships[r['run_id']]
    if xx < 1e-10:
        raise ValueError('组合内没有可识别的进阶变化；不能把跨组合差异当进阶偏移或假设偏移为0')
    slope = xy/xx
    return dict(offset=slope, estimates={g: y-slope*x for g, (x, y) in means.items()}, rows=usable)


def normalized(rows, combo, direction=None, *, regression=True, probability=False, prior_n=10, bootstraps=200, target='overall', nonnegative=True):
    """Return an audited estimate with a deterministic run-cluster bootstrap SE.

    The prior effective sample size is an explicit numerical regularizer, not
    game knowledge. Only n<prior_n shrinks. Raw observations/counts stay intact.
    Both target and parent are recomputed in every bootstrap draw, preserving
    their covariance and overlapping combo memberships.
    """
    if not isinstance(prior_n, int) or prior_n < 1:
        raise ValueError('prior_n must be a positive integer')
    rows = [r for r in rows if numeric(r.get('value'))]
    own = unique_runs([r for r in rows if r['combo'] == combo and r.get('target', 'overall') == target])
    reason = '无该组合的可核实独立局'
    method = ('所有版本/进阶合并；组合固定截距+统一进阶偏移，A10居中OLS；胜率为线性概率模型；'
              '按独立局的组合成员数反比加权；' if regression else '先逐历史独立局聚合；所有来源版本/进阶合并；')
    method += f'仅n<{prior_n}向所属方向去重局均值收缩，先验有效样本{prior_n}；{bootstraps}次固定种子20261019独立局cluster bootstrap；非因果'
    stat = statistic([(r['value'], r['evidence']) for r in own], 'independent_run', method, 'mean', reason)
    stat.update(value=None, se=None, unknown_reason=reason)
    detail = dict(raw_n=len(own), parent_n=0, weight=1.0, unshrunk=None, parent=None,
                  offset=None, offset_se=None, excluded_ascension_runs=[], extrapolated=False,
                  bootstrap_successes=0, reason=None)
    if not own:
        return stat, detail
    if regression:
        detail['excluded_ascension_runs'] = sorted({r['run_id'] for r in rows if not isinstance(r.get('ascension'), int)
                                                   or isinstance(r.get('ascension'), bool) or not 0 <= r['ascension'] <= 100})

    def estimate(data):
        fitted = offset_fit(data) if regression else None
        usable = fitted['rows'] if fitted else data
        local = unique_runs([r for r in usable if r['combo'] == combo and r.get('target', 'overall') == target])
        if not local:
            raise ValueError('该组合没有可用于A10折算的实际进阶观察')
        value = fitted['estimates'][(combo, target)] if fitted else statistics.mean(r['value'] for r in local)
        # Adjust every direction member's observed value with the SAME offset,
        # then average duplicate memberships within each run exactly once.
        parent_rows = [dict(r, value=r['value']-(fitted['offset']*(r['ascension']-10) if fitted else 0))
                       for r in usable if direction is not None and r.get('direction') == direction and r.get('target', 'overall') == target]
        parent_rows = unique_runs(parent_rows)
        parent = statistics.mean(r['value'] for r in parent_rows) if parent_rows else None
        weight = len(local)/(len(local)+prior_n) if len(local) < prior_n and parent is not None else 1.0
        shrunk = weight*value+(1-weight)*parent if parent is not None else value
        if probability and (not 0 <= shrunk <= 1 or not 0 <= value <= 1 or (parent is not None and not 0 <= parent <= 1)):
            raise ValueError('A10线性概率预测越界；不夹值、不改成确定胜败')
        if not probability and nonnegative and (shrunk < 0 or value < 0 or (parent is not None and parent < 0)):
            raise ValueError('A10线性预测为负，保留未知')
        return shrunk, value, parent, weight, len(parent_rows), fitted['offset'] if fitted else None, len(local), [r['evidence'] for r in parent_rows]

    try:
        value, raw, parent, weight, pn, slope, n, parent_evidence = estimate(rows)
    except ValueError as e:
        stat['unknown_reason'] = str(e)
        detail['reason'] = str(e)
        return stat, detail
    valid_own = [r for r in own if not regression or r['run_id'] not in detail['excluded_ascension_runs']]
    stat.update(n=n, value=value, evidence=[r['evidence'] for r in valid_own], unknown_reason=None, small_sample=n<10,
                p25=None, p75=None)
    detail.update(parent_evidence=parent_evidence, raw_se=None, parent_se=None, parent_n=pn, weight=weight, unshrunk=raw, parent=parent, offset=slope,
                  reason='所属方向缺可用观察，未收缩' if n < prior_n and parent is None else None,
                  extrapolated=regression and not min(r['ascension'] for r in valid_own) <= 10 <= max(r['ascension'] for r in valid_own))
    clusters = defaultdict(list)
    for r in rows:
        clusters[r['run_id']].append(r)
    keys = sorted(clusters)
    draws, slopes, raw_draws, parent_draws = [], [], [], []
    rng = random.Random(20261019)
    if len(keys) >= 3:
        for _ in range(bootstraps):
            sample = [dict(r, run_id=f'bootstrap-{i}', evidence=dict(r['evidence'], run_id=f'bootstrap-{i}'))
                      for i, rid in enumerate(rng.choices(keys, k=len(keys))) for r in clusters[rid]]
            try:
                estimated = estimate(sample)
                draws.append(estimated[0]); raw_draws.append(estimated[1])
                if estimated[2] is not None: parent_draws.append(estimated[2])
                if estimated[5] is not None:
                    slopes.append(estimated[5])
            except ValueError:
                pass
    detail['bootstrap_successes'] = len(draws)
    if len(draws) >= max(30, bootstraps*.8):
        stat['se'] = statistics.stdev(draws)
        detail['raw_se'] = statistics.stdev(raw_draws)
        detail['parent_se'] = statistics.stdev(parent_draws) if len(parent_draws) == len(draws) else None
        detail['offset_se'] = statistics.stdev(slopes) if len(slopes) == len(draws) else None
    else:
        stat['method'] += '；独立局不足或有效bootstrap不足80%，SE未知'
    return stat, detail
