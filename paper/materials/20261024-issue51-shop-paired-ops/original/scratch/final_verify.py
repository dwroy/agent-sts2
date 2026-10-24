import json,pathlib,hashlib,re,subprocess,collections
S=pathlib.Path(__file__).parent;RUN=S.parent;W=pathlib.Path.cwd();R=pathlib.Path('/home/dw/Projects/agent-sts2')
def sha(b):return hashlib.sha256(b).hexdigest()
result_bytes=(RUN/'result.json').read_bytes();report=(RUN/'report.md').read_bytes()
blocks=re.findall(rb'```json\n(.*?)```',report,re.S);assert len(blocks)==1 and blocks[0]==result_bytes
res=json.loads(result_bytes);assert json.loads(blocks[0])==res
assert res['base']==subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
assert subprocess.check_output(['git','status','--porcelain'],text=True)==''
before=json.load(open(RUN/'input-verification-before.json'));after=json.load(open(RUN/'input-verification.json'));assert before==after
scope=json.load(open(W/'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json'));allowed={r['run_id'] for r in scope['runs']}
refs=json.load(open(S/'raw-read-inventory.json'))['refs'];files={};verified=0
try:
 for ref in refs:
  stream=ref['stream'];off=ref['offset'];n=ref['bytes'];cut=scope['raw_stream_cutoffs'][stream]
  assert 0<=off and off+n<=cut['max_bytes']
  if stream not in files:files[stream]=(R/cut['path']).open('rb')
  f=files[stream];f.seek(off);b=f.read(n);assert len(b)==n and sha(b)==ref['sha256']
  d=json.loads(b);rid=d.get('run_id') or d.get('state',{}).get('run_id');assert rid in allowed
  verified+=1
finally:
 for f in files.values():f.close()
x={a['decision']['off']:a for a in json.load(open(S/'shop-enriched.json'))}
checks=0
for p in S.glob('*-evidence.json'):
 for e in json.load(open(p)):
  a=x[e['indexed_decision']['off']];pre=e['pre'];post=e['post'];assert pre['run']['ascension']==10
  assert pre['run_id']==post['run_id']==a['decision']['run_id']
  if a['decision']['action']=='remove_card_at_shop':
   old=collections.Counter(z['card_id']+('+' if z.get('upgraded') else '') for z in pre['run']['deck']);new=collections.Counter(z['card_id']+('+' if z.get('upgraded') else '') for z in post['run']['deck'])
   assert list((old-new).elements())==a['removed_cards'] and not new-old
   assert pre['run']['gold']-post['run']['gold']==pre['shop']['card_removal']['price']
   assert post['shop']['card_removal']['used'] is True
  elif a['target']:
   assert pre['run']['gold']-post['run']['gold']==a['target']['price']
   assert a['purchase_verified']
  else:assert pre['run']['gold']==post['run']['gold'] and post['shop']['is_open'] is False
  checks+=1
for group in json.load(open(S/'shop-statistics.json')).values():
 for row in group['strata']:
  aa=[x[o] for o in row['decision_offsets']]
  assert len(aa)==row['opportunities'] and len({a['decision']['run_id'] for a in aa})==row['independent_runs']
  assert all(a['run_stratum']['ascension']==row['ascension'] and a['run_stratum']['attempt_scope']==row['attempt_scope'] for a in aa)
  assert len({a['decision']['run_id'] for a in aa if a['run_stratum']['victory']})==row['final_winning_runs']
for unit in res['external_results']:
 assert unit['id']=='external-decision-shop-001' and unit['state']=='processed' and len(unit['destinations'])==18
 for d in unit['destinations']:
  p=pathlib.Path(d['path']);assert p.is_relative_to(S) and p.is_file()
  c=json.load(open(p));assert c[d['kind']]['id']==d['id'] and c['formal_publication']=='pending' and c['consumer_readback']=='pending'
  link=c['secondary_external_context_ledger'];assert sha(pathlib.Path(link['path']).read_bytes())==link['sha256']
raw=(W/'knowledge/characters/silent/strategy-entries.json').read_text();reuse=(S/'reused-full-potion-entry.json').read_text();assert reuse in raw
assert json.load(open(S/'gitleaks.json'))==[]
out={'head_unchanged':True,'tracked_worktree_clean':True,'manifest_and_shard_before_after_equal':True,'report_json_raw_bytes_equal':True,'report_json_parsed_equal':True,'result_sha256':sha(result_bytes),'report_sha256':sha(report),'all_raw_rows_rechecked':verified,'selected_context_records_rechecked':checks,'destination_entries':18,'byte_reuse_exact':True,'gitleaks_findings':0,'format_check':json.load(open(S/'candidate-format-check.json'))}
(S/'final-verification.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
manifest=[]
for p in sorted(RUN.rglob('*')):
 if p.is_file() and p.name not in ('artifact-manifest.json','tui-prompt.txt','tui.pid','tui.sh'):
  b=p.read_bytes();manifest.append({'path':str(p.relative_to(W)),'bytes':len(b),'sha256':sha(b)})
(S/'artifact-manifest.json').write_text(json.dumps({'files':manifest},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(out,ensure_ascii=False))
