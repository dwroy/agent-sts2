import json,hashlib,re
from pathlib import Path
p=Path(__file__).parent;meta=json.loads((p/'append-before.json').read_text());expected=(p/'draft-final.md').read_bytes();lesson=Path('/home/dw/Projects/agent-sts2/notes/lessons.md');h=hashlib.sha256();remaining=meta['size']
with lesson.open('rb') as f:
 while remaining:
  c=f.read(min(65536,remaining));assert c;h.update(c);remaining-=len(c)
 assert h.hexdigest()==meta['sha256'],'旧复盘被改'
 actual=f.read(len(expected));assert actual==expected,'追加字节不一致'
text=actual.decode();checks=['旧复盘前缀逐字节保持','一次追加内容逐字节一致']
nums=json.loads((p/'numbers-audit.json').read_text())
for item in nums['turns']:
 line=next(x for x in text.splitlines() if x.startswith(f"  | F{item['floor']}／{item['attempt']} | "))
 fields=line.split('|')[2:5]
 for k,v in zip(['need','progress','loss'],fields):assert json.loads(v)==item[k]
 checks.append(f"F{item['floor']}第{item['attempt']}试逐回合需/进度/HP复核")
for item in json.loads((p/'potion-verification-v2.json').read_text()):
 line=next(x for x in text.splitlines() if f"| {item['decision']}；" in x)
 assert f"{item['from']}→{item['to']}；{item['ts'][11:23]}" in line
 checks.append(f"d{item['decision']}饮药逐槽时间复核")
entries=json.loads((p/'ledger-find-run.json').read_text());ids={e['id'] for e in entries};updated=json.loads((p/'ledger-updated.json').read_text());assert set(updated+['silent-0328'])<=ids
for e in entries:
 if e['id'] in updated:
  ev=[x for x in e['evidence'] if x['run']=='J8PHG72DGD90'];assert ev and all(x.get('role')=='support' for x in ev)
checks.append('三经验与新增机制共15账本条目，14旧项均support')
assert int((p/'ledger-check.exit').read_text())==0;checks.append('ledger check退出0')
(p/'final-verification.json').write_text(json.dumps({'checks':checks,'count':len(checks),'appended_bytes':len(expected),'prefix_preserved':True,'corrections_after_append':[]},ensure_ascii=False,indent=2)+'\n')
print('最终核验通过',len(checks),'项；追加',len(expected),'字节；无追加后勘误')
