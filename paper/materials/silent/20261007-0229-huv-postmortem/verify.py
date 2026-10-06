import json,pathlib,collections,datetime,re,subprocess
p=pathlib.Path(__file__).parent
D=list(map(json.loads,(p/'decisions.jsonl').open())); S=list(map(json.loads,(p/'states.jsonl').open())); T={s['ts']:s['state'] for s in S}
B=list(map(json.loads,(p/'brain.jsonl').open()))
assert len(D)==714 and len(S)==739 and len(B)==34 and all(s['state']['run_id']=='HUVEPWQAHWFU' for s in S)
assert len(list((p/'plans.jsonl').open()))==6 and (p/'deepseek-reasoning.jsonl').stat().st_size==0
assert {b['engine'] for b in B}=={'codex'}
J=[d for d in D if d['decider']=='jev'];JC=[d for d in J if d['label'].startswith('combat/')]
assert len(J)==143 and len(JC)==117
assert sum(d['confidence']<.35 for d in J)==20 and sum(d['confidence']<.35 for d in JC)==12
assert collections.Counter(d['rollout_best_chosen'] for d in JC)=={True:108,False:8,None:1}
assert sum(d['confidence']<.35 for d in JC if d['floor']==35)==3
assert collections.Counter(d['rollout_best_chosen'] for d in JC if d['floor']==35)=={True:7,False:2}
assert sum('HP guard:' in d['rationale'] for d in D)==1
assert sum(d.get('chosen',{}).get('action')=='use_potion' for d in D)==13
assert sum(d.get('chosen',{}).get('action')=='discard_potion' for d in D)==0
assert sum('Potion (' in d['rationale'] and d['label']=='reward/claim' or d.get('chosen',{}).get('action')=='buy_potion' for d in D)==12
assert sum(bool(d.get('focus')) for d in D)==8
assert sum(d.get('answers',{}).get('plan',{}).get('choice') in d['focus'] for d in D if d.get('focus'))==5
C=[d for d in D if d['label'].startswith('combat/')];G=collections.defaultdict(list)
for d in C:G[d['floor'],d.get('sl_reloads'),d['turn']].append(d)
assert len(G)==120 and sum(not any(d['decider']=='jev' for d in ds) for ds in G.values())==36
A=[d for d in C if d['decider']=='code' and d['label']!='combat/plan-continue'];N=[d for d in A if d.get('chosen',{}).get('action')!='end_turn']
assert len(A)==160 and len({(d['floor'],d.get('sl_reloads'),d['turn']) for d in A})==114
assert len(N)==53 and len({(d['floor'],d.get('sl_reloads'),d['turn']) for d in N})==43
assert len([d for d in C if d['label']=='combat/plan-continue' and 'Jev-chosen' in d['rationale']])==192
assert len([d for d in C if d['label']=='combat/plan-continue' and 'code-chosen' in d['rationale']])==59
assert sum(d['usage']['input_tokens'] for d in J)==545605 and sum(d['usage']['output_tokens'] for d in J)==6494
CB=[d for d in D if d['decider']=='codex']
assert sum(d['usage'].get('input_tokens',0) for d in CB)==4346936
assert sum(d['usage'].get('output_tokens',0) for d in CB)==9079
assert sum(d['usage'].get('cache_hit_tokens',0) for d in CB)==3152640
assert (datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds()==1967.373
expected={
 (9,0):([150,144,123,117,109,95,68,38,14],[6,21,6,8,14,27,30,24,14],[2,4,14,0,18,0,0,7,0],24,0),
 (17,0):([221,206,199,179,147,146,106,84,38,2],[15,7,20,32,1,40,22,46,36,2],[0,0,0,0,0,0,20,3,0,6],5,0),
 (19,0):([92,58,49,41,32,22,6],[34,9,8,9,10,16,6],[6,0,8,11,12,3,0],17,0),
 (33,0):([341,320,313,300,243,219,190,145,110,55],[21,7,13,57,24,29,45,35,55,0],[0,0,0,0,12,0,16,0,17,0],7,55),
 (33,1):([341,320,308,266,229,209,161,130,85,38],[21,12,42,37,20,48,31,45,47,38],[0,4,11,0,7,2,20,0,0,0],8,0),
 (35,1):([172,116,116,98,82,55],[56,0,18,16,27,3],[0,5,1,15,18,18],0,52)}
for (fl,sl),(need,damage,loss,hpend,enend) in expected.items():
 groups=[v for k,v in G.items() if k[0]==fl and k[1]==sl]
 starts=[T[a[0]['ts']]['combat'] for a in groups]
 got_need=[sum(e['current_hp'] for e in c['enemies'] if e['is_alive']) for c in starts]
 hp=[c['player']['current_hp'] for c in starts]
 assert got_need==need
 assert [need[i]-[*need[1:],enend][i] for i in range(len(need))]==damage
 assert [hp[i]-[*hp[1:],hpend][i] for i in range(len(hp))]==loss
 if (fl,sl)!=(33,0):
  last=groups[-1][-1]; nxt=next(s['state'] for s in S if s['ts']>last['ts'] and (s['state'].get('run')or{}).get('floor')==fl and not s['state']['in_combat'])
  assert nxt['run']['current_hp']==hpend
  assert sum(e['current_hp'] for e in (nxt.get('combat')or{}).get('enemies',[]) if e['is_alive'])==enend
for d in D:
 if d['label']=='rest/plan':assert T[D[D.index(d)+1]['ts']]['run']['current_hp']-T[d['ts']]['run']['current_hp']==21
r=T[D[-1]['ts']]['run'];assert len(r['deck'])==32 and sum(c['upgraded'] for c in r['deck'])==5
assert next(d for d in D if d['floor']==29 and d['label']=='rest/plan')['ts']=='2026-10-06T17:50:39.376Z'
# Re-grep the extracted raw states for the written entry HP, last turn and enemy numbers.
found={}
for pattern in ['"current_hp":57','"current_hp":18','"current_hp":52','"current_hp":172','"damage":51','"turn":6']:
 result=subprocess.run(['rg','-c','-F',pattern,str(p/'states.jsonl')],capture_output=True,text=True)
 assert result.returncode==0,pattern
 found[pattern]=int(result.stdout.strip())
section='';active=False
for line in open('/home/dw/Projects/agent-sts2/notes/lessons.md'):
 if line.startswith('## '):
  if active:break
  active=line.startswith('## HUVEPWQAHWFU')
 if active:section+=line
assert sum(line.startswith('- [') for line in section.splitlines())==4
assert '17:50:39.376Z' in section and '02:23:32 +0800' in section
print('关键血量、逐轮需伤/扣血/净损、死亡回合、统计及原始状态grep核对通过。')
print(json.dumps(found,ensure_ascii=False))
(p/'verification.json').write_text(json.dumps({'run':'HUVEPWQAHWFU','verified':True,'raw_state_grep':found,'added':['silent-0202','silent-0203'],'updated':['silent-0083','silent-0125','silent-0005','silent-0011','silent-0023','silent-0046','silent-0048','silent-0067'],'repeats':[]},ensure_ascii=False,indent=2)+'\n')
