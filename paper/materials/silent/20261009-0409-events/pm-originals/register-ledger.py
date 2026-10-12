import json,subprocess
from pathlib import Path
P=Path('/home/dw/Projects/agent-sts2/learner/runs/20261009-034303-postmortem');run='456MRNGCPD8E'
def evidence(f,t,n,r=run):return {'run':r,'floor':f,'turn':t,'note':n,'role':'support'}
new=[{'character':'silent','kind':'fight','by':'learner:postmortem','status':'observed','claim':'已醒甲虫与丝虫并存时，SL判官因丝虫可能先被毒杀而排除甲虫攻击，两个已核实例实际丝先退场、甲虫保持滚动并致死。应检验这组敌人死亡时序的剩余攻击下界，不能据单条死线或两次实盘贸然放宽全部SL规则。','first_run':'3KME36ADUE4U','prior':'no','prior_runs':['3KME36ADUE4U'],'prior_note':'此前静默复盘未登记这项SL归因；回溯最早已核同型原始记录sl-attempts:543已因同伴可能死亡漏计甲虫。该窄场景学前已处理失败；另两次正确判死没有同伴毒杀条件，不当可比正确样本。','where':{'lessons':[run]},'evidence':[evidence(27,4,'第3次sl-attempts:543因丝虫5毒可能先死排除甲虫攻击，已有复盘记录丝先毒死、甲虫15对4血7挡实际致死。','3KME36ADUE4U'),evidence(31,6,'sl-attempts:1277同型拒判；s312177为2血14挡，甲虫16攻、46血10毒，丝7血4毒；s312178丝消失、甲虫19血仍滚动16，玩家0，无重载。')]},
{'character':'silent','kind':'mechanic','by':'learner:postmortem','status':'observed','claim':'静默持有石化蟾蜍PETRIFIED_TOAD的已见新战首帧，在空药槽新建药水形状的石头POTION_SHAPED_ROCK；实际使用对目标扣15，玩家HP当步不变。新战生成、奖励、SL恢复与投石分账，未观察满槽或未用旧石的组合，不推固定饮药门槛。','first_run':'ZZMYZ5UBCG72','prior':'yes','prior_runs':['ZZMYZ5UBCG72'],'prior_note':'账本尚无该机制条目；较早A2静默复盘已记录生成与投石，核s218165 F17T1槽0石、s218175→176 T3族母201→186且玩家52不变，学前已经执行正确；仅判断这个已见用法。','where':{'lessons':[run]},'evidence':[evidence(17,1,'s218165开战持蟾蜍、槽0自动有石；T3 s218175→176石离槽且族母201→186、玩家52不变。','ZZMYZ5UBCG72'),evidence(27,1,'F26取得蟾蜍；s312022→023空槽1新建石，d304197投向异螨，目标35→20、HP57不变。'),evidence(29,2,'s312066→067开战槽1新石；d304242/s312080→081目标129→114、玩家64不变。'),evidence(30,1,'s312101→102开战槽1新石；d304274/s312113→114目标99→84、玩家24不变。'),evidence(31,1,'s312142→143开战槽1新石；d304315/s312155→156丝虫44→29、玩家4不变。')]}]
updates=[]
def update(i,es):updates.append({'id':i,'by':'learner:postmortem','evidence':es,'where':{'lessons':[run]},'note':'本局补support；无受控整场替代胜线，不把死亡自动记为上线规则重犯；旧claim、先验、首证及状态保持。'})
update('silent-0019',[evidence(29,1,'F28HEAL43→64；F29赢后24、F30赢后4；F31以4血幽灵及新石进战，F32未到达，逐场资源不可省略。')])
update('silent-0316',[evidence(29,3,'力量7猛扑23、0挡实失23；第二成长后T6力量14猛扑30、13挡实失17，T7毒杀胜出24血。')])
update('silent-0232',[evidence(30,2,'柔嫩1逐牌后减属性：步法后3敏捷、防御实8，毒药后1敏捷和−3力量；下一轮恢复4敏。T6带7挡加防御9合16对24失8。')])
update('silent-0128',[evidence(31,4,'自然睡层3/2/1后T4滚动18，T5/T6力量2/4、滚动20/22；T6虚弱16仍致死，丝毒杀后死亡帧仍同招16。')])
update('silent-0005',[evidence(31,6,'步法2敏捷，两防御各7合14比基础10多4，但2血仍被16攻耗尽。')])
update('silent-0077',[evidence(31,4,'暗影后两防御每张14合28，等于(5+2敏捷)×2×2，实际抵丝10与甲虫18全挡；不预支上轮挡。')])
update('silent-0027',[evidence(31,5,'触媒+建2层；末9毒实24、丝2毒实3；T6甲虫10毒实27到19、丝4毒按剩7截断退场。')])
update('silent-0011',[evidence(29,2,'双毒雾建立4层；T3轮初4毒、毒药加到9实结9，T4再12；能力层数与实际结算分账。'),evidence(31,5,'第二毒雾使2→4，下一轮轮初甲虫10毒、丝4毒，已见触媒多次结算减层后再补毒。')])
update('silent-0301',[evidence(31,5,'幽灵药饮后建1无实体、甲虫当轮20→1，0挡实失1；T6无实体消失、虚弱后16攻，不把药效当跨轮保护。')])
update('silent-0020',[evidence(28,1,'F8/F16/F24/F28四次HEAL各21，无锻造对照；最后回血到64仍经两个赢战到4，未抵下一营火。')])
for name,items in [('ledger-add',new),('ledger-update',updates)]:
 payload=json.dumps(items,ensure_ascii=False,indent=2)+'\n';(P/(name+'.json')).write_text(payload)
 subprocess.run(['date','+%Y-%m-%d %H:%M:%S %z'],check=True)
 res=subprocess.run(['python3','/home/dw/Projects/agent-sts2/learner/ledger.py',name.split('-')[1]],input=payload,text=True,capture_output=True)
 (P/(name+'.stdout')).write_text(res.stdout);(P/(name+'.stderr')).write_text(res.stderr)
 print(name,'退出码',res.returncode,res.stdout,res.stderr)
 if res.returncode:raise SystemExit(res.returncode)
print('登记完成')
