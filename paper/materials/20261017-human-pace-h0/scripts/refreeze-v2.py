"""Retain the first cache and reuse its numerics after an exact pure-function relocation."""
import hashlib
import json
from pathlib import Path
import shutil

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')

old=json.loads((OUT/'tuning-cache.json').read_text());previous=Path(old['archive'])
prov=json.loads((previous/'model-provenance.json').read_text())
proof=json.loads((OUT/'source-boundary-v2-equivalence.json').read_text())
assert proof['pure_helper_text_identical']
for a,b in [('repair-probe-output.json','repair-probe-v2-output.json'),('adapter-probe-v3-output.json','adapter-probe-v4-output.json')]:
    assert json.loads((OUT/a).read_text())==json.loads((OUT/b).read_text())
files=dict(prov['input_files']);del files['agent/src/reflex/silent-boss-weak.ts']
changed=['agent/src/reflex/rollout.ts','agent/src/reflex/rollout-live.ts']
for p in changed:files[p]=sha(WORK/p)
model=hashlib.sha256(json.dumps(files,sort_keys=True).encode()).hexdigest()
identity=hashlib.sha256(json.dumps({'model_sha256':model,'dataset_sha256':prov['dataset_reference']['sha256'],'split_sha256':prov['split_sha256'],'samples':200,'seed':1},sort_keys=True).encode()).hexdigest()
archive=WORK/'experiments/boss-sim/silent'/identity
assert not archive.exists();archive.mkdir()
for n in ['baseline-tuning-results.jsonl','tuning-results.jsonl','split.json','turns-original.jsonl','tuning-fit.json','repair-reuse-certificate.json','counts-correction.json','diagnosis.json']:
    shutil.copyfile(previous/n,archive/n)
for n in ['source-boundary-v2-equivalence.json','repair-probe-v2-output.json','adapter-probe-v4-output.json']:
    shutil.copyfile(OUT/n,archive/n)
(archive/'source-repair').mkdir()
for p in changed:shutil.copyfile(WORK/p,archive/'source-repair'/Path(p).name)
prov.update(model_sha256=model,input_files=files,changed_source_files=changed,source_composition=prov['source_composition'].replace('three listed','two listed'),numerical_reuse={'previous_artifact':old['artifact'],'previous_model_sha256':old['model_sha256'],'results_sha256':old['results_sha256'],'fit_sha256':old['fit_sha256'],'reason':'Exact pure-function text relocated into its existing live adapter; call site, arithmetic, move data, RNG and full 200-sample seed schedule unchanged. Nine observed-intent outputs and all eight isolation groups plus actual B2/B3 construction exactly equal. This is not a partial-budget timing equivalence claim.','proof':'source-boundary-v2-equivalence.json','validation_predictions_reused':0})
save(archive/'model-provenance.json',prov)
receipt=json.loads((previous/'phase1-completed.json').read_text());receipt.update(artifact=identity,model_sha256=model,numerical_reuse_from=old['artifact'],files_sha256={str(p.relative_to(archive)):sha(p) for p in archive.rglob('*') if p.is_file()})
save(archive/'phase1-completed.json',receipt)
descriptor={**old,'archive':str(archive),'artifact':identity,'model_sha256':model,'receipt_sha256':sha(archive/'phase1-completed.json'),'fit_sha256':sha(archive/'tuning-fit.json'),'results_sha256':sha(archive/'tuning-results.jsonl'),'previous_preserved_artifact':old['artifact']}
assert descriptor['fit_sha256']==old['fit_sha256'] and descriptor['results_sha256']==old['results_sha256']
save(OUT/'tuning-cache-v2.json',descriptor)
save(OUT/'repair-source-manifest-v2.json',{'baseline_object':prov['baseline_source_commit'],'files':[{'path':p,'sha256':sha(WORK/p)} for p in changed],'equivalence_proof_sha256':sha(OUT/'source-boundary-v2-equivalence.json'),'scope':prov['repair_scope']})
print(json.dumps(descriptor))
