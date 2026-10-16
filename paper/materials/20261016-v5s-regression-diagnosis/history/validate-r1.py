#!/usr/bin/env python3
"""Check frozen identity, arithmetic, evidence coverage and reported execution boundaries."""
import collections as C
import csv
import gzip
import hashlib
import json
from pathlib import Path
from analyze import BASE, load, obj


def rows(name):return list(csv.DictReader((BASE/name).open()))


def main():
    freeze=json.loads((BASE/'freeze.json').read_bytes());manifest=json.loads((BASE/'inputs/manifest.json').read_bytes())
    lean=json.loads((BASE/'inputs-lean/manifest.json').read_bytes())
    assert hashlib.sha256((BASE/'freeze.json').read_bytes()).hexdigest()==manifest['freeze_sha256']
    assert hashlib.sha256((BASE/'inputs/manifest.json').read_bytes()).hexdigest()==lean['source_manifest_sha256']
    for r in lean['files']:assert hashlib.sha256((BASE/r['path']).read_bytes()).hexdigest()==r['sha256'],r['path']
    assert len(freeze['pre_runs'])==25 and len(freeze['post_runs'])==24
    assert not(set(freeze['pre_runs'])&set(freeze['post_runs']))
    assert manifest['all_decision_counts_match'] and sum(x['indexed_decisions'] for x in manifest['decision_coverage'].values())==33177
    bosses=rows('bosses.csv');jev={int(r['source_off']):r for r in rows('jev.csv')}
    assert len(bosses)==98 and len({(r['run_id'],r['floor']) for r in bosses})==98
    assert all(r['first_completed_win'] in ('0','1') for r in bosses)
    assert not any(r['first_completed_win']=='1' and r['final_outcome']!='won' for r in bosses)
    for group,expected in [('pre',(52,44,33,11)),('post',(46,33,30,3))]:
        rr=[r for r in bosses if r['cohort']==group]
        actual=(len(rr),sum(r['final_outcome']=='won' for r in rr),sum(r['first_completed_win']=='1' for r in rr),sum(r['first_completed_win']=='0' and r['final_outcome']=='won' for r in rr))
        assert actual==expected,(group,actual)
    flag=C.Counter();audit=C.Counter()
    t1={json.loads(r['t1_prediction']).get('source_off') for r in bosses if r.get('t1_prediction')!='{}'}
    with gzip.open(BASE/'inputs/selection-fields-supplement.jsonl.gz','rt') as stream:
        for r in map(json.loads,stream):
            off=r['source_off']
            if off in jev:
                assert type(r['rollout_best_chosen']) is bool
                assert r['rollout_best_chosen']==(jev[off]['in_best_group']=='True')
                flag['boss_questions_exact_flag_match']+=1
                x=r.get('selection_audit') or {};a=x.get('answer') or {};b=x.get('after_sl') or {}
                if a.get('line') is not None and b.get('line') is not None:
                    audit['comparable_requested_lines']+=1;audit['requested_line_changed_after_resolution']+=a['line']!=b['line']
            if off in t1:
                x=r.get('selection_audit') or {};a=x.get('answer') or {};b=x.get('after_sl') or {}
                audit['T1_prediction_rows']+=1
                audit['T1_answer_and_requested_line_equal']+=a.get('line') is not None and a.get('line')==b.get('line')
    assert flag['boss_questions_exact_flag_match']==2457
    raw_degraded=[]
    for d in load('decisions'):
        c=obj(obj(d.get('boss_sim')).get('completion'))
        if c.get('status')=='degraded':raw_degraded.append(c.get('attempt_id'))
    c1=[r for r in rows('C1.csv') if r['status']=='degraded']
    assert len(set(raw_degraded))==len(c1)==87
    assert len({(r['run_id'],r['key']) for r in c1})==71
    assert all(not r['samples'] or float(r['samples'])<300 for r in c1)
    choices=rows('P1-choice-categories.csv')
    assert len(choices)==1053 and not any(r['choice_kind']=='UNKNOWN' for r in choices)
    assert all(r['hp_frame_off'] for r in choices)
    cal=json.loads((BASE/'calibration-version-data.json').read_bytes());assert cal['all_platt_equal']
    design=json.loads((BASE/'experiment-design.json').read_bytes());assert design['executed'] is False
    assert (BASE/'report.md').exists()
    result={'schema':'v5s-regression-final-validation-v1','rc':0,'frozen_runs':49,'finished_boss_fights':98,
        'all33177_decisions_accounted_for':True,'source_and_lean_SHA_verified':True,'C1_degraded_attempt_ids':87,
        'C1_all_degraded_without_complete_numeric_sample':True,'P1_choice_categories_and_HP_coverage':1053,
        'Jev_boss_flags':dict(flag),'requested_line_audit':dict(audit),
        'limits':'Selection audit compares requested lines, not full executed turn trajectories. All headline scores are descriptive; no causal/production-calibration claim.',
        'experiment_executed':False,'new_game_simulation_or_model_calls':0}
    checks=BASE/'checks';checks.mkdir(exist_ok=True)
    (checks/'final-validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()
