import json, subprocess, sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O/'changes.json'))['entries']
M = json.load(open(O/'ledger-map.json'))
L = list(dict.fromkeys(l for ls in M.values() for l in ls))
N = '0DJ6GFZZ0TG9'

def cli(script, args, value):
    stamp = subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
    p = subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as h:
        h.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode == 0, p.stderr
    return p.stdout.strip()

if sys.argv[1] == 'prepare':
    B = {e['id']:e for e in json.load(open(O/'ledger-before.json'))}
    for lid in L:
        cs = [c for c in C if lid in M[c['id']]]
        value = dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in cs]),note='第119批经验/提案预关联；保留旧首证/prior/status/version及证据历史。原帧与旧154局复算见本任务；提交后另记proposed。')
        if N not in {e['run'] for e in B[lid]['evidence']}:
            value['evidence'] = [dict(run=N,role='support',note='原帧核验：'+','.join(c['id'] for c in cs)+'；401决策/414帧，F9/F17/F33层轮及完整血药链见new-state-facts/audit。没有替代整场受控胜因，不拟固定门槛。')]
        cli('ledger.py',['update'],value)
    resources = ['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-act-transition-missing-hp-heal']
    endings = ['silent-kaiser-crab-facing-sl','silent-giant-explosion-window','silent-terror-eel-vigor-vulnerable']
    mechanisms = [c['id'] for c in C if c['id'] not in resources+endings]
    specs = [
        ('mechanisms', mechanisms, ['combat','potion'], '静默饮药临时力量分源、多目标抽牌伤与群蛇残壳伤验收',
         'F33T2癫狂之触建立饰品3力，T3撤；T4肌肉药建立FLEX5/饰品3共8力，T5均撤。升级锋利杀灭在虚弱下四段每敌40；原完整同线106预测/136净扣差30不能全归漏3力。当前药水模型只接自身增益，饰品仅白名单，纯bug账0329保持observed且只关联提案，不把定位塞进DS正文。独立实现只补已核饮药触发及临时撤层，用固定原帧隔离牌面/附魔与遗物贡献。T5两次抽二每敌各扣4；这16已伤不能加到重问预测。F17T8防御触发群蛇4只扣残壳，仍需16挡对26。先核既有速行者/群蛇源码实现，等价时引用真实live祖先写duplicate，不重复改代码。'),
        ('endings', endings, ['combat','sl','terminal'], '静默单侧蟹毒杀与巨兽残壳后的生存窗口核验',
         'F33T6玩家2血11挡，火箭12血16毒退场，碾碎爪76→68血/18→99挡/3→9力，玩家死亡。SL判官因为火箭可能先死而排除存活部件攻击返回不确定；不是确认能活。缺单侧死到实际攻击之间帧，旧19+5和末THRASH17不作已核毛伤。独立任务参考复盘原crab-sl提案，重核同招/朝向解除/弱/增力与所有结算分支的保守下界，证据不足维持严格必死闸并写waiting，不定杀序或扩大SL。F17T7本体结束、T8虚弱喷发26对16实损10；F9过75阈值后活力6仍留但T7毒杀获胜，不能由后场败否定保血。真正蟹SL旧11场58试2赢，新局无重打不扩该分母。'),
        ('resources', resources, ['structure','combat','potion','terminal'], '静默实际路线营火动作与赢战血药、护栏候选代价分账',
         '本局三HEAL各22合66，五SMITH一DIG不回血，浴场扣6/加上限6、跨幕44各分源；新获8瓶/实饮8/弃0/SL恢复0。F22→23两胜65→58→47，F29回69，boss69血两药仍死；F28新路线F32投影69兑现、旧路线未走。F12投影F16入口73实39，默认后续回血而实际F13锻造，不视为相同条件误差或改线实赚18。F9护栏预测省13血少7伤/7施毒、替线实损3，原线未打；F33T1原线36伤含后来被弃猎杀者、实际16，属于执行变线而非同线模型差。独立任务核资源来源/假设传播、候选与实执行标签；没有新护栏阈值、路线死亡概率因果或药价拟合，不按末局死亡否定先前保血。')]
    ids = []
    for name, entries, domains, summary, detail in specs:
        lids = list(dict.fromkeys(l for ident in entries for l in M[ident]))
        if name == 'mechanisms': lids.append('silent-0329')
        text = ['# '+summary,'','角色silent，实盘新增A10；来源experience-update，独立实现strategy-proposal。授权Roy-2026-10-07-learning不提供游戏事实。','账本：'+','.join(lids),'经验：'+','.join(entries),'','## 旧行为、证据与拟议实现', detail]
        for ident in entries:
            c = next(c for c in C if c['id']==ident)
            e = c['after']
            text += ['','- '+ident+'；旧：'+(c['before']['lesson'] if c['before'] else '本角色此药无独立条目')+'；新：'+e['lesson']+'；支持局：'+','.join(e['evidence'])+'；反例：'+','.join(e.get('contradicting',[]))+'；适用'+str(e['asc'])+'；账本'+','.join(M[ident])+'。']
        text += ['','## 方法与时间切分','旧154局截至2026-10-08T20:17:18.372Z为核验基线，新局截至20:48:22.147Z为增量；以后新完局作独立留出。逐牌、药水前后与下一轮实际帧核来源和撤层，旧七数组/血档/节点/休息/SL重算；支持局数与尝试数分开。动作集合仅检索，不直接增加机制支持局数。没有拟合权重/门槛或把路线相关性当因果。','', '## 限制、验证、预期与回退','缺完整dirty源码、单侧死亡攻击中间帧、各组件受控整场胜因、替代全路线/喝留药/护栏阈值的配对结果。保留现行未观察分支、其他角色和等级行为；只以已核固定状态测试临时层、逐段伤/弱、抽牌前后、多目标与挡/毒分源、死亡/恢复资源。原test-sandbox与预算不改，先去重既有提案/实际live源码；充分证据才能改已授权规则，不足写waiting，数据上线不称源码implemented。预期减少来源/可执行后续与末态误算，不承诺翻盘。回退独立实现commit到父版，保留所有经验/证据/失败；实际规则上线先date双通知Roy旧/新规则、局号/账本/任务、影响/回退，不改运维prompt。','']
        path = O/('proposal-'+name+'.md')
        path.write_text('\n'.join(text))
        value = dict(character='silent',ledger=lids,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],value))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(ids,ensure_ascii=False))
elif sys.argv[1] == 'after':
    commit = (O/'source-commit.txt').read_text().strip()
    heading = (O/'changelog-heading.txt').read_text().strip()
    for lid in L:
        entries = [c['id'] for c in C if lid in M[c['id']]]
        note = '第119批已自测源经验提交；数据shipped交运维据实际live完成事件登记。三源码提案pending，未实现，纯bug0329只关联提案不改状态；保留首证/prior/版本和证据历史。'
        if lid == 'silent-0330':
            note += ' 历史重核发现CSBR5CRDWQNB、3KME36ADUE4U、25226ZFLNR1J亦有肌肉5/饰品3合8，非首次8力。此次条目n=1仅核本局锋利/虚弱四段双敌各40与次轮撤层的完整组合，旧动作子句不当全部条件支持；原first_run/prior/claim历史保留。'
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note=note))
    result = dict(added=[],proposed=L,retired=[])
    (O/'ledger-results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
