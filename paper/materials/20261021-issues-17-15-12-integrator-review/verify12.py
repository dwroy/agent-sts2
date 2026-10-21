import pathlib,sys,json,gzip,hashlib,collections,random,importlib.util,time
root=pathlib.Path('/home/dw/Projects/agent-sts2'); here=root/'.worktrees/integrator-19-17-15-20261021/paper/materials/2026-10-21-v6-card-increment-identifiability'; sys.path.insert(0,str(here));import study as s
out=root/'.artifacts/integration-19-17-15-12'; start=time.time()
prov=json.loads((here/'provenance.json').read_text()); missing=[]
for rel,expected in prov['source_files'].items():
 p=s.SOURCE/rel; b=p.read_bytes(); got={'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
 if got!=expected:missing.append(rel)
assert not missing,missing
ov,legacy,model,questions,results,train=s.load(); runs=sorted({r['run'] for r in train}); fights=collections.Counter(r['run'] for r in train)
def read(p):return json.loads(gzip.decompress(p.read_bytes())) if p.suffix=='.gz' else json.loads(p.read_text())
def quant(v,p):
 a=sorted(v);x=(len(a)-1)*p;lo=int(x);hi=min(lo+1,len(a)-1);return a[lo]*(hi-x)+a[hi]*(x-lo) if lo!=hi else a[lo]
def dist(v):
 pos=sum(x>1e-8 for x in v);neg=sum(x< -1e-8 for x in v);qs=[quant(v,p) for p in (.025,.05,.5,.95,.975)]
 return {'positive':pos,'negative':neg,'zero':len(v)-pos-neg,'quantiles_025_05_50_95_975':qs,'stable95':'positive' if pos>=19 and qs[0]>1e-8 else 'negative' if neg>=19 and qs[-1]< -1e-8 else 'unresolved','stable90':'positive' if pos>=19 and qs[1]>1e-8 else 'negative' if neg>=19 and qs[-2]< -1e-8 else 'unresolved','unanimous':'positive' if pos==len(v) else 'negative' if neg==len(v) else 'unresolved'}
values=collections.defaultdict(list)
for i in range(1,21):
 rep=read(here/f'bootstrap/replicate-{i:02}.json.gz');rng=random.Random(120000+i);assert rep['run_draw']==[rng.choice(runs) for _ in runs];assert rep['unique_runs']==len(set(rep['run_draw']));assert rep['fights_including_duplicates']==sum(fights[r] for r in rep['run_draw']);assert len(rep['model']['trees'])==150 and rep['model']['lr']==.08
 assert rep['feature_sha256']==hashlib.sha256(json.dumps(model['features']).encode()).hexdigest();assert len(rep['delta'])==len({(d['key'],d['id']) for d in rep['delta']})==438
 for d in rep['delta']:values[d['key'],d['id']].append(d['delta'])
cs=read(here/'candidate-results.json.gz');qs=read(here/'question-results.json.gz');summary=read(here/'summary.json');assert len(cs)==438 and len(qs)==146
for c in cs:
 assert c['stability']==dist(values[c['question_id'],c['id']]);assert abs(sum(c['support']['shapley'].values())-c['original_delta'])<1e-7
for q in qs:
 for option,rivals in q['pairwise'].items():
  for rival,expected in rivals.items():
   v=[0.]*20 if option=='skip' else values[q['question_id'],option];w=[0.]*20 if rival=='skip' else values[q['question_id'],rival];assert expected==dist([a-b for a,b in zip(v,w)])
 expected=[i for i in q['pairwise'] if q['original_winners']==[i] and all(d['stable95']=='positive' for d in q['pairwise'][i].values())];assert q['robust_winners']==expected
 assert not q['missing_next_opening'] or q['next_loss'] is None;assert not q['remaining_complete'] or not q['missing_remaining_fights'];assert not q['boss_already_passed'] or q['boss_passed'] is None
 assert len(q['remaining_keys'])==len({tuple(k) for k in q['remaining_keys']})
counts=dict(collections.Counter(c['stability']['stable95'] for c in cs));assert counts==summary['candidate_counts']['stable95'];robust=sum(bool(q['robust_winners']) for q in qs);assert robust==summary['questions']['robust_winners']==1
assert summary['outcome_coverage']['unique_next_fights']==len({tuple(q['next_fight']) for q in qs if q['next_fight']})==134
assert len({q['run'] for q in qs})==10
result={'status':'passed','source_files_byte_and_sha_verified':len(prov['source_files']),'train_fights':len(train),'train_runs':len(runs),'bootstrap_models':20,'candidates':len(cs),'questions':len(qs),'runs':10,'stable95':counts,'robust_winners':robust,'unique_next_fights':134,'checks':'frozen source integrity; bootstrap cluster draws/multiplicities; independent interval/sign recomputation; Shapley completeness; every pairwise interval; missingness gates; unique denominators','model_retrained':False,'seconds':round(time.time()-start,3)}
(out/'12-independent-validation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
