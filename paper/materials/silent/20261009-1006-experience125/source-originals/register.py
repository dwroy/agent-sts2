import collections
import json
import subprocess
import sys
from pathlib import Path

O = Path(__file__).parent.resolve()
ROOT = Path('/home/dw/Projects/agent-sts2')
C = json.load(open(O/'changes.json'))
mapping = json.load(open(O/'ledger-map.json'))
out = json.load(open(O/'registration-cli.json')) if '--proposals-only' in sys.argv else []
notes = {
 'VAC6Z1PZ1QJG': '本批原件seek/时间窗独立复核：F33胜战损68；F48六试67血两药均败，末T12 8血14挡对45、21毒及荆棘后女王152；T10预判临时4敏/脆弱防御7另余像1、次轮回1敏；早建能力/另顺序/原护栏线未实打。细项见关联经验与new-verification.json。',
 'NG1FBJTSRLHS': '本批原件seek/时间窗独立复核：F7锻造不回63，F8获胜损18、F9 45进；雕像T3十力25弱化18、T4回25、末T5 12血10挡对25，毒后28；F6痊愈能量3→4/手牌7→9/HP63不变。无休息或留药受控实打。细项见关联经验。'
}
for change in ([] if '--proposals-only' in sys.argv else C):
    e = change['after']
    new = [r for r in e['evidence'] if r not in change['before']['evidence']]
    for ident in mapping[e['id']]:
        data = {'id':ident,'by':'learner:experience-update','where':{'experience':[e['id']]},'evidence':[{'run':r,'floor':48 if r.startswith('VAC') else 9,'role':'support','note':e['id']+'：'+notes[r]} for r in new], 'note':'第125批提交前证据/提案预关联；不改变现有状态、首证、prior、claim或版本，提交后再登记proposed。'}
        p = subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'update'],input=json.dumps(data,ensure_ascii=False),text=True,capture_output=True)
        out.append({'命令':'ledger update','数据':data,'退出码':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
        (O/'registration-cli.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
        assert p.returncode==0,p.stderr

groups = {
 'resources': ['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation'],
 'mechanisms': [c['id'] for c in C if c['id'] not in ['silent-route-hp-observation','silent-rest-buffer-observation','silent-deck-burst-observation','silent-queen-poison-main-target','silent-queen-poison-window-sl-observation']],
 'queen-sl': ['silent-queen-poison-main-target','silent-queen-poison-window-sl-observation']
}
domains = {'resources':['combat','potion','terminal'],'mechanisms':['combat','potion','terminal'],'queen-sl':['combat','sl','terminal']}
plans = {
 'resources': ('同题分列护栏血价/伤害代价与路线实际资源', '旧行为：实际决策已有护栏及路线/休息投影，原线没有实打；F47双boss模拟报错沿旧0332独立提案。新行为候选：先在固定回放核每轮省血/少伤、投影所含营火/事件/上限条件及实际入场资源，展示未知和净损口径；只有配对全战证据支持才改策略评分。VAC F17T3/F42T4/F48T3、T10四题题面差省10/12/13/9、少9/14/0/6，不能累计净胜因；NG F7两线boss入口同77且全败，不证明当前63血无需休息。'),
 'mechanisms': ('现场能力与药水逐帧验收，延迟效果不预支', '旧行为：求解器已计算这些效果，末least-loss的-23/-3为hpAfter，等于8-(45-14)/12-(25-10)，不是伤害预测错误。新行为候选：固定回放按实际来源核临时敏捷/脆弱卡牌挡/余像被动挡/尖啸恢复/毒雾轮初毒/痊愈加能抽牌及再生；先对齐已有实现，若已在live祖先实现即按源码证据duplicate。VAC F48末T10防御7+余像1、T12 7+4+3=14挡；NG F6T1痊愈63血不变，F9T3迷雾毒2→6、弱使25→18，T4恢复25。'),
 'queen-sl': ('女王失败重打分清回放偏离与后续抽牌变化', '旧行为：同房六试67/84两药，五次T12判死SL、末次T12实死；部分回放在T1盘面不一致后停止。新行为候选：固定回放核状态指纹、真实deviation、实际药/能力建立与后续抽牌；保持已批准的SL触发，不从零赢试验定固定先杀序/提前能力规则。第6试T4换升级药瓶+后空翻/手法，后序不同且仍败；第4/5试目标T5/T4没有实际受控偏离。')
}
proposals = []
for name, ids in groups.items():
    ledger = list(dict.fromkeys(ident for e in ids for ident in mapping[e]))
    runs = list(dict.fromkeys(r for c in C if c['id'] in ids for r in c['after']['evidence'] if r not in c['before']['evidence']))
    path = O/f'proposal-{name}.md'
    title, body = plans[name]
    lines = ['# '+title,'','角色：silent；本次直接证据A10，历史支持按条目分别列进阶。不改铁甲战士与未观察等级。','',body,'','## 证据与账本','', '账本：'+','.join(ledger)+'；来源任务experience-update；实现任务strategy-proposal。','','| 条目 | 支持/反例、证据进阶 | 已核案例 |','| --- | --- | --- |']
    metadata = {r['run_id']:r for r in json.load(open(O/'run-metadata.json'))}
    for c in C:
        if c['id'] not in ids:continue
        e = c['after']
        asc = dict(collections.Counter(metadata[r]['ascension'] for r in e['evidence']))
        lines.append(f'| {e["id"]} | {e["n_support"]}/{e["n_contradict"]}，{asc} | {e["lesson"]} |')
    lines += ['', '支持局/反例局完整12位id见同目录changes.json各after.evidence/contradicting；原件与基线核验见new-verification.json、baseline-check.json、audit.json和historical-mechanism-notes.txt。不存在有效相反局，不将战斗失败算成机制反例。','', '## 拟合、验证与限制','', '不用战后剩血拟合新阈值、药价或整战胜率；支持按局去重，SL按房/尝试分别计。固定回放先按时间分为旧160局与新增2局，旧局核原实现、新局验收，已知模型排名不作实际执行最优率。不得运行play或boss模拟池。若发现明确机制差异，按本角色已观察机制修复并补固定回放自测、原沙箱tsc/vitest、gitleaks与live预检。缺全dirty树、前五退出结算、退场末击、另一击杀序/原线/提前能力/留药/休息整战反事实，具体差异不足则waiting、保留行为。','', '## 预期影响与回退','', '预期：能将实际当前挡/毒/药与未来效果分开，减少把模型值当已执行资源的误判；不声称提高胜率。回退：独立实现若改变行为则保存源码commit并revert该commit；经验更新可恢复本目录experience-before.json。Roy-2026-10-07-learning是规则授权，不是游戏证据。尚未实现，不登记implemented/shipped。']
    path.write_text('\n'.join(lines)+'\n')
    item = {'character':'silent','ledger':ledger,'runs':runs,'source_task':'experience-update','target_task':'strategy-proposal','domains':domains[name],'summary':title+'；以本角色原件核验后再决定修复或等待证据，不设无对照阈值','proposal':str(path),'experience':ids,'rule_changes':False,'authorization':'Roy-2026-10-07-learning'}
    (O/f'proposal-{name}.json').write_text(json.dumps(item,ensure_ascii=False,indent=2)+'\n')
    p = subprocess.run(['python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],input=json.dumps(item,ensure_ascii=False),text=True,capture_output=True)
    out.append({'命令':'code_proposals add','数据':item,'退出码':p.returncode,'stdout':p.stdout,'stderr':p.stderr})
    (O/'registration-cli.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
    assert p.returncode==0,p.stderr
    result = p.stdout.strip()
    assert result.startswith('silent-proposal-'), result
    proposals.append(result)
    print(name, result)
(O/'code-proposals-results.json').write_text(json.dumps(proposals,ensure_ascii=False,indent=2)+'\n')
