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
        old=c['before']['evidence'] if c['before'] else []
        for run in c['after']['evidence']:
            if run not in old and not any(e['run']==run for e in L[ident]['evidence']+evidence):
                evidence.append(dict(run=run,role='support',note='第139次经验更新按本角色日志核实；'+c['after']['lesson'].split('典型案例：')[1][:350]))
    data=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id'] for c in es]),note='第139次经验提案预关联；177局旧基线七数组/血档/节点/HEAL/SL逐项全等，原始帧与公式核验记录在任务scratch；保留旧claim/首证/prior及状态，提交后登记proposed。')
    if evidence:data['evidence']=evidence
    cli('ledger.py',['update'],data)

resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
summons=['silent-fabricator-living-summon-observation','silent-zapbot-high-voltage-growth','silent-axebot-stock-phase-budget']
mechanisms=[c['id'] for c in C if c['id'] not in resources+summons]
groups={
 'resources':(resources,['combat','potion','terminal','structure'],'赢战血药成本、HP护栏取舍与未来资源验收',
 '旧行为：既有HP护栏与路线/休息模型继续运行；当轮净损/推演终局价值不能替代实盘整战及后战资源。新提案：独立strategy-proposal用54G5683J0E5S A10 F42T6原Jev损16伤43末毒20、替线损2伤29末毒13和实际35→33为同盘固定输入；核少14伤/7毒的后续代价，保留8点原护栏直到足够实盘对照，不由本次败局判替换错误。F42巨斧58→15耗两药，F43HEAL+21到36，F44死；七次HEAL各21，跨幕回19/32、果汁5、再生15另源。未访F46店/F47火不计可用资源；未选路线、留药/药时、休息换升级的受控整场胜果缺失。审计路线投影的分母与动作兑现，避免把未执行计划当收益，不拟药时阈值/终局权重。'),
 'summons':(summons,['combat','sl','terminal','structure'],'组装师活体召唤、巨斧库存与SL确定性边界',
 '旧行为：当前rollout-live.ts:831只为ILLUSION_MOVE装入活体summons，rollout.ts:2320消费传入表，未传FABRICATING_STRIKE_MOVE。新提案：独立strategy-proposal将silent-0348已核的A3 10GPK5XGHCK3 F39 T1 FABRICATE_MOVE后噪音22/戳刺19、T3攻击召唤电击21，及A10 54G5683J0E5S F44 T1戳刺21/T2电击24接成固定实盘夹具；对已见召唤招式接入实际实体/时点及已建高电压，未观察生成分布显式标未知，不拟固定顺序/数量/概率或首杀。T2五轮8/8存活不是必活证明，T3毒杀旧戳刺后另两敌32攻对21血8挡完整需24、存活差4，本局未杀主怪，不声称修后可赢。旧戳刺→末20血新体内部身份帧缺失。巨斧三台上限77/93/96及后力4/8，库存消费后还须清末台；不固定首maxHP乘库存。SL三条均attempt1、reloaded0，历史多次重打另表，同抽前缀不当完整同盘，有限全败/缺召唤推演不加强SL必死判断。关联原模型缺口silent-0347，本经验任务不改源码。'),
 'mechanisms':(mechanisms,['combat','potion','structure'],'敏捷、脆弱、临时减力及遗物分源的一致性验证',
 '旧行为：能力/药水/格挡/遗物由当前通用模型处理；本次不改出牌权重或喝留规则。新提案：独立strategy-proposal固定54G5683J0E5S A10 F42步法+1→4、敏捷药4→6、步法至9、T6防御14；T9蜃景7毒+9敏=16，尖啸暂减8力令26→18、次轮复8力双击38，中和后28；F44新战只1敏，T2臂甲首防御12、次6、生存者9共27，T3脆弱冲刺(10+1)×0.75取整8。F44留手双步法未打不计敏捷；F17速度药4→9、次轮回4；再生5/4/3/2/1回15而战内净增14。抱抱轮初T2两敌各2、T3三敌各3，与已结毒分账。新毒施放当步不扣本体，毒杀旧戳刺不取消另外两敌攻击。核相邻帧和实际牌序/费用/重算；未完整执行的原蜃景方案不拿未兑现收益评模型误差，缺证保持原参数。')
}
results=[]
for key,(ids,domains,title,body) in groups.items():
    ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]))
    if key=='summons':ledger.append('silent-0347')
    lines=['# '+title,'','角色：silent；新局A10，历史按mechanism-evidence.json逐局/进阶核实。','来源任务：experience-update/20261009-210409；实现任务：独立strategy-proposal。','账本：'+','.join(ledger)+'。','',body,'','| 条目 | 支持/反例 | 适用进阶 | 结论与典型案例 |','| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines+=['','## 拟合、样本与时间切分','','全引擎silent学习观察截至2026-10-09T12:16:15.493Z共178完局，旧177局逐项全等；不是纯Codex爬塔成绩。新召唤两局A3/A10，主题支持局不是每句公式独立实验。既有规则不因单局败而改，未拟新阈值/权重；历史为观察集、后续完局时间外验证。','','## 验证、预期影响与限制','','固定原帧的真实召唤时点、敏捷/减力/脆弱、库存及跨战资源；使用原沙箱入口tsc+vitest，单worker，不运行boss模拟池。预期使预测与执行前提一致，局部差异不证明整战翻胜。','缺完整dirty运行源码、永久实体ID及内部补召唤/恢复满血帧、旧boss时钟数值、未选药时/目标/构筑/路线/休息/牌序整场反事实；未知分支保留，不用预训练机制填空。','','## 回退与授权','','全部pending，不登记implemented/shipped；独立实现限制silent已观察条件，无关角色/未观察进阶保持等价。以实际live祖先源码commit验收，规则上线先date、唯一eval版本与decision-log、Roy双通知。回退独立源码commit或本经验commit，保留并行刷新和失败历史。Roy-2026-10-07-learning授权据证学习，不提供游戏事实。']
    path=O/('proposal-'+key+'.md');path.write_text('\n'.join(lines)+'\n')
    data=dict(character='silent',ledger=ledger,runs=['54G5683J0E5S']+(['10GPK5XGHCK3'] if key=='summons' else []),source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=title,proposal=str(path),experience=ids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/('proposal-'+key+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    results.append(cli('code_proposals.py',['add','--character','silent'],data))
(O/'code-proposals-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('提案登记完成',results)
