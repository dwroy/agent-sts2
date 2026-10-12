import json, subprocess, sys
from pathlib import Path

O=Path(__file__).parent.resolve();ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries'];M=json.load(open(O/'ledger-map.json'))
L=list(dict.fromkeys(l for ls in M.values() for l in ls));H={c['id']:c for c in C}
RUN='Z91JN3S3PQX2'
def cli(script,args,value):
    subprocess.run(['date'],stdout=subprocess.DEVNULL,check=True)
    p=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as f:f.write(json.dumps(value,ensure_ascii=False)+'\n'+p.stdout+p.stderr+'\n')
    assert p.returncode==0,p.stderr
    return p.stdout.strip()
if sys.argv[1]=='prepare':
    folded=subprocess.check_output(['python3',str(ROOT/'learner/ledger.py'),'fold'],text=True)
    (O/'ledger-fold-before.json').write_text(folded)
    F=json.loads(folded);F=F if isinstance(F,dict) else {e['id']:e for e in F}
    for lid in L:
        changes=[c for c in C if lid in M[c['id']]]
        known={e['run'] for e in F[lid]['evidence']}
        missing=list(dict.fromkeys(r for c in changes for r in c['after']['evidence'] if r not in known))
        value=dict(id=lid,by='learner:experience-update',where=dict(experience=[c['id'] for c in changes]),note='第112批提案预关联；原claim/首证/prior/状态/版本及support/repeat保持，源提交后登记proposed。新局原帧/层/轮见numbers-checked和本任务audit。')
        if missing:value['evidence']=[dict(run=r,role='support',note='本角色复盘和日志重核，经验'+','.join(c['id'] for c in changes)+'；新局案例'+changes[0]['after']['lesson'].split('典型案例：')[-1]) for r in missing]
        cli('ledger.py',['update'],value)
    specs=[
        ('mechanisms',['combat','potion'],['silent-footwork-block','silent-strength-weak-observation','silent-afterimage-per-card-block','silent-rolling-boulder-start-growth','silent-mr-struggles-turn-start-damage','silent-piercing-wail-temporary-strength'],'静默实建敏捷、临时减力与轮初成长伤害的兑现核验'),
        ('sandpit',['combat','sl'],['silent-tungsten-rod-hp-loss-observation','silent-insatiable-dual-clock'],'静默钨合金棍不能据此抵挡沙坑：已观察组合的窄判死核验'),
        ('resources',['structure','combat','sl'],['silent-route-hp-observation','silent-rest-buffer-observation','silent-act-transition-missing-hp-heal','silent-deck-burst-observation'],'静默资源接续与HP护栏的即时血价、能力启动和截止分账'),
        ('potions',['potion','combat'],['silent-dexterity-potion-card-block','silent-poison-potion-observed-application','silent-cure-all-energy-draw'],'静默敏捷、毒与痊愈药水已见药效和实际结算核验')
    ]
    ids=[]
    common=['角色silent；新证据A10，历史支持进阶见historical-mechanism-summary.json。其他角色及未观察交互保持等价。','来源任务experience-update；实现任务strategy-proposal；授权Roy-2026-10-07-learning。','当前运行源码记录049dff24+dirty，完整dirty树未取得；先核当前live实现和三项既有postmortem提案90a4a4981be3c760/2a6df9ebca080b2d/16f7cf00059df9a0去重，不因经验文字变化推断源码错误。','原帧505条、原始字节偏移、决策/药水/SL/计划子集及逐房抽取都留本scratch。支持/反例语义沿经验条目，动作/持有不自动扩支持；失败不是机制反例。']
    for name,domains,entries,summary in specs:
        ledgers=list(dict.fromkeys(l for e in entries for l in M[e]));path=O/('proposal-'+name+'.md')
        lines=['# '+summary,'',*common,'账本：'+','.join(ledgers)+'；经验：'+','.join(entries),'','## 旧记录和新证据']
        for ident in entries:
            c=H[ident];e=c['after']
            lines+=['- '+ident+'：旧：'+c['before']['lesson']+' 新：'+e['lesson']+'；支持'+str(e['n_support'])+'/反例'+str(e['n_contradict'])+'，证据局'+','.join(e['evidence'])+'；反例局'+','.join(e.get('contradicting',[]))+'；账本'+','.join(M[ident])+'。']
        lines+=['','## 证据、旧规则、新行为与限制']
        if name=='sandpit':
            lines+=['Z91JN3S3PQX2 A10 F33 T6无挡18双击实损16，T13以17血/8挡对13×2仅攻击预算需16可余1；s307493→307494实际0HP/8挡、沙坑1消失、敌50→45结5毒。T13独立攻击结算帧未记录，不称先损16再扣1。此组合首次证据，账本silent-0313/prior unknown不改为先验no。','旧规则：判官原话“only the Sandpit makes it lethal”但又保留“Tungsten Rod may cut what it takes (never logged with the Sandpit)”未知，因此本局没有预测读档；sl-attempts F33只有1次实际死，不能称已有成功SL。','新行为：独立任务固定该帧核当前判死实现；若仍因钨棍阻止这个已见组合的沙坑必死结论，窄修silent已观察A10且无其他未知防死增益的组合，沙坑归零和敌未即时被清按本角色证据核。其他增益、其他角色/未观察进阶不得外推。资料不足登记waiting；不增加读档次数/终局权重、不声称SL可获胜。']
        elif name=='mechanisms':
            lines+=['Z91JN3S3PQX2 A10 F17T5步法实建3敏，T11两防御各8共16对虚弱自爆33仍损17；F33T7建3敏却零挡损24、T13防御8也不阻沙坑。F33T2没有虚弱，尖啸使敌0→−6力、双击18→6，钨棍后实损4、次轮力量恢复；后3/6/9力虚弱双击18/22/26分核。','F33T9滚石+建10，T10—13各10/15/20/25合70，抱抱先生同轮10/11/12/13合46；第13轮初窗口另含此前6毒。历史单源观察和现场文本支持分源，同窗无独立帧时不强拆次序。T13首帧显示30是25结算后加5的待结层；下一轮30尚未发生。F12能力药生余像并实打，敏捷药另建2敏，逐牌被动挡分源；异鱼油F15实建1力1敏。','旧规则：当前模型是否已正确处理力敏、步法、尖啸临时撤回、滚石/抱抱起轮尚需核验。','新行为：先以已核帧和历史兼容帧验公式/触发及支付后的建立；预期保持已正确模型，若可复现偏差才修改。未支付/未打牌/未活到触发不计收益。没有同盘提前滚石仍跨沙坑的整场实盘，不定“永远先能力”或提前打3费能力硬规则。']
        elif name=='resources':
            lines+=['Z91JN3S3PQX2 A10 F2—30十二胜战净耗95，五回血21/22/23/23/24合113，F5/F20/F22事件另付14/10/5合29，F17→18同上限76跨幕33→67回34，开场56−95+113−29+34=79进沙虫；芝士取得后十胜各当前/上限+1已含战内净损，不再重复加。','F33T5护栏题面省13血少12伤，实75→72；T11省9少14，实18→17，双方五轮8/8死，低信任整场估值未有。合22/26只是题面预算，原线没有完整执行，不能定为实盘一定多活22。F16/F32最终回复投影75/79与实际相同；较早路线模拟后续回血条件改变且芝士上限增长，不把预测差额全当系统偏差。','旧规则：已有HP护栏按即时损伤预算执行，路线模拟是条件输入；是否缺少截止和能力支付展示待独立核实。','新行为：固定题面呈现即时原/新血价和伤害进度、沙坑/当前可结伤、能力实际建层及未来营火的条件；若当前实现已正确保持等价，缺项才补结构或在本角色已证场景窄修。没有未选线路/护栏原线完整胜负，不由单局拟统一HP阈值、改营火权重、SL探索门槛或terminal规则。']
        else:
            lines+=['Z91JN3S3PQX2 A10 F12T1敏捷药实加2敏、已有挡不补；能力药生成余像后确实打出。F28T1痊愈加1能抽2、HP不变，按实际新手重算，不把消亡粉末与自动伤混算药伤。F33T12毒药实饮0→6毒、当步敌HP不变，末T12结6/T13结5合11，最后敌45，没到T14；F33T3格挡药14→26另+12，供旧复盘提案复核。','取得9瓶药和1药水形状石头，use_potion实际10次、弃置0/SL恢复0；石头由石化蟾蜍补槽并投出，不叫弃药。','旧规则：已有效果模型或未知描述不能代表真实新药池，现行喝/留阈值没有本局受控验证。','新行为：核敏捷/毒/痊愈药效是否与本角色历史及新帧一致，正确保持，偏差才改；生成牌须实际打出才计能力。无早喝毒/留消亡粉末的同盘整战胜负，不拟新饮药价值或购买优先级，不补未知药池。']
        lines+=['','## 样本切分、验证、预期影响及回退','历史146静默局截至2026-10-08T14:33:59.374Z用于复算/兼容核验；本局截至15:04:43.085Z为较晚发现样本，后续本角色完局才算独立时间留出。SL同房不独立计局；不跨角色、不用预训练/游戏二进制补事实。未拟合血线、药价、终局/探索参数。','固定日志s306993—307494、d299919/299945护栏、F33T13及所有历史兼容帧自测，原test-sandbox入口和预算不变。预期改善模型/判死与资源展示的可追溯性，不保证转胜。回退独立源码commit至其父版，保留经验/账本/原始失败记录；实际源码live祖先才登记implemented。','本任务只登记pending，不改打法源码，不称implemented/shipped；实现者证据不足明确waiting原因。实际上线先date并双通知Roy，其他角色保持等价。','']
        path.write_text('\n'.join(lines))
        item=dict(character='silent',ledger=ledgers,runs=[RUN],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],item))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print('已登记代码提案',ids)
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip();version=json.load(open(O/'update-summary.json'))['version']
    day=subprocess.check_output(['date','+%Y-%m-%d'],text=True).strip()
    heading=day+' 静默猎手 第一百一十二次增量：1 局 A10（version '+version+'，分支 exp-silent，'+commit[:8]+'）'
    for lid in L:
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=[e for e in M if lid in M[e]],commits=[commit],changelog=[heading]),note='第112批经验已提交；仅登记proposed，实际数据shipped交运维据完成事件核实。代码提案未实现，旧首证/prior/claim/证据及状态/版本历史保持。'))
    (O/'ledger-results.json').write_text(json.dumps(dict(added=[],proposed=L,retired=[]),ensure_ascii=False,indent=2)+'\n')
    (O/'changelog-heading.txt').write_text(heading+'\n')
    print('登记proposed',L)
