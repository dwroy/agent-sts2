import json,pathlib,re,datetime,subprocess
root=pathlib.Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261008-014304-postmortem';rid='RC61MFQM63Y6'
section='';active=False
for line in (root/'notes/lessons.md').open():
 if line.startswith('## '):active=line.startswith('## '+rid)
 if active:section+=line
assert section.count('\n- [')==4
assert len(re.findall(r'^## '+rid,section,re.M))==1
raw=json.load((p/'RC61MFQM63Y6-resources.json').open());aud=json.load((p/'resources-final.json').open())
expected=[(2,56,56),(3,56,46),(4,46,44),(5,44,23),(7,23,8),(12,29,23),(14,44,44),(17,59,2),(19,56,56),(20,56,46),(21,46,29),(23,44,20),(29,62,31)]
for c,e in zip(raw['combats'][:13],expected):
 assert (c['floor'],c['entry']['hp'],c['exit']['hp'])==e
 assert c['entry']['max_hp']==c['exit']['max_hp']==70
assert [c['last']['hp'] for c in raw['combats'][13:18]]==[7,2,45,7,2]
assert [c['last']['turn'] for c in raw['combats'][13:18]]==[7,5,4,7,5]
assert all(c['entry']['hp']==52 and c['entry']['max_hp']==70 and c['entry']['potions']==[[0,'BLOCK_POTION']] for c in raw['combats'][13:])
assert raw['combats'][-1]['exit']['hp']==0 and raw['combats'][-1]['exit']['turn']==4
for c in aud:
 if c['floor'] not in [7,17,23,29,33]:continue
 vals=[[t[k] for t in c['turns']] for k in ['need_body_hp','body_hp_net_removed','hp_net_lost']]
 forms=['['+','.join(map(str,v))+']' for v in vals]
 for form in forms:assert form in section,(c['sequence'],form)
sl=[json.loads(l)['data'] for l in (p/f'{rid}-sl-attempts.jsonl').open()]
assert [a['result'] for a in sl]==['won']+['predicted_death']*5+['died']
assert (sl[-1]['turns'],sl[-1]['incoming'])==(4,38)
assert sum(52-a['end_hp'] for a in sl[1:-1])==197
assert sl[-1]['judge']['reason']=='nothing left to play or drink; 38 incoming vs 31 HP + 6 block + 0 end-of-turn block'
dec=[json.loads(l) for l in (p/f'{rid}-decisions.jsonl').open()];states=[json.loads(l) for l in (p/f'{rid}-states.jsonl').open()]
lookup={x['line']:x['data'] for x in dec}
assert lookup[279021]['fingerprint']==lookup[279197]['fingerprint']
assert lookup[279042]['fingerprint']==lookup[279117]['fingerprint']
assert lookup[279117]['expect']['card']['id']=='NOXIOUS_FUMES'
stateby={x['line']:x['data']['state'] for x in states}
assert [c['card_id'] for c in stateby[285414]['combat']['hand']]==['SURVIVOR','STRIKE_SILENT']
assert stateby[285415]['combat']['hand']==[]
assert stateby[285415]['combat']['player']['block']==7
assert stateby[285415]['combat']['enemies'][1]['intents'][0]['total_damage']==57
assert stateby[285517]['combat']['player']['block']==6
assert stateby[285518]['run']['current_hp']==0
assert [e['current_hp'] for e in stateby[285518]['combat']['enemies']]==[167,149]
assert not any(r['relic_id']=='TOUGH_BANDAGES' for r in stateby[285415]['run']['relics'])
drinks=[x for x in dec if x['data']['chosen'].get('action')=='use_potion']
assert len(drinks)==15
assert not any(x['data']['chosen'].get('action')=='discard_potion' for x in dec)
newpots=[];heals=[]
for e in raw['resource_changes']:
 if e['combat_sequence'] is None and not e['restart_boundary']:
  if len(e['to']['potions'])>len(e['from']['potions']):newpots.append(e)
  if e['to']['hp']>e['from']['hp']:heals.append((e['to']['floor'],e['to']['hp']-e['from']['hp']))
assert len(newpots)==10
assert heals==[(8,21),(13,21),(15,15),(18,54),(22,15),(24,21),(27,21),(32,21)]
start=datetime.datetime.fromisoformat(dec[0]['data']['ts'].replace('Z','+00:00'));end=datetime.datetime.fromisoformat(dec[-1]['data']['ts'].replace('Z','+00:00'));obs=datetime.datetime.fromisoformat(states[0]['data']['observed_ts'].replace('Z','+00:00'))
assert (end-start).total_seconds()==2220.211
assert (end-obs).total_seconds()==2253.655
src=(root/'.worktrees/live/agent/src/reflex/turn-solver.ts').read_text().splitlines()
assert 'toughBandagesBlock' in src[1694] and 'discardAfterDraw' in src[1694]
head=subprocess.check_output(['git','-C',str(root/'.worktrees/live'),'rev-parse','HEAD'],text=True).strip()
result={'run':rid,'checked':'资源链、逐回合数组、SL恢复、死亡数字、同盘指纹、强制弃牌、药水获得和饮用、回血分账、时间与只读代码定位','checks':'通过','live_head_at_verification':head,'lesson_lines':len(section.splitlines()),'appended_section_count':1}
(p/'verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
