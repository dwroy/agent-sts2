import collections,json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');commit,title=sys.argv[1:3];M=json.load(open(O/'ledger-map.json'));C=json.load(open(O/'changes.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};current={r['id']:r for r in json.loads(subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True,capture_output=True,check=True).stdout)};groups=collections.defaultdict(list)
for e,ls in M.items():
 for l in ls:groups[l].append(e)
rows=[]
for lid,eids in groups.items():
 row=dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第82次静默经验更新，首证/先验/claim/旧support/repeat/version和全部上线历史保持；仅追加实际核对来源，代码提案独立strategy-proposal实现，未accepted/shipped。旧王室+小血瓶2血与新无小血瓶4血分支、狡诈基本生成与首次满手0257分开。')
 existing={e['run'] for e in current[lid]['evidence']};ev=[]
 for eid in eids:
  change=next(c for c in C['entries'] if c['id']==eid);old=change['before'];new=change['after'];fresh=[n for n in new['evidence'] if not old or n not in old['evidence']]
  if lid=='silent-0255':fresh=['TXZ6RVMQA09D']
  if lid=='silent-0257':fresh=['WQZVENQ7DTRP']
  for n in fresh:
   if n in existing:continue
   ev.append(dict(run=n,role='support',floor=49 if n=='TXZ6RVMQA09D' and eid=='silent-royal-poison-blood-vial-opening-net' else 48 if n=='TXZ6RVMQA09D' else 25 if eid=='silent-infested-prism-tainted-skill-cost' else 33,turn=1 if eid=='silent-royal-poison-blood-vial-opening-net' else 3 if eid=='silent-infested-prism-tainted-skill-cost' else 10 if n=='TXZ6RVMQA09D' else 11,note='本角色原始日志逐帧核验 '+eid+'；局部公式/实际资源与整战因果分账，完整证据在第82次增量及任务审计。'));existing.add(n)
 if ev:row['evidence']=ev
 rows.append(row)
(O/'ledger-final-input.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows));q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input='\n'.join(json.dumps(r,ensure_ascii=False) for r in rows),text=True,capture_output=True);(O/'ledger-final-cli.log').write_text(q.stdout+q.stderr);q.check_returncode()
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(q.stdout+q.stderr);q.check_returncode();newid=(O/'ledger-new-cli.log').read_text().strip();result=dict(added=[newid],proposed=sorted(groups),retired=[],check=q.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
