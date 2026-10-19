"""Assemble the watcher-owned pooled build-core contract from audited raw rows."""
from collections import defaultdict
import copy

from combo_metrics import numeric, statistic
from combo_normalization import normalized, unique_runs

OUTCOMES = ('win_rate', 'hp_loss', 'completion_turns')
COUNTS = ('formed_runs', 'cleared_runs', 'chain_reached', 'chain_won')


def unknown(reason, unit='independent_run'):
    return statistic([], unit, '所有版本与进阶合并；未观察不补零', reason=reason)


def component(estimate, detail, kind):
    value = detail.get('unshrunk' if kind == 'raw' else 'parent')
    if value is None:
        return unknown(detail.get('reason') or estimate['unknown_reason'] or '所属方向没有可核观察')
    out = copy.deepcopy(estimate)
    if kind == 'direction':
        out.update(n=detail['parent_n'], evidence=detail['parent_evidence'], small_sample=detail['parent_n']<10)
    out.update(value=value, se=detail.get('raw_se' if kind == 'raw' else 'parent_se'), unknown_reason=None)
    return out


def shrink(rows, combo, direction, basis, metric, target='overall', prior_n=10):
    estimate, detail = normalized(rows, combo, direction, regression=basis=='regression',
                                  probability=metric.endswith('_rate'), target=target,
                                  prior_n=prior_n, nonnegative=metric!='deck_size_scaling')
    raw, parent = component(estimate, detail, 'raw'), component(estimate, detail, 'direction')
    # Missing direction means no valid shrinkage estimate, while an unshrunk
    # regression/simulation can still be exposed separately by the caller.
    final = estimate if parent['value'] is not None else unknown('所属方向整体值缺失；不假设先验')
    row = dict(basis=basis, target=None if target=='overall' else target, metric=metric,
               raw=raw, direction=parent, estimate=final,
               combo_weight=detail['weight'] if raw['value'] is not None and parent['value'] is not None else None,
               method=estimate['method'], labels=[x for x in [detail.get('reason'),
                    'A10_extrapolation' if detail.get('extrapolated') else None,
                    'unknown_ascension_excluded_from_regression' if detail.get('excluded_ascension_runs') else None] if x])
    return row, estimate, detail


def finalize(outputs, runs, directions, simulated=None, prior_n=10):
    """Pool all history. Keep raw counts, observations and uncertainty distinct."""
    simulated = simulated or {'rows': []}
    for attempt in ('first', 'including_sl'):
        audit = {o['id']: next(a for a in o['audit'] if a.get('attempt')==attempt and 'normalization_rows' in a) for o in outputs}
        rows = [r for a in audit.values() for r in a['normalization_rows']]
        sim_rows = []
        allowed = {(c['combo'], c['run_id'], c['target'], c['entry']['sha256']) for a in audit.values() for c in a['simulation_cases']}
        for case in simulated['rows']:
            if (case['combo'],case['run_id'],case['target'],case['entry']['sha256']) not in allowed:
                continue
            for metric, value in (case.get('values') or {}).items():
                if numeric(value):
                    sim_rows.append(dict(combo=case['combo'], direction=directions.get(case['combo']), run_id=case['run_id'],
                                         target=case['target'], metric=metric, value=value, evidence=case['evidence']))
        for out in outputs:
            cid = out['id']; direction = directions.get(cid)
            m = next(m for m in out['metrics'] if m['attempt']==attempt)
            a = audit[cid]
            group = defaultdict(list)
            for run in runs:
                asc = run.get('ascension')
                if not isinstance(asc,int) or isinstance(asc,bool) or not 0 <= asc <= 100:
                    asc = None
                group[(run.get('version') or None,asc)].append(run['run_id'])

            def counts(ids):
                ids = set(ids)
                result = dict(runs=len(ids), bosses={})
                for name in COUNTS:
                    values = [s['value'] for s in a['raw_samples'].get(name,[]) if s['evidence']['run_id'] in ids]
                    result[name] = int(sum(values)) if values else None
                for target in m['bosses']:
                    raw = a['raw_boss_samples'].get(target,{})
                    result['bosses'][target] = {name:int(sum(s['value'] for s in raw.get(name,[]) if s['evidence']['run_id'] in ids)) for name in ('reached','won')}
                return result

            m['sources'] = [dict(version=v,ascension=asc,run_ids=ids,counts=counts(ids)) for (v,asc),ids in sorted(group.items(),key=lambda x:str(x[0]))]
            m['raw_counts'] = counts([r['run_id'] for r in runs])
            for name in COUNTS:
                values = [s['counts'][name] for s in m['sources']]
                m['raw_counts'][name] = None if any(v is None for v in values) else sum(values)
            m.update(target_ascension=10, simulation=[], regression=[], shrinkage=[])
            for metric in m['observed']:
                if metric in COUNTS or metric in ('deck_size_min','deck_size_max','peak_turn_damage'):
                    continue  # Descriptive raw counts/extrema never get a prior.
                subset = [r for r in rows if r['metric']==metric]
                s, _, _ = shrink(subset,cid,direction,'regression' if metric=='hp_loss_per_turn' else 'observed',metric,prior_n=prior_n)
                # Reuse the same arithmetic engine; label observed data accurately.
                s['method'] = ('A10实战回归；' if metric=='hp_loss_per_turn' else '实战能力；')+s['method']
                m['shrinkage'].append(s)
            targets = sorted(m['bosses'])
            for target in targets:
                regression = dict(target=target,ascension_offset={},method='所有版本和进阶合并，组合/目标固定截距+各指标统一进阶偏移，折算A10；观察性OLS非因果，按独立局cluster bootstrap',labels=['linear_probability_for_win_rate'])
                for metric in OUTCOMES:
                    subset = [r for r in rows if r['metric']==metric]
                    s, estimate, detail = shrink(subset,cid,direction,'regression',metric,target,prior_n)
                    m['shrinkage'].append(s)
                    regression[metric] = component(estimate,detail,'raw')
                    slope = detail.get('offset')
                    offset = unknown(estimate['unknown_reason'] or '统一进阶偏移不可识别','independent_run_per_ascension')
                    if slope is not None:
                        usable = unique_runs([r for r in subset if isinstance(r.get('ascension'),int) and not isinstance(r['ascension'],bool) and 0 <= r['ascension'] <= 100])
                        offset.update(n=len(usable),value=slope,se=detail.get('offset_se'), evidence=[r['evidence'] for r in usable],small_sample=len(usable)<10,unknown_reason=None,method=regression['method'])
                    regression['ascension_offset'][metric] = offset
                    regression['labels'].extend(s['labels'])
                regression['labels'] = list(dict.fromkeys(regression['labels']))
                m['regression'].append(regression)
                cases = [c for c in simulated['rows'] if c['combo']==cid and c['target']==target and
                         (cid,c['run_id'],target,c['entry']['sha256']) in allowed]
                hp = sorted({c['entry_hp'] for c in cases if numeric(c.get('entry_hp'))})
                # Historical max HP differs. Report one explicit standard per
                # target only if it is common; otherwise the row declares unknown.
                sim = dict(target=target,entry_hp=hp[0] if len(hp)==1 else None,trust='unknown',labels=['common_entry_hp_min_observed_max_hp','A10_exact_opening','independent_historical_runs'])
                for metric in (*OUTCOMES,'dpr'):
                    subset = [r for r in sim_rows if r['metric']==metric] if len(hp)==1 else []
                    s, estimate, detail = shrink(subset,cid,direction,'simulation',metric,target,prior_n)
                    m['shrinkage'].append(s)
                    sim[metric] = component(estimate,detail,'raw')
                    if sim[metric]['value'] is None:
                        sim[metric]['unknown_reason'] = ('共同入口HP不唯一；不能合并不同入口的模拟' if len(hp)>1 else
                            '；'.join(sorted({c.get('unknown_reason') for c in cases if c.get('unknown_reason')})) or '未运行模拟或缺历史入口/精确A10静态数据；不能假设结果')
                if len(hp)>1:
                    sim['labels'].append('entry_hp_varies_see_audit')
                m['simulation'].append(sim)
            a['simulation_results'] = [c for c in simulated['rows'] if c['combo']==cid and
                                     (cid,c['run_id'],c['target'],c['entry']['sha256']) in allowed]
