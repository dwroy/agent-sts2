import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
RUN = 'RC61MFQM63Y6'
C = json.load(open(O/'changes.json'))
L = {r['id']:r for r in json.load(open(O/'ledger-fold.json'))}
mapping = {
    'silent-strength-weak-observation':['silent-0006'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-deck-burst-observation':['silent-0021','silent-0057'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-frail-card-block':['silent-0013'],
    'silent-accelerant-triggers':['silent-0027','silent-0079'],
    'silent-kaiser-crab-facing-sl':['silent-0065','silent-0079'],
    'silent-anticipate-temporary-dexterity':['silent-0080'],
    'silent-ornamental-fan-attack-block':['silent-0088'],
    'silent-phantom-blades-first-shiv':['silent-0101'],
    'silent-beckon-held-end-turn-loss':['silent-0176'],
    'silent-survivor-neutralize-discard':['silent-0205'],
    'silent-hunter-tender-card-attributes':['silent-0232'],
    'silent-speed-potion-temporary-dexterity':['silent-0253'],
}
assert set(mapping)==set(C['updated'])
pre={}
for c in C['entries']:
    e=c['after']
    for lid in mapping[e['id']]:
        row=pre.setdefault(lid,dict(id=lid,by='learner:experience-update',where={'experience':[]},evidence=[],note='第86批经验提案预链接；保留首证、先验、原claim、repeat和上线历史，独立实现任务，不标implemented/shipped。'))
        row['where']['experience'].append(e['id'])
        known={x['run'] for x in L[lid]['evidence']}|{x['run'] for x in row['evidence']}
        for run in e['evidence']:
            if run not in known:
                note='本角色日志和复盘复核对应经验主题；机制子分母、进阶与限制见本批report.md及'+e['id']+'，整战胜因未控。'
                new=dict(run=run,role='support',note=note)
                if run==RUN:
                    new.update(floor=33,turn=4,note='F17/F23/F29及F33实帧核对：强制弃牌、临时敏捷/柔嫩/被动挡、毒结算、赢战耗血与真实回复分账；具体子窗口见'+e['id']+'及facts.json，不将未执行能力/留药线认胜因。')
                row['evidence'].append(new);known.add(run)
for r in pre.values():
    if not r['evidence']:r.pop('evidence')
payload=''.join(json.dumps(r,ensure_ascii=False)+'\n' for r in pre.values())
(O/'ledger-prelink-input.jsonl').write_text(payload)
if '--resume' not in sys.argv:
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=payload,text=True,capture_output=True)
    (O/'ledger-prelink.log').write_text(p.stdout+p.stderr)
    assert p.returncode==0,p.stderr
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')

shared='''仅静默；新证据A10，机制基础公式沿各条已核实进阶，不外推未知组合/其他角色。
来源experience-update/20261008-024302，第86次；实现strategy-proposal；授权Roy-2026-10-07-learning。
证据RC61MFQM63Y6 F17 T2/T11、F23 T3/T4、F29 T3/T4、F33六试T1/T4，原始状态/决策、字节偏移、facts、audit和before保存在本scratch。逐条完整支持/反例及进阶见changes.json；没有相反机制实帧，整战失败不当机制反例，缺对照不能认因果。
拟合/切分：旧112静默完局逐局重跑并与上批七数组、全部血档、节点转移、回复/SL逐行一致；本局独立验证，截止2026-10-07T17:26:17.487Z为113局。无自由参数、跨角色样本或boss模拟池；本局0d6c1a82+dirty完整源码未知，不以当前源码冒认旧树。
验证：独立实现先冻结历史局再回放本局，固定数据覆盖实际弃牌/目标/能力/用药/SL状态；运行原sandbox tsc/vitest、非静默等价回归。当前live已有实现须核真实祖先源码commit再duplicate；没有独立胜线/参数证据则waiting，保留现有规则。本经验任务不改源码，CLI提案pending、不声称implemented/shipped。
回退：独立实现逆向恢复实际实现前live行为，保留并行刷新与学习历史；实际上线后按Roy授权双通知旧/新规则。经验文字回退用本批experience-before与源commit的单文件逆向补丁。
'''
replay=['silent-deck-burst-observation','silent-accelerant-triggers','silent-kaiser-crab-facing-sl','silent-survivor-neutralize-discard','silent-beckon-held-end-turn-loss']
resources=['silent-route-hp-observation','silent-rest-buffer-observation']
mechanisms=[e for e in mapping if e not in replay+resources]
groups=[
    ('replay',replay,['combat','sl','terminal'],'强制单弃后取消后继攻击/转向；SL能力换线同时核即时血价与实际结算窗口', '''
旧/新行为：F33第三试T4原线安排生存者后打击朝火箭，候选7挡/损31/余14；实际生存者前只有它与打击、后手空，火箭仍57，45HP+7挡不足，判死未结算。首試刺击先朝火箭则激光38、实损31。普通生存者单弃模型仅在绷带收益>0时消费的缺口已由postmortem登记silent-0268/提案eecf671192557465；本提案引用该独立修复，审计后继伤害/朝向/未知弃牌边界，不重复称已修，不给无真实可选保留牌的界面强制建议。
首/末T1相同指纹、52血，同局24/24全死的推演，SL把一打击换触媒；末挡16→12、实损4→8，攻击少9、毒结多2，合净扣30→23。末T3无毒雾而5毒两结9，T4刺击后6毒两结11；两蟹仍167/149，存活至少缺2HP。成长分数与当前可活窗口分账，不能由全死饱和断言即时等价；不定固定先能力或更改SL死亡门槛。旧1NZ8FE5F34R9/0079等同类差额和全部contra保持。
异鱼F17 T11持呼唤先8→2失6、随后毒终结敌2血；末血价值包含自损，不将其错当敌6攻击或因毒杀删除。预期影响：删去不能兑现的后继牌/朝向与收益，保留有证据的精确分账；没有胜率提升估计。
'''),
    ('resources',resources,['sl','terminal'],'路线/休息按已兑现回复与赢战耗血核血价；存档恢复不等真实回血', '''
旧/新表述：F18“能量续航补启动，走三火无精英路线保血。”不代表未来火已兑现；F27回血投影boss中位70/p75为66，实际52。二幕F19/F20/F21/F23/F29赢战耗0/10/17/24/31=82；餐券F22回15，F24/F27/F32三火回63。全局五火105、餐券30、幕间54和SL197分账，五次读档各恢复同一瓶格挡药，不当新得药。
A10 73局400独立营火房、274回血动作、6484实回血，去重255后战40实死，活损中位24；入血档/幕/房型/REST/SHOP/EVENT转移逐项见audit。MGA0CZDDKC0P低血休与D4LJ9QMGFB8Q事件后敌/牌/间隔不同，只有观察，无改路线因果。无锻造/另路线/留药受控胜线，不新设路线禁令/留药阈值，独立实现仅审计终局与SL资源分账/题面实入口。
'''),
    ('mechanisms',mechanisms,['combat','potion'],'牌挡敏捷/脆弱/柔嫩逐张核；折扇被动挡、触发时点与持有能力分源', '''
旧/新行为：核模型是否正确消费普通/升级毒雾3、本轮预判2、速度临时5、柔嫩逐牌−1、折扇每第三攻击4、已建幻影9层等观察，不以知识文本存在宣称实现正确。F23 T3预判后柔嫩净敏1，速度药1→6，斗篷得12后敏5、刺击后敏4、防御得9；第三攻击小刀零直伤仍折扇+4共25挡。次轮临时项撤回、属性恢复0。F33 T4预判+生存者⌊10×.75⌋=7，末两防御各3；57→38转向仍杀31HP/6挡，不把取整/被动挡倒补。
F17 T2毒雾+建3时旧7毒不变，后轮才补；F29 T3幻影建立9、旧5挡不变，T4首刀在弱/易伤下实14，仅本局该首刀窗口，不外推升级/叠层/通用取整顺序；蟹末未建立幻影/毒雾，不算其持续收益。药水获得10、饮15（5次同瓶SL重放）、弃0，没有改时点的完整胜线，只核已饮效果/期限，不提出新喝药/留药规则。
预期：已观察局部效果在候选和模拟中按实建/逐牌兑现，反事实用完整实线验证，缺整战证据保留策略。正確实现项核实际祖先后duplicate，剩余等待样本。
'''),
]
ids=[]
for name,eids,domains,summary,body in groups:
    lids=sorted({l for eid in eids for l in mapping[eid]})
    if name=='replay':lids.append('silent-0268')
    path=O/f'proposal-{name}.md'
    path.write_text('# 静默猎手第86批：'+summary+'\n\n账本：'+','.join(lids)+'。\n经验：'+','.join(eids)+'。\n\n'+shared+body)
    row=dict(character='silent',ledger=lids,runs=[RUN],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/f'proposal-{name}.json').write_text(json.dumps(row,ensure_ascii=False,indent=2)+'\n')
    p=subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(row,ensure_ascii=False),text=True,capture_output=True)
    (O/f'proposal-{name}-cli.log').write_text(p.stdout+p.stderr)
    assert p.returncode==0,p.stderr
    result=p.stdout.strip();assert result.startswith('silent-proposal-'),result
    ids.append(result)
    print(name,result)
(O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
