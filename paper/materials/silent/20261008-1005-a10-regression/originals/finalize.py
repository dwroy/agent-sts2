import datetime as dt
import fcntl
import hashlib
import json
from pathlib import Path
import re
import subprocess

P = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT/'.worktrees/live'
pub = json.loads((P/'publication.json').read_text())
if pub['state']!='released': raise RuntimeError('no successful release; do not register implemented or notify deployment')
def test_counts(path):
    text = path.read_text()
    files = [int(x) for x in re.findall(r'Test Files\s+(\d+) passed',text)]
    tests = [int(x) for x in re.findall(r'Tests\s+(\d+) passed',text)]
    if len(files)!=2 or len(tests)!=2 or 'FAIL ' in text: raise RuntimeError('incomplete sandbox success summary')
    return {'entry':'bash tools/test-sandbox.sh','exit':0,'tsc':0,'vitest_files':sum(files),'vitest_tests':sum(tests),
        'workers':4,'log':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
pub['source_tests'] = test_counts(P/'source-sandbox-2.log')
pub['live_tests'] = test_counts(P/'live-sandbox.log')
pub['source_is_live_ancestor'] = subprocess.run(['git','merge-base','--is-ancestor',pub['source_commit'],'HEAD'],cwd=LIVE).returncode==0
if not pub['source_is_live_ancestor']: raise RuntimeError('source no longer a live ancestor')
with (P/'proposal-provenance.md').open('a') as handle:
    handle.write('\n实际发布：源码 '+pub['source_commit']+'；初合 '+pub['merge_commit']+' 意外继承基线六个派发路径，已恢复为净三路径 '+pub['merged']+'，其他4711路径逐blob保持。唯一 '+pub['version']+'，发布记录 '+pub['release_commit']+'。源/合后原沙箱分别 '+str(pub['source_tests']['vitest_files'])+'文件/'+str(pub['source_tests']['vitest_tests'])+'例、'+str(pub['live_tests']['vitest_files'])+'文件/'+str(pub['live_tests']['vitest_tests'])+'例，均tsc/vitest0；原失败publication-first-merge.json与merge-live.err保留。\n')
proposal = json.loads((P/'proposal-provenance.json').read_text())
proposal['implemented_commit'] = pub['source_commit']
(P/'proposal-provenance.json').write_text(json.dumps(proposal,ensure_ascii=False,indent=2)+'\n')
with (P/'code-proposal-add.out').open('w') as out, (P/'code-proposal-add.err').open('w') as err:
    result = subprocess.run(['nice','-n','19','python3',str(ROOT/'learner/code_proposals.py'),'add','--character','silent'],
        input=json.dumps(proposal,ensure_ascii=False),text=True,stdout=out,stderr=err)
if result.returncode: raise RuntimeError('proposal CLI failed; preserve release and error for operations')
ident = (P/'code-proposal-add.out').read_text().strip()
if not ident.startswith('silent-proposal-'): raise RuntimeError('invalid proposal CLI identifier')
pub['code_proposals'] = [ident]
pub['implementation_domains'] = ['structure']
(P/'publication.json').write_text(json.dumps(pub,ensure_ascii=False,indent=2)+'\n')
subprocess.run(['nice','-n','19','python3',str(P/'make_report.py')],check=True)
dated = subprocess.check_output(['date'],text=True).strip()
now = dt.datetime.now().astimezone().strftime('%Y-%m-%d %H:%M')
notice = (f'\n- {now} [Codex学习者，独立silent-a10-regression] Roy结论：原38/45为早八小时的完局切点；真正启动源码Codex-only F48为10/50→6/27、F33为24/50→15/27，区间宽，不判double因果或正常波动。'
    f'唯一上线{pub["version"]}，源{pub["source_commit"]}→净live{pub["merged"]}→发布{pub["release_commit"]}。'
    '旧：Silent非boss Jev potion_experience.data混入硬编码铁甲A8/A9统计；新：仅Silent省略两段data，原note/自己的经验/候选/评分/血价/SL及铁甲/其他角色等价。'
    '证据：C48LLXBGKXQ9 A0 F2T1、MGA0CZDDKC0P A10 F2T1，账本silent-0285；冻结83局12353请求中5454含旧统计，首次A10就有，故非近期新增回归、对选择/胜率影响未知。'
    f'提案{ident}按实际源码祖先CLI implemented；shipped请运维核实后CLI登记。'
    f'源及合后原沙箱均tsc0/vitest0（{pub["source_tests"]["vitest_files"]}文件{pub["source_tests"]["vitest_tests"]}例/{pub["live_tests"]["vitest_files"]}文件{pub["live_tests"]["vitest_tests"]}例），固定初稿/撤源码1红3绿、恢复4绿，gitleaks0。'
    '预期仅恢复角色来源完整性，不承诺胜率。回退在live锁内只逆向jev-experience.ts角色门控及对应固定测试，保留所有经验/知识刷新/并行代码，原入口通过后登记独立回退版本。'
    '初合额外继承六个派发路径已原样恢复，原失败保留；净三路径之外4711路径一致。'
    '未撤double/fix45/bullet/sloth/经验，既有0268/0271/0273和免费技能费用传播限制留原独立项/待证，不混普通fix或校准批。'
    f'完整报告paper/materials/silent/a10-regression-2026-10-08.md；固定证据/源码/全部已捕获失败{P}；完整外部检查交调度器，未执行就不报通过。\n')
(P/'roy-notification.md').write_text('date: '+dated+'\n'+notice)
for path in [ROOT/'notes/for-roy.md',ROOT/'ops/inbox-dev.md']:
    with path.open('a') as handle:
        fcntl.flock(handle,fcntl.LOCK_EX); handle.write(notice);handle.flush()
line = f'\n- {now} Codex学习者独立silent-a10-regression完成：{pub["version"]}，源{pub["source_commit"]}→净live{pub["merged"]}→发布{pub["release_commit"]}；来源隔离silent-0285/{ident}，C48/MGA0 F2T1，源/合后原沙箱均0、248文件2608例；原38/45切点早8小时、实际F48 10/50→6/27，不归因或声称正常波动；五项调查/原件保留，初合继承六派发路径已恢复、净三路径且4711其他路径保持。Roy双通知已追加，shipped/完整外部交运维。\n'
with (ROOT/'paper/materials/decision-log.md').open('a') as handle:
    fcntl.flock(handle,fcntl.LOCK_EX);handle.write(line)
report = (P/'report.md').read_text()
paper = ROOT/'paper/materials/silent/a10-regression-2026-10-08.md'
with paper.open('a') as handle:
    fcntl.flock(handle,fcntl.LOCK_EX)
    if handle.tell(): handle.write('\n\n---\n\n')
    handle.write(report)
result = {'task':'fix-batch','character':'silent','base':pub['base'],'source_commit':pub['source_commit'],
    'fixes':[{'item':'silent-a10-regression','commit':pub['source_commit'],
        'test':'agent/tests/silent-potion-provenance.test.ts: Silent potion prompt provenance, MGA0CZDDKC0P F2 T1',
        'fails_without_fix':True,'evidence_runs':['C48LLXBGKXQ9','MGA0CZDDKC0P'],'ledger':['silent-0285']}],
    'skipped':['No evidenced recent regression found for double-boss, fix45, bullet-time, sloth or experience; preserve behavior and limits.',
        'No strategy optimization, boss calibration, ordinary queue fixes, production configuration, real brains, play or full outside-sandbox check.'],
    'merged':pub['merged'],'release_commit':pub['release_commit'],'version':pub['version'],
    'tests':{'source':pub['source_tests'],'live':pub['live_tests'],
        'targeted_audit':{'files':10,'tests':114,'exit':0,'log':str(P/'targeted-tests-2.log')},
        'initial_red':{'passed':3,'failed':1,'exit':1,'log':str(P/'provenance-initial-red.log')},
        'withdrawn_red':{'passed':3,'failed':1,'exit':1,'log':str(P/'provenance-withdrawn-red.log')},
        'restored_green':{'passed':4,'exit':0,'log':str(P/'provenance-restored-green.log')},
        'first_source_sandbox':{'exit':1,'tsc':0,'passed':2596,'failed':1,'log':str(P/'source-sandbox.log'),'reason':'archived partial sources were scanned as executable imports; bytes retained as .ts.txt'},
        'gitleaks_source':{'exit':0,'log':str(P/'gitleaks-source.log')},'full_outside_sandbox':None},
    'code_proposals':[ident],'implementation_domains':['structure'],
    'report':str(P/'report.md'),'report_json':str(P/'report.json'),'paper_report':str(paper),
    'fixed_tree':str(P/'checked-tree.json'),'net_live_tree':str(P/'net-live-preservation.json'),
    'original_logs':str(ROOT/'logs'),'frozen_logs':str(P/'scratch/frozen-logs'),'raw_frames':str(P/'scratch/raw-cases'),
    'failure_inventory':str(P/'error-inventory.md'),'first_merge_failure':str(P/'publication-first-merge.json'),
    'frozen_cutoff_utc':'2026-10-08T01:05:21Z','runs':{'all':83,'codex':77,'deepseek':5,'mixed':1},
    'conclusion':'原切点早8小时。实际Codex F48 10/50→6/27，不能归因double或断言随机波动；只修直接可证、早已存在的跨角色药水上下文污染。',
    'limits':['Historical full dirty knowledge trees and complete brain system-prefix text unavailable.',
        'Bullet-time has no actual card plays or act2 samples; sloth has no act2 corridor trigger samples.',
        'No counterfactual win-rate or exact historical-lesson substitution evidence.',
        'Some temporary interactive analysis errors lack separate raw stderr files; recorded explicitly in failure inventory.'],
    'ops_handoff':['Confirm actual source/version and ledger silent-0285 shipped through CLI.',
        'Run standard full tsc + vitest outside the sandbox on the fixed release through the scheduler.']}
(P/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'merged':pub['merged'],'release':pub['release_commit'],'proposal':ident,'report':str(paper)},ensure_ascii=False))
