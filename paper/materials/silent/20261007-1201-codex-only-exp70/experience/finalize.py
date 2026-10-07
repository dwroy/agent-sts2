import hashlib,json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp'
C=json.load(open(O/'changes.json'));T=json.load(open(O/'tests.json'));L=json.load(open(O/'ledger-result.json'));M=json.load(open(O/'live-merge.json'));P=json.load(open(O/'changelog-prefix.json'))
file=ROOT/'paper/materials/experience-changelog-silent.md';data=file.read_bytes()
assert hashlib.sha256(data[:P['bytes']]).hexdigest()==P['sha256']
assert data[P['bytes']:].startswith((O/'changelog-section.md').read_bytes())
commit=(O/'commit.txt').read_text().strip()
def git(*a):return subprocess.check_output(['git','-C',str(EXP),*a],text=True).strip()
assert git('rev-parse','HEAD')==commit and not git('status','--porcelain')
assert git('show','--format=','--name-only',commit)=='knowledge/characters/silent/experience.json'
assert git('rev-parse',commit+':knowledge/characters/silent/experience.json')==(O/'source-tested-blob.txt').read_text().strip()
mechanisms=['步法/敏捷','逐击力量/虚弱','持续毒雾','余像逐牌被动挡','萎靡与敌激怒同次加减力','覆甲现场层数','石头开场敏捷','熟睡甲虫醒来/成长','触媒多次毒结算','呼唤先行自损','实验体阶段重置','女王毒窗口/SL血价观察','毒刺直伤/施毒','能力组合兑现观察']
report=dict(task='experience-update',version=C['version'],commit=commit,merged=M.get('merged'),added=0,updated=16,retired=0,active=139,mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
lines=['# 静默经验第70节交运维','',
f'- 源提交：{commit}（exp-silent），经验2026-10-07.15→2026-10-07.16，只改静默experience.json；已测blob '+git('rev-parse',commit+':knowledge/characters/silent/experience.json')+'。',
'- 来源：2Y27VAYZDA02、TDLBRNA0R05B均SILENT/A10；notes/lessons.md:5371/5381及紧后勘误；旧86局七数组/血档/源节点/回血/SL逐行重算一致。88完局1324房78实死，截止2026-10-07T02:44:08.070Z。',
'- 新增0、更新16全补非药水证据、只改数字0、退役0，139 active/49073字，高68中45低26；A8 132条45966字、A9 133条46265字。全部机制支持/反例/进阶和案例见本节与historical-facts.json。无源码/生成器/手写知识/其他角色改动，无新用药规则。',
f'- 源初稿与文字澄清后定稿两轮沙箱均tsc0/vitest0、{T["files"]}文件{T["cases"]}例；无失败/超时重跑，日志各自保留。石头旧76帧按逐房实际80更正，新增7合87；初稿83断言和更正、F19/F33口径草稿修正留draft-corrections.md，非生产或测试失败。',
'- 账本只CLI/by=learner:experience-update：'+','.join(L['proposed'])+' proposed；add/retired无，check0。原claim/first_run/asc/prior/support/repeat/旧版本保持；0216和0163纯bug状态不动，未写accepted/shipped。',
f'- 锁内合入：刷新{M.get("refresh_commit")}、合前{M.get("base")}、实际live {M.get("merged")}、合后测试{M.get("test_rc")}；原因：{M.get("reason","实际合入并通过固定沙箱")}。不同知识重叠：'+','.join(M.get('conflicting_overlap',[]))+'。live-merge.json和原日志留全。',
('- 唯一eval版本'+M['eval_version']+'、发布提交'+M['release_commit']+'，请运维核实实际合入/版本后仅上述19项经learner/ledger.py登记shipped；完整沙箱外套件交调度器。' if M.get('merged') else '- 本批未实际合入，不可提前登记shipped或新增上线版本；按第8节停止，不覆盖知识/记录冲突。交运维按原授权兜底，保留最新刷新与全部历史。'),
'- 主目录第70节和学习账本只追加未提交，由调用方提交；仅处理本批追加，其他后台产出保持。完成JSON由调用器experience-done通知运维，不另设审核；不运行play、不推送、不改ops prompt/env、不停对局。','']
(O/'handoff-ops.md').write_text('\n'.join(lines))
print(json.dumps(report,ensure_ascii=False))
