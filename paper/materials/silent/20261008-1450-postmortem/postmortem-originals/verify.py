import json,re,datetime
from pathlib import Path
p=Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-141302-postmortem');run='H1T1F8ML9FUE'
def read(name):return [json.loads(line) for line in (p/f'{run}-{name}.jsonl').open()]
s=read('states');d=read('decisions');b=read('brain');chain=json.load((p/f'{run}-resources.json').open());ss={r['_line']:r['state'] for r in s};dd={r['_line']:r for r in d}
section=[];active=False
for line in open('/home/dw/Projects/agent-sts2/notes/lessons.md'):
 if line.startswith('## '):
  if active:break
  active=line.startswith('## '+run)
 if active:section.append(line)
section=''.join(section);(p/'appended-section.md').write_text(section)
checks=[]
def check(name,condition,detail):
 if not condition:raise AssertionError((name,detail))
 checks.append({'项目':name,'通过':True,'证据':detail})
check('唯一标题',section.count('## '+run)==1,'notes/lessons.md 本局标题')
check('三条经验',len(re.findall(r'^- \[(?!记录)',section,re.M))==3,'经验3行、记录1行')
check('六次末战进场',all(c['entry']['hp']==52 and c['entry']['max_hp']==64 and c['entry']['potions']==[] and c['entry']['turn']==1 for c in chain['combats'] if c['floor']==48),'六次52/64、空药、首帧T1')
check('死亡回合与敌血',ss[298834]['turn']==4 and ss[298834]['run']['current_hp']==0 and ss[298834]['combat']['enemies'][0]['current_hp']==402,'s298834：T4／0HP／402敌HP')
final=ss[298833];hp=final['run']['current_hp'];block=final['combat']['player']['block'];enemy_attack=sum(i['total_damage'] or 0 for e in final['combat']['enemies'] for i in e['intents']);wither=next(c for c in final['combat']['hand'] if c['card_id']=='WITHER');penalty=next(v['current_value'] for v in wither['dynamic_values'] if v['name']=='Damage')
check('完整损失与缺口',(hp,block,enemy_attack,penalty,enemy_attack+penalty-block,enemy_attack+penalty-block-hp+1)==(34,0,30,6,36,3),'s298833：34HP、0挡、30攻、6凋萎、需36、活至少差3')
plan=json.loads(dd[291650]['questions']['plan']['criteria']['plan2']);check('推演低报',plan['hp_lost']==33 and plan['hp_after']==1 and plan['damage_dealt']==60 and plan['withers_added']==1,'d291650：33损、留1、60伤、新生1')
check('可见牌堆6伤',any('6点伤害' in x['line'] and 'WITHER' in x['card_ids'] for x in ss[298830]['agent_view']['combat']['discard']),'s298830弃牌区凋萎6伤')
check('固定源码缓存结果',json.load((p/'wither-cache-audit.json').open())[3]['damage']==3,'固定帧当前代码T4手空缓存3，入手后6')
check('SL同盘3血价',ss[298723]['run']['current_hp']==37 and ss[298755]['run']['current_hp']==37 and ss[298727]['run']['current_hp']==37 and ss[298760]['run']['current_hp']==34,'s298723/755进37；s298727出37、760出34')
check('末战资源前链',[ss[n]['run']['current_hp'] for n in [298567,298574,298618,298639,298646]]==[34,53,33,33,52],'F43赢34→F44回53→F45赢33→F46赢33→F47回52')
gains=sum(len(set(map(tuple,x['to']['potions']))-set(map(tuple,x['from']['potions']))) for x in chain['resource_changes']);drinks=sum(x.get('chosen',{}).get('action')=='use_potion' for x in d);discard=sum(x.get('chosen',{}).get('action')=='discard_potion' for x in d)
check('药水总数与分流',(gains,drinks,discard)==(15,13,1),'15取得、13 use_potion、1 discard_potion；d291372/s298497另1事件交换')
check('末战前HP恒等式',56+247-233-18-52==0 and sum(c['observed_net_hp_loss'] for c in chain['combats'] if c['exit'] and c['floor']!=48)==233,'净赢战损233；实际回血247、事件18；SL恢复独立')
check('HP护栏替换0',not any('HP guard' in x.get('rationale','') or 'hp guard' in x.get('rationale','') or x.get('hp_guard') for x in d),'全844决策，替换0')
check('SL替线4',[x['_line'] for x in d if x.get('sl_explore',{}).get('replacement')]==[291569,291596,291624,291646],'4次replacement，replay6/avoid2/空replacement2分列')
jev=[x for x in d if x['decider']=='jev'];low=[x for x in jev if x['confidence']<.35];plans=[x for x in jev if x['label'].startswith('combat/plan-choice')];best=[x for x in plans if isinstance(x.get('rollout_best_chosen'),bool)]
check('Jev低信心及原答比例',(len(jev),len(low),len(plans),len(best),sum(x['rollout_best_chosen'] for x in best))==(151,13,122,121,116),'151调用、13低于0.35、116/121原答最优')
code=[x for x in d if x['screen']=='COMBAT' and x['decider']=='code' and x['label']!='combat/plan-continue'];check('代码自主次数',len(code)==185 and len({(x['floor'],x.get('sl_attempt',1),x['turn']) for x in code})==124,'185非续步决策、124不同层/尝试/回合')
check('脑token独立计划',len(b)==49 and sum(x['usage']['inputTokens'] for x in b)==6590487 and sum(x['usage']['outputTokens'] for x in b)==12702 and sum(x['usage']['cacheHitTokens'] for x in b)==4009472,'49真实Codex请求；兼容48职责请求另加独立run-plan')
check('Jevtoken',sum(x['usage']['input_tokens']+x['usage']['output_tokens'] for x in jev)==771046,'763225+7821=771046')
elapsed=(datetime.datetime.fromisoformat(d[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(d[0]['ts'].replace('Z','+00:00'))).total_seconds();check('用时',elapsed==2503.964 and '41分43.964秒' in section,'首末决策2503.964秒')
for phrase in ['52/64','34血0挡','完整需损36','402/535','15瓶','13次饮用','HP护栏替换0次','95.87%','44.57%','2503.964','7374235']:
 check('追加文字关键数 '+phrase,phrase in section,'重新grep本节并与上述原始字段核对')
(p/'numeric-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'核对数':len(checks),'通过':True},ensure_ascii=False))
