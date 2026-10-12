import json
import subprocess
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
N='R6WDLYS19ZTY'
C=json.load(open(O/'changes.json'))
M=json.load(open(O/'ledger-map.json'))
L=json.load(open(O/'ledger-all.json'))
L=L if isinstance(L,dict) else {e['id']:e for e in L}
commands=[]

def cli(script,args,data):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    commands.append(dict(script=script,args=args,data=data,out=p.stdout,err=p.stderr,exit=p.returncode))
    (O/'registration-cli.json').write_text(json.dumps(commands,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()

for ident in dict.fromkeys(i for v in M.values() for i in v):
    es=[c for c in C if ident in M[c['id']]]
    data=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id'] for c in es]),note='第136次经验/提案预关联；保留旧claim、first_run、prior、状态及版本；R6WDLYS19ZTY两处勘误按普通第二步法/战内普通偏折使用，源提交后登记proposed。')
    if not any(e['run']==N for e in L[ident]['evidence']):
        data['evidence']=[dict(run=N,role='support',note='本角色A10原帧/数字核对；'+es[0]['after']['lesson'].split('典型案例：')[1][:320])]
    if ident=='silent-0343':
        data['evidence']=[dict(run='2SU6XN2AEJRD',floor=45,turn=6,role='support',note='回溯A6第5张防御非攻击仍使枢纽37→27，能力10建立在前轮；原帧字节seek配对通过。保留原first_run为首次完整定位模型消费缺口的R6局。'),dict(run='G403VCZ3BH1B',floor=33,turn=4,role='support',note='回溯A9全扫牌面8、两敌各实扣18，额外各10，与新局群伤配对相符；第五张前后原帧seek通过，整体胜因未控。')]
    cli('ledger.py',['update'],data)

groups={
    'resources':(['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal'],['combat','potion','terminal'],
        '棱柱HP护栏与实血药资源链的同输入验收',
        '旧行为：HP护栏替换Jev出牌，按当轮损血候选择线；已有路线投影、休息与后战估值。新行为提案：保留原阈值，独立strategy-proposal并列即时损血、已结伤/余毒、污染成本和后段存活；只在受控固定输入与时间外新局说明差异后调整。R6 F30T1损10/伤25/余毒8换损2/伤6/余毒0，T7损36/伤25/余毒11换结束损18/伤3/余毒2。模型合省26/少41不是实际救血；整场66→8胜。F40锻造入口57/62，HEAL最多补5；F42终轮至少差7仍不证明另升级或休息能赢。五HEAL各21、三店餐券各15、跨幕回46/55与五次SL恢复分账，不拟固定留药/终局HP新权重。'),
    'mechanisms':(['silent-strength-weak-observation','silent-footwork-block','silent-speed-potion-temporary-dexterity','silent-reptile-trinket-temporary-strength','silent-dampen-battle-upgrade-observation','silent-haze-group-poison-weak','silent-bronze-scales-per-hit-thorns','silent-scroll-paper-cuts-unblocked','silent-serpent-form-per-card-damage','silent-panache-fifth-card-group-damage'],['combat','potion','structure'],
        '神气制胜实群伤消费及力敏、战内降级和被动伤的固定回放',
        '旧行为：当前live combat-plan.ts:2854玩家输入及2920能力映射、turn-solver.ts逐能力/逐牌消费未找到PANACHE。新行为：独立strategy-proposal先固定R6 F42T4已建PANACHE_POWER10、T5总出牌4→5切割的原输入，核自身6与三敌各10群伤分源，魔法9挡先消、三敌实血合21；只补实证消费缺口。历史A6防御第5张扣10、A9全扫8另各10相符。历史20次建立/4局筛37第五张候选不是37次确证；存在建立当轮、自动出牌/计数偏移及其他限制的未隔离候选，总出牌计数不保证触发，未知组合保留原行为，不凭第5张推第10张。其他已观察条件：步法3再普通2到5、速度临时5次轮撤、饰品饮药临时3力次轮撤、战内刀刃3刀/迷雾4毒1弱、普通偏折9挡、荆棘逐击3、卷轴每漏击上限减2、群蛇已建4伤。第二步法F39事件已普通，不能归敌抑制；已有模型先验等价，不强制先打能力，不改无关角色。'),
    'boss-sl':(['silent-giant-explosion-window','silent-kaiser-crab-facing-sl','silent-three-knights-output-buffer-observation','silent-infested-prism-tainted-skill-cost'],['combat','sl','terminal'],
        '巨兽与蟹的重打实出口及三骑士毒杀后攻击验收',
        '旧行为：SL探索允许替序，候选完整死亡或一侧死亡不自动等于实战出口。新行为提案：独立strategy-proposal按真实重打、同抽前缀和实际击杀/剩余攻击复核，保留现行必死与SL门槛，证据不足不加固定杀序。R6 F17三试一赢，前两次T13为21血15挡对50判死，末次T10弱后30与8挡实34→12胜；T5换防御多留8血少6进度，后抽序也变。F33四试一赢、相同44血力量药入口，末T9火箭毒退场取消41激光，T10碾碎爪15血99挡12力26攻击被17毒结束、仍1血；12力来源未拆。F42只有首试、无SL，不把此前重打算三骑士尝试。末36血10挡、先毒杀连枷后仍52攻需42，至少差7存活血，实际只扣36；余两敌35/61血。棱柱技能污染每段血价与未施放毒分账，未执行原线不记原线败或救血量。')}
ids=[]
for key,(es,domains,title,body) in groups.items():
    ledger=list(dict.fromkeys(i for e in es for i in M[e]))
    lines=['# '+title,'','角色：silent；新局A10，机制历史A6/A9等分阶见mechanism-evidence.json。','来源任务：experience-update/20261009-184303；实现任务：独立strategy-proposal。','账本：'+','.join(ledger)+'。','',body,'','| 条目 | 支持/反例 | 范围 | 已核结论与案例 |','| --- | --- | --- | --- |']
    for c in C:
        if c['id'] in es:
            e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]} | {e["asc"]} | {e["lesson"]} |')
    lines+=['','## 拟合、样本与时间切分','',
        '截至2026-10-09T09:54:02.029Z共174静默完局，全引擎学习观察不当纯Codex爬塔成绩；旧173局七数组/血档/节点/HEAL/SL逐项全等，新增R6只作一局。主题支持局不等每个公式的独立因果样本，SL同场相关、不当独立局。无新参数拟合，后续完局作时间外验收；机制引用只来自本角色原帧，不用预训练知识补计数。','',
        '## 固定验证与数据限制','',
        '固定记录验收：1726条新局原始偏移核验及2个历史群伤配对原帧；R6末切割6+群伤10/三敌实血21及耗9挡；两挡26/25与17/2实损；临时力敏撤回；末毒杀后的52攻与至少差7存活血；F17自爆30−8=22、F33毒绕99挡；护栏两个题面取舍；F39普通化第二步法、战内普通偏折。tsc/vitest走固定沙箱入口，不跑模拟池。',
        '缺完整dirty源码、部分逐击归零/过量与内部结算、所有未选线整战反事实、不同节点因果对照、神气建立当轮及自动计数/重放/第十张边界、未到后战资源、无饰品对照和留药整战胜局。有限全败不证明所有打法必死，局部改善不许冒称整战翻胜；证据不足保留原规则。','',
        '## 预期影响、回退与授权','',
        '预期使已观察机制和真实血药出口被候选/执行模型一致消费，避免预支未发生收益；不保证本局翻胜。只silent已观察条件，无关角色/未观察组合等价。回退独立实现源码commit及本批经验commit，保留并行知识刷新和失败原件。Roy-2026-10-07-learning为既有授权，不是机制证据；规则实际合入后先date、唯一eval版本/decision-log和Roy双通知。',
        '本批提案pending，未改打法源码，不登记implemented/shipped；已实现项须由独立任务核实际live祖先源码commit才能登记。']
    path=O/('proposal-'+key+'.md');path.write_text('\n'.join(lines)+'\n')
    data=dict(character='silent',ledger=ledger,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=title+'；已观察条件固定验收、未知参数保留',proposal=str(path),experience=es,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/('proposal-'+key+'.json')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    ids.append(cli('code_proposals.py',['add','--character','silent'],data))
(O/'code-proposals-results.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-added.json').write_text('[]\n')
print('提案',','.join(ids),'；预关联账本',len(dict.fromkeys(i for v in M.values() for i in v)))
