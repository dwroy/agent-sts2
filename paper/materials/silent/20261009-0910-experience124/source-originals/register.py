import json
import subprocess
import sys
from pathlib import Path

O=Path(__file__).parent.resolve()
ROOT=Path('/home/dw/Projects/agent-sts2')
C=json.load(open(O/'changes.json'))['entries']
M=json.load(open(O/'ledger-map.json'))
N='SDY5T9XCSQN2'

def cli(script,args,value):
    stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
    result=subprocess.run(['nice','-n','19','python3',str(ROOT/'learner'/script),*args],input=json.dumps(value,ensure_ascii=False),text=True,capture_output=True)
    with (O/'ledger-cli.log').open('a') as f:
        f.write(stamp+'\n'+json.dumps(value,ensure_ascii=False)+'\n'+result.stdout+result.stderr+'\n')
    assert result.returncode==0,result.stderr
    return result.stdout.strip()

if sys.argv[1]=='prepare':
    B={e['id']:e for e in json.load(open(O/'ledger-before.json'))}
    notes={
        'silent-0019':(8,7,'满血70进骇鳗胜损66；F9避可选精英但F13仍必经，两瓶药路上实饮，boss空药六败。无改线/留药受控胜果。'),
        'silent-0020':(16,None,'三火回63、事件10、缩放仪仅进boss回25；F16锻造未回皇家枕头血，65/70六败。B2两选项估计无实打配对。'),
        'silent-0021':(17,15,'末試15轮直扣213+毒75=288，初250+回复45需清295余7；11血9挡对33需损24，活命差14血，补7伤不证明过自爆。'),
        'silent-0125':(13,2,'原候选损10伤56，护栏替损5伤55、实损5净清55；原答比plan9零损多10超8宽限。原线未实打，长期价值未知。'),
        'silent-0006':(13,2,'力量药实际建2力、旧5挡不补；打击8、中和5、匕首雨三无挡目标各12共36，换战力量清、全局敏捷未建。'),
        'silent-0012':(13,2,'匕首雨二力各段6，三无挡目标共36，比无力每敌8合24多12；第四目标2挡先抵只实扣10，毒与盾另账。'),
        'silent-0030':(17,14,'末試刺击及打击38→26、2→5毒，结束扣5及回复15后36；末轮4毒只11→7仍攻击杀玩家，未结毒不当已伤。'),
        'silent-0017':(17,16,'四次T15结束本体、T16蒸汽59弱化44但余8/11/11/6血0挡判死，全部六试零赢；末试本体仍7血阵亡。'),
        'silent-0079':(17,5,'第五試同盘用打击换防御多付5血换题面6伤，后序仍有差、零赢家，不据局部取舍定整战因果或取消护栏。'),
        'silent-0050':(8,7,'T5至75眩晕不结束战斗，T7六活力及99易伤令撞击24→36，5挡实损31；本战70→4胜损66。'),
        'silent-0211':(13,2,'二力打击19→11后补7挡，中和5只抵至2，匕首雨12抵挡后实扣10到1，2毒退场取消该体弱后6攻。'),
    }
    lids=list(dict.fromkeys(l for ls in M.values() for l in ls))
    for lid in lids:
        entries=[c['id'] for c in C if lid in M[c['id']]]
        v=dict(id=lid,by='learner:experience-update',where=dict(experience=entries),note='第124批经验预关联：旧claim/首证/prior/status/version与support/repeat历史保持；旧159局同口径复算及本局原件核验，提交后另记proposed。')
        if not any(x['run']==N for x in B[lid]['evidence']):
            floor,turn,note=notes[lid]
            v['evidence']=[dict(run=N,floor=floor,turn=turn,role='support',note=note)]
        cli('ledger.py',['update'],v)
    specs=[
        ('resources',['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation'],['combat','potion','terminal'],
         '静默赢战血药链、护栏即时取舍与未兑现恢复的终局预算验证',
         'F8满血70进骇鳗赢但损66，三火63/事件10/缩放仪进boss25分源；两药分别F3T1爆炸安瓿、F13T2力量药实饮，丢弃0，boss六试空药。F9避可选精英但F13仍强制，未到商店/后幕。F13T2原答损10伤56，护栏替线损5伤55实际54→49、敌109→54；plan9报零损，原答多10超既有8宽限，不能误定纯bug。F16锻造/休息B2胜率10.37%/9.71%、预测入场65/70，实选锻造进场65兑现，单场六试败不作六个校准样本。旧规则保留固定护栏、药水持有价值与休息选择；建议先对齐候选省血/伤害/药水及后战资源来源，投影未来火与遗物条件不能当当前资源。缺配对原线/留药/改线/休息整战胜果，独立策略任务不足则waiting，不拟新血线/药价/护栏权重。'),
        ('mechanisms',['silent-strength-weak-observation','silent-poisoned-stab-components','silent-terror-eel-vigor-vulnerable','silent-gardener-skittish-shield'],['combat','potion','terminal'],
         '静默逐段力量、胆小盾与毒结算的真实目标/生存窗口核验',
         'F13T2力量药建2力且不补5旧挡，打击6→8、中和3→5、匕首雨4×2→6×2；三无挡目标合36较无力24多12。第四目标19→11后胆小7挡，中和5只抵到2，匕首雨先抵2再扣10至1，2毒退场，其弱后6攻未兑现；F14力量清。F8T5至75阈值眩晕，T7六活力而非力量、99易伤令24→36，5挡实损31。巨兽末试T14刺击+打击38→26、毒2→5，结束毒5和回复15后36；T15结4毒仍7本体血，11血9挡对33需损24阵亡。旧代码按属性/伤害/盾/毒结算路径；建议用固定真实帧检查逐段、目标挡、退场免攻与后战清层分账，若发现明确遗漏才限本角色已观察机制修正。无整战移除力量药/换目标/先杀后段的受控赢家，不加先喝/留药/固定集火新规则。'),
        ('phase',['silent-giant-explosion-window'],['combat','sl','terminal'],
         '静默巨兽本体回复、自爆阶段与SL占位指标分账',
         'F17六試零赢；第一/二/四/五次T15本体结束，T16蒸汽59弱化44，余8/11/11/6血0挡判死读档，不是四胜。末試15轮直扣213+毒75=288，对250初血+45回复需295余7，11血9挡对33活命至少差14血，还未支付自爆。T2蒸汽20后每轮+3，只用A10观察参数，不复制其他进阶基数。旧sl/explore.ts的summary HP累加把自爆999999999占位HP当残血，0250重复；四条该值相同，现有尝试次序等仍影响参考选择，不能宣称该字段独自选错。建议独立策略任务将本体剩血、已结束本体、自爆威胁/可活血挡分别记录，参考指标排除占位HP，不由攻击残壳估新进度；核旧提案e972b5909856ce15及旧0250去重。最长存活优先另为规则问题，缺受控赢家不改排序。第五試T5多付5血换题面6伤，后序不等，保留0079局部repeat，不当整战单因。'),
    ]
    ids=[]
    for name,entries,domains,summary,detail in specs:
        linked=list(dict.fromkeys(l for e in entries for l in M[e]))
        if name=='phase':linked.append('silent-0250')
        lines=['# '+summary,'','角色silent；新证据A10；source_task=experience-update；任务20261009-084302-experience-update；target_task=strategy-proposal。','账本：'+','.join(linked),'经验：'+','.join(entries),'授权Roy-2026-10-07-learning仅提供修改权限，不提供游戏事实。','','## 旧规则、新行为、已核数据',detail]
        for ident in entries:
            c=next(x for x in C if x['id']==ident);e=c['after']
            lines+=['','- '+ident+'；旧：'+c['before']['lesson']+'；新：'+e['lesson']+'；evidence='+','.join(e['evidence'])+'；contradicting='+','.join(e.get('contradicting',[]))+'；适用进阶'+str(e['asc'])+'。']
        lines+=['','## 拟合、切分、反例及限制','旧159个silent完局截至2026-10-08T23:15:32.987Z同口径复算，本局截至23:47:30.633Z作增量，后续独立局留出。支持按已核语义，相关性写观察，各子参数分母另列，不把同场SL当独立样本；当前经验反例均0不意味着未观察分支被验证。缺完整dirty源码/知识、前五试最终结算、部分逐击过量/独立毒回复时序、原线/留药/改线/更早击杀并存活受控整战、后续幕资源、实际最优执行比例/时钟/费用。未拟合新数值；独立任务使用本角色既有已核帧及后续局时间留出，不足保留现状waiting。','','## 验证、预期影响与回退','核既有提案/实际live祖先源码去重，固定数据逐帧重放属性、盾、毒、阶段及真实血药链；必要实现后原沙箱测试/完整外部检查，不改预算/依赖/未观察分支或其他角色。预期改善已核知识与预算一致性，不承诺翻盘。本经验任务不改打法源码，提案pending，不冒称implemented/shipped；回退独立实现源码commit或本经验父版blob，保持知识刷新/历史。实际规则上线先date双通知Roy旧规则、新规则、证据/账本/任务、影响与回退，不改运维prompt。','']
        path=O/('proposal-'+name+'.md');path.write_text('\n'.join(lines))
        v=dict(character='silent',ledger=linked,runs=[N],source_task='experience-update',target_task='strategy-proposal',domains=domains,summary=summary,proposal=str(path),experience=entries,rule_changes=True,authorization='Roy-2026-10-07-learning')
        (O/('proposal-'+name+'.json')).write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
        ids.append(cli('code_proposals.py',['add','--character','silent'],v))
    (O/'proposal-ids.json').write_text(json.dumps(ids,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(dict(added=[],proposals=ids),ensure_ascii=False))
elif sys.argv[1]=='after':
    commit=(O/'source-commit.txt').read_text().strip();heading=(O/'changelog-heading.txt').read_text().strip()
    lids=list(dict.fromkeys(l for ls in M.values() for l in ls))
    for lid in lids:
        entries=[c['id'] for c in C if lid in M[c['id']]]
        cli('ledger.py',['update'],dict(id=lid,by='learner:experience-update',status='proposed',where=dict(experience=entries,commits=[commit],changelog=[heading]),note='第124批经验自测提交；实际合入和数据shipped交运维据完成事件，三独立源码提案pending。claim/首证/prior/旧版本与support/repeat历史保持；0250纯bug仅提案关联，不改状态。'))
    v=dict(added=[],proposed=lids,retired=[])
    (O/'ledger-results.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(v,ensure_ascii=False))
