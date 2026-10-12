import bisect, collections, json
from pathlib import Path

O = Path(__file__).parent
meta = {r['run_id']: r for r in json.load(open(O/'run-metadata.json'))}
cases, holders, excluded = [], [], []
for run in meta:
    acquired = None
    with (O/run/'states.jsonl').open() as f:
        for line in f:
            if 'UNSETTLING_LAMP' not in line:
                continue
            r = json.loads(line)
            if any(e['relic_id']=='UNSETTLING_LAMP' and not e.get('is_melted') for e in r['state']['run']['relics']):
                acquired = r['ts']; break
    if not acquired:
        continue
    holders.append(run)
    S = [json.loads(l) for l in (O/run/'states.jsonl').open()]
    sm = {s['ts']: s['state'] for s in S}; times = [s['ts'] for s in S]
    first = set()
    def powers(e): return {p['power_id']: p['amount'] for p in e.get('powers', [])}
    for line in (O/run/'decisions.jsonl').open():
        d = json.loads(line)
        if d['ts'] < acquired or not d.get('chosen') or d['chosen']['action']!='play_card' or not str(d.get('result','')).startswith('completed'):
            continue
        before = sm[d['ts']]; combat = before.get('combat') or {}
        if not combat: continue
        card_id = d.get('expect',{}).get('card',{}).get('id')
        card = next((c for c in combat['hand'] if c['card_id']==card_id), {})
        dynamic = {v['name']:v['current_value'] for v in card.get('dynamic_values',[])}
        debuff = '负面状态' in card.get('resolved_rules_text','') or any(k in dynamic for k in ['PoisonPower','WeakPower','VulnerablePower']) or card_id=='MALAISE'
        if not debuff: continue
        key = (d['floor'],d.get('sl_attempt') or 1)
        if key in first: continue
        first.add(key)
        after = S[min(bisect.bisect_right(times,d['ts']),len(S)-1)]['state']
        if not after.get('combat'): continue
        target = d['chosen'].get('target_index')
        b = next((e for e in combat['enemies'] if e['index']==target),None)
        a = next((e for e in after['combat']['enemies'] if e['index']==target),None)
        if not a or not b or len(after['combat']['enemies']) < len(combat['enemies']) or powers(b).get('ARTIFACT_POWER') or powers(combat['player']).get('BURST_POWER'):
            excluded.append(dict(run=run,floor=d['floor'],card=card_id,reason='目标退场/数组重排、非单目标、制品或重放，未用于首次数值公式'))
            continue
        fact = dict(run=run,asc=meta[run]['ascension'],floor=d['floor'],turn=d['turn'],attempt=d.get('sl_attempt') or 1,ts=d['ts'],card=card_id,text=card.get('resolved_rules_text'),dynamic=dynamic,before=powers(b),after=powers(a))
        if 'PoisonPower' in dynamic and card_id in ['DEADLY_POISON','POISONED_STAB']:
            fact['base']=dynamic['PoisonPower']; fact['actual']=powers(a).get('POISON_POWER',0)-powers(b).get('POISON_POWER',0)
            fact['kind']='poison'
        elif card_id=='MALAISE':
            fact['base']=combat['player']['energy']+(1 if card.get('is_upgraded') else 0)
            fact['actual']=[powers(b).get('STRENGTH_POWER',0)-powers(a).get('STRENGTH_POWER',0),powers(a).get('WEAK_POWER',0)-powers(b).get('WEAK_POWER',0)]
            fact['kind']='malaise'
        else:
            excluded.append(dict(run=run,floor=d['floor'],card=card_id,reason='不把其他负面状态或生成/重放外推为同一子公式'))
            continue
        fact['doubled'] = fact['base']>0 and (fact['actual']==2*fact['base'] if fact['kind']=='poison' else fact['actual']==[2*fact['base']]*2)
        cases.append(fact)
support = list(dict.fromkeys(r['run'] for r in cases if r['doubled']))
other = [r for r in cases if not r['doubled']]
result = dict(holders=holders,support=support,cases=cases,unresolved=other,excluded=excluded)
(O/'lamp-history.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('持有局',holders,'直接翻倍局',support,'未匹配',[(r['run'],r['floor'],r['card'],r['base'],r['actual']) for r in other])
print('直接案例',[(r['run'],r['floor'],r['card'],r['base'],r['actual']) for r in cases if r['doubled']])
