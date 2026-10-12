import json,subprocess
from pathlib import Path
p=Path(__file__).parent;root=Path('/home/dw/Projects/agent-sts2');run='0PH64C4AWAX9'
updates=[
 {'id':'silent-0295','evidence':[{'run':run,'floor':24,'turn':1,'role':'repeat','note':'首/第二试d321706/321719仍将中和+→药瓶+→冒泡打后段报25总伤，预测后段29血20毒；s330600/330615实分前/中各6毒，后段50血无毒，冒泡花1能量零效果，本轮实际16。当前live turn-solver.ts:2284→2536最高HP+挡随机施毒分配同根因；本局plan-choice并未伪标确定斩杀，整场独立归因未知。'}]},
 {'id':'silent-0205','evidence':[{'run':run,'floor':17,'turn':5,'role':'repeat','note':'d321590选生存者→中和+→冲刺，原18挡/损0/扣25；d321591信心0.31弃冲刺，重算突然一拳/中和/匕首雨，实8挡对14、49→43损6、敌208→177扣31。原后继防守取消后没有兑现零损；不声称保留冲刺能赢整场。'},{'run':run,'floor':23,'turn':3,'role':'support','note':'d321685原含腐化串刺的方案报损13/扣39；d321686弃串刺后重算损11/扣15，s330576—330582实际6挡对17、30→19、敌119→104。取消24预算伤害也避免2自损；这是取舍支持，不将省血改线单独判错误或新代码bug。'}]},
 {'id':'silent-0019','evidence':[{'run':run,'floor':24,'turn':1,'role':'support','note':'F21/22/23三胜战入口59→49→28→7净消耗52，含小血瓶三次+2、腐化串刺两次-2、敌失血54；F24进房7、就绪9，槽0狡/槽1精三试未赢。F18路线两火均在强制精英之后未访；替路线和前战早用药的整场反事实未记录，不记路线repeat。'}]},
 {'id':'silent-0030','evidence':[{'run':run,'floor':17,'turn':8,'role':'support','note':'s330487→330488吸取后玩家力量/敏捷各0→-2、敌力量0→2；T8防御3、两击各4并结算27毒；T9两防御6挡对18损12，直伤6+26毒；T10防御3与冲刺8共11挡对16损5，直伤8+25毒。负力量不减毒，后段威胁仍需防守。'}]},
 {'id':'silent-0046','evidence':[{'run':run,'floor':23,'turn':1,'role':'support','note':'s330571—330574突然一拳给弱后意图7，两尖啸使力量0→-6→-12、意图7→3→0，零攻击损；T2减力消失，T3已7力23攻，中和后17、脆弱生存者6挡仍损11。仅本局同一招窗口数值，不拟所有敌人倍率。'}]},
 {'id':'silent-0010','evidence':[{'run':run,'floor':24,'turn':1,'role':'support','note':'首/第二试药瓶+实分前/中各6毒而后段无毒，随后冒泡指定后段，s330600→330601及330615→330616能量1→0但敌血与毒均不变。确认已见零毒条件无效果；随机施毒造成伪前提的模型根因另补0295 repeat。'}]}
]
for r in updates:
 r.update(by='learner:postmortem',where={'lessons':[run]},note='本任务只追加本角色证据，保留原claim、first_run、prior、status、version及全部历史。原始660条偏移字节已核；复盘完成后登记，代码实现走独立strategy-proposal。')
new={'by':'learner:postmortem','character':'silent','kind':'mechanic','claim':'本局A10千足虫第二/第三试同T1实打三小刀后，敌出口HP同为24/40/50，前中各5残毒，玩家末挡分别0/5，瓶中精灵均在0血过渡帧被动消耗，下一轮出口分别8/14。5挡对应复活出口多6血，不能把初始HP加减伤或名义复活血量当出口。独立复活21血帧、逐击顺序及整场胜利对照未记录，不推出每点格挡的通用复活收益。','evidence':[{'run':run,'floor':24,'turn':1,'role':'support','note':'第二试s330621零挡→330622零血槽1消失→330623为8；第三试s330636五挡→330637零血槽1消失→330638为14，两试敌下一轮24/40/50。第二T2判死，第三T2损12剩2而T3仍死；当前候选出口8/14吻合，21仅模型名义值不作独立实测。'}],'first_run':run,'prior':'unknown','prior_runs':[],'prior_note':'按silent账本关键词瓶中精灵/瓶中/复活/残杀和这个角色较早复盘标题核查，已有瓶中精灵被动复活及尾巴后续扣血观察，未找到此同房配对的0/5挡和8/14出口；只针对本项局部交互判断unknown，不声称复活本身从未见过。','status':'observed','where':{'lessons':[run]}}
results=[]
for command,item in [('update',r) for r in updates]+[('add',new)]:
 ident=item.get('id','new-mechanic');(p/f'ledger-input-{ident}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
 stamp=subprocess.run(['date','-Is'],capture_output=True,text=True,check=True);print(stamp.stdout.strip())
 result=subprocess.run(['python3',str(root/'learner/ledger.py'),command],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
 (p/f'ledger-output-{ident}.txt').write_text(result.stdout+result.stderr)
 print(command,ident,'exit',result.returncode,result.stdout.strip(),result.stderr.strip())
 results.append({'command':command,'requested_id':ident,'code':result.returncode,'stdout':result.stdout,'stderr':result.stderr})
 (p/'ledger-registration-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 if result.returncode:raise SystemExit(result.returncode)
