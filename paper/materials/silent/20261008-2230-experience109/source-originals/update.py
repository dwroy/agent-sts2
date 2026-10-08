import collections
import copy
import hashlib
import json
from pathlib import Path

O = Path(__file__).parent
P = Path('/home/dw/Projects/agent-sts2/.worktrees/exp/knowledge/characters/silent/experience.json')
B = json.load((O/'experience-before.json').open())
E = copy.deepcopy(B)
A = json.load((O/'audit.json').open())
R = json.load((O/'rest-summary.json').open())[-1]
RUN1, RUN2 = '2H311EAD34GD', 'WZL2AMEY85S7'
C = []
M = {}

def update(ident, runs, ledger, case=None, lesson=None):
    e = next(e for e in E['entries'] if e['id'] == ident)
    before = copy.deepcopy(e)
    for run in runs:
        assert run not in e['evidence']
        e['evidence'].append(run)
    old = e['n_support']
    n = e['n_support'] = len(e['evidence'])
    z = e['n_contradict']
    e['confidence'] = 'high' if n >= 5 and z <= n/3 else 'med' if n >= 2 else 'low'
    e['last_seen'] = '2026-10-08'
    e['lesson'] = lesson if lesson else e['lesson'].replace(str(old)+'支持',str(n)+'支持').replace('（n='+str(old)+'）','（n='+str(n)+'）')
    if case:
        e['lesson'] = e['lesson'].split('典型案例：')[0]+'典型案例：'+case
    C.append(dict(id=ident,kind='updated',before=before,after=e,new_runs=runs))
    M[ident] = ledger

update('silent-footwork-block',[RUN1],['silent-0005'],case='PF90JTU0UZ5M A10四敏三防御27，自爆30仍损3；2H311EAD34GD A10族母石头1＋步法2＝3敏，两次吸取后−1，末T12两防御各4合8，对25攻击仍死；旧敏捷/旧挡不预支。')
update('silent-strength-weak-observation',[RUN1,RUN2],['silent-0012'],case='LYBHQ1X230ZB四段1力多4伤；2H311EAD34GD A10族母敌0/2/4力同招21/23/25，玩家−4力使小刀0、打击2；WZL2AMEY85S7 A10尖啸减6力仅当轮、次轮继续成长，毒跨阈值另核。')
update('silent-route-hp-observation',[RUN1,RUN2],['silent-0019'],lesson='观察：胜前战/避可选精英不保证后段血药，问号可战，未来营火不能预支。A10 104局二幕Monster<25%入血12房/11局、7死（58.33%），活损中位6；分阶/幕/房型/血档另列（n=144）。典型案例：WZL2AMEY85S7 F7改避精英，四火实回84，F13/14两胜仍耗37，40血空药进boss六败；2H311EAD34GD F8精英胜耗51，四火后52血两药仍败。构筑/敌盘面不同，无改线整场因果对照。')
update('silent-rest-buffer-observation',[RUN1,RUN2],['silent-0020'],lesson=f'观察：即时回复增加血缓冲，不等后战保证，未来营火不预支。A10 104局{R["rests"]}独立火/{R["heal"]}回血实回{sum(R["gains"])}，去重{R["nexts"]}后战{R["deaths"]}死（{R["deaths"]/R["nexts"]*100:.2f}%），活损中位{R["median"]}；各阶另列（n=144）。典型案例：2H311EAD34GD与WZL2AMEY85S7各四火各回21，共84；七胜战分别净耗82/91，事件耗6/9，最终52/40血进boss均败。未有改锻造或路线的整场对照。')
update('silent-deck-burst-observation',[RUN1,RUN2],['silent-0021'],case='2H311EAD34GD A10睡期实建刀刃/步法、无施毒牌，末削154还欠79；WZL2AMEY85S7 A10三毒雾实建2→4→6层、末试毒63＋荆棘15＋行动75＝153，8轮后敌仍109，余能不能突破昏眩。计划want不当到手组件。')
update('silent-lagavulin-siphon-poison-sl',[RUN1],['silent-0030','silent-0079'],case='QHK1XQ928TTM A10负力下T12毒终结；2H311EAD34GD A10 T7/T11吸取后力−4敏−1、敌4力，末T12两挡8对25、11血需损17而死，敌余79。第4/5试T4同底板舍一防御多6伤、多损8，B2均0/1200；六试0赢，后继同变，不立整战胜因。')
update('silent-gardener-skittish-shield',[RUN1],['silent-0209','silent-0211'],case='R0HEV5E3QT6G A0中和+扣6后补6挡；2H311EAD34GD A10 F8 T1四次非致死命中各补7挡，T3才首退、T6次退；T5三体合30攻、5挡实损25，整战55→4。已有集火仍损51，无替目标顺序整战胜果。')
stone=[f for f in A['fights'] if f['run']==RUN1 and f['floor']>=11]
update('silent-smooth-stone-opening-dexterity',[RUN1],['silent-0158'],lesson=f'意外光滑的石头实见开场1敏捷，与步法叠加，收益由随后牌挡兑现。机制：10支持局{87+len(stone)}个持有后独立战斗房首帧均1敏，SL同房不重计；脆弱/吸取与旧挡另核。搭配：多挡重复兑现，不能沿用吸取前属性。决定胜负的战斗：10支持/0反例，遗物独立胜因未控（n=10）。典型案例：2H311EAD34GD A10 F10取得，F11/13/14/17四房首帧1敏，族母建步法至3敏，两次吸取后−1，末两防御只8挡而死；不是石头持续抵消吸取。')
update('silent-heart-of-iron-plating',['SY0WMJNNVRLM',RUN1],['silent-0277'],lesson='铁心药水建立7覆甲，不等即时或全战恒定7挡。机制：21局42饮均覆甲+7、旧牌挡不变；后轮核剩层，完整减层条件未隔离。搭配：牌挡/敏捷与覆甲分源，不定喝留阈值。决定胜负的战斗：21支持/0反例，单药整战胜因未控（n=21）。典型案例：2H311EAD34GD A10族母同瓶六饮各建7；末试T4牌挡8＋覆甲6对15损1，T5覆甲5对20损7，T10归零；末T12不预支早药7挡。时点/后序同变，六败不立晚喝必胜。')
update('silent-noxious-fumes-growth',[RUN2],['silent-0011'],case='UZ1T7AH49WMB末轮建3即死无后轮收益；WZL2AMEY85S7 A10三张普通毒雾末试T2/T3/T6实建2/4/6，T3—T8结毒2/5/8/11/16/21共63；未抽触媒/未发生T9不预支，敌109仍死。第三张来自变牌，不当主动违背avoid选奖励。')
update('silent-piercing-wail-temporary-strength',[RUN2],['silent-0046'],case='KAY522KT5NXR实验体三击30→12；WZL2AMEY85S7 A10仪式兽末T5普通尖啸使6→0力、26→20攻，16挡完整需损4；T6恢复并成长至8力、28攻，不能把减6当永久，毒跨160取消攻击另核。')
update('silent-bronze-scales-per-hit-thorns',[RUN2],['silent-0129'],case='R0HEV5E3QT6G三击全挡仍反9；WZL2AMEY85S7 A10仪式兽末T2/3/4/5/8五单击各反3合15，T3全挡仍触发，T6毒跨阈值取消攻击则不反；末21毒＋3荆棘只使133→109，玩家仍死。')
update('silent-ceremonial-beast-threshold-growth-sl',[RUN2],['silent-0133','silent-0079'],case='NEWRFAYKTQHR A10直伤跨160清力；WZL2AMEY85S7 A10末T6行动到166未跨，11毒结155清8力/横冲并取消21攻，T8仍17跺地、8血8挡死，敌109。六试0赢，第1/3试同T4舍挡多6伤、多损5，B2均0；后继同变，无整战换线胜因。')
update('silent-ceremonial-beast-ringing-one-card',[RUN2],['silent-0222'],case='MTQ0EUBJ3R6T A10首防御后继续并胜；WZL2AMEY85S7 A10末T8昏眩1，生存者8挡后余2能、余牌全blocked_by_hook，究极防御没抽到；8血对17需损9而死，至少差2血存活，不是差2伤斩杀。')
update('silent-fishing-rod-random-upgrade',[RUN2],['silent-0170'],lesson='钓鱼竿每三场普通战后随机升级一张牌，不保证核心强化。机制：5局15次战后升级在获得后普通战序号3/6/9（长局另12），问号普通战同计，精英/boss与营火/事件升级分账。搭配：普通战升级机会与血价分别核，随机强化不当能力升级已兑现。决定胜负的战斗：A4一局/A10四局，5支持0反例，路线/随机牌胜因未隔离（n=5）。典型案例：1NZ8FE5F34R9 A4问号第12战升级防御；WZL2AMEY85S7 A10 F4第3普通战升级防御、F13第6战升级打击，三毒雾仍普通；四火实回84后40血空药进boss六败，不由失败判回血或避精英错误。')
E['version'] = '2026-10-08.26'
E['_about'] = '静默经验只来自本角色实盘与复盘。第109次增量合并2H311EAD34GD/WZL2AMEY85S7 A10；截至2026-10-08T13:16:41.806Z共144完局。旧142局七数组/血档/节点后战/休息/SL按原口径复算；每局六次boss尝试不作六份构筑证据。族母吸取/覆甲剩量、仪式兽临时减力/毒跨阈值/单牌限制及实际血价分源，未来组件不预支。相关经验/账本同步独立strategy-proposal，不改打法源码/其他角色。'
P.write_text(json.dumps(E,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(dict(entries=C),ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(M,ensure_ascii=False,indent=2)+'\n')
active = [e for e in E['entries'] if e['status']=='active']
summary = dict(old_version=B['version'],version=E['version'],added=0,updated=len(C),retired=0,active_before=sum(e['status']=='active' for e in B['entries']),active=len(active),chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars=sum(len(e['lesson']) for e in active),confidence=dict(collections.Counter(e['confidence'] for e in active)),asc={str(a):dict(entries=sum(e['asc'][0]<=a<=e['asc'][1] for e in active),chars=sum(len(e['lesson']) for e in active if e['asc'][0]<=a<=e['asc'][1])) for a in [8,9,10]})
assert summary['chars'] <= 60000
(O/'update-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
other=[]
for p in sorted(P.parent.glob('*')):
    if p==P or not p.is_file(): continue
    v=json.load(p.open()) if p.suffix=='.json' else {}
    other.append(dict(file=p.name,sha256=hashlib.sha256(p.read_bytes()).hexdigest(),fields=list(v)[:12],note='核对生成统计/模型/证据用途；本两局未到二三幕/双boss，未见需改手写知识；不同切点不当机制反例。'))
(O/'other-knowledge.json').write_text(json.dumps(other,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(summary,ensure_ascii=False))
