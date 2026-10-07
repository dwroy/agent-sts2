import collections
import copy
import json
import re
from pathlib import Path

O = Path(__file__).parent
K = O.parents[2] / 'knowledge/characters/silent/experience.json'
RUN = 'RC61MFQM63Y6'
before = json.load(open(O / 'experience-before.json'))
after = copy.deepcopy(before)
audit = json.load(open(O / 'audit.json'))
rest = json.load(open(O / 'rest-summary.json'))[-1]
cases = {
    'silent-strength-weak-observation': 'RC61MFQM63Y6 A10猎人T3预判后柔嫩使力敏−1/1，速度药再使敏1→6；斗篷12挡、其后防御9挡，次轮属性归0。蟹末T4两防御各3挡，转向火箭57→38仍死。',
    'silent-deck-burst-observation': 'RC61MFQM63Y6 A10蟹末T1触媒换一打击，毒3→两结5却净扣30→23、挡16→12、实损4→8；末T3才结5+4=9，毒雾/幻影之刃均未建，四轮仅扣112/428，六试全败。未执行能力优先线不认必胜。',
    'silent-noxious-fumes-growth': 'RC61MFQM63Y6 A10异鱼T2建3雾时旧7毒不变，后续轮初补3；蟹首试T4建3雾、后续轮初补毒，末试到T4仍未建，末轮11毒伤来自刺击增到6毒后的触媒两结6+5。',
    'silent-frail-card-block': 'RC61MFQM63Y6 A10蟹首/第三试T4预判2敏后生存者⌊(8+2)×0.75⌋=7挡；末T4零敏两防御各⌊5×0.75⌋=3，6挡对38、31血，完整需损32，存活至少再需2血。',
    'silent-accelerant-triggers': 'RC61MFQM63Y6 A10蟹末T1建1触媒不即时施毒，已有3毒两结3+2=5；T3毒药5毒两结9，T4刺击后6毒两结11。首手换触媒同时少9攻击伤害和4挡，四轮仍死；局部收益不定固定能力优先级。',
    'silent-anticipate-temporary-dexterity': 'RC61MFQM63Y6 A10蟹首/第三试T4预判建2敏且不补已有挡，生存者在脆弱下实得7；F29 T3旧5挡不变、生存者后得10至15；猎人T3临时标记2、柔嫩使净敏只1，速度药另加5，次轮均撤回。',
    'silent-ornamental-fan-attack-block': 'RC61MFQM63Y6 A10蟹首T1第三张攻击刺击0→4被动挡；末T3第3/第6张攻击切割/小刀各补4，原11→15→19，无敏捷。F23 T3攻击第三张小刀即使0直伤仍21→25挡，零损该轮、整战仍损24。',
    'silent-survivor-neutralize-discard': 'RC61MFQM63Y6 A10蟹第三试T4生存者前只它与打击，施放后手空，计划末打击朝火箭未执行；7挡、45血对57激光判死。首试先刺击火箭则38激光、实损31；两线目标不同，不能把未执行保留线称必胜。',
    'silent-hunter-tender-card-attributes': 'RC61MFQM63Y6 A10 F23 T3预判2敏被柔嫩扣1，速度药使1→6；斗篷按6敏得12挡后敏降5，刺击后敏4，防御得9而非旧预览10，第三攻击折扇另补4至25。T4属性归0，六轮44→20虽赢仍耗24；不推固定先牌。',
    'silent-phantom-blades-first-shiv': 'RC61MFQM63Y6 A10 F29 T3建9层，T4首刀在玩家虚弱/石虫易伤下实扣14，现场文本9、不能将旧基础4直接当最终伤；同轮没有第二刀，新增证据只支持首刀/保留窗口。蟹六试均未建立，不预支其增伤。',
    'silent-beckon-held-end-turn-loss': 'RC61MFQM63Y6 A10异鱼T11持一呼唤，玩家8→2先失6，敌该轮只有塞状态意图；随后毒结束剩2血敌而胜。59→2的57战内净损包含这6，不能归为敌攻击或因毒杀省略。',
    'silent-speed-potion-temporary-dexterity': 'RC61MFQM63Y6 A10猎人T3预判/柔嫩后敏1，速度药建5临时项、净敏1→6；斗篷/防御实12/9挡，柔嫩逐牌削敏、折扇另4，25挡零损。次轮速度项及预判撤回、力敏归0；不据单轮收益定用药/留药门槛。',
}
changed = []
for entry in after['entries']:
    eid = entry['id']
    if eid not in cases and eid not in ['silent-route-hp-observation', 'silent-rest-buffer-observation', 'silent-kaiser-crab-facing-sl']:
        continue
    old = copy.deepcopy(entry)
    assert RUN not in entry['evidence']
    entry['evidence'].append(RUN)
    entry['n_support'] = len(entry['evidence'])
    n = entry['n_support']
    if n >= 5 and entry['n_contradict'] <= n / 3:
        entry['confidence'] = 'high'
    elif n >= 2 and entry['confidence'] != 'high':
        entry['confidence'] = 'med'
    entry['last_seen'] = '2026-10-08'
    lesson = entry['lesson']
    lesson = re.sub(r'\b' + str(old['n_support']) + r'支持局', str(n) + '支持局', lesson)
    lesson = lesson.replace('(n='+str(old['n_support'])+')', '(n='+str(n)+')').replace('（n='+str(old['n_support'])+'）', '（n='+str(n)+'）')
    if eid == 'silent-route-hp-observation':
        lesson = '观察：按实际入血和下一战敌人核连续血价，不预支未来营火。A10 73局，二幕Monster<25% 8房4死、25–40% 6房2死；A8一局/A9三局另列。典型案例：RC61MFQM63Y6二幕无精英，F19/20/21/23/29虽赢仍合耗82，餐券回30全局另账；F24/27回血到62，F29损31、F32回21，双蟹52/70六败。旧MGA0CZDDKC0P低血休与D4LJ9QMGFB8Q事件后敌/牌/间隔不同，无改线因果（n=113）。'
    elif eid == 'silent-rest-buffer-observation':
        gain = sum(rest['gains'])
        lesson = f'观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{gain}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]*100:.2f}%），活损中位{rest["median"]}；A8七后战0死/A9十五后战1死。典型案例：RC61MFQM63Y6五火各回21合105，两锻造不回；二幕三火回63，F27投影70实boss52。餐券30/幕间54/SL197分账，无改锻造或另路线受控胜局（n=113）。'
    elif eid == 'silent-kaiser-crab-facing-sl':
        support = set(entry['evidence'])
        fights = [f for f in audit['fights'] if f['run'] in support and 'CRUSHER' in f['enemies']]
        groups = collections.defaultdict(list)
        for a in audit['attempts']:
            if a['run'] in support and any(f['run']==a['run'] and f['floor']==a['floor'] for f in fights):
                groups[(a['run'], a['floor'])].append(a)
        multi = [v for v in groups.values() if max(a['attempt'] for a in v)>1]
        lesson = f'观察：帝王蟹朝向/减益/增伤/即时血价同核，固定击杀顺序胜因未控。机制：后方攻击、力量与虚弱依现场意图核；旧−2力/1弱同招正面1、转向2，毒按实结。搭配：输出/牌挡分账，全死推演不等即时血价相同，未建能力不预支。决定胜负的战斗：支持{n}局、{len(fights)}房{sum(not f["death"] for f in fights)}活{sum(f["death"] for f in fights)}死，真正重打{len(multi)}场{sum(len(v) for v in multi)}试{sum(a["result"]=="won" for v in multi for a in v)}赢（n={n}）。典型案例：RC61MFQM63Y6 A10六试0赢；同52血同首手T1换一打击为触媒，净扣30→23、挡16→12、损4→8；末T4刺击转向火箭57→38仍需损32，仅31血/6挡，毒后两侧仍167/149。9TG1RP5LFAAK先火箭胜、LLYSRQQ35AVW先爪亦胜，不定单因/运气。'
    else:
        if eid == 'silent-speed-potion-temporary-dexterity':
            lesson = lesson.replace('34局40饮','35局41饮').replace('另3次有步法/口红/预判独立变化','另4次有步法/口红/预判/柔嫩独立变化')
        lesson = lesson.rstrip('。')+'。新核案例：'+cases[eid]
    entry['lesson'] = lesson
    changed.append(dict(id=eid, before=old, after=copy.deepcopy(entry)))
assert len(changed) == 15
after['version'] = '2026-10-08.3'
after['_about'] = '静默经验仅来自本角色复盘与日志。第86次增量合并RC61MFQM63Y6（A10）及勘误，截至2026-10-07T17:26:17.487Z共113完局；旧112局七数组、血档、节点转移、回血与SL逐行复算一致。赢战耗血、实际回复与存档恢复分账；触媒换线即时血价、临时敏捷/柔嫩/被动挡、强制弃牌后效果落空均按实帧核，不将局部机制收益当整战胜因。全部相关变更经CLI关联账本和独立strategy-proposal；本任务未改策略源码。'
active = [e for e in after['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active) <= 60000
changes = dict(added=[], updated=[c['id'] for c in changed], retired=[], entries=changed,
               active_before=sum(e['status']=='active' for e in before['entries']), active_after=len(active),
               chars_before=sum(len(e['lesson']) for e in before['entries'] if e['status']=='active'), chars_after=sum(len(e['lesson']) for e in active),
               confidence=dict(collections.Counter(e['confidence'] for e in active)),
               applicable={str(a):dict(entries=len(es),chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10] for es in [[e for e in active if e['asc'][0]<=a<=e['asc'][1]]]})
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
K.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in changes.items() if k!='entries'})
