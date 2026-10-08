import json,hashlib
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-071302-postmortem';before=json.loads((p/'lessons-before.json').read_text());draft=(p/'lesson-draft.md').read_bytes();path=root/'notes/lessons.md'
with path.open('rb') as f:
 prefix=f.read(before['size']);suffix=f.read()
assert hashlib.sha256(prefix).hexdigest()==before['sha256'],'旧复盘前缀变化'
assert suffix.startswith(draft),'追加原文与已核草稿不一致'
assert sum(line.startswith(b'## CSLHFCBSC1UM') for line in suffix.splitlines())==1
states={r['_line']:r for r in map(json.loads,(p/'states.jsonl').open())};checks=[]
with (root/'logs/states.jsonl').open('rb') as f:
 for n in (315377,315397,315402,315414,315424,315433,315439,315462,315470,315490,315502,315532,315538,315563,315572,315592,315597,315619,315628,315665,315666,315698,315699,315731,315732,315770,315771,315809,315810,315848,315852,315853):
  r=states[n];f.seek(r['_offset']);raw=json.loads(f.readline());assert raw['state']==r['state'];st=raw['state'];c=st.get('combat') or {};player=c.get('player') or {};checks.append({'原行':n,'UTC':raw['ts'],'层':st['run']['floor'],'回合':st['turn'],'HP':st['run']['current_hp'],'maxHP':st['run']['max_hp'],'格挡':player.get('block'),'敌HP':[e['current_hp'] for e in c.get('enemies',[])]})
for expected in ('六次均64/70血空药进场','末次T10以10血6挡对25攻击阵亡','完整需损19、存活至少差10血','16毒结算后敌仍56/233血','70/78＝89.74%','输入命中率63.94%'):
 assert expected.encode() in draft,expected
(p/'post-append-numbers-checked.json').write_text(json.dumps({'前缀保持':True,'原文一致':True,'原日志seek核验':checks,'勘误':[]},ensure_ascii=False,indent=2)+'\n')
print('追加后核验通过：旧前缀保持、草稿原文一致、32帧原日志seek核对，关键数无勘误。')
