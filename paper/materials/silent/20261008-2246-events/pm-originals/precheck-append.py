import json,hashlib,subprocess,re
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-221302-postmortem');draft=p/'section-draft.md';body=draft.read_text().replace('F2为15＋31＋12＝58','F2为12＋35＋11＝58')
d=[json.loads(x) for x in (p/'decisions.jsonl').open()]; resources=json.loads((p/'R3AJCGQGGMR4-resources.json').read_text())
for ev in resources['resource_changes']:
 a,z=ev['from'],ev['to']
 if ev['restart_boundary']: continue
 for slot,k in set(map(tuple,a['potions']))-set(map(tuple,z['potions'])):
  candidates=[r for r in d if (r.get('chosen') or {}).get('action')=='use_potion' and (r.get('chosen') or {}).get('option_index')==slot and r['floor']==z['floor'] and r['turn']==z['turn'] and r['ts']<=a['ts']]
  assert candidates,(slot,k,a,z)
  chosen=max(candidates,key=lambda r:r['ts'])
  prefix=f"s{a['line']}→{z['line']}；{z['ts'][11:]}；d"
  body=re.sub(re.escape(prefix)+r'\d+',prefix+str(chosen['_line']),body)
  assert chosen.get('result','').startswith(('completed','pending')),chosen['_line']
body=body.replace('每次药水消失均有use_potion完成／后帧核对','每次药水消失均有use_potion与后帧核对；F22攻击药及F45赌徒动作标pending但实际进入对应选牌／弃牌屏幕，其余11次动作完成')
draft.write_text(body)
assert sum(1 for c in resources['combats'] if c['exit'] and c['exit']['screen']=='REWARD')==18
assert '52/75血进场' in body and '9血12挡对26' in body
assert '766020／输出7845' in body and '6038387／输出14213' in body
for c in resources['combats']:
 a=c['entry'];z=c['exit'] or c['last'];assert f"s{a['line']}→{z['line']}" in body
for ident in ['silent-0117','silent-0019']:
 out=subprocess.check_output(['python3','learner/ledger.py','show',ident],text=True);x=json.loads(out)
 print(ident,x['status'],x.get('version'))
 if ident=='silent-0019':
  label=f'（之前学过：{ident}，{x["version"]}）' if x['status']=='shipped' else f'（之前见过：{ident}）'
  body=re.sub(r'（之前学过：silent-0019，[^）]+）|（之前见过：silent-0019）',label,body)
body += '\n  新错／老错标签取追加前账本快照；silent-0019的S1.exp109数据上线晚于本局22:04结束，不意味着本局已使用该版，也不将资源支持证据写成上线后重犯。\n'
draft.write_text(body)
lessons=Path('/home/dw/Projects/agent-sts2/notes/lessons.md');before=lessons.read_bytes();assert not any(line.startswith('## R3AJCGQGGMR4') for line in before.decode().splitlines())
manifest={'run':'R3AJCGQGGMR4','lessons_prefix_bytes':len(before),'lessons_prefix_sha256':hashlib.sha256(before).hexdigest(),'section_sha256':hashlib.sha256(body.encode()).hexdigest(),'checks':'资源链、药水动作与后帧、关键HP、原日志行号及账本状态已核对'}
(p/'append-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(p/'append-section.sh').write_text("cat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+body+"EOF\n")
print('追加前核验通过，获得12瓶、实饮13次')
