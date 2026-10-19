#!/usr/bin/env python3
"""Recompute combo observations from frozen runtime logs; never publish game knowledge."""
import argparse
import json
from pathlib import Path
from collections import Counter, defaultdict
from combo_metrics import compute_combo, digest, extract, holding


def verified_witnesses(path, combos, logs, limits, run_ids):
    """Verify learner knowledge's concrete witnesses against original bounded bytes.

    Contribution meaning remains the learner's claim, with its definition retained.
    This verifies identity/holding/chronology/cost, not a developer-made card rule.
    """
    data = json.loads(path.read_bytes())
    result = defaultdict(list)
    covered = set()
    with (logs/'states.jsonl').open('rb') as handle:
        def read(ref):
            if Path(ref['path']).resolve() != (logs/'states.jsonl').resolve():
                raise ValueError('activation source must be original states.jsonl')
            off, size = ref['offset'], ref['bytes']
            if not isinstance(off, int) or not isinstance(size, int) or not 0 <= off < off+size <= limits['states.jsonl']:
                raise ValueError('witness exceeds frozen source cut')
            handle.seek(off); raw = handle.read(size)
            if digest(raw) != ref['sha256']:
                raise ValueError('witness SHA mismatch')
            return json.loads(raw)
        for row in data:
            cid, rid = row['combo'], row['run_id']
            if cid not in combos or rid not in run_ids:
                continue
            if (cid, rid) in covered:
                raise ValueError('duplicate combo/run witness coverage')
            covered.add((cid, rid))
            if not isinstance(row.get('activation_witnesses'), list):
                raise ValueError('witness coverage must explicitly list observations')
            for wrapper in row.get('activation_witnesses', []):
                w = wrapper['activation']
                raw = read(w['source']); state = raw['state']
                if (state['run_id'], state['run']['floor'], state['turn'], raw['ts']) != (rid, w['floor'], w['turn'], w['ts']):
                    raise ValueError('activation identity/chronology mismatch')
                if not w.get('definition') or holding(combos[cid]['cards'], state['run'].get('deck')) is not True:
                    raise ValueError('activation definition or contemporaneous holding missing')
                def verify_extra(value):
                    if isinstance(value, dict):
                        if {'path', 'offset', 'bytes', 'sha256'} <= value.keys():
                            source = read(value)
                            if source['state']['run_id'] != rid or source['state']['run']['floor'] != w['floor'] or source['ts'] > w['ts']:
                                raise ValueError('extra witness crosses run/floor or activation')
                        else:
                            for nested in value.values():
                                verify_extra(nested)
                    elif isinstance(value, list):
                        for nested in value:
                            verify_extra(nested)
                verify_extra(w.get('extra', []))
                seen_plays = set()
                for event in w.get('witness', []):
                    identity = (event['before_source']['offset'], event['after_source']['offset'])
                    if identity in seen_plays:
                        raise ValueError('duplicate component play witness')
                    seen_plays.add(identity)
                    before, after = read(event['before_source']), read(event['after_source'])
                    bs, af = before['state'], after['state']
                    if bs['run_id'] != rid or af['run_id'] != rid or bs['run']['floor'] != w['floor'] or af['run']['floor'] != w['floor'] or bs['turn'] != af['turn'] or not before['ts'] <= after['ts'] <= w['ts']:
                        raise ValueError('component witness crosses run/floor/turn or activation')
                    bc, ac = bs['combat'], af['combat']
                    if ac['player'].get('cards_played_this_turn', -10) - bc['player'].get('cards_played_this_turn', 10) != 1:
                        raise ValueError('component play counter is not a single play')
                    def cards(hand):
                        return Counter((c['card_id'], c.get('upgraded')) for c in hand)
                    removed = list((cards(bc['hand'])-cards(ac['hand'])).elements())
                    card = event['card']
                    if removed != [(card['id'], card['upgraded'])]:
                        raise ValueError('ambiguous component card identity')
                    matches = [c for c in bc['hand'] if (c['card_id'], c.get('upgraded')) == removed[0]]
                    if not matches or any(c.get('energy_cost') != card.get('cost') for c in matches):
                        raise ValueError('component cost differs from original observed cost')
                result[cid].append(dict(w, run_id=rid))
    if covered != {(cid, rid) for cid in combos for rid in run_ids}:
        raise ValueError('missing combo/run witness coverage; absence is not an observed negative')
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--logs', type=Path, required=True)
    p.add_argument('--spec', type=Path, required=True, help='build-cores-v1, build-core-v1 or {id,cards}')
    p.add_argument('--character', required=True, choices=['silent', 'ironclad', 'regent', 'defect', 'necrobinder'])
    p.add_argument('--manifest', type=Path, help='optional JSON with log_byte_limits; never read beyond cuts')
    p.add_argument('--run-inventory', type=Path, help='optional frozen per-run states.jsonl byte ranges')
    p.add_argument('--run', action='append', help='restrict to an explicitly listed ended run (repeatable)')
    p.add_argument('--rules', type=Path, help='learner-supplied {combo_id:{activation,required_relics,evidence}}')
    p.add_argument('--witnesses', type=Path, help='learner combo-run-witnesses.json; verify source bytes before use')
    p.add_argument('--coverage', type=Path, help='frozen per-run engine-observed metadata for exact learner version strata')
    p.add_argument('--output', type=Path, required=True, help='scratch/material report only; no automatic publishing')
    args = p.parse_args()
    if 'knowledge' in args.output.resolve().parts and 'characters' in args.output.resolve().parts and 'pending' not in args.output.resolve().parts:
        p.error('formal character knowledge output is forbidden')
    spec_bytes = args.spec.read_bytes()
    spec = json.loads(spec_bytes)
    if spec.get('schema') == 'build-cores-v1':
        if spec.get('character') != args.character:
            p.error('spec character mismatch')
        cores = spec['entries']
    elif spec.get('schema') == 'build-core-v1':
        cores = [spec]
    else:
        cores = []
    if any(c.get('scope', {}).get('character') != args.character for c in cores):
        p.error('core character mismatch')
    combos = [combo for core in cores for combo in core['combos']] if cores else [spec]
    if not combos or len({c['id'] for c in combos}) != len(combos):
        p.error('empty/duplicate combo identities')
    rule_bytes = args.rules.read_bytes() if args.rules else b'{}'
    rules = json.loads(rule_bytes)
    for cid, rule in rules.items():
        if not rule.get('evidence'):
            p.error(f'{cid}: activation/key relic rules need learner evidence')
    if args.manifest:
        manifest_bytes = args.manifest.read_bytes()
        limits = json.loads(manifest_bytes)['log_byte_limits']
    else:
        manifest_bytes = None
        limits = {name: (args.logs/name).stat().st_size for name in
                  ('runs.jsonl', 'states.jsonl', 'sl-attempts.jsonl', 'decisions.jsonl') if (args.logs/name).exists()}
    inventory_bytes = args.run_inventory.read_bytes() if args.run_inventory else None
    inventory = json.loads(inventory_bytes) if inventory_bytes else None
    runs, ranges = extract(args.logs.resolve(), args.character, limits, inventory,
                           set(args.run) if args.run else None)
    if args.coverage:
        if inventory is None:
            p.error('--coverage requires --run-inventory')
        coverage = {r['run_id']: r for r in json.loads(args.coverage.read_bytes())}
        by_id = {r['run_id']: r for r in inventory}
        for run in runs:
            rid = run['run_id']; inv = by_id[rid]
            if rid not in coverage or inv['ascension'] != run.get('ascension') or inv['code'] != run.get('code'):
                p.error('coverage/inventory identity mismatch')
            run['version'] = str(run['code'])+';records='+coverage[rid]['engine_observed']+';accepted='+inv['actual_engine_group']+';config='+','.join(inv['config_commits'])
    witnesses = verified_witnesses(args.witnesses, {c['id']: c for c in combos}, args.logs.resolve(), limits,
                                   {r['run_id'] for r in runs}) if args.witnesses else {}
    outputs = []
    for combo in combos:
        options = dict(rules.get(combo['id'], {}))
        if args.witnesses:
            options.update(witnesses=witnesses.get(combo['id'], []), has_definition=True)
        metrics, audit = compute_combo(combo, runs, options)
        outputs.append(dict(id=combo['id'], metrics=metrics, audit=audit))
    report = dict(schema='combo-metrics-report-v1', character=args.character,
                  inputs=dict(spec_sha256=digest(spec_bytes), rules_sha256=digest(rule_bytes),
                              manifest_sha256=digest(manifest_bytes) if manifest_bytes else None,
                              inventory_sha256=digest(inventory_bytes) if inventory_bytes else None,
                              witnesses_sha256=digest(args.witnesses.read_bytes()) if args.witnesses else None,
                              coverage_sha256=digest(args.coverage.read_bytes()) if args.coverage else None,
                              log_byte_limits=limits, ranges=ranges),
                  ended_runs=[r['run_id'] for r in runs], combos=outputs,
                  unstratified_runs=[dict(run_id=r['run_id'], reason='原始runs.ascension缺失或不是整数，不能猜测进阶分层') for r in runs if not isinstance(r.get('ascension'), int) or isinstance(r.get('ascension'), bool)],
                  limitations=['只含已结束且角色匹配的日志；缺失观察保留null/n=0及原因，不补零。',
                               'first为日志可见首条路径，在首个已记录判死/重载处截尾；未记录SL无法排除。',
                               '版本默认按runs.code原始标签分层；给出coverage/inventory时按学习者code/记录引擎/accepted/config复合标签。短SHA/dirty不能恢复成精确构建身份。',
                               '持有与激活分开；激活仅执行学习者提供的有证据条件，代码不内置游戏知识。',
                               '独立局先聚合，DPR局内均值→局间中位；中位数SE=400次固定种子20261019bootstrap，n<3未知；small_sample阈值10局。',
                               '敌人HP减少/正格挡增量/无可见回血的HP首尾差为可见量，不是事件级总伤害/总格挡/组合因果贡献。',
                               '终结回合无下一回合完整边界，伤害统计排除；启动能量仅为贡献施放的现场费用，不是全程消耗；抽牌缺计数未知。',
                               '多敌回合总HP减少不冒充群体效果；规模斜率仅同局同类观察相关，未控敌人/层/资源；无规模变化或资源反事实时相应指标未知，原始记录在audit。',
                               'simulation为空：本生成器不运行或混入模拟，已有模拟条目需另行按来源保留。'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False)+'\n')
    print(json.dumps({'output': str(args.output), 'runs': len(runs), 'combos': len(outputs)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
