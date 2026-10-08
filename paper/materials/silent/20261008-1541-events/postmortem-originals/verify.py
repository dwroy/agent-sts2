import json
from pathlib import Path
from datetime import datetime
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-151301-postmortem')
ss=[json.loads(l) for l in (p/'states.jsonl').open()];ds=[json.loads(l) for l in (p/'decisions.jsonl').open()]
s={x['_line']:x['state'] for x in ss};r=json.loads((p/'AD3QSC3P41JU-resources.json').read_text());checks=[]
def check(name,condition):
 checks.append({'核对':name,'通过':bool(condition)})
 if not condition:raise AssertionError(name)
run=json.loads(next((p/'runs.jsonl').open()))
check('SILENT A10 F49已结束',run['character'].lower()=='silent' and run['ascension']==10 and run['floor']==49 and not run['victory'])
check('18战斗房23窗口',len({c['floor'] for c in r['combats']})==18 and len(r['combats'])==23)
check('六次首手均11血',all(s[i]['run']['current_hp']==11 for i in [299496,299507,299519,299530,299541,299552]))
check('F46与F48及F49资源',[s[i]['run']['current_hp'] for i in [299391,299392,299440,299447,299449,299450,299493,299495,299496]]==[66,62,26,62,62,58,15,15,11])
check('末次T2 3血18挡23攻击',s[299564]['turn']==2 and s[299564]['run']['current_hp']==3 and s[299564]['combat']['player']['block']==18 and s[299564]['combat']['enemies'][0]['intents'][0]['total_damage']==23)
check('GAME_OVER敌58/111且玩家0血',s[299565]['screen']=='GAME_OVER' and s[299565]['run']['current_hp']==0 and s[299565]['combat']['enemies'][0]['current_hp']==58 and s[299565]['combat']['enemies'][0]['max_hp']==111)
check('五次判死与一次实死',[e['result'] for e in r['sl_events'] if e['floor']==49]==['predicted_death']*5+['died'])
check('判死回合',[c['last']['turn'] for c in r['combats'] if c['floor']==49 and not c['exit']]==[2,3,2,2,2])
check('药水10饮0弃',sum((d.get('chosen') or {}).get('action')=='use_potion' for d in ds)==10 and sum((d.get('chosen') or {}).get('action')=='discard_potion' for d in ds)==0)
check('10次实得药',sum(len(g['to']['potions'])>len(g['from']['potions']) for g in r['resource_changes'])==10)
check('两次HP护栏',sum('HP guard:' in d.get('rationale','') for d in ds)==2)
check('激怒每技能+3',[[a['amount'] for a in s[i]['combat']['enemies'][0]['powers'] if a['power_id']=='STRENGTH_POWER'][0] for i in [299559,299560,299561,299562,299563]]==[3,6,9,12,15])
check('第2次开场省8但少9输出',[s[i]['run']['current_hp'] for i in [299512,299558]]==[11,3] and [s[i]['combat']['enemies'][0]['current_hp'] for i in [299512,299558]]==[81,72])
check('Jev25低信心',sum(d['decider']=='jev' and isinstance(d.get('confidence'),(int,float)) and d['confidence']<.35 for d in ds)==25)
check('用时2217.876秒',(datetime.fromisoformat(ds[-1]['ts'])-datetime.fromisoformat(ds[0]['ts'])).total_seconds()==2217.876)
bs=[json.loads(l) for l in (p/'brain.jsonl').open()]
check('43次Codex及输入缓存',len(bs)==43 and all(b['engine']=='codex' for b in bs) and sum(b['usage']['inputTokens'] for b in bs)==5743412 and sum(b['usage']['cacheHitTokens'] for b in bs)==2910080)
(p/'numbers-checked.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n')
print('独立核验',len(checks),'项通过')
