import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent
ROOT = Path('/home/dw/Projects/agent-sts2')
M = json.load((O/'ledger-map.json').open())
C = json.load((O/'changes.json').open())['entries']

def cli(script, command, value):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['python3',str(ROOT/'learner'/script),*command],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:h.write(p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout

phase=sys.argv[1]
if phase=='prepare':
    p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True,capture_output=True,check=True)
    (O/'ledger-fold-before.json').write_text(p.stdout)
    folded=json.loads(p.stdout)
    if isinstance(folded,list):folded={r['id']:r for r in folded}
    ids=list(dict.fromkeys(i for v in M.values() for i in v))
    for lid in ids:
        changes=[c for c in C if lid in M[c['id']]]
        row=folded[lid]
        seen={e['run'] for e in row['evidence']}
        ev=[]
        for c in changes:
            for n in c['new_runs']:
                if n in seen:continue
                seen.add(n)
                ev.append(dict(run=n,role='support',note='本次经验更新已独立seek抽帧并重算；'+c['id']+'，逐动作/资源数字见numbers-checked.json与audit.json；不认定整场单因。'))
        data=dict(id=lid,by='learner:experience-update',where={'experience':[c['id'] for c in changes]},note='第103批提交前关联两局实帧/勘误；保留首证/prior/claim和历史状态，提交后登记proposed。')
        if ev:data['evidence']=ev
        cli('ledger.py',['update'],data)
    special=['silent-construct-artifact-growth','silent-lagavulin-siphon-poison-sl','silent-insatiable-dual-clock','silent-giant-explosion-window','silent-kaiser-crab-facing-sl']
    resources=['silent-act-transition-missing-hp-heal','silent-rest-buffer-observation','silent-route-hp-observation','silent-deck-burst-observation']
    mechanisms=[c['id'] for c in C if c['id'] not in special+resources]
    specs=[('mechanisms',['combat','potion'],mechanisms,'按已核力敏/脆弱、毒雾/触媒/蜃景、制品/暴露和遗物逐动作核模型，只修有证缺口，不拟固定出牌或药水门槛。'),('boss-sl',['combat','sl'],special,'核同盘重问后的实际目标、能力、毒退攻击者与即时血价；同时验沙坑/攻击、自爆阶段，三试零赢不作为胜线，不将未知抽序超集存活认定必胜。'),('resources',['combat','potion','sl','terminal'],resources,'逐段传递真实战出口HP/药与回复，排除未到营火、未建能力和未执行题面；固定验证预测条件，不由两局拟终局价值/持有价或路线阈值。')]
    common='''来源任务：experience-update / 20261008-170939；实现任务：独立strategy-proposal。角色silent，两局均A10；历史各阶支持/反例见update-summary.json与historical-mechanism-summary.json，机制适用[0,20]，策略沿[8,20]，不以低阶替高阶验证。授权Roy-2026-10-07-learning不提供游戏事实。本任务只改经验，不改打法源码；不登记implemented/shipped。

旧行为：BJLTVSYXCSGS F42T2原Jev方案题面24/24赢，但日志称旧近似线已知失败；SL改蜃景/暴露/两攻击打拳击，22挡却三敌32攻，损10，未建触媒。首试15挡但毒退方柱，损7；两线均T3判死/死。两试T2首手、能量、敌HP和铁棒计数相同，次序/目标/能力共同变，不能只按挡量择线；最终报需损6而现场需8根因未定位，不能直接报新模型bug。

新行为提案：实现前先核最新live接线和题目状态版本；优先固定回放完整尝试与重问后的实际出牌/目标/毒退攻击者/能力，再计算当轮血价及剩余场景。若只是旧策略生成有限估计与实盘政策不同，记录waiting而非重拟胜率。已有实际live祖先实现可duplicate；未实现不得冒认。

已核机制及案例：BJL F17三毒雾6、T7吸取玩家力敏各−2/敌力+2，防御3/防御+6/生存者6共15，比无负敏少6；T10敵40/毒51无再出牌毒胜。F33模拟512样本0胜而实61→9/T6胜，T5净进度227含爆发即时毒/额外毒/轮末毒/抱抱，早轮损12/34。F39T1步法建2敏、复制防御+两次10合20；F42开场三敌各1制品，中和先耗一体，其余毒雾先耗后建毒；首两试T2触媒+6毒三结退方柱，末试无触媒/换目标，毒未提前退该攻击者。铁棒3→4抽蜃景引发重问。暴露去8挡/加2易伤不扣HP，后打击18/13；抱抱轮初T3无毒方柱58→55。

Y5H4CFAQ2WTG F31T3药建2敏/旧挡0，脆弱蜃景4→6、防御3→5，合11挡对17损6；换战撤。F33沙虫同双击力3/6时12×2/15×2，尖啸T5力3→−3、T6恢复3。T10逃离沙坑1→2、末仍1；蜃景23＋防御5＝28，对30攻/1血实死，敌毒结后71。T1赌博筹码确认五弃341→326、T3单弃214→211，铜钹与攻击/毒分账，仅这次五弃合15、不推随机分配。F17本体T8被毒结束，T9残壳999999999只标自爆阶段，38攻对10挡实损28、46→18胜。

资源：BJL初56＋五火111＋跨幕104＋草莓7−17赢房净损229−事件37＝12，末战12→0；SL两次各5→12是恢复、药空，不叠进回复。13独立药=6奖励/5商店/2事件，11饮/1丢/1事件交换，无SL恢复药；F36补两防御药F37都饮，F38事件战20→21获复制、F39用后21→12、F42空药败，F43火未到。Y5初56＋四火84＋事件25＋餐券15＋跨幕41−14赢房162＝59，末战59→0；八药全奖励/八饮/无SL恢复，F30精英61→44/用祝福，F31问号44→38/用敏捷，F32补21。F27预测含F29回血，实际锻造且餐券补15，条件不同；不能把所有偏差归战斗模型。

反例与缺数据：经验原contradicting完整保留，两局败不反驳局部机制。完整dirty源码、BJL前两次致死退出、同结算全序、未执行Jev24/24方案整战、保留旧路线/提前营火/留药/替换组件完整胜负、计算下注真实重抽及先逃离再换手结局均未知。Y5纯bug0300/既有postmortem提案只列代码记录，不写DS经验；现drawsCards仍漏drawDiscardedHand，不把未知重抽超集当实际胜线。

样本/拟合方法：旧133局作时间前置、两新局冻结后验；135局全角色隔离、七数组/血档/节点后战/休息/SL重算，重复尝试按战/局分组。无自由参数拟合；任何终局价值/药价/SL阈值改变先按局时间留出与同盘完整对照验收，不足则保留旧参数写waiting。其他角色与未观察交互保持等价。

验证/预期影响：固定原帧回放与逐动作数值、实际生存和资源守恒，保留生成/执行/重问边界，避免预支未来毒/营火/未得能力，不承诺通关。原沙箱/gitleaks与合后测试通过且确实源码live祖先后才能实现登记。回退：逆向独立策略任务的实际源码提交，保留原日志/失败稿/经验/账本历史；实际改规则上线后先date双通知Roy旧/新规则、证据/账本/任务、影响与回退。
'''
    proposal_ids=[]
    for name,domains,eids,summary in specs:
        ledgers=list(dict.fromkeys(i for eid in eids for i in M[eid]))
        md=O/('proposal-'+name+'.md')
        md.write_text('# 静默猎手：'+summary+'\n\n账本：'+','.join(ledgers)+'\n经验：'+','.join(eids)+'\n\n'+common)
        item=dict(character='silent',ledger=ledgers,runs=['BJLTVSYXCSGS','Y5H4CFAQ2WTG'],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(md.resolve()),experience=eids,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        out=cli('code_proposals.py',['add','--character','silent'],item)
        proposal_ids.append(out.strip())
    (O/'code-proposal-ids.json').write_text(json.dumps(proposal_ids)+'\n')
    print(json.dumps(dict(proposals=proposal_ids,ledgers=ids),ensure_ascii=False))
elif phase=='commit':
    commit=(O/'source-commit.txt').read_text().strip()
    heading='## 2026-10-08 静默猎手 第一百零三次增量：2 局 A10（version 2026-10-08.20，分支 exp-silent，'+commit[:8]+'）'
    ids=list(dict.fromkeys(i for v in M.values() for i in v))
    for lid in ids:
        eids=[k for k,v in M.items() if lid in v]
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=eids,commits=[commit],changelog=[heading]),note='第103批经验源提交完成；保留首证/prior/claim及历史证据/版本；实际shipped交运维核live，经验发布不当策略代码实现。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=ids,retired=[]),ensure_ascii=False,indent=2)+'\n')
    print('提交后proposed登记',len(ids),'条')
