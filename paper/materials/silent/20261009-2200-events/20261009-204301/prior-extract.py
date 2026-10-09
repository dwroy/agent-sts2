import json,pathlib,subprocess
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-204303-postmortem'
for run in ['10GPK5XGHCK3']:
 for name in ['decisions','states']:
  proc=subprocess.Popen(['rg','-n','-b','-F',run,str(root/'logs'/f'{name}.jsonl')],stdout=subprocess.PIPE)
  with (p/f'{run}-{name}.jsonl').open('w') as out:
   for raw in proc.stdout:
    line,offset,body=raw.split(b':',2);row=json.loads(body);row['_line']=int(line);row['_offset']=int(offset);out.write(json.dumps(row,ensure_ascii=False)+'\n')
  proc.wait()
 ds=[json.loads(l) for l in (p/f'{run}-decisions.jsonl').open()];ss=[json.loads(l) for l in (p/f'{run}-states.jsonl').open()]
 rows=[s for s in ss if any(e.get('enemy_id')=='FABRICATOR' for e in (s.get('state',{}).get('combat') or {}).get('enemies',[]))];floors={s['state']['run']['floor'] for s in rows}
 print(run,'floors',floors)
 for x in rows:
  s=x['state'];c=s.get('combat')or{};print('state',x['_line'],x['ts'],s['turn'],[(e['enemy_id'],e['current_hp'],e['max_hp'],e.get('move_id')) for e in c.get('enemies',[])])
 for d in ds:
  if d['floor'] in floors and d['label'].startswith('combat/plan-choice'):
   crit=d['questions'].get('plan',{}).get('criteria',{});k=d.get('answers',{}).get('plan',{}).get('choice');v=json.loads(crit[k]) if k in crit else {};print('decision',d['_line'],d['turn'],v.get('enemy_threat_next'),v.get('plays'),v.get('rollout_turns'))
