import json,pathlib,collections,re,datetime
p=pathlib.Path(__file__).parent

def rows(name):
 for l in (p/name).open():
  n,j=l.split(':',1);r=json.loads(j);r['_line']=int(n);yield r

ds=list(rows('decisions-lines.jsonl'));ss=list(rows('states-lines.jsonl'));chain=json.loads((p/'NEWRFAYKTQHR-resources.json').read_text())
for c in chain['combats']:
 lo=c['entry']['line'];hi=c.get('exit',{}).get('line') if c.get('exit') else c['last']['line'];group=[s for s in ss if lo<=s['_line']<=hi];ts=collections.OrderedDict()
 for r in group:
  if r['state'].get('in_combat'):ts.setdefault(r['state']['turn'],[]).append(r)
 losses=[]
 for t,rs in ts.items():
  nxt=next((r for r in group if r['_line']>rs[-1]['_line']),None)
  losses.append([t,rs[0]['state']['run']['current_hp']-(nxt or rs[-1])['state']['run']['current_hp']])
 c['player_observed_turn_net_losses']=losses
(p/'turn-audit.json').write_text(json.dumps(chain,ensure_ascii=False,indent=2)+'\n')
print('统计',len(ds),'state',len(ss),'plans',sum(1 for _ in rows('plans-lines.jsonl')))
print('总决策者',collections.Counter(r['decider'] for r in ds),'仅combat',collections.Counter((r['decider'],r['label']) for r in ds if r['label'].startswith('combat/')))
jev=[r for r in ds if r['decider']=='jev'];low=[r for r in jev if isinstance(r.get('confidence'),(int,float)) and r['confidence']<.35]
print('低信心',len(low),[(r['_line'],r['floor'],r['turn'],r['confidence']) for r in low])
plans=[r for r in jev if r['label'].startswith('combat/plan-choice')];best=[r for r in plans if type(r.get('rollout_best_chosen')) is bool];print('推演选优',len(plans),len(best),sum(r['rollout_best_chosen'] for r in best))
ranks=[int(m.group(1)) for r in plans if (m:=re.search(r'code rank (\d+)',r.get('rationale','')))];print('code rank',len(ranks),ranks.count(1))
guards=[r for r in ds if 'HP guard' in r.get('rationale','')];print('护栏',[(r['_line'],r['floor'],r['turn'],r['rationale']) for r in guards])
print('自主回合')
non=[r for r in ds if r['decider']=='code' and r['label'].startswith('combat/') and r['label']!='combat/plan-continue'];ck=lambda r:(r['floor'],r.get('sl_attempt'),r['turn']);codekeys=set(map(ck,non));jevkeys=set(map(ck,[r for r in jev if r['label'].startswith('combat/') or r['label'].startswith('selection/')]))
print('动作',len(non),'去重轮',len(codekeys),'全自主',len(codekeys-jevkeys),'混合',len(codekeys&jevkeys),'keys',sorted(codekeys,key=str))
print('喝药/丢药')
for r in ds:
 if r['chosen'].get('action') in ['use_potion','discard_potion']:print(r['_line'],r['floor'],r['turn'],r.get('sl_attempt'),r['chosen'],r['rationale'])
print('逐轮损')
for c in chain['combats']:print(c['sequence'],c['floor'],c['player_observed_turn_net_losses'])
print('末牌组')
run=ss[-1]['state']['run'];print('牌',len(run['deck']),collections.Counter((c['card_id'],c.get('upgraded')) for c in run['deck']));print('遗物',[(r['relic_id'],r['name'],r.get('description'),r.get('status')) for r in run['relics']]);print('宠物',ss[-1]['state'].get('combat',{}).get('player',{}).get('pets'))
print('focus')
for f in [28,31]:
 qq=[r for r in plans if r['floor']==f];print(f,len(qq),collections.Counter(str(a) for r in qq for a in [r.get('answers',{}).get('focus')]))
print('用时',(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds())
print('token按usage',collections.Counter({k:sum(r.get('usage',{}).get(k,0) or 0 for r in ds) for k in ['input_tokens','output_tokens','cache_hit_tokens','cache_miss_tokens']}));print('usage样例',next(r['usage'] for r in ds if r['decider']=='codex'))
