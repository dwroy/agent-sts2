import hashlib,json,re
from pathlib import Path
P=Path(__file__).parent
D=json.loads((P/'decisions.json').read_text());S=json.loads((P/'states.json').read_text());R=json.loads((P/'PF90JTU0UZ5M-resources.json').read_text());L={x['_line']:x['state'] for x in S}
assert len(D)==444 and len(S)==455 and len(R['combats'])==15
assert all(w['entry_is_turn_one'] for w in R['combats'])
expected=[(2,56,54),(3,54,41),(4,41,40),(5,40,32),(9,53,1),(13,22,15),(17,59,46),(19,65,47),(20,47,21),(21,21,None),(21,21,3),(22,3,None),(22,3,None),(22,3,None),(22,3,0)]
for w,(f,a,b) in zip(R['combats'],expected):
 assert w['floor']==f and w['entry']['hp']==a
 assert (w['exit']['hp'] if w['exit'] else None)==b
 assert w['entry']['max_hp']==70 and (w['exit'] or w['last'])['max_hp']==70
for n,h,b in [(304651,3,0),(304670,3,0),(304674,1,0),(304681,1,0),(304684,1,27),(304686,1,27),(304687,0,0)]:
 assert L[n]['run']['current_hp']==h and L[n]['combat']['player']['block']==b
assert L[304651]['combat']['hand']==L[304670]['combat']['hand']
last=L[304686]['combat'];assert [(e['current_hp']) for e in last['enemies']]==[58,25]
assert sum(h['card_id']=='TOXIC' for h in last['hand'])==2
assert sum(i['total_damage'] or 0 for e in last['enemies'] for i in e['intents'])==19
assert [(e['current_hp']) for e in L[304687]['combat']['enemies']]==[58,16]
for a,b in [(304628,304629),(304647,304648),(304666,304667),(304685,304686),(304580,304581)]:
 ee=L[a]['combat']['enemies'];ff=L[b]['combat']['enemies']
 assert [e['current_hp'] for e in ee]==[e['current_hp'] for e in ff]
 def total(es):return sum(v['amount'] for e in es for v in e['powers'] if v['power_id']=='POISON_POWER')
 assert total(ff)-total(ee)==6
for a,b in [(304289,304290),(304448,304449)]:assert L[a]['combat']['player']['block']==5 and L[b]['combat']['player']['block']==15
J=[x for x in D if x['decider']=='jev'];assert len(J)==156 and sum(x['confidence']<.35 for x in J)==22
Q=[x for x in J if x['label'] in ['combat/plan-choice','combat/plan-choice+potion']];assert len(Q)==118
assert sum(x.get('rollout_best_chosen') is True for x in Q)==111 and sum(x.get('rollout_best_chosen') is False for x in Q)==1
assert len([x for x in Q if re.search(r'code rank 1(?:\D|$)',x['rationale'])])==74
assert len([x for x in Q if re.search(r'code rank \d+',x['rationale'])])==99
assert not any('HP guard:' in x.get('rationale','') or 'HP guard bound' in x.get('rationale','') for x in D)
assert sum(x.get('chosen',{}).get('action')=='use_potion' for x in D)==11
assert not any(x.get('chosen',{}).get('action')=='discard_potion' for x in D)
assert len([x for x in D if x['decider']=='code' and x['label'].startswith('combat/') and x['label']!='combat/plan-continue'])==52
for char in ['jev','codex']:
 rows=[x for x in D if x['decider']==char]
 got=tuple(sum((x.get('usage') or {}).get(k,0) for x in rows) for k in ['input_tokens','output_tokens','cache_hit_tokens'])
 assert got==({'jev':(674811,11269,0),'codex':(2997758,6555,1682816)}[char])
# Preserve a hash of the complete existing prefix without rewriting it.
f=Path('/home/dw/Projects/agent-sts2/notes/lessons.md');size=f.stat().st_size
h=hashlib.sha256()
with f.open('rb') as stream:
 while chunk:=stream.read(65536):h.update(chunk)
result={'checks':'通过','run':'PF90JTU0UZ5M','lessons_prefix_bytes':size,'lessons_prefix_sha256':h.hexdigest(),'entry_hp':[w['entry']['hp'] for w in R['combats']],'final_hp':0,'death_turn':3,'final_enemies':[58,16],'held_damage':10,'attack':19,'block':27,'needed_loss':2,'survival_hp_gap':2}
(P/'verification-before.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False))
