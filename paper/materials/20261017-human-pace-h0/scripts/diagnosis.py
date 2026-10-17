"""Compile per-boss diagnostics from existing frozen tables and original byte-source evidence."""
import collections
import hashlib
import json
from pathlib import Path

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
FROZEN=WORK/'paper/materials/20261017-human-pace-h0/inputs-r1'
OLD=WORK/'experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b'

def main():
    trust=json.loads((FROZEN/'live-boss-trust.json').read_text())
    old=[json.loads(l) for l in (OLD/'fights.jsonl').open()];val=set(trust['split']['val'])
    attempts=[json.loads(l) for l in (OUT/'all-target-attempts-summary.jsonl').open()]
    choices=json.loads((OUT/'selected-fights.json').read_text())
    windows=json.loads((OUT/'end-turn-windows.json').read_text())
    replay=json.loads((OUT/'window-replay-merged.json').read_text())
    static=json.loads((OUT/'table-audit-merged.json').read_text())
    rows=[]
    for boss in ['TEST_SUBJECT','AEONGLASS','QUEEN','KAISER_CRAB','KNOWLEDGE_DEMON','THE_INSATIABLE']:
        def match(enc):return enc==boss or boss=='QUEEN' and 'QUEEN' in enc or boss=='KAISER_CRAB' and 'CRUSHER' in enc
        scope=[r for r in old if r['key'] in val and match(r['encounter'])]
        mine=[r for r in attempts if r['boss']==boss];ws=[r for r in windows if r['boss']==boss];rs=[r for r in replay if r['boss']==boss]
        raw=[r for r in static if r['boss']==boss];rv=[r for r in rs if r['status']=='replayed'];diff=[r for r in rv if r['net_loss_error']!=0]
        counts={start:{'candidate_independent_runs':len({r['run_id'] for r in scope}),'effective_n':trust['bosses'][boss][start]['n'],'independent_quantity_missing':max(0,10-len({r['run_id'] for r in scope})),'quality_missing_count':'unknown; more data alone does not repair a failed quality gate','original_metrics':trust['bosses'][boss][start],'after_repair_validation':None} for start in ['t1','pre']}
        rows.append({'boss':boss,'frozen_old_gates':counts,'all_ended_silent_evidence':{'attempts':len(mine),'independent_runs':len({r['run'] for r in mine}),'outcomes':dict(collections.Counter(r['outcome'] for r in mine)),'first_attempt_outcomes':dict(collections.Counter(r['outcome'] for r in mine if r['attempt']==1)),'retry_outcomes':dict(collections.Counter(r['outcome'] for r in mine if r['attempt'] and r['attempt']>1))},
          'diagnostic_selection':[r for r in choices if r['boss']==boss],'end_turn_windows':len(ws),'replayed_windows':len(rv),'unavailable':len(rs)-len(rv),'net_hp_matches':sum(r['net_loss_error']==0 for r in rv),'first_same_window_net_divergence':min(diff,key=lambda r:r['pre']['offset']) if diff else None,
          'late_old_endpoint_windows':[{k:w[k] for k in ['key','turn','pre','next','old_last','net_window_loss','old_leak']} for w in ws if w['old_leak']!=w['net_window_loss']],
          'static_per_hit_audit':{'enemy_frames':len(raw),'attack_frames':sum(bool(r['actual']) for r in raw),'per_hit_mismatches':sum(r['first_hit_matches'] is False for r in raw),'scope':'Base/shown per-hit diagnostic only; not a hit-count, targeting, phase, facing, or full-policy equivalence claim.'},
          'repair':'Silent A2 Paper Krane Amalgam only; nine frozen intent endpoints / one tuning run' if boss=='QUEEN' else None,
          'remaining_gap':'Longer same-action trajectories and the original fixed-split validation of the repaired new source object remain untested. A10, F49/joint and H1 partial-budget reliability not established; no label/gate/coefficient changes.'})
    bounds=json.loads((FROZEN/'model-input-boundaries.json').read_text())
    result={'request_id':'roy-20261017-human-pace-h0','revision':1,'input_sha256':'982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54','frozen_manifest_sha256':'7bdcf916f6ff77e5ff1d88a58662a51a9b97aac4db380552470d2e66105cdb84','original_fixed_object':{'simulator_base':trust['source']['simulator_base'],'model_sha256':trust['source']['model_sha256'],'tune_n':107,'val_n':481,'artifact':trust['refresh']['artifact'],'prior_R366':'107/460, 70 production-input differences: separate historical object, not replaced or rerun'},
      'production_boundaries':[{k:v for k,v in r.items() if k in ['checkout','head','head_tree','per_leaf_observation','atomic_full_runtime_tree_claim']}|{'inherited_leaves':len(r['files']),'changed_in_inherited_leaves':sum(not f['matches_previous_calibration'] for f in r['files'])} for r in bounds],
      'additional_derived_source_imports':65,'criteria':trust['criteria'],'bosses':rows,'old_ascension_residuals':trust['residuals'],'old_F49_metrics':trust['stage_metrics'],'old_F49_low':trust['stage_low'],'new_validation_status':'not started in this phase; no after metrics or new trusted list published','corrected_window_totals':{'windows':len(windows),'replayed':sum(r['status']=='replayed' for r in replay),'unavailable':sum(r['status']=='unavailable' for r in replay),'net_hp_matches':sum(r.get('net_loss_error')==0 for r in replay)},'counts_correction':'counts-correction.json retains the erroneous initial manual totals and original source hashes; all totals here derive directly from original files.'}
    (OUT/'diagnosis.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'bosses':len(rows),'window_totals':result['corrected_window_totals'],'source_differences':[(r['checkout'],r['changed_in_inherited_leaves']) for r in result['production_boundaries']]}))

if __name__=='__main__':main()
