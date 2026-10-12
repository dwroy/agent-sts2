from pathlib import Path
from collections import Counter
import hashlib,importlib.util,json,re,shlex,subprocess
exec(compile(Path('/tmp/sts2-0907-deploy-common.py').read_text(),'common','exec'))
oldgit=git
def git(*args,**kw):return oldgit('-c','core.quotepath=false',*args,**kw)
ARC=ROOT/'paper/materials/silent/20261009-1639-events'
PD=ROOT/'learner/runs/20261009-161301-postmortem'
BATCH,RUN='20261009-161301','C6Z8ATNBNHZ7'
LP,LESSON='paper/materials/learning/ledger.jsonl','notes/lessons.md'
assert not ARC.exists() and not git('diff','--cached','--name-only').strip()
base_head=git('rev-parse','HEAD').strip()
def digest(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def fenced(t):return json.loads(re.findall(r'```json\s*(\{.*?\})\s*```',t,re.S)[-1])
report=json.loads((PD/'report.json').read_text())
assert report==fenced((PD/'report.md').read_text())==fenced((ROOT/f'ops/codex-ops/learner/{BATCH}.out').read_text())
assert report['appended']==[RUN] and not report['skipped'] and not report['ledger']['added'] and report['ledger']['repeats']==['silent-0256'] and report['ledger']['check']==0
assert len(report['bugs'])==1 and report['bugs'][0]['new'] is False and report['bugs'][0]['run']==RUN and 'silent-0256' in report['bugs'][0]['what']
assert 'silent-0256' in (ROOT/'notes/fix-queue-v4.md').read_text()
assert len(report['ledger']['updated'])==8 and len(report['code_proposals'])==2
latest=json.loads((ROOT/'ops/codex-ops/learn.json').read_text());state=latest['batches'][BATCH]
assert state['state']=='done' and state['rc']==0 and state['done']==[RUN] and not state['missing'] and not state['proposal_audit_errors']
assert latest['runs'][RUN]=={'attempts':1,'batch':BATCH}
registry={}
for s in (ROOT/'paper/materials/learning/code-proposals.jsonl').read_text().splitlines():
 r=json.loads(s);registry.setdefault(r['id'],{}).update(r)
for ident,stem in zip(report['code_proposals'],['proposal-artifact','proposal-potions']):
 item=registry[ident];inp=json.loads((PD/(stem+'.json')).read_text());assert all(item[k]==v for k,v in inp.items())
 assert item['source_task']=='postmortem' and item['target_task']=='strategy-proposal' and item['character']=='silent'
 assert item['state'] in ['pending','running','waiting'] and not item.get('implemented_commit')
 assert digest(item['proposal'])==item['proposal_sha256']
prior=subprocess.check_output(['git','show',':'+LESSON],cwd=ROOT);physical=(ROOT/LESSON).read_bytes();title=('## '+RUN).encode()
addition=(PD/'appended-section.md').read_bytes()
command_addition=(PD/'append-lesson.sh').read_bytes().split(b"<<'EOF'\n",1)[1].rsplit(b'EOF\n',1)[0]
assert command_addition==(PD/'lesson-draft.md').read_bytes() and len(command_addition)==18733
assert title not in prior and len(addition)==19245 and addition.startswith(command_addition)
assert physical.count(title)==physical.count(addition)==1
prefix=json.loads((PD/'lessons-before.json').read_text());position=json.loads((PD/'append-verification.json').read_text())
assert hashlib.sha256(physical[:prefix['bytes']]).hexdigest()==prefix['sha256']
assert physical[prefix['bytes']:prefix['bytes']+len(addition)]==addition
assert len(addition)==position['appended_bytes'] and prefix['bytes']==position['old_prefix_bytes']
assert position['old_prefix_sha256']==prefix['sha256'] and position['draft_matches'] is True
assert addition.count('### 勘误'.encode())==position['errata_count']==2 and position['title_count']==1
verification=json.loads((PD/'verification.json').read_text());assert verification['checks']==len(verification['details'])==105 and verification['passed'] is True
code=(PD/'verify.py').read_text().split("(O/'verification.json').write_text",1)[0];assert 'write_text' not in code
ns={'__file__':str(PD/'verify.py')};exec(compile(code,str(PD/'verify.py'),'exec'),ns)
assert json.loads(json.dumps(ns['checks'],ensure_ascii=False))==verification['details']
commands=[e['item'] for e in map(json.loads,PD.with_suffix('.jsonl').read_text().splitlines()) if e.get('type')=='item.completed' and e.get('item',{}).get('type')=='command_execution']
inputs=[]
for c in commands:
 if 'learner/ledger.py update' not in c.get('command',''):continue
 text=shlex.split(c['command'])[-1]
 body=re.findall(r"learner/ledger.py update <<'EOF'\n([\s\S]*?)\nEOF",text)
 assert len(body)==1 and c['exit_code']==0
 inputs.extend(json.loads(s) for s in body[0].splitlines() if s.strip())
assert len(inputs)==8
idx=git('show',':'+LP);extra=Counter((ROOT/LP).read_text().splitlines(True))-Counter(idx.splitlines(True));rows=[]
for s in (ROOT/LP).read_text().splitlines(True):
 if extra[s]:
  r=json.loads(s)
  if r.get('by')=='learner:postmortem' and (PD.name in s or RUN in s):rows.append(s);extra[s]-=1
parsed=[json.loads(s) for s in rows];evidence=[r for r in parsed if r.get('evidence')];links=[r for r in parsed if r.get('where',{}).get('proposal')]
assert len(rows)==14 and len(evidence)==8 and len(links)==6 and all(r['op']=='update' for r in parsed)
assert {r['id'] for r in evidence}==set(report['ledger']['updated'])
for actual,input_ in zip(evidence,inputs):assert all(actual[k]==v for k,v in input_.items())
assert Counter(e['role'] for r in parsed for e in r.get('evidence',[]))=={'support':10,'repeat':1}
assert all(not ({'claim','first_run','prior','prior_runs','status','version'}&set(r)) for r in parsed)
for ident in report['code_proposals']:
 item=registry[ident];linked=[r for r in links if r['where']['proposal']==[item['proposal']]]
 assert len(linked)==len(item['ledger']) and {r['id'] for r in linked}==set(item['ledger'])
ts=stamp();ARC.mkdir();originals={}
def capture(name,path):
 assert path.is_file() and not path.is_symlink() and not path.name.endswith('.env')
 size,sha=path.stat().st_size,digest(path);originals[str(path)]={'bytes':size,'sha256':sha}
 target=ARC/name;target.parent.mkdir(parents=True,exist_ok=True)
 if size<=200000:target.write_bytes(path.read_bytes())
 else:target.with_name(target.name+'.pointer.json').write_text(json.dumps({'original':str(path),'bytes':size,'sha256':sha,'original_retained':True},ensure_ascii=False,indent=2)+'\n')
for p in sorted(PD.rglob('*')):
 if p.is_file() and not p.is_symlink() and p.suffix!='.pyc' and '__pycache__' not in p.parts:capture('pm-originals/'+str(p.relative_to(PD)),p)
capture('pm-event-stream.jsonl',PD.with_suffix('.jsonl'))
for suffix in ['out','err']:capture('pm.'+suffix+'.txt',ROOT/f'ops/codex-ops/learner/{BATCH}.{suffix}')
run_report=list((ROOT/'notes').glob('run-*-'+RUN+'.md'));assert len(run_report)==1;capture('run-report-'+RUN+'.md',run_report[0])
(ARC/'owned-lessons-addition-original.md').write_bytes(addition);(ARC/'owned-postmortem-original-cli.jsonl').write_text(''.join(rows))
(ARC/'original-cli-inputs.json').write_text(json.dumps(inputs,ensure_ascii=False,indent=2)+'\n')
(ARC/'proposal-registry-observed.json').write_text(json.dumps([registry[i] for i in report['code_proposals']],ensure_ascii=False,indent=2)+'\n')
(ARC/'observed-scheduler-state.json').write_text(json.dumps({'batch':state,'run':latest['runs'][RUN]},ensure_ascii=False,indent=2)+'\n')
manifest={'timestamp':ts,'batch':BATCH,'run':RUN,'report':report,'originals':originals,'owned_cli':14,'evidence_update_rows':8,'first_observation_add_rows':0,'proposal_link_rows':6,'support_evidence':10,'repeat_evidence':1,'correction_rows':0,'new_pure_bugs':[],'queue_append':False,'blocking':False,'lesson_append_bytes':19245,'old_prefix_bytes':prefix['bytes'],'old_prefix_sha256':prefix['sha256'],'append_verification':{'formal_equals_original_appended_section':True,'original_command_draft_and_two_errata_preserved':True,'draft_v2_not_assumed_formal':True,'old_prefix_preserved':True,'title_count':1},'source_total_verification_count':105,'ops_readonly_source_checks_reexecuted':105,'source_failed_command_history':[{'exit':c['exit_code'],'command_sha256':hashlib.sha256(c['command'].encode()).hexdigest(),'output_excerpt':c.get('aggregated_output','')[-1200:]} for c in commands if c.get('exit_code') not in [0,None]],'source_proposals_original_automatic_chain':True,'no_ops_game_knowledge_added':True,'original_reports_and_streams_kept':True,'manual_parent_and_supplement_retained_in_separate_request_receipt':True}
(ARC/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
blob=subprocess.check_output(['git','hash-object','-w','--stdin'],cwd=ROOT,input=prior+addition).decode().strip();git('update-index','--add','--cacheinfo','100644,'+blob+','+LESSON)
cache_update(LP,idx+''.join(rows))
spec=importlib.util.spec_from_file_location('ledger1604',ROOT/'learner/ledger.py');ll=importlib.util.module_from_spec(spec);spec.loader.exec_module(ll)
tmp=Path('/tmp/sts2-20261009-1639-index.jsonl');tmp.write_text(git('show',':'+LP));assert not ll.check_file(str(tmp),ll.load_runs(),ll.load_versions())
check=run(['nice','-n','19','python3','-B','learner/ledger.py','check']).stdout;assert '0 problem(s)' in check;(ARC/'ledger-check.txt').write_text(check)
paths=[str(p.relative_to(ROOT)) for p in ARC.rglob('*') if p.is_file()];git('add','-f','--',*paths)
staged=git('diff','--cached','--name-only').splitlines();assert set(staged)==set(paths)|{LP,LESSON}
record={'base_head':base_head,'staged_paths':staged,'cli':14,'originals':len(originals)}
Path('/tmp/sts2-20261009-1639-prepare.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'prepared':True,'source_checks':105,'cli':14,'originals':len(originals),'paper_pending':True},ensure_ascii=False),flush=True)
