import json,collections,re
from pathlib import Path
P=Path(__file__).parent
expected={
'DPYF2BAA3DKT':{17:([233,233,233,219,194,161,127,108,77,28],[0,0,14,25,33,34,19,31,49,28]),25:([171,160,118,106,87,72,38,13],[11,42,12,19,15,34,25,13]),31:([165,116,95,77,58,28,14],[49,21,18,19,30,14,14]),33:([399,344,318,294,300,260,212,164,111,59],[55,26,24,-6,40,48,48,53,52,59]),42:([294,215,179,135,108,93,68,10],[79,36,44,27,15,25,58,10])},
'CRK2HNYKSCZC':{2:([59,42,30,21,7],[17,12,9,14,7]),3:([49,20],[29,20]),6:([44,38,18,15,7],[6,20,3,8,7]),8:([85,77,73,67,55,43,25,25,15],[8,4,6,12,12,18,0,10,15]),11:([67,60,29],[7,31,0])}}
for run,fs in expected.items():
 S=[json.loads(l) for l in (P/(run+'-states.jsonl')).open()];S=[x for x in S if x['state'].get('run_id')==run]
 for fl,(need,dealt) in fs.items():
  groups=collections.OrderedDict()
  for x in S:
   s=x['state'];c=s.get('combat')or{};r=s.get('run')or{}
   if r.get('floor')==fl and s.get('in_combat') and c.get('hand'):
    groups.setdefault(s['turn'],[]).append(x)
  actual=[sum(e['current_hp'] for e in a[0]['state']['combat']['enemies'] if e['is_alive'])for a in groups.values()]
  assert actual==need,(run,fl,actual,need)
  last=29 if run=='CRK2HNYKSCZC' and fl==11 else 0
  changes=[a-b for a,b in zip(actual,actual[1:]+[last])]
  assert changes==dealt,(run,fl,changes,dealt)
 print(run,'关键战斗需/净扣数组全部吻合')
 if run=='CRK2HNYKSCZC':
  b=[h for x in S if (x['state'].get('run')or{}).get('floor')==3 for h in (x['state'].get('combat')or{}).get('hand',[]) if h['card_id']=='ROLLING_BOULDER']
  assert b and all(h['energy_cost']==0 for h in b)
  print('无色药水生成的滚石费用0已核对')
 # Check real rest results against the immediately observed post-choice state.
 D=[json.loads(l) for l in (P/'decisions.jsonl').open() if json.loads(l)['run_id']==run]
 for d in D:
  if d['label']=='rest/plan':
   after=next(x for x in S if x['ts']>d['observed_ts'] and (x['state'].get('run')or{}).get('floor')==d['floor'] and (x['state'].get('run')or{}).get('current_hp')!=json.loads(d['fingerprint'])['hp']) if run.startswith('DP') else None
   if after:print('营火',d['floor'],json.loads(d['fingerprint'])['hp'],'→',after['state']['run']['current_hp'])
L=Path('/home/dw/Projects/agent-sts2/notes/lessons.md').read_text()
for run in expected:
 assert len(re.findall('^## '+run,L,re.M))==1
 print(run,'唯一标题已核对')
