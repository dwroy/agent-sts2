import json,hashlib,collections,datetime
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[2]
manifest=[]
for name in ['runs','decisions','states','run-plans','sl-attempts','brain','codex-calls','run-config']:
 with (root/f'logs/{name}.jsonl').open('rb') as raw,(p/f'{name}.jsonl').open() as src:
  for line in src:
   copied=json.loads(line);ref=copied.pop('_source');raw.seek(ref['offset']);body=raw.read(ref['length']);original=json.loads(body)
   assert all(original.get(k)==v for k,v in copied.items()),(name,ref['line'])
   manifest.append({**ref,'sha256':hashlib.sha256(body).hexdigest()})
for run in ['0DTPVHFXJ319','U1QYLX1AE1WX']:
 for name in ['states','decisions']:
  with (root/f'logs/{name}.jsonl').open('rb') as raw,(p/f'prior-{run}-{name}.jsonl').open() as src:
   for line in src:
    copied=json.loads(line);ref=copied.pop('_source');raw.seek(ref['offset']);body=raw.read(ref['length']);assert json.loads(body)==copied
    manifest.append({**ref,'run':run,'sha256':hashlib.sha256(body).hexdigest()})
D=[json.loads(l) for l in (p/'decisions.jsonl').open()];S=[json.loads(l) for l in (p/'states.jsonl').open()];R=json.loads((p/'Q9FM7A80E4BZ-resources.json').read_text());C=[json.loads(l) for l in (p/'codex-calls.jsonl').open()];by={x['_source']['line']:x['state'] for x in S}
assert len(D)==515 and len(S)==535 and len(R['combats'])==13
assert [x['entry']['hp'] for x in R['combats']]==[56,55,50,49,50,43,39,60,60,60,60,60,60]
assert [x['exit']['hp'] for x in R['combats'][:7]]==[55,50,49,9,30,39,39]
assert all(x['entry_is_turn_one'] for x in R['combats'])
assert all(x['entry']['max_hp']==70 for x in R['combats'])
A=[json.loads(l) for l in (p/'sl-attempts.jsonl').open()]
assert [x['turns'] for x in A]==[10,8,10,10,10,11]
assert [x['result'] for x in A]==['predicted_death']*5+['died']
assert sum(x.get('reload') is not None for x in A)==5
last=R['combats'][-1]['enemy_hp_audit']['turns'];progress=[x['net_live_enemy_hp_loss'] for x in last]
assert progress==[0,7,17,20,28,10,36,30,19,19,23] and sum(progress)==209
poison=[0,7,6,5,4,10,9,15,14,13,12];assert sum(poison)==95
assert [x-y for x,y in zip(progress,poison)]==[0,0,11,15,24,0,27,15,5,6,11]
e=by[398322]['combat']['enemies'][0];assert by[398322]['run']['current_hp']==2 and by[398322]['combat']['player']['block']==1
assert e['current_hp']==36 and e['intents'][0]['total_damage']==18
assert by[398323]['run']['current_hp']==0 and by[398323]['combat']['enemies'][0]['current_hp']==24
potions=[d for d in D if d.get('chosen',{}).get('action')=='use_potion'];assert len(potions)==4
assert [(d['floor'],d['turn'],d['chosen']['option_index']) for d in potions]==[(7,1,0),(11,1,0),(11,4,1),(15,1,0)]
assert not any(d.get('chosen',{}).get('action')=='discard_potion' for d in D)
G=[d for d in D if d.get('hp_guard')];assert len(G)==8
assert sum(x['hp_guard']['predicted_hp_saved'] for x in G)==49
assert sum(x['hp_guard']['predicted_damage_change'] for x in G)==-42
changed=[]
for d in G:
 ex=d.get('sl_explore') or {}
 if ex.get('replay',{}).get('overridden') or ex.get('replacement') is not None:changed.append(d['_source']['line'])
assert changed==[386286,386332,386374]
kept=[d for d in G if d['_source']['line'] not in changed];assert len(kept)==5
assert sum(d['hp_guard']['predicted_hp_saved'] for d in kept)==28
assert sum(d['hp_guard']['predicted_damage_change'] for d in kept)==-21
assert len(C)==18 and all(c['model']=='gpt-6.1-sol' and c['effort']=='xhigh' for c in C)
usage={k:sum(c['usage'].get(k,0) for c in C) for k in ['inputTokens','outputTokens','cachedInputTokens','reasoningOutputTokens','totalTokens']}
assert usage=={'inputTokens':2738591,'outputTokens':22885,'cachedInputTokens':1640192,'reasoningOutputTokens':21403,'totalTokens':2761476}
assert (datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds()==2386.546
config=json.loads((p/'run-config.jsonl').read_text());assert (datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(config['ts'])).total_seconds()==2450.270
found={}
for relic in ['BOOK_OF_FIVE_RINGS','CENTENNIAL_PUZZLE','BAG_OF_MARBLES','THE_BOOT']:
 found[relic]=next((x['state']['run']['floor'],x['_source']['line']) for x in S if any(r['relic_id']==relic for r in x['state']['run']['relics']))
assert found=={'BOOK_OF_FIVE_RINGS':(7,397937),'CENTENNIAL_PUZZLE':(10,397955),'BAG_OF_MARBLES':(11,398014),'THE_BOOT':(12,398019)}
assert by[397862]['event']['event_id']=='DOORS_OF_LIGHT_AND_DARK'
section=[];active=False;headings=0
for line in (root/'notes/lessons.md').open():
 if line.startswith('## Q9FM7A80E4BZ'):active=True;headings+=1
 elif line.startswith('## '):active=False
 if active:section.append(line)
assert headings==1
section=''.join(section);assert section.count('\n- [')==4 and '### 勘误' in section
(p/'lessons-section.md').write_text(section)
(p/'raw-evidence-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
summary={'原始逐字节读回条数':len(manifest),'本局战斗窗口':13,'赢战':7,'boss尝试':6,'标题':headings,'主经验':3,'勘误':'事件ID、五轮书/百年积木/弹珠袋出处、启动用时、hp_guard源码引用已追加更正','关键数字复核':'进场HP、逐轮进度、终态、护栏/SL、药水、token及用时通过','ledger_check':'另跑CLI'}
(p/'verification.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps(summary,ensure_ascii=False))
