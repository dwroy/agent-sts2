import bisect
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
N = 'H1T1F8ML9FUE'
S = [json.loads(line) for line in (O/N/'states.jsonl').open()]
D = [json.loads(line) for line in (O/N/'decisions.jsonl').open()]
T = [s['ts'] for s in S]
checks = []

def check(name, value):
    checks.append(dict(name=name, passed=bool(value)))
    assert value, name

def state(ts):
    i = bisect.bisect_left(T, ts)
    assert T[i] == ts
    return S[i]['state']

def powers(entity):
    return {p['power_id']: p['amount'] for p in entity.get('powers', [])}

def pair(ts):
    i = bisect.bisect_left(T, ts)
    assert T[i] == ts
    return S[i]['state'], S[i+1]['state']

check('本局930帧均静默', len(S) == 930 and all(s['state']['run']['character_id'].lower() == 'silent' for s in S))
check('决策844条', len(D) == 844)
brain = [json.loads(line) for line in (O/N/'brain.jsonl').open()]
check('实际49脑请求均Codex', len(brain) == 49 and all(b['engine'] == 'codex' for b in brain))
check('DeepSeek推理窗0行', (O/N/'deepseek-reasoning.jsonl').stat().st_size == 0)
a, b = pair('2026-10-08T05:46:44.702Z')
check('2敏防御7加余像1', powers(a['combat']['player'])['DEXTERITY_POWER'] == 2 and b['combat']['player']['block'] - a['combat']['player']['block'] == 8)
a, b = pair('2026-10-08T05:55:54.407Z')
check('沙坑1到2且余像补1', powers(a['combat']['enemies'][0])['SANDPIT_POWER'] == 1 and powers(b['combat']['enemies'][0])['SANDPIT_POWER'] == 2 and b['combat']['player']['block'] == 1)
check('沙虫末轮18血20毒实胜', a['combat']['enemies'][0]['current_hp'] == 18 and powers(a['combat']['enemies'][0])['POISON_POWER'] == 20 and any(s['state']['run']['floor'] == 33 and s['state']['screen'] == 'REWARD' and s['state']['run']['current_hp'] == 28 for s in S))
a, b = pair('2026-10-08T06:03:01.928Z')
check('群蛇4扣盾而防御脆弱3挡', powers(a['combat']['player'])['SERPENT_FORM_POWER'] == 4 and b['combat']['enemies'][0]['block'] == 14 and a['combat']['enemies'][0]['block'] == 18 and b['combat']['player']['block'] == 3)
a, b = pair('2026-10-08T06:03:28.315Z')
check('蜃景重放牌挡6余像2群蛇8', powers(a['combat']['enemies'][0])['POISON_POWER'] == 5 and b['combat']['player']['block'] - a['combat']['player']['block'] == 8 and a['combat']['enemies'][0]['block'] == 4 and b['combat']['enemies'][0]['current_hp'] == 96 and a['combat']['enemies'][0]['current_hp'] == 100)
a, b = pair('2026-10-08T06:08:37.266Z')
check('零毒零敏蜃景实0挡', a['combat']['player']['block'] == b['combat']['player']['block'] == 0 and all(powers(e).get('POISON_POWER', 0) == 0 for e in a['combat']['enemies']))
a, b = pair('2026-10-08T06:10:49.015Z')
check('末轮毒雾3建立但未即施毒', powers(b['combat']['player'])['NOXIOUS_FUMES_POWER'] == 3 and powers(b['combat']['enemies'][0]).get('POISON_POWER', 0) == 0)
check('末轮34血30攻凋萎6死敌402', b['run']['current_hp'] == 34 and b['combat']['player']['block'] == 0 and b['combat']['enemies'][0]['current_hp'] == 402 and b['combat']['enemies'][0]['intents'][0]['total_damage'] == 30 and any(c['card_id'] == 'WITHER' and '6' in c.get('resolved_rules_text', '') for c in b['combat']['hand']) and S[-1]['state']['run']['current_hp'] == 0)
other = []
for p in sorted(Path('knowledge/characters/silent').glob('*.json')):
    if p.name == 'experience.json':
        continue
    x = json.load(p.open())
    other.append(dict(file=str(p), sha256=hashlib.sha256(p.read_bytes()).hexdigest(), keys=list(x), metadata={k:v for k,v in x.items() if k in ['_about', 'generated', 'generated_at', 'version']}))
(O/'other-knowledge.json').write_text(json.dumps(other, ensure_ascii=False, indent=2)+'\n')
(O/'verify.json').write_text(json.dumps(checks, ensure_ascii=False, indent=2)+'\n')
print('本局独立帧核验', len(checks), '项通过；其他知识', len(other), '份')
