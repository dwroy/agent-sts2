import pathlib,json,collections,hashlib,datetime,re
p=pathlib.Path(__file__).parent;root=p.parents[2];checks=[]
def check(name,condition):
 checks.append({'check':name,'ok':bool(condition)})
 if not condition:raise AssertionError(name)
for name in ('runs','decisions','run-plans','states','sl-attempts','run-config','codex-calls','brain','jev-prompts'):
 with (root/'logs'/f'{name}.jsonl').open('rb') as source:
  for l in (p/f'{name}.jsonl').open():
   row=json.loads(l);offset=row.pop('_offset',None);no=row.pop('_line')
   if offset is not None:source.seek(offset);original=json.loads(source.readline());check(f'{name}:{no}:原件seek',row==original)
 # brain and Jev prompts retain source line rather than byte offset; stream own run only.
 if name in ('brain','jev-prompts'):
  selected={json.loads(l)['_line']:json.loads(l) for l in (p/f'{name}.jsonl').open()}
  with (root/'logs'/f'{name}.jsonl').open() as source:
   for no,l in enumerate(source,1):
    if no not in selected:continue
    row=selected[no].copy();row.pop('_line');check(f'{name}:{no}:流式原件',row==json.loads(l))
ss=[json.loads(l) for l in (p/'states.jsonl').open()];ds=[json.loads(l) for l in (p/'decisions.jsonl').open()];s={x['_line']:x['state'] for x in ss};d={x['_line']:x for x in ds};rc=json.load((p/'NBJBVSBNPYQB-resources.json').open());run=json.loads((p/'runs.jsonl').open().readline())
check('完局角色',run['character'].lower()=='silent' and run['ended'] and not run['victory'] and run['floor']==49 and run['ascension']==10 and run['code']=='10168ac71+dirty')
check('窗口24',len(rc['combats'])==24);check('首帧全T1',all(c['entry_is_turn_one'] for c in rc['combats']))
for c in rc['combats']:
 for key in ('entry','last','exit'):
  r=c.get(key)
  if not r:continue
  origin=s[r['line']];belt=sorted([[v['index'],v['potion_id']] for v in origin['run']['potions'] if v.get('occupied')],key=lambda v:str(v[0]));check(f"窗口{c['sequence']}:{key}:HP槽位",r['hp']==origin['run']['current_hp'] and r['max_hp']==origin['run']['max_hp'] and r['potions']==belt)
check('F48链',s[322340]['run']['current_hp']==49 and s[322374]['run']['current_hp']==27 and not any(v['occupied'] for v in s[322374]['run']['potions']))
check('F49初始',all(c['entry']['hp']==27 and c['entry']['max_hp']==75 and c['entry']['potions']==[[0,'POTION_SHAPED_ROCK']] for c in rc['combats'][18:]))
check('末6血15挡',s[322461]['run']['current_hp']==6 and s[322461]['combat']['player']['block']==15)
check('威胁36',sum(i.get('total_damage') or 0 for e in s[322461]['combat']['enemies'] for i in e['intents'])==36)
check('死亡T3',s[322462]['screen']=='GAME_OVER' and s[322462]['turn']==3 and s[322462]['run']['current_hp']==0)
check('末敌血',sorted((e['enemy_id'],e['current_hp']) for e in s[322462]['combat']['enemies'])==[('QUEEN',394),('TORCH_HEAD_AMALGAM',157)])
check('三99',all(any(v['power_id']==power and v['amount']==99 for v in s[322459]['combat']['player']['powers']) for power in ('WEAK_POWER','FRAIL_POWER','VULNERABLE_POWER')))
check('同指纹',d[313856]['fingerprint']==d[313870]['fingerprint'])
check('两T1实伤',sum(e['current_hp'] for e in s[322376]['combat']['enemies'])-sum(e['current_hp'] for e in s[322382]['combat']['enemies'])==58)
check('第二T1实伤',630-sum(e['current_hp'] for e in s[322396]['combat']['enemies'])==75)
check('净损16vs21',s[322384]['run']['current_hp']==11 and s[322397]['run']['current_hp']==6)
player_expected={12:[0,0,20,11,7,10,0],17:[0,0,16,0,3,0,25,0,2,0],33:[0,14,0,29,12,0,14,0],42:[9,0,0,3,31,10,0],45:[0,19,0,25,0,0],48:[0,4,0,18,0,0]}
for c in rc['combats']:
 if c['floor'] not in player_expected:continue
 grouped=collections.defaultdict(list)
 for row in ss:
  if c['entry']['line']<=row['_line']<=c['exit']['line'] and row['state'].get('turn') is not None:grouped[row['state']['turn']].append(row)
 starts=[v[0]['state']['run']['current_hp'] for v in grouped.values()];ends=starts[1:]+[c['exit']['hp']];check(f"F{c['floor']}:每轮HP",[a-b for a,b in zip(starts,ends)]==player_expected[c['floor']])
for c in rc['combats'][18:]:
 exp=[58,4,0] if c['sequence']==19 else [58,10,0] if c['sequence']==22 else [75,14,0] if c['sequence'] in (21,23) else [75,4,0]
 check(f"F49/{c['sequence']-18}:敌HP进度",[v['visible_enemy_hp_loss_lower_bound'] for v in c['enemy_hp_audit']['turns']]==exp)
check('护栏2',sum('HP guard:' in x['rationale'] for x in ds)==2);check('SL覆盖4',sum('SL explore' in x['rationale'] for x in ds)==4)
check('执行药28/弃0',sum(x['chosen'].get('action')=='use_potion' for x in ds)==28 and not any(x['chosen'].get('action')=='discard_potion' for x in ds))
adds=[v for e in rc['resource_changes'] if not e['restart_boundary'] for v in e['to']['potions'] if v not in e['from']['potions']];check('新增药24/石13',len(adds)==24 and sum(v[1]=='POTION_SHAPED_ROCK' for v in adds)==13)
rolls=collections.Counter(str(x.get('rollout_best_chosen')) for x in ds if x['decider']=='jev' and x['label'].startswith('combat/plan-choice'));check('推演102/114',rolls=={'True':102,'False':12,'None':1})
check('低信心15',sum(x['decider']=='jev' and isinstance(x.get('confidence'),(float,int)) and x['confidence']<.35 for x in ds)==15)
normalized=collections.Counter('jev-plan' if x['rationale'].startswith('continuing the Jev-chosen plan') else x['decider'] for x in ds);check('decider口径',normalized==run['deciders'])
for who,values in [('jev',{'input_tokens':828342,'output_tokens':7494}),('codex',{'input_tokens':6323012,'output_tokens':11742,'cache_hit_tokens':3606656,'reasoning_tokens':8049})]:
 for k,v in values.items():check(f'{who}:{k}',sum((x.get('usage') or {}).get(k,0) or 0 for x in ds if x['decider']==who)==v)
brain=[json.loads(l) for l in (p/'brain.jsonl').open()];check('完整Codex47',len(brain)==47 and all(x['engine']=='codex' and x['accepted'] for x in brain));check('含独立计划的完整tokens',sum(x['usage']['inputTokens'] for x in brain)==6453112 and sum(x['usage']['outputTokens'] for x in brain)==12488 and sum(x['usage']['cacheHitTokens'] for x in brain)==3606656)
check('用时', (datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds()==2486.894)
check('无旧标题',not re.search(r'^## NBJBVSBNPYQB', (root/'notes/lessons.md').read_text(),re.M))
(p/'verification-before.json').write_text(json.dumps({'checks':checks,'count':len(checks),'ok':True},ensure_ascii=False,indent=2)+'\n');print('核验通过',len(checks))
