import bisect
import collections
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
A = json.load((O/'audit.json').open())
checks = []
slots = []

def check(label, value):
    checks.append(dict(主题=label,通过=bool(value)))
    assert value, label

tables = {
    'QHK1XQ928TTM': [(2,2),(3,0),(4,7),(5,16),(8,9),(11,6),(14,10),(15,4),(17,39),(19,8),(20,19),(24,24),(27,16),(31,19),(33,38)],
    'UZ1T7AH49WMB': [(2,4),(3,0),(5,0),(9,0),(13,35),(14,5),(15,10),(17,35),(19,14),(20,38),(25,15)],
    '7BNC8QX746YP': [(2,0),(6,0),(7,0),(11,10),(12,36),(14,31)],
}
frames = [767,422,159]
decisions = [746,406,152]
brains = [34,24,14]
for i,(run,expected) in enumerate(tables.items()):
    P = O/run
    S = [json.loads(l) for l in (P/'states.jsonl').open()]
    D = [json.loads(l) for l in (P/'decisions.jsonl').open()]
    B = [json.loads(l) for l in (P/'brain.jsonl').open()]
    check(run+'角色/帧数',len(S)==frames[i] and all(s['state']['run']['character_id'].lower()=='silent' and s['state']['run_id']==run for s in S))
    check(run+'决策/脑数及实际引擎',len(D)==decisions[i] and len(B)==brains[i] and all(b['engine']=='codex' for b in B))
    check(run+'逐房净损',[ (f['floor'],f['loss']) for f in A['fights'] if f['run']==run]==expected)
    check(run+'仅末房实际死',sum(f['death'] for f in A['fights'] if f['run']==run)==1)
    check(run+'实际DeepSeek0',not (P/'deepseek-reasoning.jsonl').stat().st_size)
    drinks=[d for d in D if (d.get('chosen') or {}).get('action')=='use_potion']
    SM={s['ts']:s['state'] for s in S}
    stamps=[s['ts'] for s in S]
    consumed=[]
    for d in drinks:
        before=SM[d['ts']]
        after=S[min(bisect.bisect_right(stamps,d['ts']),len(S)-1)]['state']
        slot=d['chosen']['option_index']
        b=next(p for p in before['run']['potions'] if p['index']==slot)
        a=next(p for p in after['run']['potions'] if p['index']==slot)
        consumed.append(bool(b['occupied'] and not a['occupied']))
        slots.append(dict(run=run,floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],slot=slot,potion=b['potion_id'],result=d['result'],after_screen=after['screen'],consumed=consumed[-1]))
    check(run+'饮药槽逐笔消失/未弃',[len(drinks),sum((d.get('chosen') or {}).get('action')=='discard_potion' for d in D)]==[[22,10,3][i],0] and all(consumed))
    check(run+'直接完成/随机选牌待稳分账',collections.Counter(d['result'].split(':')[0] for d in drinks)==collections.Counter({'completed':[13,8,3][i],**({'pending (unstable)':[9,2,0][i]} if i<2 else {})}))
    check(run+'实休回量',sum(max(0,r['after']-r['before']) for r in A['rests'] if r['run']==run)==[126,24,21][i])
    check(run+'血链终点',[56+126+35,66+18+24+48,56+21][i]-sum(loss for f,loss in expected[:-1])==[38,15,31][i])
    check(run+'SL实际记录数',sum(1 for l in (P/'sl-attempts.jsonl').open())==[10,5,0][i])

check('140局仅静默/分阶100A10',len(A['runs'])==140 and sum(r['ascension']==10 for r in json.load((O/'run-metadata.json').open()))==100)
check('2042独立战房/130实际死',len(A['fights'])==2042 and sum(f['death'] for f in A['fights'])==130)
offer=json.load((O/'history-offering.json').open())
check('16次祭品实际每次6血且挡不变能量加2',len(offer)==16 and all(r['before_hp']-r['after_hp']==6 and r['before_block']==r['after_block'] and r['after_energy']-r['before_energy']==2 for r in offer))
body=json.load((O/'history-corrupt_body_slam.json').open())
check('腐化撞击仅本局两次2血挡不变',len(body)==2 and all(r['before_hp']-r['after_hp']==2 and r['before_block']==r['after_block'] and r['run']=='QHK1XQ928TTM' for r in body))
effigy=json.load((O/'history-effigy.json').open())
check('27局雕像睡醒十力',len(effigy)==27 and all(r['supported'] and r['sleep'][0]['turn']==1 and r['wake'][0]['turn']==2 and r['strength10'][0]['turn']==3 for r in effigy))
rainbow=json.load((O/'history-rainbow.json').open())
check('彩虹32次/3局逐步力敏加1',len(rainbow)==32 and len({r['run'] for r in rainbow})==3 and all(r['after'].get('STRENGTH_POWER',0)-r['before'].get('STRENGTH_POWER',0)==1 and r['after'].get('DEXTERITY_POWER',0)-r['before'].get('DEXTERITY_POWER',0)==1 for r in rainbow))
cards=[r for r in A['cards'] if r['run']=='QHK1XQ928TTM' and r['floor']==33 and r['attempt']==6]
mirror=next(r for r in cards if r['turn']==2 and r['card']=='MIRAGE')
check('蜃景当前10毒1敏暗影翻倍实22挡',mirror['before']['block']==12 and mirror['after']['block']==34 and sum(e['powers'].get('POISON_POWER',0) for e in mirror['before']['enemies'])==10 and mirror['before']['powers'].get('DEXTERITY_POWER')==1)
for att,loss in [(3,14),(6,20)]:
    rows=[r for r in A['cards'] if r['run']=='QHK1XQ928TTM' and r['floor']==33 and r['attempt']==att and r['turn']==3]
    end=next(r for r in A['ends'] if r['run']=='QHK1XQ928TTM' and r['floor']==33 and r['attempt']==att and r['turn']==3)
    check('双蟹同盘第'+str(att)+'试血价',rows[0]['before']['hp']==35 and end['before']['hp']-end['after']['hp']==loss)
    check('双蟹同盘第'+str(att)+'试实际净进度47含直扣19毒28',sum(e['hp'] for e in rows[0]['before']['enemies'])-sum(e['hp'] for e in end['before']['enemies'])==19 and sum(e['hp'] for e in end['before']['enemies'])-sum(e['hp'] for e in end['after']['enemies'])==28)
for r in json.load((O/'other-knowledge.json').open()):
    check('其他静默知识未修改 '+r['file'],hashlib.sha256(Path(r['file']).read_bytes()).hexdigest()==r['sha256'])
(O/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
(O/'potion-slot-checks.json').write_text(json.dumps(slots,ensure_ascii=False,indent=2)+'\n')
print('独立数字检查通过',len(checks),'项。')
