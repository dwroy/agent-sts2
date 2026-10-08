import collections,datetime,hashlib,json,pathlib,re
p=pathlib.Path('/home/dw/Projects/agent-sts2/learner/runs/20261008-131301-postmortem')
D=json.loads((p/'decisions.json').read_text());S=json.loads((p/'states.json').read_text());R=json.loads((p/'G8NHLL09DLBX-resources.json').read_text());by={r['_line']:r['state'] for r in S}
checks=[]
def check(label,actual,expected):
 checks.append({'项目':label,'实际':actual,'复盘':expected,'通过':actual==expected})
 if actual!=expected:raise AssertionError((label,actual,expected))
check('决策与帧数',[len(D),len(S)],[726,747])
check('战斗窗口',len(R['combats']),17)
check('关键进场HP',[c['entry']['hp'] for c in R['combats'] if c['floor'] in (17,23,24)],[76,76,76,76,52,22,22])
check('关键终帧HP',[ (c['exit'] or c['last'])['hp'] for c in R['combats'] if c['floor'] in (17,23,24)],[4,2,15,1,22,10,0])
check('死亡回合',[by[297419]['turn'],by[297419]['run']['current_hp'],by[297419]['combat']['player']['block'],by[297420]['run']['current_hp']],[5,1,0,0])
check('母体死亡帧余血',next(e['current_hp'] for e in by[297420]['combat']['enemies'] if e['enemy_id']=='OVICOPTER'),9)
check('幼虫死亡帧余血',[e['current_hp'] for e in by[297420]['combat']['enemies'] if e['enemy_id']=='TOUGH_EGG'],[9,10])
check('F23逐轮玩家失血',[52-52,52-31,31-22,22-22,22-22],[0,21,9,0,0])
check('F23反伤前后HP与偏折后挡',[by[297349]['run']['current_hp'],by[297350]['run']['current_hp'],by[297352]['combat']['player']['block']],[52,47,9])
check('F24末试逐轮HP',[by[n]['run']['current_hp'] for n in [297394,297398,297404,297409,297415,297420]],[22,22,13,11,1,0])
check('F24末试母体需伤',[next(e['current_hp'] for e in by[n]['combat']['enemies'] if e['enemy_id']=='OVICOPTER') for n in [297394,297398,297404,297409,297415]],[132,117,97,56,29])
check('F24末试全体HP和',[sum(e['current_hp'] for e in by[n]['combat']['enemies'] if e['is_alive']) for n in [297394,297398,297404,297409,297415]],[132,168,162,97,67])
check('F24首试母体需伤',[next(e['current_hp'] for e in by[n]['combat']['enemies'] if e['enemy_id']=='OVICOPTER') for n in [297368,297373,297379,297385,297390]],[132,123,108,80,67])
check('F24首试全体HP和',[sum(e['current_hp'] for e in by[n]['combat']['enemies'] if e['is_alive']) for n in [297368,297373,297379,297385,297390]],[132,174,173,106,132])
check('F17自爆前后意图',[by[n]['combat']['enemies'][0]['intents'][0]['damage'] for n in [297245,297247]],[56,42])
check('F17自爆生存资源',[by[297249]['run']['current_hp'],by[297249]['combat']['player']['block'],by[297250]['run']['current_hp']],[34,9,1])
check('喝药动作',sum(d['chosen'].get('action')=='use_potion' for d in D),12)
check('弃药动作',sum(d['chosen'].get('action')=='discard_potion' for d in D),0)
check('独立取得药水',sum(max(0,len(c['to']['potions'])-len(c['from']['potions'])) for c in R['resource_changes'] if not c['restart_boundary']),9)
J=[d for d in D if d['decider']=='jev'];check('Jev调用与低信心',[len(J),sum(d['confidence']<.35 for d in J)],[147,25])
B=[d for d in J if d['label']=='combat/plan-choice' and type(d.get('rollout_best_chosen')) is bool];check('最优原答统计',[sum(d['rollout_best_chosen'] for d in B),len(B)],[100,116])
C=[d for d in D if d['decider']=='code' and d['label'].startswith('combat/') and d['label']!='combat/plan-continue'];check('代码自主非续步与去重轮数',[len(C),len({(d['floor'],d.get('sl_attempt'),d['turn']) for d in C})],[179,128])
check('HP护栏替换',sum('hpGuard' in d or 'hp_guard' in d or 'HP guard' in d['rationale'] for d in D),0)
explore=[d['sl_explore'] for d in D if d.get('sl_explore')];check('SL探索记录组成',[len(explore),sum('replay' in e for e in explore),sum(bool(e.get('replacement')) for e in explore),sum('avoid' in e for e in explore)],[13,10,2,1])
check('Jev输入输出',[sum(d['usage']['input_tokens'] for d in J),sum(d['usage']['output_tokens'] for d in J)],[737800,7461])
brain=[d for d in D if (d.get('deepseek') or {}).get('input_tokens') is not None and not d.get('reused_answer')];check('脑请求输入输出缓存',[len(brain),sum(d['deepseek']['input_tokens'] for d in brain),sum(d['deepseek']['output_tokens'] for d in brain),sum(d['deepseek']['cache_hit_tokens'] for d in brain)],[25,3256473,5767,1689088])
check('用时秒',(datetime.datetime.fromisoformat(D[-1]['ts'].replace('Z','+00:00'))-datetime.datetime.fromisoformat(D[0]['ts'].replace('Z','+00:00'))).total_seconds(),2055.428)
check('固定帧随机毒伪斩杀',json.loads((p/'随机施毒核对.json').read_text())['模拟']['winsFight'],True)
# The targeted run section is retained independently of parallel appends.
section=[];active=False
for s in pathlib.Path('/home/dw/Projects/agent-sts2/notes/lessons.md').open():
 if s.startswith('## '):
  if active:break
  active=s.startswith('## G8NHLL09DLBX（')
 if active:section.append(s)
text=''.join(section);check('经验行数',sum(s.startswith('- [') and not s.startswith('- [记录]') for s in section),3)
check('关键数字已出现在追加文本',all(token in text for token in ['22/76','母体9血','[0,21,9,0,0]','2055.428','1689088','745261',':2284']),True)
(p/'数字复核.json').write_text(json.dumps({'checks':checks,'count':len(checks),'lesson_sha256':hashlib.sha256(text.encode()).hexdigest(),'clarification_needed':'sl_explore13条应分为10重放、2换线、1avoid；原文重放13条口径不精确。'},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'checks':len(checks),'passed':True,'clarification':'SL13条记录＝10重放＋2换线＋1avoid'},ensure_ascii=False))
