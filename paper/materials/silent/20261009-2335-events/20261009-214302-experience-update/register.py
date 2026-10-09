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
        for run in c['after']['evidence']:
            if run not in c['before']['evidence'] and not any(e['run']==run for e in L[ident]['evidence']+evidence):
                evidence.append(dict(run=run,role='support',note='第140次经验更新按本角色日志核实；'+c['after']['lesson'].split('典型案例：')[1][:350]))
    data=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id'] for c in es]),note='第140次经验提案预关联；旧178局基线与新179局按同口径复算，保留旧claim/首证/prior/状态，提交后登记proposed。')
    if evidence:data['evidence']=evidence
    cli('ledger.py',['update'],data)

resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal','silent-royal-poison-blood-vial-opening-net']
weak=['silent-strength-weak-observation','silent-piercing-wail-temporary-strength','silent-frail-card-block']
remaining=[c['id'] for c in C if c['id'] not in resources+weak]
groups={
 'resources':(resources,['combat','potion','sl','terminal','structure'],'连续胜战血价、开战扣血与未兑现能力的资源验收',
 '旧行为：路线、休息、药水与SL按现有模型处理，未来回血和库存能力可能在投影中被混同。拟议行为：独立strategy-proposal对9663Y88TYK73 A10 F43/45/46入口70/55/9、王室猛毒各扣4、真实出口19/9/0建固定夹具；F44枕头休息回36、全局七火回152、跨幕两次各32、茶回31另源。三次SL从1空药恢复5两药是同房存档恢复，未再观察开场扣4，不能算新增药或普通回复。F46触媒/余像未施放，附加流电8自伤仅牌面，不预支多结毒/逐牌挡，不虚构实际自伤。前3试T4判死、末试T3实死，四试0赢；共同抽牌前缀不等完整同抽。未选路线/升级/留复制药或早喝毒没有整场结果，不拟安全血线、固定药时或终局权重，保留现行为并要求后续时间外验证。'),
 'weak':(weak,['combat','sl','structure'],'已有虚弱下临时减力与脆弱挡的实际存活边界',
 '旧行为：当前turn-solver.ts:2684—2692把新增力量变化直接加到已含虚弱的显示攻击上，本场12−6−3报损3余2，实8−3需损5死亡。拟议行为沿复盘silent-0349原修复提案：只有可核未缩放值时重新施力量/倍率并取整；只有显示12与弱时保持兼容原值区间，不能唯一逆推16；本场原16/17减6再弱可为7/8，按真实8边界核存活而不承诺翻胜。固定末次F46T3已弱1、减6力、无敏脆弱防御3、HP5与毒结后敌49；同局T2新弱配尖啸7×3→0×3作为兼容对照。已有弱无新增力量变化、新弱、未观察易伤/缩小等保留既有路径与固定等价检查。只影响已核输入的推演准确性，不修改SL尝试上限或必死门槛。本任务只关联独立实现，源码dirty全貌未知。'),
 'mechanisms':(remaining,['combat','potion','structure'],'临时敏捷、逐牌被动挡与毒施加结算的分源校验',
 '旧行为：现有能力与药水模型继续运行，本经验任务不改牌序、权重或喝留规则。拟议行为：独立strategy-proposal用9663Y88TYK73 A10 F17T5速度药建5敏、后续生存者13/两防御各10共33、饮时0挡、次轮撤敏做固定夹具；F43T2余像建1层，T3三触发加防御共8而来袭28损20；触媒+建2，F43T4毒19三结54，F45T4/T5三结60/63；能力建立当步不补既有伤挡。F46没有这些增益，两毒药21→27→33时敌82不变，随后结33至49仍杀5血3挡玩家，四试八饮只两瓶实得。历史全部silent机制日志与动作保留historical-parameters.json；不把所有支持局当每一句公式独立因果，不由单次败局拟固定喝药时机，缺提前饮用/安全建能力整场受控胜果时保持原规则。')
}
results=[]
for key,(ids,domains,title,body) in groups.items():
    ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
    if key=='weak':ledger.append('silent-0349')
    lines=['# '+title,'','角色：silent；新证据A10，历史逐局/进阶见mechanism-evidence.json。','来源任务：experience-update/20261009-214304；实现任务：独立strategy-proposal。','账本：'+','.join(ledger)+'。','',body,'','| 条目 | 支持/反例 | 适用进阶 | 结论与典型案例 |','| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines+=['','## 拟合、样本与时间切分','','全引擎silent学习观察179完局，截止2026-10-09T13:04:10.045Z；旧178局基线复算，非纯Codex爬塔成绩。没有拟合新参数，历史用于观察与兼容，新局定位夹具，后续完局独立验证。单局四尝试相关，不计四独立训练样本；未见公式反例，败局不自动等同反例。','','## 验证、影响、缺数据','','固定本角色实帧、药物建立与撤回、多次结毒及当前实际伤挡，沿原沙箱tsc+vitest，不跑boss模拟池。预期改善输入、预测与执行前提一致性，局部差异不证整场胜因。','缺完整dirty运行源码、前三次SL出口和完整洗牌同抽、逐击毛伤/部分终击归零、未知牌序/药时/路线/休息的整场反事实、旧boss时钟与未访资源；未知保留，不用预训练知识补。','','## 回退与授权','','全部pending，不登记implemented/shipped。本次只经验与提案，独立源码实现限silent已观察条件，其他角色/未观察组合保持等价；用实际live祖先源码commit验收。实际规则上线后date、唯一版本/decision-log及Roy双通知，回退独立源码commit；经验回退本源提交，保留刷新与历史。Roy-2026-10-07-learning授权据证学习，不提供游戏事实。']
    path=O/('proposal-'+key+'.md');path.write_text('\n'.join(lines)+'\n')
    data=dict(character='silent',ledger=ledger,runs=['9663Y88TYK73'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=title,proposal=str(path),experience=ids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/('proposal-'+key+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    results.append(cli('code_proposals.py',['add','--character','silent'],data))
(O/'code-proposals-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('提案登记完成',results)
