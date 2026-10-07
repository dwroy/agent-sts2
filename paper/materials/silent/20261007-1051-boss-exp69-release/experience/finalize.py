import hashlib,json,subprocess
from pathlib import Path
O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp';C=json.load(open(O/'changes.json'));T=json.load(open(O/'tests.json'));L=json.load(open(O/'ledger-result.json'));M=json.load(open(O/'live-merge.json'));P=json.load(open(O/'changelog-prefix.json'));file=ROOT/'paper/materials/experience-changelog-silent.md'
assert hashlib.sha256(file.read_bytes()[:P['bytes']]).hexdigest()==P['sha256']
assert file.read_bytes()[P['bytes']:]==(O/'changelog-section.md').read_bytes()
commit=(O/'commit.txt').read_text().strip()
def git(*a):return subprocess.check_output(['git','-C',str(EXP),*a],text=True).strip()
assert git('rev-parse','HEAD')==commit and not git('status','--porcelain')
assert git('show','--format=','--name-only',commit)=='knowledge/characters/silent/experience.json'
assert git('rev-parse',commit+':knowledge/characters/silent/experience.json')==(O/'source-tested-blob.txt').read_text().strip()
mechanisms=['昏眩1层单牌窗口','逐击力量/逐牌敏捷与虚弱','带毒刺击直伤/施毒/结算','仪式兽横冲阈值/后段再成长','能力组合实际兑现观察']
report=dict(task='experience-update',version=C['version'],commit=commit,merged=M['merged'],added=len(C['added']),updated=len(C['updated']),retired=len(C['retired']),active=C['active'],mechanisms=mechanisms,tests=dict(tsc=T['tsc'],vitest=T['vitest'],cases=T['cases']),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
text=f'''# 静默经验第69节交运维

本批20261007-101303-experience-update已完成经验、提交、账本与变更记录；实际live未合入，不应登记本批shipped或提前新增S1.exp69。

- 来源：7ZUC4VPMDS41 SILENT A10，notes/lessons.md:5360及09:28勘误；昏眩旧证LRN0HPZ0FZS1/A0，旧85静默局全部重算。经验2026-10-07.14→2026-10-07.15。
- 固定源：{commit}（exp-silent），只改knowledge/characters/silent/experience.json；已测经验blob {git('rev-parse',commit+':knowledge/characters/silent/experience.json')}。不推送。
- 新增1、更新6全补证、退0，139 active/49583字；A8 132条46476字、A9 133条46775字，高68中45低26。完整改动与分母见changes.json/第69节，没有新用药规则、源码、生成器或手写知识改动。
- 源自测tsc0、vitest0，217文件2315例首轮通过、无重跑；test-source.log/.rc保存。沙箱外完整套件待实际固定live发布后由调度器跑。
- 账本只CLI/by=learner:experience-update：{','.join(L['proposed'])} proposed；新增/退役无，check0。0030追加本局support，0222首证LRN0/A0/prior=yes和原证据不动；其他first_run/asc/prior/claim/repeat/版本历史保持，0216 bug已shipped/S1.fix42状态不动。
- 合入受阻：两次flock -w45退出1，未取得锁；只读预检live={M['read_only_preflight_head']}，共同祖先={M['fork']}，下列七份生成知识与源不同blob重叠。未提交刷新、未执行merge、未保存锁内合前点、未合后测试或上线记录/eval版本，无排队活操作。完整逐blob见readonly-preflight.json/live-merge.json。按任务第8节停止，不绕过冲突规则。
'''
text+='\n'.join('- '+x for x in M['conflicting_overlap'])+'\n\n'
text+='由完成JSON/调用器experience-done通知运维。请运维按原授权机械兜底、保留最新刷新和全部记录，核实实际live提交与唯一eval版本后再经learner/ledger.py登记上述九项shipped；此前状态维持proposed，不额外审核知识结论。主目录第69节和账本只追加未提交，由调用方提交；仅保存本批追加，其他后台产出保持。对局继续、不运行play、不改ops prompt或env。\n'
(O/'handoff-ops.md').write_text(text)
print(json.dumps(report,ensure_ascii=False))
