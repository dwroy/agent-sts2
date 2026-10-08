import json, re, collections, datetime
from pathlib import Path

root=Path('/home/dw/Projects/agent-sts2')
p=Path(__file__).parent
runs=['K2JAGKVJAWZJ','79UCJ0K6R9C1']
expected={
 'K2JAGKVJAWZJ':dict(floor=46,code='6fd495cc+dirty',count=722,state_count=814,duration=3004.677,low=17,plans=138,best_n=134,best_yes=130,rank_n=111,rank1=74,auto=101,auto_turns=81,deck=34,upgraded=16,jev_in=890543,jev_out=9572,brain_in=6500256,brain_out=16395),
 '79UCJ0K6R9C1':dict(floor=14,code='f8947651+dirty',count=235,state_count=243,duration=713.764,low=5,plans=78,best_n=77,best_yes=77,rank_n=66,rank1=54,auto=11,auto_turns=7,deck=21,upgraded=0,jev_in=376203,jev_out=4943,brain_in=1825951,brain_out=4831)
}
result={}
for run in runs:
 sources={}
 for name in ('runs','decisions','states','run-plans','sl-attempts'):
  sources[name]=[]
  with (root/'logs'/f'{name}.jsonl').open('rb') as original, (p/f'{run}-{name}.jsonl').open() as selected:
   for l in selected:
    r=json.loads(l);original.seek(r['_offset']);raw=json.loads(original.readline())
    assert raw=={k:v for k,v in r.items() if k not in ('_line','_offset')},(run,name,r['_line'])
    sources[name].append(r)
  result.setdefault(run,{})[name+'_original_rows_checked']=len(sources[name])
 e=expected[run];meta=sources['runs'][0];ds=sources['decisions'];ss=sources['states'];states={x['_line']:x['state'] for x in ss}
 assert str(meta['character']).lower()=='silent' and meta['ascension']==10 and not meta['victory'] and meta['ended']
 assert meta['floor']==e['floor'] and meta['code']==e['code']
 assert len(ds)==e['count'] and len(ss)==e['state_count']
 duration=(datetime.datetime.fromisoformat(ds[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(ds[0]['ts'].replace('Z','+00:00'))).total_seconds()
 assert duration==e['duration']
 assert sum(d['decider']=='jev' and d.get('confidence') is not None and d['confidence']<.35 for d in ds)==e['low']
 js=[d for d in ds if d['decider']=='jev' and d['label'].startswith('combat/plan-choice')]
 best=[d['rollout_best_chosen'] for d in js if isinstance(d.get('rollout_best_chosen'),bool)]
 ranks=[int(m.group(1)) for d in js if (m:=re.search(r'code rank (\d+)',d.get('rationale','')))]
 assert (len(js),len(best),sum(best),len(ranks),sum(x==1 for x in ranks))==(e['plans'],e['best_n'],e['best_yes'],e['rank_n'],e['rank1'])
 auto=[d for d in ds if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue']
 assert len(auto)==e['auto'] and len({(d.get('sl_reloads'),d['floor'],d.get('turn')) for d in auto})==e['auto_turns']
 final=ss[-1]['state'];deck=final['run']['deck'];assert len(deck)==e['deck'] and sum(c['upgraded'] for c in deck)==e['upgraded']
 for dec,key in [('jev','jev'),('codex','brain')]:
  for field,short in [('input_tokens','in'),('output_tokens','out')]:
   assert sum(d.get('usage',{}).get(field,0) for d in ds if d['decider']==dec)==e[key+'_'+short]
 assert meta['tokens']==e['jev_in']+e['jev_out'] and meta['ds_tokens_in']==e['brain_in'] and meta['ds_tokens_out']==e['brain_out']
 rc=json.loads((p/f'{run}-resources.json').read_text());combats=rc['combats'];assert all(c['entry_is_turn_one'] for c in combats)
 for c in combats:
  for f in ('entry','last','exit'):
   frame=c.get(f)
   if not frame:continue
   raw=states[frame['line']]
   assert (raw['run']['current_hp'],raw['run']['max_hp'])==(frame['hp'],frame['max_hp'])
  if c.get('exit'):assert c['observed_net_hp_loss']==c['entry']['hp']-c['exit']['hp']
 last=combats[-1]
 def losses(c):
  out=collections.defaultdict(int)
  for z in c['changes']:out[z['from']['turn']]+=z['from']['hp']-z['to']['hp']
  return [out[t] for t in range(1,c['last']['turn']+1)]
 if run=='K2JAGKVJAWZJ':
  assert len(combats)==18 and len(sources['sl-attempts'])==3
  assert (last['entry']['hp'],last['entry']['max_hp'],last['exit']['hp'],last['exit']['turn'])==(86,91,0,9)
  assert losses(last)==[0,0,2,0,39,26,6,0,13]
  assert [t['net_live_enemy_hp_loss'] for t in last['enemy_hp_audit']['turns']]==[0,25,14,25,38,8,43,14,0]
  assert states[293158]['combat']['player']['block']==states[293159]['combat']['player']['block']==16
  assert states[292940]['combat']['enemies'][0]['current_hp']==states[292941]['combat']['enemies'][0]['current_hp']==54
  pois=lambda s:[q['amount'] for q in s['combat']['enemies'][0]['powers'] if q['power_id']=='POISON_POWER'][0]
  assert (pois(states[292940]),pois(states[292941]))==(42,48)
  assert states[292942]['run']['current_hp']==62
 else:
  assert len(combats)==7 and len(sources['sl-attempts'])==0
  assert (last['entry']['hp'],last['entry']['max_hp'],last['exit']['hp'],last['exit']['turn'])==(51,70,0,11)
  assert losses(last)==[0,0,0,0,0,32,3,3,0,11,2]
  assert [t['net_live_enemy_hp_loss'] for t in last['enemy_hp_audit']['turns']]==[18,3,0,0,0,29,-62,15,6,5,9]
  assert [q['current_hp'] for q in states[293447]['combat']['enemies']]==[19,21,18,20]
  assert states[293463]['combat']['player']['block']==states[293464]['combat']['player']['block']==7
  pois=lambda s:[q['amount'] for q in s['combat']['enemies'][0]['powers'] if q['power_id']=='POISON_POWER'][0]
  assert (pois(states[293463]),pois(states[293464]),pois(states[293465]))==(4,10,10)
  assert [q['current_hp'] for q in states[293465]['combat']['enemies']]==[8,21,14]
  assert states[293465]['run']['current_hp']==0
  assert len([q for q in states[293464]['combat']['hand'] if q['card_id']=='INFECTION'])==3
  assert losses(combats[4])==[-5,-4,14,16,19,0]
  assert [t['net_live_enemy_hp_loss'] for t in combats[4]['enemy_hp_audit']['turns']]==[20,16,19,26,28,23]
 result[run]['key_numbers']='通过；K2升级张数和79休息出处及遗物名称按已追加勘误核对'
 result[run]['combats_checked']=len(combats)
 result[run]['statistics']=e
with (p/'verification.json').open('w') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
for run,item in result.items():print(run,'原始偏移校验通过，战斗',item['combats_checked'],'末战HP/回合/敌血/药水/统计通过')
