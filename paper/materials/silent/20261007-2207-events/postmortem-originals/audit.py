import json,pathlib,collections,datetime
p=pathlib.Path(__file__).parent
d=[json.loads(l) for l in (p/'decisions.jsonl').open()];s=[json.loads(l) for l in (p/'states.jsonl').open()];r=json.loads((p/'TXZ6RVMQA09D-resources.json').read_text())
byline={x['_line']:x for x in s}
def powers(c):return {z['power_id']:z['amount'] for z in c.get('powers',[])}
out=[]
for i,c in enumerate(r['combats']):
 end=c['exit']['line'] if c['exit'] else c['last']['line']
 frames=[x for x in s if c['entry']['line']<=x['_line']<=end]
 ts=collections.defaultdict(list)
 for x in frames:ts[x['state'].get('turn')].append(x)
 turns=[]
 for t,fs in ts.items():
  if t is None:continue
  alive=[x for x in fs if (x['state'].get('combat') or {}).get('enemies')]
  if not alive:continue
  first=alive[0];st=first['state'];co=st['combat'];needs=sum(e['current_hp'] for e in co['enemies'] if e.get('is_alive'))
  dmg=0;details=[]
  for a,b in zip(frames,frames[1:]):
   if a['state'].get('turn')!=t:continue
   ea={(e['index'],e['enemy_id']):e for e in (a['state'].get('combat') or {}).get('enemies',[])}
   eb={(e['index'],e['enemy_id']):e for e in (b['state'].get('combat') or {}).get('enemies',[])}
   for k,v in ea.items():
    if k in eb:
     diff=max(0,v['current_hp']-eb[k]['current_hp']);dmg+=diff
     if diff:details.append([a['_line'],b['_line'],k,diff])
    elif v['current_hp']>0:
     # Disappearance is preserved as unknown rather than counted as dealt damage.
     details.append([a['_line'],b['_line'],k,'消失剩血'+str(v['current_hp'])])
  ready=next((x for x in alive if (x['state']['combat'].get('action_readiness') or {}).get('can_use_combat_actions')),None)
  nextfirst=next((x for x in frames if isinstance(x['state'].get('turn'),int) and x['state']['turn']>t),None)
  after=nextfirst or frames[-1]
  hpstart=(ready or first)['state']['run']['current_hp']
  hpend=after['state']['run']['current_hp']
  turns.append({'turn':t,'need':needs,'damage_visible':dmg,'hp_before':hpstart,'hp_after':hpend,'net_loss':hpstart-hpend,'entry_line':first['_line'],'last_line':alive[-1]['_line'],'after_line':after['_line'],'details':details,'ready':ready is not None})
 out.append({'seq':c['sequence'],'floor':c['floor'],'turns':turns})
(p/'turn-audit.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print('统计')
j=[x for x in d if x['decider']=='jev'];jp=[x for x in j if x['label'].startswith('combat/')];known=[x for x in jp if type(x.get('rollout_best_chosen')) is bool];low=[x for x in j if (x.get('confidence') or 1)<.35]
print('Jev',len(j),'低信心',len(low),collections.Counter(x['label'] for x in low),'推演最优',sum(x['rollout_best_chosen'] for x in known),len(known),'boss',sum(x['rollout_best_chosen'] for x in known if x['floor']==48),sum(x['floor']==48 for x in known))
code=[x for x in d if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'];print('代码',len(code),collections.Counter(x['label'] for x in code),'自主窗口',len({(x['floor'],x.get('sl_attempt'),x['turn']) for x in code}),'总窗口',sum(len(x['turns']) for x in out))
focus=[]
for x in jp:
 criteria=(x.get('questions') or {}).get('plan',{}).get('criteria',{});opts=[]
 for k,v in criteria.items():
  if 'focus' in v.lower():opts.append((k,json.loads(v).get('focus')))
 if opts:focus.append((x['_line'],x['floor'],x['turn'],opts,x.get('answers',{}).get('plan',{}).get('choice')))
print('focus',focus)
for f in out:print('回合',f['seq'],'F',f['floor'],'需',[x['need'] for x in f['turns']],'可见扣',[x['damage_visible'] for x in f['turns']],'损',[x['net_loss'] for x in f['turns']])
print('药水决策')
for x in d:
 if x['chosen'].get('action') in ['use_potion','discard_potion']:print(x['_line'],x['ts'],x['floor'],x['turn'],x['chosen'],x['rationale'])
print('用时',(datetime.datetime.fromisoformat(d[-1]['ts'])-datetime.datetime.fromisoformat(d[0]['ts'])).total_seconds())
for who in ['jev','codex']:
 rows=[x for x in d if x['decider']==who];print('tokens',who,{k:sum(x.get('usage',{}).get(k,0) for x in rows) for k in ['input_tokens','output_tokens','cache_hit_tokens']})
print('BOSS关键帧')
for seq in [23,24,25]:
 f=out[seq-1]
 for a in f['turns']:
  line=a['last_line'];st=byline[line]['state'];co=st['combat'];print(seq,a['turn'],line,st['run']['current_hp'],co['player']['block'],powers(co['player']),[(e['current_hp'],powers(e),e.get('intents')) for e in co['enemies']],[(h['card_id'],h['resolved_rules_text']) for h in co['hand'] if h['card_id']=='WITHER'])
