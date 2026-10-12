import collections,json,subprocess,sys
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');commit,title=sys.argv[1:3];M=json.load(open(O/'ledger-map.json'));C=json.load(open(O/'changes.json'));H=json.load(open(O/'historical-facts.json'));P=json.load(open(O/'speed-history.json'));q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True,capture_output=True,check=True);current={r['id']:r for r in json.loads(q.stdout)};group=collections.defaultdict(list)
for eid,lids in M.items():
 for lid in lids:group[lid].append(eid)
rows=[]
for lid,eids in group.items():
 row=dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第81次静默经验增量；只追加已核本角色来源，保留首证/先验/claim/旧support及repeat/全部上线历史。速度药基本用法首证C48/先验yes与0091的A4脆弱组合/先验unknown分开；仪式2不给雕刻师专属9层追加KEN。代码提案独立实现，未accepted/shipped/implemented。')
 existing={e['run'] for e in current[lid]['evidence']};ev=[]
 for eid in eids:
  fresh=P['support'] if eid=='silent-speed-potion-temporary-dexterity' else ['KEN58SH9SLZ6']
  for run in fresh:
   if run in existing:continue
   if eid=='silent-speed-potion-temporary-dexterity':case=next(c for c in P['cases'] if c['run']==run)
   else:case=next((c for c in H[eid].get('actions',[]) if c['run']==run),None)
   item=dict(run=run,role='support',note='本角色原始日志逐帧支持 '+eid+'；单机制/子公式/实际资源与整战因果分账，详见第81次增量。')
   if case:item.update(floor=case['floor'],turn=case['turn'])
   elif run=='KEN58SH9SLZ6':item.update(floor=17,turn=13)
   ev.append(item);existing.add(run)
 if ev:row['evidence']=ev
 rows.append(row)
(O/'ledger-final-input.jsonl').write_text(''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows));q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input='\n'.join(json.dumps(r,ensure_ascii=False) for r in rows),text=True,capture_output=True);(O/'ledger-final-cli.log').write_text(q.stdout+q.stderr);q.check_returncode()
q=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],text=True,capture_output=True);(O/'ledger-check.log').write_text(q.stdout+q.stderr);q.check_returncode();new=(O/'ledger-new-cli.log').read_text().strip();result=dict(added=[new],proposed=sorted(group),retired=[],check=q.returncode);(O/'ledger-result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(result)
