import hashlib, json, re, subprocess
from pathlib import Path

O=Path(__file__).parent;ROOT=Path('/home/dw/Projects/agent-sts2');EXP=ROOT/'.worktrees/exp';LIVE=ROOT/'.worktrees/live'
C=json.load(open(O/'changes.json'));M=json.load(open(O/'live-merge.json'));L=json.load(open(O/'ledger-result.json'));S=json.load(open(O/'slice-summary.json'));mechanisms=json.load(open(O/'mechanisms.json'))
assert M['merged'] is None and M['preflight_rc']==1 and not M['conflicting_overlap']
assert 'paper/materials/decision-log.md' in (O/'merge-tree-locked.txt').read_text()
assert (O/'test-source.rc').read_text().strip()=='0' and L['check']==0
def git(cwd,*args):return subprocess.check_output(['git','-C',str(cwd),*args],text=True).strip()
assert git(EXP,'rev-parse','HEAD')==M['source_commit']
assert git(EXP,'rev-parse','HEAD:knowledge/characters/silent/experience.json')==(O/'source-tested-blob.txt').read_text().strip()
assert not git(EXP,'status','--porcelain')
assert json.load(open(LIVE/'knowledge/characters/silent/experience.json'))['version']=='2026-10-07.11'
assert 'S1.exp66' not in [x['name'] for x in json.load(open(LIVE/'eval/versions.json'))['versions']]
assert subprocess.run(['git','-C',str(LIVE),'rev-parse','-q','--verify','MERGE_HEAD'],capture_output=True).returncode!=0
t=(O/'test-source.log').read_text();files=sum(map(int,re.findall(r'Test Files\s+(\d+) passed',t)));cases=sum(map(int,re.findall(r'Tests\s+(\d+) passed',t)))
assert files==215 and cases==2299
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %z'],text=True).strip()
finish=(f'本节收尾（{stamp}）：源{M["source_commit"]}（exp-silent），定稿第三轮tsc0/vitest0/{files}文件{cases}例，前两稿均215文件2299例通过；收尾补A10标签/8胧光与1雾菇口径及旧含药事实4D4J8USKCPAV归属后重测，非失败或高负载超时重跑。最终经验blob与测试冻结/暂存/提交一致。'
f'锁内刷新7份知识提交{M["refresh_commit"]}、合前{M["base"]}，知识重叠0/不同blob冲突0；merge-tree预检exit1，唯一冲突paper/materials/decision-log.md。按任务第8节停止，不强解/覆盖；未实际合入、未进入合后测试/上线步骤，live经验仍2026-10-07.11，未新增S1.exp66，无MERGE_HEAD，刷新数据与既有notes脏文件保留。'
'账本仅CLI/by=learner:experience-update将'+','.join(L['proposed'])+'登记proposed，新增/退役无，覆盖12个经验条目、check0；旧first_run/prior/claim/support/repeat/版本与0217/0218独立observed保持，不写accepted/shipped。'
'主目录本节和账本只追加、不提交，由调用方归档。全部原日志、抽取/校验/初稿失败及更正/三轮源自测/切片/扫描留learner/runs/20261007-075642-experience-update；handoff-ops.md与完成JSON交调用器experience-done通知运维兜底记录冲突、实际合入并登记版本/shipped，完整外部由调度器补跑。无手写知识/源码/生成器/铁甲知识/新药水规则改动，不重建；不停对局、不运行play、不推送。需要Roy定的知识事项：无。')
(O/'changelog-finish.md').write_text(finish+'\n')
with (O/'gitleaks-finish.log').open('w') as h:
    subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/'changelog-finish.md')],stdout=h,stderr=subprocess.STDOUT,check=True)
with (ROOT/'paper/materials/experience-changelog-silent.md').open('a') as h:h.write('\n'+finish+'\n')
handoff=(f'# 静默经验更新受阻交接\n\n记录时间：{stamp}\n\n'
f'- 任务：20261007-075642-experience-update，P5HT1272P5SB，静默A10；源{M["source_commit"]}，exp-silent，版本2026-10-07.11→.12。\n'
f'- 已完成：仅experience.json提交，增0改12退0，active136/49049字；A8 129条45942字、A9 130条46241字，240切片配对中位0、最大5294→5276。源最终tsc0、215文件2299例/vitest0，源三轮各通过；最终blob冻结校验一致，gitleaks0。\n'
f'- 锁内受阻：刷新{M["refresh_commit"]}，合前{M["base"]}；知识不同blob重叠0。预检只冲突paper/materials/decision-log.md，原三方blob及输出在merge-tree-locked.txt；没有实际git merge或手工解冲突、没有MERGE_HEAD。live仍.11、没有S1.exp66，合后测试尚未执行。刷新7份知识与notes/monster-db-check.md、未跟踪notes/fight-value-backtest-silent.md保持。\n'
'- 账本：'+','.join(L['proposed'])+'，仅proposed/check0；0217/0218纯bug保持observed，旧首证/先验/claim/证据/repeat/版本不重置。未纳条目不动，不借其他批结果登记shipped。\n'
'- 记录：主目录experience-changelog-silent.md只追加第66节与节内收尾，ledger仅CLI追加，均没有在主目录提交。请调用方归档并发experience-done，运维按闭环兜底合入记录冲突、核实际合入后登记eval和shipped，合后自测及完整外部检查仍需按流程做，不另设审核。\n'
'- 证据：原新局423帧/409指纹、83局原脚本复算、旧七数组及血档/源节点/回血/SL逐行一致；机制支持/反例进阶在historical-facts.json，初稿失败/更正与前三次源日志保留；不加用药规则或未选整场因果。\n')
(O/'handoff-ops.md').write_text(handoff)
report=dict(task='experience-update',version='2026-10-07.12',commit=M['source_commit'],merged=None,added=0,updated=12,retired=0,active=136,mechanisms=[m['name'] for m in mechanisms],tests=dict(tsc=0,vitest=0,cases=cases),ledger=L)
(O/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
for name in ['handoff-ops.md','report.json','ledger-updates.jsonl']:
    with (O/('gitleaks-'+name.replace('.','-')+'.log')).open('w') as h:
        subprocess.run(['nice','-n','19','/home/dw/.local/bin/gitleaks','dir','--redact','--no-banner',str(O/name)],stdout=h,stderr=subprocess.STDOUT,check=True)
print('交接/报告/节内收尾已落盘；未合入，刷新提交保留，账本check0。')
