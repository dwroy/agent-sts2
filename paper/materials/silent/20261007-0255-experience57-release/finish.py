import json,re,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=O.parents[2];LIVE=ROOT/'.worktrees/live';EXP=ROOT/'.worktrees/exp';M=json.load(open(O/'live-merge.json'));C=json.load(open(O/'changes.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));source=(O/'commit.txt').read_text().strip()
assert M.get('release_commit') and M['merged'] and M['test_rc']==0
subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',M['release_commit'],'HEAD'],check=True)
assert subprocess.check_output(['git','-C',str(EXP),'status','--short'],text=True).strip()==''
assert subprocess.check_output(['git','-C',str(LIVE),'hash-object','knowledge/characters/silent/experience.json'],text=True).strip()==subprocess.check_output(['git','-C',str(EXP),'hash-object','knowledge/characters/silent/experience.json'],text=True).strip()
p=subprocess.run(['python3',str(ROOT/'learner/ledger.py'),'check'],capture_output=True,text=True);(O/'ledger-check-final.log').write_text(p.stdout+p.stderr);assert p.returncode==0
assert len(C['updated'])==19 and len(L['proposed'])==22
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
closing=(f'本节收尾（{stamp}）：源{source}，实际live合入{M["merged"]}，上线登记{M["release_commit"]}、eval {M["eval_version"]}。新增1更新19（15补证/1只数字/3压缩）退0，active127→128、56154→{C["chars"]}字，高61中39低28；A8 121条48407字/A9 122条48706字/A10 123条49286字，240配对中位−127、最大5816→5673。旧68局全部重算一致，新70局1101房60死、A10三十局387房30死；新沙漏六试0赢，仅前9次干净抽序可比，没有单项因果。三轮前稿测试均tsc0/vitest0、各210文件2254例；首轮期间改SL口径、中间期间改元数据、第三轮发现步法全角括号未命中，计数检查与冻结hash阻止旧稿提交。修为n=40/19更新后第四轮冻结源tsc0/vitest0、{M["source_tests"]["files"]}文件{M["source_tests"]["cases"]}例；合后tsc0/vitest0、{M["live_tests"]["files"]}文件{M["live_tests"]["cases"]}例，'+('初次失败重跑通过，原日志保持。' if M.get('test_first_rc') else '首轮通过。')+f'刷新{M.get("refresh_commit")}、合前{M["base"]}、不同知识blob冲突0、其他知识保持；{('decision-log仅双方追加历史合并，原序保留。' if M.get('append_history_union') else '锁内预检/实际合并无冲突，历史原文保留。')}账本新增/退役无，proposed '+','.join(L['proposed'])+'、最终check0，首证/prior/claim/旧version/repeat保持；0200机制与0199代码缺口分账，0199未纳入本经验状态变更。无源码/生成器/手写知识/其他角色或药水规则变更，无重建、不停对局、不运行play、不推送；主目录本节/账本只追加不提交。交接learner/runs/20261007-021220-experience-update/handoff-ops.md，调用器experience-done通知运维，运维核实际发布后CLI登记shipped，完整外部套件交调度器。需要Dai定：无。')
(O/'changelog-closing.md').write_text(closing+'\n')
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as h:h.write('\n'+closing+'\n')
notice=f'''# 静默经验第57批上线交接

- 源提交：{source}（exp-silent），知识version 2026-10-07.3。
- 实际live合入：{M['merged']}；发布登记：{M['release_commit']}；eval：{M['eval_version']}。
- 来源：DPYF2BAA3DKT、CRK2HNYKSCZC，均SILENT/A10，历史只用本角色。
- 新增1、更新19（15补证/1句内数字/3压缩）、退役0；active128/51683字。机制/纯bug分账，0200入经验，0199仍由独立修复任务负责。本批未改源码、生成器、手写知识、铁甲知识或用药规则。
- 源定稿与合后沙箱均tsc0/vitest0，具体数见live-merge.json；前三轮前稿均通过但不冒充定稿，最终第四轮冻结blob校验通过；完整外部套件请调度器补跑。
- 学习账本仅proposed/check0：{','.join(L['proposed'])}。请运维按实际合入经learner/ledger.py登记shipped/{M['eval_version']}，保留首证/先验/旧版本/repeat；不另设审核、不重置0199或其他并行纯bug状态。
- root变更记录只追加第57节和同节收尾，账本只经CLI追加；root未提交，交调用方提交。刷新数据保持、decision-log双方追加历史逐行保持。
- 本文件随调用器experience-done完成事件交运维；不停对局、不运行play、不推送。
'''
(O/'handoff-ops.md').write_text(notice)
report=dict(task='experience-update',version='2026-10-07.3',commit=source,merged=M['merged'],added=1,updated=19,retired=0,active=128,mechanisms=['力量/敏捷/逐击虚弱','脆弱逐牌','触媒毒次数','头骨施毒/冒泡条件','余像实际触发','预判临时敏捷','尖啸临时减力','棱柱技能污染','滚石启动/挡吸收','凋萎与格挡预算','重放效果/原始计数观察','构筑兑现观察'],tests=dict(tsc=0,vitest=0,cases=M['source_tests']['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for f in ['changelog-closing.md','handoff-ops.md','report.json']:
 with (O/('gitleaks-'+f+'.log')).open('w') as h:subprocess.run(['nice','-n','19',str(Path.home()/'.local/bin/gitleaks'),'dir','--redact','--no-banner',str(O/f)],stdout=h,stderr=subprocess.STDOUT,check=True)
print(json.dumps(dict(source=source,merged=M['merged'],release=M['release_commit'],eval=M['eval_version'],source_tests=M['source_tests'],live_tests=M['live_tests'],ledger=L),ensure_ascii=False))
