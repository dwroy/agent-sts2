import json
import subprocess
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O/'changes.json'))
L = {r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
mapping = json.load(open(O/'ledger-map.json'))
rows = {}
for c in C['entries']:
    e = c['after']
    for lid in mapping[e['id']]:
        r=rows.setdefault(lid,dict(id=lid,by='learner:experience-update',where={'experience':[]},evidence=[],note='第88批经验提案预关联，保留首证/prior/原claim/repeat及全部上线历史；局部机制与整战因果分账。'))
        r['where']['experience'].append(e['id'])
        known={x['run'] for x in L[lid]['evidence']}|{x['run'] for x in r['evidence']}
        for run in e['evidence']:
            if run not in known:
                item=dict(run=run,role='support',note='本角色历史复盘与实帧重新核对支持'+e['id']+'；具体进阶、卡牌窗口/组合子分母和限制见本批mechanism-evidence.json。')
                if run=='9Z9H2EXKLF3T':item.update(floor=48,turn=11,note='A10沙漏三试0赢；末T11毒39+38及荆棘3使112→32，T8倍率挡32仍复活、T10挡37实损15；对应经验主题及其他层实帧见本批facts/audit与'+e['id']+'，不把全败推演或局部收益当必死/整战胜因。')
                r['evidence'].append(item);known.add(run)
for r in rows.values():
    if not r['evidence']:r.pop('evidence')
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in rows.values())
(O/'ledger-prelink-input.jsonl').write_text(payload)
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
(O/'ledger-prelink.log').write_text(p.stdout+p.stderr);p.check_returncode()
resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal']
combat=[c['id'] for c in C['entries'] if c['id'] not in resources]
common='''角色仅静默猎手；新增局9Z9H2EXKLF3T为A10，基础机制范围按各条已核进阶，未观察组合/其他角色保持等价。
来源experience-update/20261008-044250，第88次；实现任务strategy-proposal；授权Roy-2026-10-07-learning。
证据：只读根notes/lessons.md:5627起本角色复盘与勘误、logs/runs/decisions/brain/sl-attempts；states按UTC窗口seek再核run_id/character_id。逐帧facts、audit、旧新changes、机制窗口/反例和分阶、SL重放原行、字节偏移与before保存本scratch。
拟合/切分：旧115静默完局逐局重跑，七数组、全部血档、节点转移、真实回复及SL与第87批逐行一致；新局为新增验证，共116完局，切点2026-10-07T19:59:55.152Z。无自由参数拟合、无boss模拟池，不用预训练补机制；6c3d8187+dirty完整源码未知，不把当前源码当原局树。
支持/反例：各经验完整run id与各进阶支持/反例见changes.json及mechanism-evidence.json；新局无机制反例，无胜利SL对照。局部成立与整战失败分别计，不把失败局自动当基础公式反例。
验证：独立任务冻结本角色已观察状态和动作，核逐牌倍率、临时属性、毒/持牌伤/复活/反伤与已完成资源接续；核全败推演不能代替必死判官。运行原沙箱tsc/vitest，其他角色和未观察进阶策略保持等价。只有真实live祖先源码commit才可处置已实现子项；证据不足waiting保留现有行为。
预期影响：减少预支未执行组件、忽略持牌血价、混合生命上限/当前血、重复计算SL恢复的风险；胜率影响未知。
回退：独立源码实现逆向恢复实际上线前差量；经验以三方逆向本批单文件变化并登记回退版本，保留并行刷新和全部历史。实际上线后date、Roy双通知旧/新规则及证据/账本/任务/影响/回退。本经验任务只登记pending，不改打法源码，不冒称implemented/shipped。
'''
groups=[
 ('combat',combat,['combat','potion','sl','terminal'],'毒/倍率挡/持牌伤及荆棘按实结算，SL换线预测与整轮实差分账','''
旧行为/待核：现有经验支持毒/敏捷/翻倍/荆棘；末次T7全败模拟换线预计多损7换16伤，实际整轮省2血、多扣22且熔炉时点T8改T10，最终仍失败。模拟代价不是实际血价，局部差额不证明整战胜因或必死。既有代码策略实现需按当前live版本先查，不能从原dirty树归因。
新行为提案：固定回放审计末试F48 T2/T4毒雾+各3共6、T3普通触媒1；T11的39毒只结39+38=77，荆棘实反3，112→32。玩家仅2敏无力量；敌T8力6双18、T11力12双24逐击成长。T8暗影/士兵首挡为(6+2)×4=32但两张9伤+攻击36仍复活20；T10首偏折18后余偏折9、防御10共37，对两张12及28攻仍损15。只翻第一张士兵挡，不能沿用所有初览；死后未执行第二击不预支反伤。
药水：F48三试技能T1/T5/T5，混沌均T7生成精灵/熔炉，熔炉T7/T8/T10；末T8和第二试T8的精灵复活各20，首试精灵未消费便读档。22饮、三自动复活、两次SL复药、0弃分账，未实打的留药反事实未知，不设新喝药/持有门槛。
F35卷轴当前血66→30但上限77→69，两种损失不能相加；F48三次T1均弃悔恨，没有该持牌失血，不把商店未删诅咒当本局致死原因。验证现有模拟/终局是否与实帧一致；差异只在复现实验中确立后修改。缺毛伤事件账、两次截断结算、同条件替代整战与原dirty树，保留必死/SL边界，不以24/24全败增设阈值。
'''),
 ('resources',resources,['structure','sl','terminal'],'跨幕缺血80%回复与营火/胜战消耗/SL资源接续按实到节点分账','''
旧行为/待核：路线期望回血可能与赢战掉血、卷轴上限变化、问号战和SL恢复混算；跨幕已有silent-0243的机制尚未进经验。仅检查现有题面/结构模型，不假定代码尚未实现或新的路线必优。
新行为提案：9Z9H2EXKLF3T F35赢66/77→30/69，F38问号赢30→19、F39赢19→11；F42补20到31后F45再耗24到7，F47补20只到27，F48三试败、F49未到。F34路线投影F42/F47/boss为32/38/61（77上限），实11/7/27（69上限），F36与F42有新条件投影，不当同条件因果误差。六营火实回125，幕间79、三精灵复活63与两SL恢复28单列；恢复两药栏不算新获得。
跨幕公式：silent-0243现有证据十局A9/A10十六对同上限转换逐帧重核，全部实回floor(缺失HP×80%)；本局24/70→60/70补36，23/77→66/77补43。更低进阶与未见先古/遗物交互未知。只应用本角色已观察A9/A10结构边界，不把公式推广未观察条件。
分阶/路线：全部116局逐幕四档Monster/Elite/Unknown/Boss掉血和实死率、REST/SHOP/EVENT下一战、去重回血后战与SL统计留audit/rest/sl-summary。低血异节点历史对照敌/牌/幕/间隔不同，仅观察。无同条件改线或锻造胜线，不定安全血线、不加留药规则。独立实现若已有等价结构，给真实live祖先commit duplicate；缺数据waiting。
''')]
ids=[]
for name,eids,domains,summary,body in groups:
    lids=sorted({l for eid in eids for l in mapping[eid]})
    path=O/f'proposal-{name}.md'
    path.write_text('# 静默猎手第88批：'+summary+'\n\n账本：'+','.join(lids)+'\n经验：'+','.join(eids)+'\n\n'+common+body)
    runs=['9Z9H2EXKLF3T']
    if name=='resources':runs=next(c['after']['evidence'] for c in C['entries'] if c['id']=='silent-act-transition-missing-hp-heal')
    row=dict(character='silent',ledger=lids,runs=runs,source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
    (O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr);p.check_returncode()
    pid=p.stdout.strip();assert pid.startswith('silent-proposal-'),pid
    ids.append(pid);print(name,pid)
(O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
