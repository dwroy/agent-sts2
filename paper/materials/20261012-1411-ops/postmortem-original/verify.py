import json,collections,hashlib,subprocess
from pathlib import Path
O=Path(__file__).parent;D=[json.loads(x) for x in (O/'decisions.jsonl').open()];S=[json.loads(x) for x in (O/'states.jsonl').open()];B=[json.loads(x) for x in (O/'brain.jsonl').open()];R=json.loads((O/'KF9HMZKTFC3V-resources.json').read_text());A=json.loads((O/'audit.json').read_text());d={x['_line']:x for x in D};s={x['_line']:x for x in S}
def p(n):return s[n]['state']['combat']['player']
def enemy(n,i=0):return s[n]['state']['combat']['enemies'][i]
def power(x,k):return next((v['amount'] for v in x['powers'] if v['power_id']==k),0)
checks=[]
def check(label,condition):
 assert condition,label
 checks.append(label)
check('run match',all(x['state']['run_id']=='KF9HMZKTFC3V' for x in S))
check('source counts',(len(D),len(S),len(B),len(R['combats']))==(880,937,64,27))
check('all decision observation matches',all(any(st['observed_ts']==x['observed_ts'] and st['fingerprint']==x['fingerprint'] for st in S) for x in D))
check('helmet full line',d[359707]['selection_audit']['answer']['turn']['block_gained']==8 and d[359707]['selection_audit']['answer']['turn']['hp_loss']==8)
check('helmet actual', [p(n)['block'] for n in [370151,370152,370153]]==[0,8,16] and p(370154)['current_hp']==30)
check('helmet input powers',power(p(370151),'FRAIL_POWER')==94 and power(p(370153),'PLATING_POWER')==6 and sum(i.get('total_damage') or 0 for i in enemy(370153)['intents'])==22)
check('helmet independent pair',d[359725]['selection_audit']['answer']['turn']['block_gained']==4 and [p(n)['block'] for n in [370174,370175]]==[13,21] and p(370176)['current_hp']==28)
check('snakebite free',s[370134]['state']['combat']['hand'][0]['card_id']=='SNAKEBITE' and s[370134]['state']['combat']['hand'][0]['energy_cost']==0 and power(enemy(370135),'POISON_POWER')==20)
check('snakebite nonreplay',power(enemy(370157),'POISON_POWER')==26 and power(enemy(370158),'POISON_POWER')==36 and '重放' not in s[370157]['state']['combat']['hand'][0]['resolved_rules_text'])
check('queen kill setup',power(enemy(370159),'POISON_POWER')==60 and enemy(370159)['current_hp']==122 and s[370160]['state']['run']['current_hp']==31)
check('final victory',s[370198]['state']['game_over']['is_victory'] and s[370195]['state']['run']['current_hp']==19 and s[370195]['state']['run']['max_hp']==87)
check('boss consecutive resources',R['combats'][-2]['exit']['hp']==R['combats'][-1]['entry']['hp']==31 and not R['combats'][-1]['entry']['potions'])
check('poison/armor T2',power(enemy(370170),'ARTIFACT_POWER')==3 and power(enemy(370171),'ARTIFACT_POWER')==0 and power(enemy(370171),'POISON_POWER')==0 and power(enemy(370175),'POISON_POWER')==24)
check('poison T3',power(enemy(370178),'POISON_POWER')==47 and power(p(370179),'ACCELERANT_POWER')==2 and enemy(370180)['current_hp']-enemy(370181)['current_hp']==142)
check('end turn T4',p(370186)['current_hp']==28 and p(370187)['current_hp']==18 and enemy(370186)['current_hp']-enemy(370187)['current_hp']==156)
check('six turn pool',sum(t['net_enemy'] for t in A['windows'][-1]['turns'])==535)
check('potions',sum(x['chosen']['action']=='use_potion' for x in D)==17 and sum(x['chosen']['action']=='discard_potion' for x in D)==0)
check('hp guard',sum(bool(x.get('hp_guard')) for x in D)==1)
check('rest actions',sum(x['label']=='rest/plan' and x['chosen']['option_index']==0 for x in D)==6 and sum(x['label']=='rest/plan' and x['chosen']['option_index']==1 for x in D)==3)
check('brain full tokens',sum((x.get('usage') or {}).get('inputTokens',0) for x in B)==7199126)
check('prior no exact replay',not json.loads((O/'prior-helmet-replay-check.json').read_text())['played_cost2_replay_with_helmet'])
# Preserve exact source bytes for independent review without claiming run-version identity.
source=Path('.worktrees/live/agent/src/reflex/turn-solver.ts').read_text().splitlines()
check('source location','helmetBlock' in source[1723] and 'gainBlock' in source[1723])
manifest={'checks':checks,'result':'通过','run':'KF9HMZKTFC3V','live_readonly_head':subprocess.check_output(['git','-C','.worktrees/live','rev-parse','HEAD'],text=True).strip(),'files':{name:hashlib.sha256((O/name).read_bytes()).hexdigest() for name in ['decisions.jsonl','states.jsonl','brain.jsonl','run-plans.jsonl','sl-attempts.jsonl','KF9HMZKTFC3V-resources.json']}}
(O/'verification-before.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('通过',len(checks)); print('prior',json.loads((O/'prior-helmet-replay-check.json').read_text()))
