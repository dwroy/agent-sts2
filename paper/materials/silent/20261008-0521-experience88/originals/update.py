import collections
import copy
import json
from pathlib import Path

O = Path(__file__).parent
K = O.parents[2] / 'knowledge/characters/silent/experience.json'
N = '9Z9H2EXKLF3T'
B = json.load(open(O / 'experience-before.json'))
A = json.load(open(O / 'audit.json'))
M = {r['run_id']: r for r in json.load(open(O / 'run-metadata.json'))}
L = {r['id']: r for r in json.load(open(O / 'ledger-fold.json'))}
after = copy.deepcopy(B)
cases = {
    'silent-footwork-block': '9Z9H2EXKLF3T A10沙漏末T5普通步法建2敏；T8斗篷基础6加敏2再由暗影/士兵四倍成32挡，仍触发精灵，不以增益在场认安全。',
    'silent-strength-weak-observation': '9Z9H2EXKLF3T A10沙漏末T8敌6力双18、T11敌12力双24，多6力逐击多6共12；玩家仅2敏、无力量，37挡仍未抵T10持牌伤与攻击。',
    'silent-deck-burst-observation': '9Z9H2EXKLF3T A10终局38牌，末试T2/T4两雾建至6、T3触媒1、T5步法2敏；T11才毒77仍余敌32。建成组件不等于在生存窗口内通关。',
    'silent-noxious-fumes-growth': '9Z9H2EXKLF3T A10沙漏末T2/T4两张毒雾+各建3共6；普通触媒两结时净增4须排除刺击施毒，T11的39毒两结77仍未杀112血敌。',
    'silent-accelerant-triggers': '9Z9H2EXKLF3T A10沙漏末T3普通触媒建1，不即时改3毒；T11的39毒实结39+38=77，再加荆棘3使112→32，不能把80都归毒。',
    'silent-wither-end-turn-loss': '9Z9H2EXKLF3T A10沙漏末T8两张9伤+双击36、32挡触发精灵20；T10两张12+攻击28−挡37=15，使18→3，T11无持牌伤仍死。',
    'silent-shadowmeld-new-block-double': '9Z9H2EXKLF3T A10沙漏末T8施暗影仍0挡，士兵首触发与2敏斗篷合(6+2)×2×2=32；后续未加挡，仍需复活，不外推所有倍率来源。',
    'silent-paels-legion-card-block-double': '9Z9H2EXKLF3T A10沙漏末T8斗篷(6+2)四倍实32；T10首偏折+实18后，熔炉饮用及再出偏折+只9、防御+10，合37，首触发不能重复预支。',
    'silent-bronze-scales-per-hit-thorns': '9Z9H2EXKLF3T A10沙漏末T11毒39+38先扣77，再实反3而112→32；玩家3血耗尽后未见第二击反伤，不按双击意图预支6反伤。',
    'silent-scroll-paper-cuts-unblocked': '9Z9H2EXKLF3T A10 F35三卷轴，漏挡关联上限77→75→73→71→69；当前血66→30净损36，8上限损失不是额外8当前血损。',
}
mapping = {
    'silent-footwork-block': ['silent-0005'],
    'silent-strength-weak-observation': ['silent-0006'],
    'silent-deck-burst-observation': ['silent-0021'],
    'silent-noxious-fumes-growth': ['silent-0011'],
    'silent-accelerant-triggers': ['silent-0027'],
    'silent-wither-end-turn-loss': ['silent-0024'],
    'silent-shadowmeld-new-block-double': ['silent-0077'],
    'silent-paels-legion-card-block-double': ['silent-0123', 'silent-0180'],
    'silent-bronze-scales-per-hit-thorns': ['silent-0129'],
    'silent-scroll-paper-cuts-unblocked': ['silent-0221'],
    'silent-route-hp-observation': ['silent-0019'],
    'silent-rest-buffer-observation': ['silent-0020'],
    'silent-aeonglass-artifact-growth-sl': ['silent-0079'],
    'silent-regret-hand-loss': ['silent-0034'],
    'silent-act-transition-missing-hp-heal': ['silent-0243'],
}
changes = []
rest = json.load(open(O / 'rest-summary.json'))[-1]
for e in after['entries']:
    eid = e['id']
    if eid not in mapping:
        continue
    old = copy.deepcopy(e)
    assert N not in e['evidence']
    e['evidence'].append(N)
    e['n_support'] = n = len(e['evidence'])
    e['last_seen'] = '2026-10-08'
    e['confidence'] = 'high' if n >= 5 and e['n_contradict'] <= n / 3 else 'med' if n >= 2 else 'low'
    text = e['lesson'].replace(str(old['n_support'])+'支持局', str(n)+'支持局').replace('（n='+str(old['n_support'])+'）', '（n='+str(n)+'）')
    if eid == 'silent-paels-legion-card-block-double':
        text = text.replace('四局支持', '五局支持').replace('四局末战均败', '五局末战均败')
    if eid == 'silent-route-hp-observation':
        rows = [r for r in A['bands'] if r['asc']==10 and r['act']==3 and r['type']=='Monster' and r['band'] in ['<25%','25–40%','40–60%']]
        nums = '、'.join(f'{r["band"]}{r["n"]}房{r["deaths"]}死' for r in rows)
        text = f'观察：按实际入血和下一战敌人核连续血价，不预支未来营火。A10 {rest["runs"]}局三幕Monster：{nums}；A8一局/A9三局另列。典型案例：9Z9H2EXKLF3T F35赢仍66/77→30/69、F38问号赢30→19、F39赢19→11；F42回至31后F45赢再到7，F47仅回27进沙漏败。不同路线敌/牌/间隔未控，不设安全血线（n={n}）。'
    elif eid == 'silent-rest-buffer-observation':
        text = f'观察：只计已完成回复，后战胜负另核，不预支未到营火。A10 {rest["runs"]}局{rest["rests"]}火/{rest["heal"]}回血实回{sum(rest["gains"])}，去重{rest["nexts"]}后战{rest["deaths"]}死（{rest["deaths"]/rest["nexts"]*100:.2f}%），活损中位{rest["median"]}；A8七后战0死/A9十五后战1死。典型案例：9Z9H2EXKLF3T六火实回125，幕间79/三次精灵共63/SL恢复28分账；F42实回20又耗24，F47回20仍27血进boss三败。无锻造/改线受控胜因（n={n}）。'
    elif eid == 'silent-aeonglass-artifact-growth-sl':
        text = text.replace('真正重打12场57试3次赢', '真正重打13场60试3次赢')
        text += '。9Z9H2EXKLF3T A10三试0赢，末T7相同20血底板换线预计多损7换16伤，实整轮却省2血/多净扣22；后续熔炉T8改T10及重规划同变，T11仍死。不能把局部差额归单步或全败模拟当必死证据。'
    elif eid == 'silent-regret-hand-loss':
        text = f'悔恨留手按手牌数失血，弃掉后本次持牌代价不发生。机制：R0HEV5E3QT6G A0无攻击留4张损4、全弃损0；两段致死先后未知。搭配：弃牌同时会改变当轮攻防；商店删除必须实际完成。决定胜负的战斗：A0实验体三试败，A10沙漏三试均T1弃悔恨也败，无删除后的胜负对照（n={n}）。典型案例：9Z9H2EXKLF3T F37承诺删悔恨未执行、终局仍有，但F48三次开场均弃，不把死亡归于未发生的悔恨失血。'
    if eid in cases:
        text = text.rstrip('。')+'。新核案例：'+cases[eid]
    e['lesson'] = text
    changes.append(dict(id=eid,before=old,after=copy.deepcopy(e)))
ledger = L['silent-0243']
support = sorted({r['run'] for r in ledger['evidence'] if r.get('role')=='support'}, key=lambda n:M[n]['ended'])
pairs = []
for run in support:
    states = [json.loads(s)['state'] for s in (O/run/'states.jsonl').open()]
    floors = [18,34] if run==N else sorted({e['floor'] for e in ledger['evidence'] if e['run']==run})
    for floor in floors:
        j = next(i for i,s in enumerate(states) if s['run']['floor']==floor)
        z = states[j]['run']; b = states[j-1]['run']
        assert b['floor']==floor-1 and b['max_hp']==z['max_hp']
        observed = z['current_hp']-b['current_hp']
        expected = (b['max_hp']-b['current_hp'])*80//100
        assert observed==expected, (run,floor,b,z)
        pairs.append(dict(run=run,asc=M[run]['ascension'],floor=floor,before=b['current_hp'],after=z['current_hp'],max_hp=b['max_hp'],gain=observed))
(O/'transition-heal-evidence.json').write_text(json.dumps(pairs,ensure_ascii=False,indent=2)+'\n')
n = len(support)
new = dict(id='silent-act-transition-missing-hp-heal',scope='general:rest',asc=[0,20],
           lesson=f'已观察A9/A10跨幕回复按当时缺失HP的80%向下取整，不是固定回满。机制：F17→18/F33→34的{len(pairs)}对同上限转换全部实回⌊(最大HP−当前HP)×0.8⌋；未核更低进阶或其他先古交互。搭配：与营火、战斗复活和SL恢复分账，路线只预估有证据的幕间节点，不把未来回复预支到当前战。决定胜负的战斗：{n}支持局/0反例；局部补血不保证下一战获胜（n={n}）。典型案例：9Z9H2EXKLF3T A10的24/70→60/70实补36、23/77→66/77实补43，三幕赢战后最终沙漏仍败。',
           evidence=support,n_support=n,n_contradict=0,confidence='high',last_seen='2026-10-08',status='active')
after['entries'].append(new)
changes.append(dict(id=new['id'],before=None,after=copy.deepcopy(new)))
after['version'] = '2026-10-08.5'
after['_about'] = f'静默经验仅来自本角色复盘与日志。第88次增量合并9Z9H2EXKLF3T A10，截至{A["cutoff"]}共{len(M)}完局；旧115局七数组、血档、节点转移、真实回复及SL逐行复算一致。毒结算、倍率挡、持牌伤/荆棘/生命上限与当前血分账；跨幕回复核历史转换。全部相关条目经CLI关联账本和独立strategy-proposal，本任务未改打法源码。'
active = [e for e in after['entries'] if e['status']=='active']
result = dict(added=[new['id']],updated=[c['id'] for c in changes if c['before']],retired=[],entries=changes,
              active_before=sum(e['status']=='active' for e in B['entries']),active_after=len(active),
              chars_before=sum(len(e['lesson']) for e in B['entries'] if e['status']=='active'),chars_after=sum(len(e['lesson']) for e in active),
              confidence=dict(collections.Counter(e['confidence'] for e in active)),
              applicable={str(a):dict(entries=len(es),chars=sum(len(e['lesson']) for e in es)) for a in [8,9,10] for es in [[e for e in active if e['asc'][0]<=a<=e['asc'][1]]]})
assert result['chars_after']<=60000
K.write_text(json.dumps(after,ensure_ascii=False,indent=2)+'\n')
(O/'changes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(O/'ledger-map.json').write_text(json.dumps(mapping,ensure_ascii=False,indent=2)+'\n')
print({k:v for k,v in result.items() if k!='entries'})
