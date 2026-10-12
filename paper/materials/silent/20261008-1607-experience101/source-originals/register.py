import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
N = 'AD3QSC3P41JU'
mapping = {
    'silent-strength-weak-observation':['silent-0012'],
    'silent-mirage-poison-card-block':['silent-0010'],
    'silent-noxious-fumes-growth':['silent-0011'],
    'silent-vambrace-opening-block':['silent-0013'],
    'silent-test-subject-phase-reset':['silent-0028','silent-0079'],
    'silent-lagavulin-siphon-poison-sl':['silent-0030'],
    'silent-piercing-wail-temporary-strength':['silent-0046'],
    'silent-burst-next-skills-replay':['silent-0115'],
    'silent-ripple-basin-no-attack-block':['silent-0048'],
    'silent-queen-poison-main-target':['silent-0069'],
    'silent-royal-poison-blood-vial-opening-net':['silent-0255'],
    'silent-double-boss-resource-handoff':['silent-0228'],
    'silent-act-transition-missing-hp-heal':['silent-0243'],
    'silent-dexterity-potion-card-block':['silent-0276'],
    'silent-rest-buffer-observation':['silent-0020'],
    'silent-route-hp-observation':['silent-0019'],
    'silent-deck-burst-observation':['silent-0021'],
}
locations = {'silent-0012':(49,2),'silent-0010':(48,6),'silent-0011':(48,3),'silent-0013':(49,1),'silent-0028':(49,2),'silent-0079':(49,1),'silent-0030':(17,8),'silent-0046':(48,10),'silent-0115':(48,10),'silent-0048':(48,9),'silent-0069':(48,3),'silent-0255':(49,1),'silent-0228':(49,1),'silent-0243':(18,None),'silent-0276':(21,1),'silent-0020':(47,None),'silent-0019':(15,None),'silent-0021':(48,6)}
groups = {}
for eid, ids in mapping.items():
    for ident in ids:
        groups.setdefault(ident,[]).append(eid)

def cli(tool, command, data):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    args = ['nice','-n','19','python3',str(ROOT/'learner'/tool),command]
    if tool=='code_proposals.py': args.extend(['--character','silent'])
    p=subprocess.run(args,input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
    with (O/(tool+'.'+command+'.log')).open('a') as h: h.write(p.stdout+p.stderr)
    assert p.returncode==0,p.stdout+p.stderr
    return p.stdout.strip()

if sys.argv[1]=='prepare':
    L={e['id']:e for e in json.load((O/'ledger-fold.json').open())}
    for ident,eids in groups.items():
        item=dict(id=ident,by='learner:experience-update',where=dict(experience=eids),note='第101批AD3QSC3P41JU实帧关联；首证/prior/claim及原support/repeat保留，提交后登记proposed。')
        if N not in {e['run'] for e in L[ident]['evidence']}:
            f,t=locations[ident]
            ev=dict(run=N,floor=f,role='support',note='独立重抽实帧支持'+','.join(eids)+'；数据与反事实限制见20261008-153440报告，不将局部收益称整战胜因。')
            if t is not None: ev['turn']=t
            item['evidence']=[ev]
        cli('ledger.py','update',item)
    (O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
    (O/'ledger-added.json').write_text('[]\n')
    print('账本预关联',len(groups))
elif sys.argv[1]=='proposals':
    C=json.load((O/'changes.json').open())['entries']
    specs=[
        ('modifiers',['combat','potion'],[e for e in mapping if e not in ['silent-test-subject-phase-reset','silent-royal-poison-blood-vial-opening-net','silent-double-boss-resource-handoff','silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation']],
         '核实毒雾轮初实建/结算、脆弱蜃景、首牌臂甲、爆发尖啸和水盆分源；敏捷药只核已饮＋2，不拟留药时点。'),
        ('enrage',['combat','sl'],['silent-test-subject-phase-reset'],
         '对实验体激怒3逐技能净收益和已知抽牌重规划做固定帧核验；全败推演中保留实际血价和可活窗口，不以单局拟HP护栏边界。'),
        ('resources',['combat','potion','sl','terminal'],['silent-royal-poison-blood-vial-opening-net','silent-double-boss-resource-handoff','silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation'],
         '保留连续boss实际出口HP/药水、下一场入房与可操作HP、能力重建及开场血价；受控样本不足时保留药水持有价、SL及终局权重。')]
    common='''来源任务：experience-update / 20261008-153440；实现任务：独立strategy-proposal。角色silent，本批策略只观察A10，机制范围与历史各阶证据见changes.json/update-summary.json。授权Roy-2026-10-07-learning不提供游戏事实；其他角色及未观察进阶保持等价。本经验任务不改打法源码，不登记implemented/shipped。

旧行为：当前turn-solver.ts:1942已按每技能增加现场enrage，不能因本局败就认定漏模。完整运行a340c1ec+dirty源码未保存；当前exp引用只是核验入口。F49T1 Jev在8/8或24/24死亡的候选中选30伤/损8，第二试SL实选21伤/零损；8血差未越当前护栏8，不能登记为护栏未触发bug。当前模型、抽牌重规划与真实意图逐步一致性需独立检查。

证据：AD3QSC3P41JU A10 F49败，708决策/728重抽帧/43Codex脑请求/9SL记录。F49六次同11/70空药及同八张首手；五次判死截断，末次T2实死，不能把截断记作五次实际死亡。首及末T1首防御10挡、30直伤后18攻击实损8；第二试突然一拳→切割→扫腿+实21伤/28挡、虚弱4，T2仍11血且零损，T3才判死，后轮抽牌/行为亦变，无整场胜利对照。末T2肾上腺素、两后空翻、防御+使敌力3→6→9→12→15、攻击19→22→25→28→31，突然一拳施弱后23；18挡与3血需损5而实死。毒雾能力不加激怒力量；额外起始毒3→6不扣本体，末次实结6后仍58/111血。本局未跨实验体第一阶段，不补后续阶段机制。

机制：F17 T2/T3双毒雾+合6，T8玩家力敏−2/敌力2仍继续毒输出，38→11/T11胜。F48 T1建雾6、T3补到8；T3后99减益与魂缚在场，T6敌毒32+41=73、蜃景脆弱后54挡挡住36攻；T8聚合体44血46毒退场，其31攻击未结算。T9女王6×5=30，牌挡13+水盆4实损13。T10爆发+层2→1→0，尖啸重放使敌力2→−10、攻22→9，防御重放实6挡+水盆4零损；次轮力回2。F21敏捷药实＋2而换战撤，F49无玩家常驻力量/敏捷。局部机制兑现不等单能力整战胜因。

资源：F46法官房间66→可操作62→赢26，两药实饮；F47休息+36至62。F48女王房间62→可操作58→赢15，能量药T3喝完。F49房间15→可操作11、空药，前战增益撤。王室猛毒F39/45/46/48/49新战各开场扣4，五次SL恢复11不重复加开场损失或当回血。11火中6回血实+133、5锻造；跨幕+47/+40；10瓶实得且10饮、0弃、无SL药水恢复。F4路线投影F15为70但两火实际锻造，实53，不将17血差全归预测误差；F49投影明确前战损血未知。脑F34已经明确备连战，不当忘记双boss。留药/改线/女王缩短战斗后完整通关反事实未记录。

推理/样本：旧131局为时间前置，本局留出；各阶只用silent；同战多次尝试按局/房分组，不当六独立局。旧七数组、血档/节点后战、回复与SL逐行复算一致；437段历史静默复盘和全部自有日志用于验证，支持名单不以动作出现集替代。反例沿经验contradicting保存；本局战败不反驳已实测的局部机制。

验证：先核现live真实祖先源码；固定本局动作前后帧验证力/弱、毒实结、脆弱牌挡、重放、回合末被动挡及出口资源。对已实现部分只记真实祖先或具体waiting，不冒称新增实现。若拟修改终局/药水权重，需按局/战时间切分和同盘完整结局对照，目前保留原权重。SL探索差异与运气不能由六敗判定，未知抽牌仍可能有解。

缺数据：完整dirty源码、前五SL实际退出/致死结算、部分敌退场末击毛伤、后续实验体阶段、本角色boss时钟输出、联合通关预测、受控留药/换线/改休息整场结局，以及末轮推演损2与实际需损5差额的确定原因。证据不足保留现行为，不凭rationale定新纯bug。

预期：模型逐步消费与血药接续一致，避免预支能力/未来毒或忽略技能净威胁；不承诺胜率。回退：独立实现仅逆向对应源码提交，经验及原帧保留；测试、gitleaks、锁内合入及实际规则上线后的Roy旧新双通知按协议执行。
'''
    ids=[]
    for name,domains,eids,summary in specs:
        ledgers=list(dict.fromkeys(i for eid in eids for i in mapping[eid]))
        path=O/('proposal-'+name+'.md')
        text='# 静默猎手经验代码提案：'+summary+'\n\n'+common+'\n新行为及边界：'+summary+'\n\n账本：'+','.join(ledgers)+'；经验：'+','.join(eids)+'。\n'
        text+=''.join('\n- '+c['id']+'；适用'+str(c['after']['asc'])+'；支持/反例'+str(c['after']['n_support'])+'/'+str(c['after']['n_contradict'])+'；'+c['after']['lesson'] for c in C if c['id'] in eids)
        path.write_text(text+'\n')
        item=dict(character='silent',ledger=ledgers,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py','add',item))
    assert set(mapping)=={eid for _,_,eids,_ in specs for eid in eids}
    (O/'code-proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('提案',ids)
elif sys.argv[1]=='finalize':
    commit=(O/'source-commit.txt').read_text().strip()
    title=(O/'changelog-title.txt').read_text().strip()
    for ident,eids in groups.items():
        cli('ledger.py','update',dict(id=ident,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[title]),note='第101批经验源提交完成；首证/prior/claim/原证据与旧上线历史保持；实际shipped交运维核live，经验发布不当策略代码实现。'))
    (O/'ledger-proposed.json').write_text(json.dumps(list(groups),ensure_ascii=False,indent=2)+'\n')
    print('proposed',len(groups))
