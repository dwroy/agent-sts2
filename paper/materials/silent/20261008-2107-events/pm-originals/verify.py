import json,collections,re,datetime,bisect
from pathlib import Path
P=Path(__file__).parent;D=json.loads((P/'decisions.json').read_text());S=json.loads((P/'states.json').read_text());C=json.loads((P/'2H311EAD34GD-resources.json').read_text());T=json.loads((P/'turn-audit.json').read_text());B=json.loads((P/'brain.json').read_text());draft=(P/'lessons-draft.md').read_text();checks=[]
def check(name,actual,want):
 assert actual==want,(name,actual,want)
 checks.append({'项目':name,'实核':actual})
check('结束局号、角色、进阶和源码',[D[-1]['run_id'],S[-1]['state']['run']['character_id'],S[-1]['state']['run']['ascension']],['2H311EAD34GD','SILENT',10])
check('总决策',len(D),647);check('实盘窗口',len(C['combats']),13)
check('获胜战入口出口',[(x['floor'],x['entry']['hp'],x['exit']['hp'],x['observed_net_hp_loss']) for x in C['combats'][:7]],[(2,56,53,3),(4,47,34,13),(5,34,34,0),(8,55,4,51),(11,25,14,11),(13,35,35,0),(14,35,31,4)])
check('所有T1及70上限',all(x['entry_is_turn_one'] and x['entry']['max_hp']==70 for x in C['combats']),True)
check('族母入口药水',all(x['entry']['hp']==52 and x['entry']['potions']==[[0,'HEART_OF_IRON'],[1,'SWIFT_POTION']] for x in C['combats'][7:]),True)
sl=json.loads((P/'sl-attempts.json').read_text());check('SL死亡轮',[x['turns'] for x in sl],[13,14,13,14,12,12]);check('SL判死末血',[x['end_hp'] for x in sl],[15,4,9,4,4,0]);check('SL判死攻击',[x['incoming'] for x in sl],[28,13,20,13,25,25]);check('恢复成功',sum(x.get('reload',{}).get('ok') is True for x in sl if x.get('reload')),5)
expected=[[0,0,17,25,21,25,14,2,14,18,9,0,0],[0,0,17,25,21,19,14,2,14,12,9,0,2,7],[0,0,17,25,21,19,14,2,14,12,9,13,4],[0,0,17,25,21,25,14,2,14,12,9,0,2,7],[0,0,17,31,26,25,17,2,11,15,9,0],[0,0,17,25,30,25,10,11,15,19,0,2]]
for a in range(1,7):
 rows=[x for x in T if x['sequence']==a+7];dmg=[x['first']['en'][0][1]-x['last']['en'][0][1] for x in rows];check('族母第'+str(a)+'次逐轮扣血',dmg,expected[a-1]);check('族母第'+str(a)+'次累计扣血',sum(dmg),[145,142,150,148,153,154][a-1]);check('族母第'+str(a)+'次末敌HP',rows[-1]['last']['en'][0][1],[88,91,83,85,80,79][a-1])
rows=[x for x in T if x['sequence']==13];check('末试逐轮实扣HP',[rows[i]['first']['hp']-(rows[i+1]['first']['hp'] if i+1<len(rows) else 0) for i in range(len(rows))],[0,0,0,1,7,0,0,9,17,7,0,11]);check('末轮完整需求',rows[-1]['last']['en'][0][4]-rows[-1]['last']['b'],17);check('末轮存活还需血',17-rows[-1]['last']['hp']+1,7)
rows=[x for x in T if x['sequence']==4];check('花园逐轮活体净减',[sum(v[1] for v in x['first']['en'])-sum(v[1] for v in x['last']['en']) for x in rows],[32,6,13,15,18,11,5,9,6]);check('花园实损',[rows[i]['first']['hp']-(rows[i+1]['first']['hp'] if i+1<len(rows) else 4) for i in range(len(rows))],[0,6,6,10,25,2,2,0,0]);check('花园T5威胁/挡',[sum(v[4] for v in rows[4]['last']['en']),rows[4]['last']['b']],[30,5])
G=json.loads((P/'guard-audit.json').read_text());check('护栏记载',len(G),8);active=[x for x in G if not x['explored']];check('实际护栏采用',len(active),7);check('护栏题面省血',sum(x['original']['hp_lost']-x['guard']['hp_lost'] for x in active),65);check('护栏题面少伤',sum(x['original']['damage_dealt']-x['guard']['damage_dealt'] for x in active),52)
check('Jev数量',sum(x['decider']=='jev' for x in D),154);check('Jev低信',sum(x['decider']=='jev' and x['confidence']<.35 for x in D),29)
plans=[x for x in D if x['decider']=='jev' and x['label'].startswith('combat/plan-choice')];check('选线题与最优回答',[len(plans),sum(x['rollout_best_chosen'] for x in plans)],[111,109]);check('F8最优',[sum(x['floor']==8 for x in plans),sum(x['floor']==8 and x['rollout_best_chosen'] for x in plans)],[12,11]);check('F17最优',[sum(x['floor']==17 for x in plans),sum(x['floor']==17 and x['rollout_best_chosen'] for x in plans)],[82,82])
check('药水动作饮用与弃药',[sum(x['chosen'].get('action')=='use_potion' for x in D),sum(x['chosen'].get('action')=='discard_potion' for x in D)],[17,0]);check('新取得瓶数',sum(len(set(map(tuple,x['to']['potions']))-set(map(tuple,x['from']['potions']))) for x in C['resource_changes'] if not x['restart_boundary']),7)
heals=[x['to']['hp']-x['from']['hp'] for x in C['resource_changes'] if x['to']['floor'] in [7,9,12,16] and x['to']['screen']=='REST' and x['to']['hp']!=x['from']['hp']];check('营火回血',heals,[21,21,21,21]);check('boss资源算术',56+sum(heals)-sum(x['observed_net_hp_loss'] for x in C['combats'][:7])-6,52)
check('大脑引擎',collections.Counter(x['engine'] for x in B),{'codex':16});check('牌组张数',len(S[-1]['state']['run']['deck']),21);check('所求毒牌无已记选项',any(any(v in str(r['options']) for v in ['毒雾','致命毒药','带毒刺击','弹跳药瓶']) for r in B),False)
for f,h in [(7,70),(9,58),(12,50),(16,52)]:
 r=next(x for x in D if x['floor']==f and x['label']=='rest/plan');opt=json.loads(r['questions']['pick']['criteria']['o0']);check('F'+str(f)+'选回血boss输入',opt['boss_sim_hp_reference']['simulated_entry_hp'],h)
check('Jev输入输出',[sum(r['usage'].get('input_tokens',0) for r in D if r['decider']=='jev'),sum(r['usage'].get('output_tokens',0) for r in D if r['decider']=='jev')],[771840,6684]);check('Codex输入输出缓存',[sum(r['usage'].get('input_tokens',0) for r in D if r['decider']=='codex'),sum(r['usage'].get('output_tokens',0) for r in D if r['decider']=='codex'),sum(r['usage'].get('cache_hit_tokens',0) for r in D if r['decider']=='codex')],[2101081,3823,843904]);check('请求延迟合计',sum(x['latency_ms'] for x in B),227110)
check('开始至结束秒',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['ts'])).total_seconds(),1511.364);check('首观察至结束秒',(datetime.datetime.fromisoformat(D[-1]['ts'])-datetime.datetime.fromisoformat(D[0]['observed_ts'])).total_seconds(),1541.347)
check('正文三条经验',len(re.findall(r'^- \[(?!记录)',draft,re.M)),3);check('单节标题',len(re.findall(r'^## ',draft,re.M)),1)
(P/'verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n');print('通过',len(checks),'项数字与格式核验')
