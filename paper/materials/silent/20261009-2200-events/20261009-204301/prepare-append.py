import json,pathlib,hashlib
p=pathlib.Path('learner/runs/20261009-204303-postmortem');r='54G5683J0E5S';a=json.load((p/f'{r}-resources.json').open());ds=[json.loads(l) for l in (p/f'{r}-decisions.jsonl').open()]
gains=[];losses=[]
for ch in a['resource_changes']:
 before={tuple(t) for t in ch['from']['potions']};after={tuple(t) for t in ch['to']['potions']}
 for slot,pid in after-before:gains.append((pid,slot,ch['to']))
 for slot,pid in before-after:losses.append((pid,slot,ch['to']))
assert len(gains)==len(losses)==12
rows=['\n| 药水（中文名 ID）／槽 | 实得证据（层、states行、UTC） | 实饮证据（层／回合、决策原行、UTC）／槽空帧 |','|---|---|---|']
for pid,slot,g in gains:
 d=next(d for d in ds if d.get('chosen',{}).get('action')=='use_potion' and d.get('expect',{}).get('potion',{}).get('id')==pid)
 loss=next(l for x,y,l in losses if x==pid);name=next((word for word in ['迅捷药水','熔炉的祝福','技能药水','速度药水','再生药水','无色药水','癫狂之触','能力药水','果汁','流动铜液','赌徒特酿','敏捷药水'] if word in d['rationale']),pid)
 rows.append(f"| {name} {pid}／槽{slot} | F{g['floor']}；s{g['line']}；{g['ts']} | F{d['floor']}T{d['turn']}；decisions:{d['_line']}；{d['ts']}；s{loss['line']} |")
(p/'potion-table.md').write_text('\n'.join(rows)+'\n')
head=(p/'lessons-head.md').read_text();tables=(p/'combat-tables.md').read_text();tail=(p/'lessons-tail.md').read_text();tail=tail.replace('\n\n  大脑构筑与路线：','\n'+ '\n'.join(rows)+'\n\n  大脑构筑与路线：')
text='\n'+head+'\n'+tables+tail
(p/'lessons-draft.md').write_text(text)
(p/'append-lessons.sh').write_text("cat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+text+"EOF\n")
print('payload bytes',len(text.encode()),'gain/consume',len(gains),len(losses),'sha',hashlib.sha256(text.encode()).hexdigest())
