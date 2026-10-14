import json,hashlib,collections,datetime
from pathlib import Path
P=Path(__file__).resolve().parent;ROOT=P.parents[2];D=json.load((P/'decisions.json').open());S=json.load((P/'states.json').open());R=json.load((P/'LKC9YXKZWTKR-resources.json').open());by={x['_line']:x for x in S};ds={x['_line']:x for x in D}
with (ROOT/'logs/states.jsonl').open('rb') as f:
 for x in S:
  f.seek(x['_offset']);z=json.loads(f.readline());assert z=={k:v for k,v in x.items() if k not in ['_line','_offset']}
assert len(S)==833 and len(D)==798 and len(R['combats'])==19
assert all(c['entry_is_turn_one'] and c['exit']['screen']=='REWARD' for c in R['combats'])
assert [(c['entry']['hp'],c['exit']['hp']) for c in R['combats']]==[(56,49),(49,49),(49,49),(49,40),(61,35),(35,33),(54,50),(50,39),(39,4),(56,47),(77,62),(62,62),(62,53),(53,53),(76,47),(68,62),(62,48),(68,61),(61,1)]
assert sum(c['observed_net_hp_loss'] for c in R['combats'])==243
assert sum(d['label']=='combat/plan' and d['decider']=='code' for d in D)==99
assert sum(d['rationale'].startswith('continuing the Jev-chosen plan') for d in D)==199
assert len({(d['floor'],d['turn']) for d in D if d['decider']=='code' and d['label'] in ['combat/plan','combat/lethal','combat/mod-lethal','combat/least-loss']})==94
assert len({(x['state']['run']['floor'],x['state']['turn']) for x in S if x['state'].get('in_combat')})==116
jev=[d for d in D if d['decider']=='jev'];assert len(jev)==176 and sum(d.get('confidence',1)<.35 for d in jev)==19
comp=[d for d in jev if d['label'].startswith('combat/plan-choice')];assert len(comp)==150 and sum(d.get('rollout_best_chosen') is True for d in comp)==141 and sum(d.get('rollout_best_chosen') is False for d in comp)==8
assert len([d for d in D if d.get('focus')])==41
assert sum(d.get('selection_audit',{}).get('answer',{}).get('line','').startswith('focus:') for d in D if d.get('focus'))==22
assert not any(d.get('fallback') for d in D)
guards=[d for d in D if 'HP guard:' in d['rationale']];assert [(d['floor'],d['turn']) for d in guards]==[(49,4),(49,6),(49,12)]
assert [d['hp_guard']['predicted_hp_saved'] for d in guards]==[14,3,14]
assert [d['hp_guard']['predicted_damage_change'] for d in guards]==[3,0,-21]
assert all(d['selection_audit']['sl_delta']=={'hp_loss':0,'damage':0,'strength_gained':0,'lasting_value':0} for d in guards)
potion=json.load((P/'potion-audit.json').open());assert collections.Counter(x[0] for x in potion)=={'获得':13,'饮用':13}
assert sum(d['chosen']['action']=='use_potion' for d in D)==13
assert not any(d['chosen']['action']=='discard_potion' for d in D)
assert ds[385937]['label']=='combat/plan' and 'hp -21, dmg 5' in ds[385937]['rationale']
assert by[397780]['state']['run']['current_hp']==22 and by[397781]['state']['combat']['player']['block']==11
assert by[397782]['state']['run']['current_hp']==1 and by[397782]['state']['combat']['enemies'][0]['current_hp']==31
assert by[397783]['state']['screen']=='REWARD' and by[397783]['state']['run']['current_hp']==1
assert by[397713]['state']['combat']['player']['energy']==1 and by[397714]['state']['combat']['player']['energy']==3
assert by[397716]['state']['combat']['player']['block']==39
assert sum((d.get('usage') or {}).get('input_tokens',0) for d in jev)==2035675
brains=[json.loads(l.split(':',1)[1]) for l in (P/'brain-numbered.jsonl').open()];assert len(brains)==45 and all(b['accepted'] and b['model']=='gpt-6.1-sol' and b['effort']=='xhigh' for b in brains)
assert [sum(b['usage'].get(k,0) or 0 for b in brains) for k in ['inputTokens','outputTokens','cacheHitTokens','reasoningTokens']]==[6876579,38534,4250240,35038]
sl=[json.loads(l.split(':',1)[1]) for l in (P/'sl-numbered.jsonl').open()];assert [(b['floor'],b['attempt'],b['result'],b['turns']) for b in sl]==[(17,1,'won',12),(33,1,'won',7),(48,1,'won',9),(49,1,'won',16)]
assert (P/'deepseek-window.jsonl').stat().st_size==0
assert (datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds()==4019.82
text=(P/'draft.md').read_text();assert text.count('- [记录]')==1 and len([l for l in text.splitlines() if l.startswith('- [')])==4 and '@@' not in text
assert text.count('（之前学过：')==3 and '原选线带focus标签的22题' in text
print('固定原始证据及主要数字核验通过；833原始状态按字节偏移逐条读回一致')
