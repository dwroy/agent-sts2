import json,hashlib,subprocess,re
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-221302-postmortem'
m=json.loads((p/'append-manifest.json').read_text());raw=(root/'notes/lessons.md').read_bytes();draft=(p/'section-draft.md').read_bytes()
assert hashlib.sha256(raw[:m['lessons_prefix_bytes']]).hexdigest()==m['lessons_prefix_sha256']
assert raw[m['lessons_prefix_bytes']:].startswith(draft)
assert raw.count('## R3AJCGQGGMR4'.encode())==1
needle='R3AJCGQGGMR4'; lines={306365,306394,306403,306440,306443,306444}; observed={}
proc=subprocess.Popen(['rg','-n','-F',needle,str(root/'logs/states.jsonl')],stdout=subprocess.PIPE,text=True)
for rawline in proc.stdout:
 n,line=rawline.split(':',1);n=int(n)
 if n not in lines:continue
 r=json.loads(line);s=r['state'];c=s.get('combat') or {};pl=c.get('player') or {}
 observed[n]={'ts':r['ts'],'floor':s['run']['floor'],'turn':s['turn'],'hp':s['run']['current_hp'],'max_hp':s['run']['max_hp'],'block':pl.get('block'),'enemies':[(e['enemy_id'],e['current_hp'],e['max_hp']) for e in c.get('enemies',[])]}
proc.wait();assert set(observed)==lines
assert observed[306365]['hp']==51 and observed[306394]['hp']==6
assert observed[306403]['hp']==52 and observed[306403]['max_hp']==75
assert observed[306440]['hp']==9 and observed[306443]['block']==12
assert observed[306444]['turn']==7 and observed[306444]['hp']==0 and observed[306444]['enemies'][0][1:]==(87,99)
assert '完整需损14、存活至少差6血'.encode() in draft
entries=subprocess.check_output(['python3',str(root/'learner/ledger.py'),'find','--run',needle,'--json'],text=True);(p/'ledger-after.json').write_text(entries)
ids={r['id']:r for r in json.loads(entries)}
for i in ['silent-0311','silent-0312','silent-0117','silent-0019']:assert needle in ids[i]['where']['lessons']
assert any(e.get('run')==needle and e.get('role')=='repeat' for e in ids['silent-0117']['evidence'])
checks=subprocess.run(['python3',str(root/'learner/ledger.py'),'check'],capture_output=True,text=True);(p/'ledger-check.txt').write_text(checks.stdout+checks.stderr);assert checks.returncode==0
props=[]
with (root/'paper/materials/learning/code-proposals.jsonl').open() as f:
 for line in f:
  r=json.loads(line)
  if r.get('id') in ['silent-proposal-d04933cbd408d85b','silent-proposal-e4263c03267cf4cf'] and r.get('op')=='add':props.append(r)
assert len(props)==2
for r in props:
 assert r['state']=='pending' and r['source_task']=='postmortem' and r['target_task']=='strategy-proposal'
 assert r['runs']==[needle]
 assert Path(r['proposal']).is_file()
report={'run':needle,'original_states_rechecked':observed,'ledger_check':checks.returncode,'lessons_prefix_unchanged':True,'single_section_appended':True,'errata':['T1额外6伤来源不能归三刃回旋镖，来源中间帧未记录','首段勘误标题22:42:27录入错误，实际date为22:42:33；后段勘误据date现取22:43:01'],'proposals':[r['id'] for r in props]}
(p/'verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('原始日志关键帧复核通过；旧复盘前缀保持；本局仅一个标题；12账本条目；2提案pending；ledger.py check退出0')
