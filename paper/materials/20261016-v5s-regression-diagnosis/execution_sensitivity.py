#!/usr/bin/env python3
"""Exclude predictions whose initial requested line differed from the Jev answer; no trajectory is invented."""
import csv
import gzip
import json
from analyze import BASE, csvout, score


def main():
    rows=list(csv.DictReader((BASE/'bosses.csv').open()))
    audit={}
    with gzip.open(BASE/'inputs/selection-fields-supplement.jsonl.gz','rt') as stream:
        for r in map(json.loads,stream):audit[r['source_off']]=r
    aligned=[]
    for r in rows:
        prediction=json.loads(r['t1_prediction'])
        if not prediction:continue
        source=prediction['source_off'];a=(audit[source].get('selection_audit') or {})
        answer=a.get('answer') or {};requested=a.get('after_sl') or {}
        same=answer.get('line') is not None and answer.get('line')==requested.get('line')
        aligned.append({'cohort':r['cohort'],'run_id':r['run_id'],'floor':r['floor'],'source_off':source,
            'Jev_answer_equals_initial_requested_line':same,'p_chosen':float(r['p_chosen']) if r['p_chosen'] else None,
            'first_completed_win':int(r['first_completed_win']),'low_trust':r['low_trust']=='True'})
    csvout('prediction-execution-alignment.csv',aligned)
    result={'scope':'Initial requested-line identity only, not full turn execution; downstream actual play differs from simulator policy.',
        'matched_T1':len(aligned),'same_initial_requested_line':sum(r['Jev_answer_equals_initial_requested_line'] for r in aligned),
        'changed_initial_requested_line':sum(not r['Jev_answer_equals_initial_requested_line'] for r in aligned),'cohorts':{}}
    for group in ('pre','post'):
        good=[r for r in aligned if r['cohort']==group and r['Jev_answer_equals_initial_requested_line']]
        result['cohorts'][group]={'all':score(good),'trusted':score([r for r in good if not r['low_trust']]),
            'excluded_changed':sum(r['cohort']==group and not r['Jev_answer_equals_initial_requested_line'] for r in aligned)}
    (BASE/'execution-sensitivity.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))


if __name__=='__main__':main()
