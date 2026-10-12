import collections
import copy
import hashlib
import json
import re
from pathlib import Path

O = Path(__file__).parent
K = O.parents[2] / 'knowledge/characters/silent/experience.json'
B, X = 'BTSRF7JL1W1Y', 'XTSV1U9JD34T'
before = json.load(open(O / 'experience-before.json'))
after = copy.deepcopy(before)
audit = json.load(open(O / 'audit.json'))
meta = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
rest = json.load(open(O / 'rest-summary.json'))[-1]
cases = {
    'silent-strength-weak-observation': ([B, X], 'BTSRF7JL1W1Y A10同族胜试T5步法+建3敏，两防御各8挡仍损6；甲虫末T4力量4、22攻对5牌挡+1覆甲杀14血。XTSV1U9JD34T女王末T3步法后3敏未追补已有5挡，仍损22。'),
    'silent-deck-burst-observation': ([B, X], 'BTSRF7JL1W1Y末战未建步法/精准/幻影，不能继承前战增益。XTSV1U9JD34T女王末T4夜魇建3复制标记却在次轮到手前死亡，1血6挡对16需损10。'),
    'silent-footwork-block': ([B, X], 'BTSRF7JL1W1Y同族胜试T5建3敏，两防御各8合16仍损6，F31未建不继承。XTSV1U9JD34T女王末T3建至3敏不补旧5挡；T4脆弱防御6，未建步法的第五试仅3，均败。'),
    'silent-noxious-fumes-growth': ([B, X], 'BTSRF7JL1W1Y F31建2雾，T2毒2结后余1，T3补至3、T4至4；丝虫2血被毒杀，甲虫17→13仍攻。XTSV1U9JD34T女王未继承沙漏3雾/2触媒。'),
    'silent-frail-card-block': ([X], 'XTSV1U9JD34T女王T2后99脆弱；末T4三敏防御⌊(5+3)×0.75⌋=6，第五试零敏仅3；尖啸后仍16攻击，两线均判死/实死。'),
    'silent-accelerant-triggers': ([X], 'XTSV1U9JD34T A10沙漏T8触媒+2层、54毒潜在54+53+52=159，敌132血按132截断毒杀；凋萎先耗9，玩家32→23，不能把毒胜视为零损。'),
    'silent-gorget-plating': ([B], 'BTSRF7JL1W1Y A10 F31覆甲4/3/2/1分轮核；T2牌挡13+覆甲3盖石虫7、其他两敌仍损14，末5+1挡对22、14血耗尽。'),
    'silent-dark-shackles-temporary-strength': ([B], 'BTSRF7JL1W1Y A10 F31 T2普通镣铐令石虫0→−9力、16→7攻，中和另使甲虫18→13；合减14当轮威胁，13牌挡+3覆甲仍被其他敌打掉14。'),
    'silent-piercing-wail-temporary-strength': ([X], 'XTSV1U9JD34T A10女王末T4尖啸令聚合体1→−5力、25→16攻，减少9当轮威胁；1血6挡仍需损10，不把减力等同恒定6挡或永久安全。'),
    'silent-survivor-neutralize-discard': ([B], 'BTSRF7JL1W1Y A10 F31 T2生存者弃唯一突然一拳，计划13伤/损4/杀丝未兑现；实扣8、损14，35→21，比预计多10血价，保留牌替代整战未实打。'),
    'silent-slumbering-beetle-wake-growth': ([B], 'BTSRF7JL1W1Y A10 F31 T1三次实伤唤醒、当轮眩晕；T2弱后18→13，T3/T4力2/4、攻击20/22，末毒17→13未杀、22攻穿6挡耗尽14血，无重打。'),
    'silent-bowlbug-rock-full-block-stun': ([B], 'BTSRF7JL1W1Y A10 F31 T2镣铐后石虫7攻被13牌挡+3覆甲完整覆盖，丝虫/甲虫仍打掉14；T3石虫眩晕，不要求整轮零损。'),
    'silent-kin-poison-sl-observation': ([B], 'BTSRF7JL1W1Y A10四试70血/空药，前三次T10/T11/T10判死，第四次T3/T6退两信徒、T13胜剩23；T2换集中信徒，后轮抽牌/动作同变，不归单动作或运气。'),
    'silent-queen-poison-main-target': ([X], 'XTSV1U9JD34T A10 F49六试23/97、0赢，末T4两敌毒扣11+5后仍401/168血，1血6挡对16实死；未杀任一敌，不能验证固定击杀顺序。'),
    'silent-queen-poison-window-sl-observation': ([X], 'XTSV1U9JD34T A10六试均23/97及幽灵，0赢；第二/四试T3换猎杀者净扣31而药瓶线32、均损22，T4挡9/6均不足16；后轮手牌亦变，无单因胜线。'),
    'silent-nightmare-next-turn-copies': ([X], 'XTSV1U9JD34T A10女王末T4复制防御，建立NIGHTMARE_POWER3后当轮1血6挡对16死亡，三张次轮复制未到手，不能记作三次格挡或增益已兑。'),
    'silent-sturdy-clamp-retention-cap': ([X], 'XTSV1U9JD34T A10女王幽灵使聚合体26→1、16挡盖住，T2仅带10；T2末21挡抵16后T3留5，27攻实损22至1。上限非固定每轮10。'),
    'silent-whispering-earring-first-turn-control': ([X], 'XTSV1U9JD34T A10女王首题接管后只剩不可打进阶之灾、仍有3能量，暗影1/16挡/敌临时−6为现场状态；中间动作顺序未知，不归Jev自主启动。'),
    'silent-wither-end-turn-loss': ([X], 'XTSV1U9JD34T A10 F48 T8敌132血/54毒/触媒2，持凋萎+2文本9伤，32→23先实扣9再毒胜，23原样进F49；有防御候选但替代实得血量/通关未知。'),
}
changed = []
for entry in after['entries']:
    eid = entry['id']
    if eid not in cases and eid not in ['silent-route-hp-observation', 'silent-rest-buffer-observation']:
        continue
    old = copy.deepcopy(entry)
    runs = cases[eid][0] if eid in cases else [B, X]
    assert all(r not in entry['evidence'] for r in runs)
    entry['evidence'].extend(runs)
    entry['n_support'] = n = len(entry['evidence'])
    entry['last_seen'] = '2026-10-08'
    entry['confidence'] = 'high' if n >= 5 and entry['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    text = entry['lesson']
    text = re.sub(r'\b' + str(old['n_support']) + r'支持局', str(n) + '支持局', text)
    text = text.replace('(n='+str(old['n_support'])+')', '(n='+str(n)+')').replace('（n='+str(old['n_support'])+'）', '（n='+str(n)+'）')
    if eid == 'silent-route-hp-observation':
        rows = [r for r in audit['bands'] if r['asc']==10 and r['act']==2 and r['type']=='Monster' and r['band'] in ['<25%','25–40%']]
        nums = '、'.join(f'{r["band"]} {r["n"]}房{r["deaths"]}死' for r in rows)
        text = f'观察：按实际入血和下一战敌人核连续血价，不预支未来营火。A10 {sum(r["ascension"]==10 for r in meta.values())}局，二幕Monster{nums}；A8一局/A9三局另列。典型案例：BTSRF7JL1W1Y F30虽赢70→42且耗明晰，F31再42→0、F32火未到；XTSV1U9JD34T F47回满97，F48赢仍耗74、23血直进F49六败。低血改线旧对照敌/牌/间隔不同，仅观察无因果（n={n}）。'
    elif eid == 'silent-rest-buffer-observation':
        text = f'观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]*100:.2f}%），活损中位{rest["median"]}；A8七后战0死/A9十五后战1死。典型案例：BTSRF7JL1W1Y两火42、事件78/幕间37/SL199分账；XTSV1U9JD34T七火160、五轮书40/蘑菇20/SL146分账，F47满血仍两boss败。无锻造或改线受控胜因（n={n}）。'
    elif eid == 'silent-kin-poison-sl-observation':
        text = text.replace('5场21试2赢，真正重打4场20试1赢','6场25试3赢，真正重打5场24试2赢').replace('（n=4）','（n=5）')
    elif eid == 'silent-queen-poison-main-target':
        text = text.replace('真正重打7场36次2赢','真正重打8场42次2赢')
    elif eid == 'silent-queen-poison-window-sl-observation':
        text = text.replace('4场24次零赢','5场30次零赢')
    elif eid == 'silent-dark-shackles-temporary-strength':
        text = text.replace('22次施放，普通14/升级8次','32次施放，普通24/升级8次')
    elif eid == 'silent-whispering-earring-first-turn-control':
        text = text.replace('A0/A10两局支持','A0/A10三局支持')
    elif eid == 'silent-sturdy-clamp-retention-cap':
        text = f'坚固钳子跨回合最多保留10挡，剩量不足只留剩量。机制：旧A5沙漏35挡抵18持牌伤、46挡抵34攻均带10；A10女王21挡抵16攻只带5，不将上限当保底。搭配：当轮牌挡/被动挡先抵本轮攻击和持牌伤，再核实际剩挡。决定胜负的战斗：两局支持，无移除遗物的整战胜因对照（n={n}）。典型案例：ZE8F192FKX24 A5沙漏第二试T9的1血35挡抵18凋萎不损，T10仅留10。'
    if eid in cases:
        text = text.rstrip('。')+'。本批案例：'+cases[eid][1]
    entry['lesson'] = text
    changed.append(dict(id=eid,before=old,after=copy.deepcopy(entry)))
assert len(changed) == 21
after['version'] = '2026-10-08.4'
after['_about'] = '静默经验仅来自本角色复盘与日志。第87次增量合并BTSRF7JL1W1Y、XTSV1U9JD34T两局A10，截至'+audit['cutoff']+f'共{len(meta)}完局；旧113局七数组、血档、节点转移、实际回复与SL逐行复算一致。敏捷逐牌/脆弱/覆甲分源，毒雾与触媒按实际时点，强制弃牌及未到夜魇复制不预支；赢战血价与SL恢复分账。相关条目均经CLI关联账本和独立strategy-proposal，本任务未改打法源码。'
active = [e for e in after['entries'] if e['status']=='active']
assert sum(len(e['lesson']) for e in active) <= 55000
changes = dict(added=[],updated=[c['id'] for c in changed],retired=[],entries=changed,
               active_before=sum(e['status']=='active' for e in before['entries']),active_after=len(active),
               chars_before=sum(len(e['lesson']) for e in before['entries'] if e['status']=='active'),chars_after=sum(len(e['lesson']) for e in active),
               confidence=dict(collections.Counter(e['confidence'] for e in active)),
               applicable={str(a):dict(entries=len(es),chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10] for es in [[e for e in active if e['asc'][0]<=a<=e['asc'][1]]]})
(O/'changes.json').write_text(json.dumps(changes,ensure_ascii=False,indent=2)+'\n')
K.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in changes.items() if k!='entries'})
