import json,collections,subprocess
from pathlib import Path
O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2');N='RMNXHZKV716Y';C=json.load(open(O/'changes.json'));M=json.load(open(O/'ledger-map.json'));R={r['run_id']:r for r in json.load(open(O/'run-metadata.json'))};records=[]
def cli(args,data=None):
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/args[0]),*args[1:]],input=json.dumps(data,ensure_ascii=False) if data else None,capture_output=True,text=True)
    records.append(dict(command=args,data=data,stdout=p.stdout,stderr=p.stderr,exit=p.returncode));(O/'registration-cli.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n');assert p.returncode==0,p.stderr
    return p.stdout.strip()
known={}
for ident in dict.fromkeys(i for v in M.values() for i in v):
    known[ident]=json.loads(cli(['ledger.py','show',ident]));(O/f'ledger-source-{ident}.json').write_text(json.dumps(known[ident],ensure_ascii=False,indent=2)+'\n')
for ident,item in known.items():
    linked=[c for c in C if ident in M[c['id']]];floor=47 if ident in ['silent-0019','silent-0020','silent-0142','silent-0204'] else 34 if ident=='silent-0243' else 48 if ident in ['silent-0024','silent-0059','silent-0025','silent-0278','silent-0301','silent-0125'] else 49
    data=dict(id=ident,by='learner:experience-update',where=dict(experience=[c['id'] for c in linked]),note='第130次经验提案预关联；已核本角色原日志，保留旧claim/prior/首证/状态/版本，提交后登记proposed。')
    if not any(x['run']==N and x.get('role')=='support' for x in item['evidence']):data['evidence']=[dict(run=N,floor=floor,role='support',note=linked[0]['after']['lesson'])]
    cli(['ledger.py','update'],data)
resources=['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-double-boss-resource-handoff','silent-eternal-feather-rest-arrival-heal','silent-stone-humidifier-rest-growth','silent-act-transition-missing-hp-heal']
boss=['silent-wither-end-turn-loss','silent-aeonglass-artifact-growth-sl','silent-queen-poison-main-target','silent-queen-poison-window-sl-observation']
potions=['silent-poison-potion-observed-application','silent-ghost-in-a-jar-current-turn','silent-petrified-toad-opening-rock']
mechanisms=[c['id'] for c in C if c['id'] not in resources+boss+potions]
groups=dict(resources=resources,mechanisms=mechanisms,boss=boss,potions=potions)
texts={
 'resources':('护栏最终执行及连续boss实血药接续验收',['combat','sl','terminal'],'旧行为：本局已有连续boss资源题面、末火回血计划和HP护栏，不认定缺备战意识。拟议行为：独立strategy-proposal用四个固定护栏帧d312975/312981/313020/313087分别核原Jev候选、护栏替换、抽弃重问和SL重放后的最终实盘。题面省16/12/16/8不是实得52血；前三未完整贯彻原替代后缀。F49首试T2实损2却撤毒雾与科学，需核成长成本。F47羽毛50→68/95再HEAL100/100，F48末13空药接F49同13且新生石；六次HEAL增30上限、到火羽毛及跨幕55/47、七次SL恢复分账。核已有资源同样本接续、能力跨战重建与终局目标，证据不足不改原8/10宽限、HP权重/药价/路线血线。'),
 'mechanisms':('专长科学、敏捷脆弱、首卡翻倍和遗物末挡/反伤的时点验收',['combat','terminal'],'旧行为：多数机制已学，当前源码只能定位，不等完整dirty运行树。拟议行为：先核实际live是否等价；偏差可复现才交独立实现。F49末T2专长科学0→2力、1→3敏却0挡；T3扫腿+给25，后空翻预览12消费佩尔后实6，31挡盖弱后的三击27，不能计37；T4步法3→5敏却没有挡牌兑现，两打击虚弱后各6。奥利哈钢零挡补6，T2对16实损10而非16，末对19仍需13损；荆棘三击9与毒22合31净清分账。毒雾实建2、旧毒扣1后再补2，末敌尚133/349。诊断endTurnGuards漏列奥利哈钢沿原postmortem silent-0338链，本任务不重复立纯bug，不把注记错误说成伤害漏算或败因。'),
 'boss':('沙漏持牌伤收尾与女王同抽重打证据验收',['combat','sl','terminal'],'旧行为：SL有换线/重放，有限全败模拟与实盘终战需分核。拟议行为：固定本角色已观察A10窗口，核沙漏末T13敌32血62毒仍先付持牌15减末挡6=9血，胜13后后战；三试首33抽同，一次胜，但护栏/牌序/药时点多处变。女王六试首20抽同且同13血石头，五次判死T3/4/4/2/4截断、末T4实死；没有赢例、未独立击杀爪牙或女王，不从chosen_order产生已验证顺序。99三减益/缚魂3与当前费用/挡预算合核，不能概括手里有能量却所有牌不可打。先核现有机制/SL等价实现，缺整战受控证据保留原必死标准及资源权重。'),
 'potions':('罐装幽灵实际防护、毒药启动及新战石头/SL恢复分账',['combat','potion','sl','terminal'],'旧行为：本局毒药F9得、幽灵F36得均留到沙漏；F48三试各用两药，没有早喝/继续留药整战对照。拟议行为：用实际饮用帧验证毒药只施毒不立即扣血、幽灵末T10使弱后30→1且38→38，次轮无实体撤、40攻；不从零净损造省30毛伤。新战空槽石头首生成、末T1女王400→385、玩家13不变，后五次恢复同石。成功use_potion实21=普通15+石6；历史audit的completed动作18、另三pending在后帧确实消耗，未下发幽灵一条排除。独立实现先核现有时点/资源模型，证据不足不定喝留门槛/新药价，其他角色保持等价。')}
proposals=[]
for name,ids in groups.items():
    title,domains,body=texts[name];ledger=list(dict.fromkeys(i for ident in ids for i in M[ident]));lines=['# '+title,'','角色silent；直接证据A10，历史进阶逐条列出。来源任务experience-update/20261009-130839；实现任务strategy-proposal；账本：'+','.join(ledger)+'。','',body,'','## 证据与反例','','| 条目 | 支持/反例、进阶 | 典型实帧 |','| --- | --- | --- |']
    for c in C:
        if c['id'] in ids:
            e=c['after'];lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}；{dict(collections.Counter(R[r]["ascension"] for r in e["evidence"]))} | {e["lesson"]} |')
    lines+=['','完整run id和参数见changes.json、mechanism-evidence.json，原始偏移/SHA见raw-verification.json；支持是主题证据局数，不等逐公式独立实验，败局不自动作机制反例。','', '## 样本、时间切分及限制','','截止2026-10-09T04:32:36.657Z，旧166完局复算完全一致，本局为随后观察；全引擎学习证据与纯Codex爬塔统计分开。各进阶分别核，不将A10策略自动下推低阶。没有新参数拟合；同抽前缀不等全程抽弃及候选固定。','', '缺完整dirty运行树、七个判死窗口真实致死结算、攻击逐击毛伤/过量、护栏原线/保药/改路线/科学时点的整场配对。证据不足保留原行为，waiting可等待新局；不从一次失败保证改后能赢。','', '## 验证、影响与回退','','独立strategy-proposal固定日志帧核现有live源码；等价实现只有真实live祖先源码commit才可登记duplicate/implemented，本次pending。必要改动经原沙箱tsc/vitest测试及live流程上线；不运行play，不跑boss模拟池，不影响其他角色/未观察进阶。预期让真实资源与兑现时点一致，不保证本局翻胜。回退独立源码commit或本经验提交，保留并行刷新/记录。','', 'Roy-2026-10-07-learning提供改规则授权，不提供游戏事实；源码规则实际上线后按date、decision-log、唯一eval版本和Roy双通知登记。']
    path=O/f'proposal-{name}.md';path.write_text('\n'.join(lines)+'\n');item=dict(character='silent',ledger=ledger,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=title+'；未核整战参数保留原行为',proposal=str(path),experience=ids,rule_changes=True,authorization='Roy-2026-10-07-learning')
    (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n');proposals.append(cli(['code_proposals.py','add','--character','silent'],item))
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n');(O/'ledger-added.json').write_text('[]\n');print(proposals)
