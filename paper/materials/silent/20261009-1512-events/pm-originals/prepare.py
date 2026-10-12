import json,pathlib,hashlib
p=pathlib.Path(__file__).parent;rc=json.load((p/'833ZM0MJGWHC-resources.json').open());ss=[json.loads(l) for l in (p/'states.jsonl').open()]
lines=['  | 层／敌人ID／尝试 | 进场→离场HP；max HP | 药槽进→出 | 净HP下降／结果 | 原状态行／UTC起止 |','  | --- | --- | --- | --- | --- |']
for c in rc['combats']:
 e=c['entry'];x=c['exit'];last=x or c['last'];frames=[r for r in ss if e['ts']<=r['ts']<=c['last']['ts']];ids={enemy['enemy_id']:enemy['name'] for r in frames for enemy in r['state']['combat']['enemies']};enemy='、'.join(f'{name} {ident}' for ident,name in ids.items());floor=c['floor'];seq=c['sequence']
 if floor==49:enemy='实验体 TEST_SUBJECT／第'+str(seq-21)+'次'
 cap=str(e['max_hp']) if e['max_hp']==last['max_hp'] else f"{e['max_hp']}→{last['max_hp']}"
 belt=lambda r:'空' if not r['potions'] else '、'.join(f'槽{slot} {ident}' for slot,ident in r['potions'])
 hp=f"{e['hp']}→{last['hp']}" if x else f"{e['hp']}→退出未记录（末{last['hp']}）"
 net=f"{c['observed_net_hp_loss']}／"+('死' if floor==49 else '胜') if x else f"完整净损未记录；到末帧净降{e['hp']-last['hp']}／判死后读档"
 lines.append(f"  | F{floor} {enemy} | {hp}；{cap} | {belt(e)}→{belt(last)} | {net} | s{e['line']}→s{last['line']}；{e['ts'][11:-1]}→{last['ts'][11:-1]} |")
text=(p/'draft-head.md').read_text()+'\n'.join(lines)+'\n'+(p/'draft-tail.md').read_text();(p/'draft-v2.md').write_text(text)
script="date '+%Y-%m-%d %H:%M:%S %Z'\ncat >> /home/dw/Projects/agent-sts2/notes/lessons.md <<'EOF'\n"+text+"EOF\n";(p/'append.sh').write_text(script)
f=pathlib.Path('/home/dw/Projects/agent-sts2/notes/lessons.md');h=hashlib.sha256();size=0
with f.open('rb') as inp:
 for b in iter(lambda:inp.read(1048576),b''):h.update(b);size+=len(b)
(p/'append-before.json').write_text(json.dumps({'bytes':size,'sha256':h.hexdigest(),'draft_bytes':len(text.encode()),'draft_sha256':hashlib.sha256(text.encode()).hexdigest()},ensure_ascii=False,indent=2));print('草稿字节',len(text.encode()),'资源行',len(lines)-2)
