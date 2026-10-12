import collections, hashlib, json, pathlib
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
OUT=pathlib.Path(__file__).resolve().parent
def subset(actual, expected):
 if isinstance(expected,dict):return isinstance(actual,dict) and all(k in actual and subset(actual[k],v) for k,v in expected.items() if not k.startswith('_'))
 if isinstance(expected,list):return isinstance(actual,list) and len(actual)==len(expected) and all(subset(a,b) for a,b in zip(actual,expected))
 return actual==expected
manifest=[]; rows={}; handles={name:(ROOT/'logs'/name).open('rb') for name in ['states.jsonl','decisions.jsonl']}
def verify(file,offset,expected=None,sha=None,line=None):
 key=(file,offset)
 if key in rows:return rows[key]
 f=handles[file];f.seek(offset);raw=f.readline();actual=json.loads(raw);digest=hashlib.sha256(raw).hexdigest()
 if sha:assert digest==sha,(key,'sha')
 if expected:
  assert subset(actual,expected),(key,'object')
 run=actual.get('run_id') or actual['state']['run_id'];assert run in RUNS
 if 'state' in actual:
  assert actual['state']['run']['character_id']=='SILENT'
  assert actual['state']['run']['ascension']==10
 manifest.append(dict(file=file,offset=offset,line=line,sha256=digest,run=run))
 actual['_offset']=offset
 if line:actual['_line']=line
 rows[key]=actual;return actual
RUNS={r['run_id'] for r in json.load(open(OUT/'run-identity.json'))}
OLD=ROOT/'.worktrees/codex-dev/learner/runs/20261007-170245-strategy-proposal'
floors={'CA5KE8GFJ9X2':{13},'61E2QS63Y9WU':{17,23},'5PM6JAQG6FNQ':{33,39},'DUZUBAJ3A8GP':{30}}
for l in (OLD/'verified-evidence.jsonl').open():
 x=json.loads(l)
 if x['row']['state']['run']['floor'] in floors[x['run']]:verify('states.jsonl',x['offset'],x['row'],x['sha256'])
PM=ROOT/'learner/runs/20261007-154302-postmortem'
for file in handles:
 for l in (PM/file).open():
  x=json.loads(l);floor=x.get('floor') if file=='decisions.jsonl' else x['state']['run']['floor']
  if floor in {35,37,43,45}:verify(file,x['_offset'],x,line=x['_line'])
fixture=json.load(open('agent/tests/silent-selection-observation-evidence.json'))
for kind in ['states','decisions']:
 for x in fixture[kind]:verify(kind+'.jsonl',x['_offset'],x,x['_source_sha256'],x['_line'])
for file in ['agent/tests/silent-selection-terminal-evidence.json','agent/tests/silent-hp-guard-audit-evidence.json']:
 if not pathlib.Path(file).exists():continue
 def walk(x):
  if isinstance(x,dict):
   if '_offset' in x and '_source_sha256' in x:verify('states.jsonl' if 'state' in x else 'decisions.jsonl',x['_offset'],x,x['_source_sha256'],x.get('_line'))
   else:
    for v in x.values():walk(v)
  elif isinstance(x,list):
   for v in x:walk(v)
 walk(json.load(open(file)))
manifest.sort(key=lambda x:(x['file'],x['offset']))
(OUT/'raw-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
for file in handles:
 with (OUT/file).open('w') as f:
  for (kind,offset),r in sorted(rows.items()):
   if kind==file:f.write(json.dumps(r,ensure_ascii=False)+'\n')
counts=collections.Counter((x['run'],x['file']) for x in manifest)
summary=[dict(run=run,file=file,verified=n) for (run,file),n in sorted(counts.items())]
(OUT/'verification.json').write_text(json.dumps({'verified_rows':len(manifest),'counts':summary,'all_sha_and_objects_match':True},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
