#!/usr/bin/env python3
"""Describe decision categories, conditional exposure and fight-level associations from frozen records."""
import bisect
import collections as C
import csv
import gzip
import hashlib
import json
from pathlib import Path
import statistics as S

from analyze import BASE, ROOT, csvout, dist, load, obj, ratio, stamp


def table(name):
    return list(csv.DictReader((BASE / name).open()))


def main():
    choices = {int(r['source_off']): r for r in table('P1-choices.csv')}
    frames = C.defaultdict(list)
    for r in load('frames'):
        frames[(r['run_id'], r.get('floor'))].append(r)
    times = {}
    for key, rows in frames.items():
        rows.sort(key=lambda r: stamp(r.get('observed_ts') or r['ts']))
        times[key] = [stamp(r.get('observed_ts') or r['ts']) for r in rows]
    p2, saturation, matched_flags, execution_supplements = [], [], C.Counter(), []
    supplement = BASE / 'inputs/selection-fields-supplement.jsonl.gz'
    cached = {}
    if supplement.exists():
        with gzip.open(supplement, 'rt') as stream:
            cached = {r['source_off']: r for r in map(json.loads, stream)}
    skipped = C.Counter()
    # Only the newly needed top-level execution fields are read again, not game frames or simulations.
    with (ROOT / 'logs/decisions.jsonl').open('rb') as raw_stream:
        for d in load('decisions'):
            off = d['_source']['off']
            rid, floor = d['run_id'], d.get('floor')
            if off in choices:
                c = choices[off]
                choice = c['choice']
                criteria = obj(obj(obj(d.get('questions')).get('pick')).get('criteria'))
                selected = criteria.get(choice)
                if isinstance(selected, str):
                    try: selected = json.loads(selected)
                    except ValueError: selected = {}
                selected = obj(selected)
                kind = selected.get('kind') if d['label'] == 'rest/plan' else 'SKIP' if choice == 'skip' else 'TAKE_CARD' if choice.startswith('card') else 'UNKNOWN'
                c['choice_kind'] = kind or 'UNKNOWN'
                c['selected_option'] = selected.get('option')
                key = (rid, floor)
                rows = frames[key]
                at = stamp(d.get('observed_ts') or d['ts'])
                index = bisect.bisect_right(times[key], at) - 1
                frame = rows[index] if index >= 0 else None
                known_hp = obj(d.get('fingerprint_metadata')).get('hp')
                valid = frame is not None and abs(stamp(frame.get('observed_ts') or frame['ts']) - at) <= 10
                if valid and known_hp is not None:
                    valid = frame['hp'] == known_hp
                if valid:
                    c['hp'] = frame['hp']; c['max_hp'] = frame['max_hp']
                    c['hp_fraction'] = frame['hp'] / frame['max_hp'] if frame['max_hp'] else None
                    c['hp_frame_off'] = frame['off']
                else:
                    c['hp_fraction'] = None; c['hp_frame_off'] = None
                c['act_by_cutoff'] = 1 if floor <= 17 else 2 if floor <= 33 else 3
            sim = obj(d.get('boss_sim')); rank = obj(sim.get('build_ranking'))
            if rank.get('status') == 'produced':
                selection = obj(rank.get('selection'))
                p2.append({'run_id':rid,'floor':floor,'label':d['label'],'mode':rank.get('mode'), 'deviated':selection.get('deviated'),
                    'target_pending':selection.get('target_pending'),'simulated_candidate_count':len(rank.get('candidates') or []),
                    'win_saturated':rank.get('win_saturated'), 'reason':selection.get('ranking_override_reason'),
                    'low_trust':rank.get('low_trust'), 'source_off':off})
            if d.get('decider') == 'jev' and d.get('label','').startswith('combat/plan-choice'):
                if off in cached:
                    original = cached[off]
                    assert original['source_sha256'] == d['_source']['sha256']
                else:
                    raw_stream.seek(off); raw = raw_stream.read(d['_source']['len'])
                    assert hashlib.sha256(raw).hexdigest() == d['_source']['sha256']
                    original = json.loads(raw)
                roll=obj(d.get('rollout')); best=roll.get('best'); answer=obj(obj(d.get('answers')).get('plan')).get('choice')
                inferred = answer in (roll.get('tied') or [best]) if answer is not None and best is not None else None
                stored=original.get('rollout_best_chosen')
                matched_flags['stored_present'] += type(stored) is bool
                matched_flags['rederived_comparable'] += type(stored) is bool and type(inferred) is bool
                matched_flags['stored_equal_rederived'] += type(stored) is bool and type(inferred) is bool and stored == inferred
                execution_supplements.append({'source_off':off,'source_sha256':d['_source']['sha256'],'run_id':rid,'floor':floor,
                    'rollout_best_chosen':stored,'sl_explore':original.get('sl_explore'),'selection_audit':original.get('selection_audit')})
    csvout('P1-choice-categories.csv', list(choices.values()))
    with (BASE / 'inputs/selection-fields-supplement.jsonl.gz').open('wb') as raw, gzip.GzipFile(fileobj=raw,mode='wb',mtime=0) as stream:
        for r in execution_supplements: stream.write((json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n').encode())
    p1=[]
    for label in ('rest/plan','reward/card'):
        for group in ('pre','post'):
            for delivery in ('all','True','False'):
                selected=[r for r in choices.values() if r['label']==label and r['cohort']==group and (delivery=='all' or r['P1_delivered_to_accepted_brain']==delivery)]
                for bucket in ('all','hp<0.5','0.5<=hp<0.8','hp>=0.8'):
                    def in_bucket(r):
                        x=r.get('hp_fraction')
                        return bucket=='all' or x is not None and (x<.5 if bucket=='hp<0.5' else .5<=x<.8 if bucket=='0.5<=hp<0.8' else x>=.8)
                    rows=[r for r in selected if in_bucket(r)]
                    p1.append({'label':label,'cohort':group,'P1_delivery':delivery,'hp_bucket':bucket,'n':len(rows),
                        'choice_kinds':dict(C.Counter(r['choice_kind'] for r in rows)),'hp_fraction':dist([r['hp_fraction'] for r in rows]),
                        'unknown_hp':sum(r['hp_fraction'] is None for r in rows),'act_counts':dict(C.Counter(r['act_by_cutoff'] for r in rows)),
                        'independent_runs':len({r['run_id'] for r in rows})})
    pp=[]
    for mode in ('shadow','on'):
        for label in ('all','rest/plan','reward/card','shop/open','event/choose'):
            for multi in ('all','multiple_simulated'):
                rows=[r for r in p2 if r['mode']==mode and (label=='all' or r['label']==label) and (multi=='all' or r['simulated_candidate_count']>=2)]
                valid=[r for r in rows if type(r['deviated']) is bool]
                pp.append({'mode':mode,'label':label,'scope':multi,'rows':len(rows),'independent_runs':len({r['run_id'] for r in rows}),
                    'in_best_group':ratio(sum(not r['deviated'] for r in valid),len(valid)),
                    'saturated':sum(r['win_saturated'] is True for r in rows),
                    'unresolved_or_target_pending':len(rows)-len(valid),
                    'override_reasons_present':sum(r['deviated'] is True and bool(r['reason']) for r in rows)})
    bosses=table('bosses.csv');j=table('jev.csv'); jf=[]
    for f in bosses:
        rows=[r for r in j if r['run_id']==f['run_id'] and r['floor']==f['floor'] and r['first_attempt']=='True']
        if not rows:continue
        first=min(rows,key=lambda r:float(r['source_off']))
        jf.append({'cohort':f['cohort'],'run_id':f['run_id'],'floor':f['floor'],'encounter':f['encounter'],
            'any_first_attempt_deviation':any(r['exact_best']!='True' for r in rows),
            'first_question_deviation':first['exact_best']!='True','questions':len(rows),
            'first_result':f['first_result'],'first_completed_win':f['first_completed_win'], 'final_outcome':f['final_outcome']})
    ja=[]
    for group in ('pre','post'):
        for field in ('any_first_attempt_deviation','first_question_deviation'):
            for val in (False,True):
                rows=[r for r in jf if r['cohort']==group and r[field] is val]
                first=[r for r in rows if r['first_completed_win']!='']
                ja.append({'cohort':group,'comparison':field,'deviated':val,'boss_fights':len(rows),
                    'first_completion':ratio(sum(r['first_completed_win']=='1' for r in first),len(first)),
                    'final_outcome':ratio(sum(r['final_outcome']=='won' for r in rows),len(rows))})
    csvout('jev-fight-associations.csv',jf)
    # A next Boss's entry state is descriptive; no unobserved alternate policy is invented.
    transition=[]
    for second in bosses:
        if second['floor']!='49':continue
        first=next((r for r in bosses if r['run_id']==second['run_id'] and r['floor']=='48'),None)
        transition.append({'cohort':second['cohort'],'run_id':second['run_id'],
            'F48_entry_hp':first['entry_hp'] if first else None,'F49_entry_hp':second['entry_hp'],'F49_deck_size':second['deck_size'],
            'F49_final_outcome':second['final_outcome'],'F49_encounter':second['encounter'],'F49_max_hp':second['max_hp']})
    csvout('F48-F49-transition.csv',transition)
    # Trust changes are compared both by question and once per Boss start.
    epochs=('pre','P1P3_before_R362','R362_before_R366','R366_before_R369','R369+')
    onset=[]
    for epoch in epochs:
        rows=[r for r in bosses if r['epoch']==epoch and r['p_chosen']!='']
        onset.append({'epoch':epoch,'observed_T1_bosses':len(rows),'low_trust':sum(r['low_trust']=='True' for r in rows),
                      'low_trust_rate':sum(r['low_trust']=='True' for r in rows)/len(rows) if rows else None})
    c1=table('C1.csv'); c2=table('C2.csv')
    c1groups=[]
    for key in sorted({(r['run_id'],r['floor'],r['lane']) for r in c1 if r['status']=='degraded'}):
        rr=[r for r in c1 if (r['run_id'],r['floor'],r['lane'])==key and r['status']=='degraded']
        c1groups.append({'run_id':key[0],'floor':key[1],'lane':key[2],'degraded_attempt_ids':len(rr),
            'unique_input_keys':len({r['key'] for r in rr}),'below300_or_no_number':sum(not r['samples'] or float(r['samples'])<300 for r in rr),
            'explicit_resource_contract_errors':sum('nonpositive-hp' in r['error'] for r in rr)})
    rejected=[r for r in load('brains') if r.get('accepted') is not True and 'ranking_override_reason' in json.dumps(r.get('problems'))]
    result={'P1_choice_distributions':p1,'P2_distribution':pp,'jev_first_attempt_fight_associations':ja,
        'jev_stored_flag_validation':dict(matched_flags),'boss_onset_low_trust':onset,'C1_groups':c1groups,
        'P2_rejections_for_reason_contract':len(rejected),'P2_reason_rejection_refs':[r['_source'] for r in rejected],
        'C2_by_lane':{lane:{'on_computations':sum(r['mode']=='on' and r['lane']==lane for r in c2),
            'on_questions_with_elimination':sum(r['mode']=='on' and r['lane']==lane and int(r['eliminated_candidates'])>0 for r in c2),
            'eliminated_candidate_prefixes':sum(int(r['eliminated_candidates']) for r in c2 if r['mode']=='on' and r['lane']==lane)} for lane in ('b2','b3')},
        'matching_limits':'P1 delivery joined by exact run/label/answer reason and <=600s; 1053/1053 matched. HP uses frozen nearest prior same-floor observation within10s with matching logged HP; otherwise unknown. Choice kind comes from original offered criteria, never o0/o1 index assumptions.',
        'association_limits':'Question counts correlate within turns/fights/runs. Deviations may follow difficulty, HP guards and SL exploration; these are not causal estimates.'}
    (BASE/'details.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'choices':len(choices),'jev_stored_flag_validation':dict(matched_flags),'P2_reason_rejections':len(rejected),'C1_groups':c1groups},ensure_ascii=False))


if __name__=='__main__':main()
