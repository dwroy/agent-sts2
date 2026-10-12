import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))
M=json.load(open(O/'ledger-map.json'))
L={e['id']:e for e in json.load(open(O/'ledger-all.json'))}
calls=[]
def cli(script,args,data):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    calls.append(dict(script=script,args=args,data=data,stdout=p.stdout,stderr=p.stderr,exit=p.returncode))
    (O/'registration-cli.json').write_text(json.dumps(calls,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

for ident in dict.fromkeys(i for ids in M.values() for i in ids):
    es=[c for c in C if ident in M[c['id']]]
    evidence=[]
    for c in es:
        old=(c['before'] or {}).get('evidence',[])
        for run in c['after']['evidence']:
            if run not in old and not any(e['run']==run for e in L[ident]['evidence']+evidence):
                evidence.append(dict(run=run,role='support',note='第141次经验按silent日志核实；'+c['after']['lesson'].split('典型案例：')[1][:350]))
    data=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id'] for c in es]),note='第141次经验预关联；旧179局与新增1局按同口径复算，保留旧claim/首证/prior/状态，提交后登记proposed。')
    if evidence:data['evidence']=evidence
    cli('ledger.py',['update'],data)

resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-cunning-potion-shiv-capacity','silent-fairy-revival-exit-observation']
discard=['silent-survivor-neutralize-discard']
remaining=[c['id'] for c in C if c['id'] not in resources+discard]
groups={
 'poison':(remaining,['combat','structure'],'随机启毒条件、逐敌威胁与临时属性的固定实盘验收',
 '旧规则：随机施毒以代表落点模拟，后继条件可能沿该代表落点成立；现场力量/敏捷和敌成长继续按现模型。新行为提案：独立strategy-proposal按本角色实帧验证随机分支条件和执行后重读，不把最高HP目标自动中毒当确定事实。0PH64C4AWAX9 A10 F24首两试T1中和/药瓶+/后段冒泡：药瓶实际前中各6、后0，冒泡花1零效果；原预测整轮25、实16，差9。第三试只换防御，随机分配同前中6，末轮雾建2无后轮收益；前段毒死而中后18攻仍杀2血。固定F17T8力敏各−2、敌力+2，两打击各4、两防御各3、T10冲刺8；F23双尖啸弱攻7→3→0及次轮撤回，脆弱生存者6、中和后17攻损11。历史公式分母另表，不把全部支持局当每句公式独立实验。只修有证据的输入和条件预算，不写固定先杀后段、固定禁随机毒或能力牌优先级；未知随机分布/制品组合继续保留不确定性。'),
 'discard':(discard,['combat','structure'],'生存者选择边界重新比较后继牌机会成本',
 '旧规则：原方案可在强制弃牌后继续保留已被弃后继收益，选择题只显示牌面。新行为提案：独立strategy-proposal沿silent-0205/0268已核边界，向弃牌选择提供原计划及剩余手牌真实攻防，取消被弃后继牌并重算，不强制保留原计划。0PH64C4AWAX9 A10 F17T5弃冲刺：原18挡/损0/扣25，实8挡对14损6/扣31；F23T3弃腐化串刺：原损13/扣39，实损11/扣15、省2自损。方向相反，证明须共同核血价和输出，不能只最大化旧后继兑现；完整保留线整场结果未记录，不声称改后必胜。范围限已观察普通生存者选择，不外推其他弃抽牌机制；实盘CARD_SELECTION pending动作不能因不是completed而漏作执行证据。'),
 'resources':(resources,['combat','potion','sl','terminal','structure'],'连续胜战资源链与精灵真实复活出口验收',
 '旧规则：现有路线/休息、饮药与必死闸继续处理，部分生成药仍未模拟。新行为提案：独立strategy-proposal用实盘固定夹具核资源分账与死亡后剩余攻击；本任务不直接改阈值。0PH64C4AWAX9 A10 F21/22/23三胜净耗52，回血6、自损4、敌攻击54分账；F24进房7、小血瓶到9，两火在精英后未到。F16休息41→62、F17胜离6、跨幕回51到57，恢复存档不当普通回血。F24第二/三试同T1三小刀、同敌出口24/40/50与前中5残毒，末挡0/5、精灵被动耗瓶后出口8/14；第三试T2实损12余2、T3死。当前精灵出口预测8/14已吻合，不凭整帧净HP判数值bug；独立21血帧/逐击顺序缺失，不能拟每点挡固定复活收益。三试零赢、抽序共同前缀不等完整同抽，不改SL上限或必死门槛。狡诈各添三升级刀，首试弱下每刀4、后二试6；调用题面effect not simulated为既有silent-0256，不重复称新bug。核生成后后缀/当前弱/容量与精灵出口共同验收，未见早喝/前战喝或替路线胜果，不设安全血线/饮药时点/终局权重。')
}
results=[]
for key,(ids,domains,title,body) in groups.items():
    ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
    if key=='discard':ledger.append('silent-0268')
    if key=='resources':ledger.append('silent-0256')
    lines=['# '+title,'','角色：silent；新证据A10，历史进阶及每条支持/反例见mechanism-evidence.json。','来源任务：experience-update/20261009-224303；实现任务：独立strategy-proposal。','账本：'+','.join(ledger)+'。','',body,'','| 条目 | 支持/反例 | 适用进阶 | 结论与典型案例 |','| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines+=['','## 拟合、样本与时间切分','','全引擎silent学习观察180完局，截止2026-10-09T13:28:20.770Z；旧179局基线全等复算，不是纯Codex爬塔成绩。未拟合新参数；历史作机制验证与兼容，新局定位固定夹具，后续完局独立验证。三次重打同局相关，不记三独立训练局；败局不自动列机制反例。','','## 验证、影响与缺数据','','固定原始实帧与字节来源，验证随机落点/初毒条件、负属性及弱脆弱、计划取消、生成容量、实际复活出口及SL恢复，沿原沙箱tsc+vitest，不跑boss模拟池。预期使预测、选择前提和实际状态一致，局部改进不证明整场翻胜。','完整dirty源码、复活内部逐击/独立21血帧、首两试SL退出结算、完整洗牌同抽、未选牌序/药时/路线/休息整战反事实、末击归零及未访资源仍未知，保留旧行为，不用预训练知识补。','','## 回退与授权','','全部pending，未登记implemented/shipped。独立源码实现限silent已观察条件，其他角色和未观察组合保持等价；验实际live祖先源码commit。规则实际上线后date、唯一版本/decision-log与Roy双通知，回退独立源码commit；经验回退本源提交并保留知识刷新及历史。授权Roy-2026-10-07-learning只提供学习权限，不提供游戏事实。']
    path=O/('proposal-'+key+'.md');path.write_text('\n'.join(lines)+'\n')
    data=dict(character='silent',ledger=ledger,runs=['0PH64C4AWAX9'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=title,proposal=str(path),experience=ids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/('proposal-'+key+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    results.append(cli('code_proposals.py',['add','--character','silent'],data))
(O/'code-proposals-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('提案登记完成',results)
