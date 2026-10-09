import json,hashlib,re,sys
from pathlib import Path
root=Path('/home/dw/Projects/agent-sts2');p=root/'learner/runs/20261009-074301-postmortem'
checks=[]
def check(name,cond):
 checks.append({'item':name,'ok':bool(cond)})
 if not cond:raise AssertionError(name)
def read(name):return [json.loads(x) for x in (p/f'{name}.jsonl').open()]
s=read('states');d=read('decisions');b=read('brain');run=read('runs')[0];sm={x['_line']:x['state'] for x in s};dm={x['_line']:x for x in d}
for name in ['runs','decisions','states','brain','run-plans','run-config']:
 rows=read(name)
 with (root/'logs'/f'{name}.jsonl').open('rb') as original:
  for row in rows:
   original.seek(row['_offset']);raw=json.loads(original.readline());copy={k:v for k,v in row.items() if k not in ['_line','_offset']}
   check(f'{name} 原始字节定位 {row["_line"]}',raw==copy)
check('结束/角色/进阶/层号/代码版本',run['ended'] and run['character'].lower()=='silent' and run['ascension']==10 and run['floor']==12 and run['code']=='cfa8112d+dirty')
check('208决策216帧12脑3计划无SL',len(d)==208 and len(s)==216 and len(b)==12 and len(read('run-plans'))==3 and len(read('sl-attempts'))==0)
check('SL计数均0',all(x.get('sl_reloads',0)==0 for x in d))
check('脑均Codex',all(x['engine']=='codex' for x in b))
check('max HP70/两药槽',all(x['state']['run']['max_hp']==70 and len(x['state']['run']['potions'])==2 for x in s))
entries={2:(315861,315885,56,50),3:(315890,315917,50,43),4:(315923,315944,43,38),6:(315955,315984,38,30),8:(315993,316014,51,38),9:(316019,316035,38,9),12:(316051,316072,9,0)}
for f,(a,z,hp1,hp2) in entries.items():
 check(f'F{f}进离HP',sm[a]['run']['current_hp']==hp1 and sm[z]['run']['current_hp']==hp2)
 check(f'F{f}首T1/退出结果',sm[a]['turn']==1 and sm[z]['screen']==('GAME_OVER' if f==12 else 'REWARD'))
check('唯一休息30→51',sm[315990]['run']['current_hp']==30 and sm[315991]['run']['current_hp']==51)
check('死亡回合4，4血9挡对15',sm[316071]['turn']==4 and sm[316071]['run']['current_hp']==4 and sm[316071]['combat']['player']['block']==9 and sm[316071]['combat']['enemies'][0]['intents'][0]['total_damage']==15)
check('死亡潮湿6/52与4毒',sm[316072]['combat']['enemies'][0]['current_hp']==6 and sm[316072]['combat']['enemies'][0]['max_hp']==52 and any(x['power_id']=='POISON_POWER' and x['amount']==4 for x in sm[316072]['combat']['enemies'][0]['powers']))
check('F12药瓶6/3',[[x['amount'] for x in e['powers'] if x['power_id']=='POISON_POWER'] for e in sm[316053]['combat']['enemies']]==[[6],[3]])
check('F12下一轮23/36血及5/2毒',[e['current_hp'] for e in sm[316058]['combat']['enemies']]==[23,36] and [[x['amount'] for x in e['powers'] if x['power_id']=='POISON_POWER'] for e in sm[316058]['combat']['enemies']]==[[5],[2]])
plan=json.loads(dm[307856]['questions']['plan']['criteria']['plan1'])
check('逐敌预测29/30与8毒',plan['dmg']==32 and plan['enemies_after']=='钙化邪教徒 29 HP; 潮湿邪教徒 30 HP, Weak 1, 中毒 8')
check('护栏唯一且9血12伤差',sum('HP guard:' in x['rationale'] or 'over the HP guard bound' in x['rationale'] for x in d)==1)
options={k:json.loads(v) for k,v in dm[307764]['questions']['plan']['criteria'].items()}
check('护栏9/21→0/9',options['plan4']['hp_lost']==9 and options['plan4']['dmg']==21 and options['plan2']['hp_lost']==0 and options['plan2']['dmg']==9)
check('四次饮药/零丢弃',sum(x['chosen']['action']=='use_potion' for x in d)==4 and sum(x['chosen']['action']=='discard_potion' for x in d)==0)
a=json.loads((p/'audit.json').read_text())
check('Jev34/低4/最优22/24',a['jev']['all']==34 and a['jev']['low']==4 and a['jev']['best']==22 and a['jev']['plan_choices']==24)
check('36战斗回合及13自主非结束',a['code']['turns']==36 and a['code']['no_jev_turns']==13 and a['code']['independent_nonend_turns']==13)
check('token与runs对应',a['usage']['jev_input']+a['usage']['jev_output']==run['tokens']==104725 and a['usage']['brain_input']==run['ds_tokens_in']==1594425 and a['usage']['brain_output']==run['ds_tokens_out']==3294 and a['usage']['brain_cache']==run['ds_cache_hit']==618240)
expected={2:([47,32,26,14,14,5],[15,6,12,0,9,5],[4,0,0,2,0,0]),3:([48,36,33,25,16,4],[12,3,8,9,12,4],[0,0,7,0,0,0]),4:([56,38,30,23,2],[18,8,7,21,2],[5,0,0,0,0]),6:([82,73,57,45,44,36,25],[9,16,12,1,8,11,25],[0,6,0,0,1,1,0]),8:([54,40,20,17],[14,20,3,17],[3,10,0,0]),9:([80,71,53,17],[9,18,36,17],[2,16,11,0]),12:([91,59,47,23],[32,12,24,17],[0,1,4,4])}
body=(p/'lesson-draft.md').read_text()
for battle in a['battles']:
 f=battle['floor'];v=expected[f]
 for k,ex in zip(['need_hp','net_enemy_hp_loss','player_net_hp_loss'],v):
  check(f'F{f}逐轮{k}',[t[k] for t in battle['turns']]==ex and str(ex).replace(' ','') in body)
if '--after' in sys.argv:
 prefix=json.loads((p/'lessons-prefix-before.json').read_text());h=hashlib.sha256()
 with (root/'notes/lessons.md').open('rb') as f:
  left=prefix['bytes']
  while left:
   chunk=f.read(min(left,1048576));h.update(chunk);left-=len(chunk)
  tail=f.read().decode()
 check('旧前缀未改',h.hexdigest()==prefix['sha256'])
 check('追加一次/全文与草稿相同',tail==body and tail.count('## RZ6YAC7K89NM（')==1)
 (p/'lesson-appended.md').write_text(tail)
 (p/'verification-after.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
else:
 (p/'verification-before.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'failed':sum(not x['ok'] for x in checks),'stage':'after' if '--after' in sys.argv else 'before'},ensure_ascii=False))
