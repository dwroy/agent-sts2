"""Freeze the repaired object's completed tuning cache; do not fabricate validation or a trust release."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

sys.dont_write_bytecode=True
OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
OLD=WORK/'experiments/boss-sim/silent/995fbdbd421116fc5aff5c375c35623cb939dcdb1f72a5877b6c03b8e91f3a7b'
sys.path.insert(0,str(WORK/'agent/tools/boss-sim'))
from silent_calibration import select_model, residuals
from calib import turns_of

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def rows(path):return [json.loads(line) for line in path.open() if line.strip()]
def save(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')

def main():
    plan=json.loads((OUT/'new-object-plan.json').read_text());split=json.loads((OLD/'split.json').read_text())
    for path,digest in plan['files'].items():assert sha(OUT/'frozen-model'/path)==digest,path
    baseline=rows(OUT/'new-object-first/results-0.jsonl')
    for shard in range(3):baseline.extend(rows(OUT/f'new-object-tune/results-{shard}.jsonl'))
    expected={(key,start) for key in split['tune'] for start in ['t1','pre']}
    assert len(baseline)==214 and {(r['key'],r['start']) for r in baseline}==expected
    assert all(r['character']=='silent' for r in baseline)
    patched=rows(OUT/'repaired-key/results-0.jsonl');affected=set(json.loads((OUT/'repair-affected-keys.json').read_text()))
    assert len(patched)==2 and {(r['key'],r['start']) for r in patched}=={(k,s) for k in affected for s in ['t1','pre']}
    lookup={(r['key'],r['start']):r for r in baseline};lookup.update({(r['key'],r['start']):r for r in patched})
    ordering={r['key']:i for i,r in enumerate(rows(OLD/'fights.jsonl'))}
    results=sorted(lookup.values(),key=lambda r:(ordering[r['key']],r['start']!='t1'))
    assert all(r['sim']['samples']==200 for r in results if r.get('sim'))
    files=dict(plan['files']);changed=['agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts','agent/src/reflex/silent-boss-weak.ts']
    for path in changed:files[path]=sha(WORK/path)
    model_sha=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
    identity=hashlib.sha256(json.dumps({'model_sha256':model_sha,'dataset_sha256':sha(OLD/'fights.jsonl'),'split_sha256':sha(OLD/'split.json'),'samples':200,'seed':1},sort_keys=True).encode()).hexdigest()
    archive=WORK/'experiments/boss-sim/silent'/identity
    assert not archive.exists(),'Do not overwrite an existing fingerprint directory'
    archive.mkdir(parents=True)
    for name,content in [('baseline-tuning-results.jsonl',baseline),('tuning-results.jsonl',results)]:
        (archive/name).write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in content))
    shutil.copyfile(OLD/'split.json',archive/'split.json');shutil.copyfile(OLD/'turns.jsonl',archive/'turns-original.jsonl')
    turns=turns_of(str(OLD/'turns.jsonl'));fit={}
    for start in ['t1','pre']:
        valid=[r for r in results if r['start']==start and r.get('sim')]
        model,selection=select_model(valid,turns)
        fit[start]={'candidate_tuning_keys':107,'successful':len(valid),'platt':model,'selection':selection,'tuning_residuals':residuals(valid,model,turns) if model else None,'validation_used':False}
    save(archive/'tuning-fit.json',fit)
    provenance={'request_id':'roy-20261017-human-pace-h0','revision':1,'model_sha256':model_sha,'input_files':files,'simulator_base':plan['source_commit'],'baseline_source_commit':plan['source_commit'],'source_base_commit':'54e36d0830ab640130557b62a078b25954912ff4','source_composition':'Frozen live source closure and individual frozen data leaves, with the three listed repaired source leaves overlaid from source-repair/. simulator_base is the base, not an unpatched tree claim. Not an atomic past runtime tree. Actual overlay/published commits are recorded separately.','changed_source_files':changed,'samples':200,'seed':1,'row_seed_rule':'1+original full 588-row index*101','dataset_reference':{'path':str((OLD/'fights.jsonl').relative_to(WORK)),'sha256':sha(OLD/'fights.jsonl'),'git_blob':'b414e4c2aa7f099d8e663244630e23733e581868'},'split_sha256':sha(OLD/'split.json'),'cutoff_ts':split['cutoff_ts'],'tune_n':107,'val_n':481,'start_points':{'B2':'t1','B3':'pre'},'repair_scope':'Already-active Weak, Silent A2, active Paper Krane Amalgam, six observed move/Strength/Vulnerable contexts only. New Weak during a line, A10 and other conditions unchanged.','reuse':'212 unaffected rows come from the freshly computed production-source baseline; two affected A2 rows replaced by the repaired-object computation. No validation predictions reused from old 7e1193.','validation_pending':split['val'],'criteria':{'min_fights':10,'brier_ratio':1.25,'max_gap':.15,'leak_range':[.7,1.3]},'leak_method':'Original turns data and original assay retained; 17 diagnostic endpoint-timing discrepancies recorded separately, no relabeling to pass gates.','status':'tuning-cache-complete-validation-pending','H1_partial_budget_applicability':'not validated','F49_joint_probability':'unknown'}
    save(archive/'model-provenance.json',provenance)
    (archive/'source-repair').mkdir()
    for path in changed:shutil.copyfile(WORK/path,archive/'source-repair'/Path(path).name)
    for name in ['repair-reuse-certificate.json','repair-probe-output.json','counts-correction.json','diagnosis.json','repair-source-manifest.json']:
        shutil.copyfile(OUT/name,archive/name)
    errors=[{'key':r['key'],'start':r['start'],'error':r.get('error') or r.get('simError')} for r in results if not r.get('sim')]
    receipt={'request_id':provenance['request_id'],'revision':1,'status':provenance['status'],'artifact':identity,'model_sha256':model_sha,'tuning_rows':len(results),'successful_by_start':{s:fit[s]['successful'] for s in fit},'errors':errors,'validation_rows_computed':0,'validation_keys_pending':481,'trust_artifact_generated':False,'files_sha256':{str(p.relative_to(archive)):sha(p) for p in archive.rglob('*') if p.is_file()}}
    save(archive/'phase1-completed.json',receipt)
    save(OUT/'tuning-cache.json',{'archive':str(archive),'artifact':identity,'model_sha256':model_sha,'receipt_sha256':sha(archive/'phase1-completed.json'),'fit_sha256':sha(archive/'tuning-fit.json'),'results_sha256':sha(archive/'tuning-results.jsonl'),'successful_by_start':receipt['successful_by_start'],'errors':errors,'validation_pending':481})
    print(json.dumps({'archive':str(archive),'model_sha256':model_sha,'successful':receipt['successful_by_start'],'errors':errors,'validation_pending':481}))

if __name__=='__main__':main()
