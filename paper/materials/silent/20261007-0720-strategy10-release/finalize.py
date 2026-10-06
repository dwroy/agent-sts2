import hashlib
import json
from pathlib import Path
import re
import subprocess

scratch = Path(__file__).parent
root = Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev')
live = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
result = json.loads((scratch / 'live-result.json').read_text())
assert result['suite_exit'] == 0 and result['merged'] and result['version']
assert result['knowledge_preserved'] and not result['knowledge_overlap']
for commit in [result['source_commit'], result['code_merge'], result['merged']]:
    subprocess.run(['git', 'merge-base', '--is-ancestor', commit, 'live'], cwd=root, check=True)
published = json.loads(subprocess.check_output(['git', 'show', result['merged'] + ':eval/versions.json'], cwd=root))
entries = [v for v in published['versions'] if v['name'] == result['version']]
assert len(entries) == 1 and entries[0]['commit'] == result['code_merge']
for name, checksum in json.loads((scratch / 'source-manifest.json').read_text()).items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == checksum
assert not subprocess.check_output(['git', 'status', '--porcelain'], cwd=root).strip()
assert (scratch / 'live-source-equality.exit').read_text().strip() == '0'

def counts(name):
    text = (scratch / name).read_text()
    return {'files': sum(map(int, re.findall(r'Test Files\s+(\d+) passed', text))),
            'cases': sum(map(int, re.findall(r'Tests\s+(\d+) passed', text)))}

source_counts, live_counts = counts('source-suite.log'), counts('live-suite.log')
assert source_counts == live_counts == {'files': 215, 'cases': 2299}
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
print(stamp)
report = {
    'task': 'strategy-proposal', 'base': 'b8894feb36d805e13d15911830610e6bd3c8fec3',
    'runs': [r['run_id'] for r in json.loads((scratch / 'runs-verified.json').read_text())],
    'fixes': [{'id': 'silent-0215', 'proposal': '加湿器休息题分列回复、最大血增长与逐动作条件参考',
               'commit': result['source_commit'], 'version': result['version'],
               'evidence': [{'run': 'UMVLWER4CD98', 'floors': [7, 9, 16, 44, 47], 'turn': None,
                             'ledger': ['silent-0215', 'silent-0204', 'silent-0020']}]}],
    'skipped': [
        {'items': ['保血／全死权重', '固定击杀顺序', '巨兽拖延', 'SL范围／阈值', '统一路线／休息血线', '完整boss时钟校准'],
         'reason': '缺受控替代的完整实打或阈值证据，不把局部收益或模拟当成确定整场胜负。'},
        {'items': ['其他回血遗物组合', '未知营火动作'], 'reason': '本项没有实测分账，参考保持未知。'},
    ],
    'merged': result['merged'], 'tests': {'tsc': 0, 'vitest': 0, 'cases': live_counts['cases']},
}
(scratch / 'report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
handoff = (f'{stamp}，学习者自测及live合入已完成。\n\n'
           f'提案：{scratch}/proposal.md；独立账本silent-0215，关联既有silent-0204/0020。'
           '证据UMVLWER4CD98 SILENT A10 F7/9/16/44/47（营火，无回合），F48末试T11只用于限制整战结论。'
           'F7回复18加增长5，52/70→75/75；F9锻造54/75不增长；F16为51/85→81/90；F44为44/110→82/115；F47为31/115→70/120。'
           '同一局十次回血增长5、实际总回321，六次boss仍全败，没有替代休息或路线受控胜局。\n\n'
           f'独立源码{result["source_commit"]}→实际live代码{result["code_merge"]}→固定发布{result["merged"]}，'
           f'树{result["tree"]}，唯一{result["version"]}指向实际代码合入。'
           f'锁内刷新{result["refresh_commit"]}，合前保留点{result["pre_merge"]}；知识重叠为空，预检0，已提交知识逐blob保持。'
           '原无关notes及后续后台差异保留，无生成器改动不重建。开发分支干净，全部agent源码／测试／tools与合后live相同，冻结三blob一致。\n\n'
           '固定十例撤完整rest.ts后9失败1通过／exit1，恢复10通过／exit0；源及合后固定沙箱tsc0/vitest0，各215文件2299例。'
           '首轮通过，无高负载超时重跑；原初稿缺state_version失败、F9未选HEAL截断预期更正、离线run_id提取修正及分支改名受限config提示历史保留。'
           '源码、刷新、发布敏感信息扫描均0，任务材料扫描随后收尾。\n\n'
           '只增加静默DeepSeek休息题条件参考，普通／单步题均可见；当前HEAL/SMITH的HP/最大HP、回复与增长分账，同值仅最大HP指标并列，未知动作null。'
           '原全部选项／动作／评分／投影／模拟、怪物当前进阶首样本与房间五样本门槛保持，Jev战斗与铁甲等价；无新药水代价、过滤、否决、提前或留药规则。'
           '保血／全死权重、固定目标、巨兽拖延、SL范围／阈值、统一血线及完整时钟缺受控替代或阈值证据，保持待定。\n\n'
           '学习者仅经项目根learner/ledger.py/by=learner:strategy-proposal登记0215 proposed及提交去向；0204/0020的首证、先验、状态、版本不重置。'
           '请运维核上述实际发布与唯一版本后，仅经CLI将0215登记shipped，并按既有流程同步main。完整沙箱外tsc/vitest由调度器补跑，本交接不冒称外部已通过。'
           '启动器完成事件strategy-done与最终JSON承载本次运维通知；未停对局、未运行play、未推送。\n')
(scratch / 'handoff-ops.md').write_text(handoff)
with (scratch / 'proposal.md').open('a') as handle:
    handle.write(f'\n## 实际发布与运维交接\n\n{stamp}（写入前执行date）。\n\n' + handoff + '\n')
update = {'id': 'silent-0215', 'by': 'learner:strategy-proposal', 'status': 'proposed',
          'where': {'commits': [result['source_commit'], result['code_merge'], result['merged']]},
          'note': f'实际live已发布{result["merged"]}、唯一{result["version"]}；源及合后tsc/vitest0、各215文件2299例，撤完整生产源码9失败1通过／恢复10通过。只登记proposed，版本正式字段与shipped交运维同步后核实登记；0204/0020及旧历史保持。'}
(scratch / 'ledger-final-update.json').write_text(json.dumps(update, ensure_ascii=False, indent=2) + '\n')
with (scratch / 'ledger-final-update.log').open('w') as handle:
    subprocess.run(['python3', '/home/dw/Projects/agent-sts2/learner/ledger.py', 'update'],
                   input=json.dumps(update, ensure_ascii=False), text=True, stdout=handle, stderr=subprocess.STDOUT, check=True)
with (scratch / 'ledger-final-check.log').open('w') as handle:
    subprocess.run(['python3', '/home/dw/Projects/agent-sts2/learner/ledger.py', 'check'], stdout=handle, stderr=subprocess.STDOUT, check=True)
print(json.dumps({'source': result['source_commit'], 'merged': result['merged'], 'version': result['version'], 'tests': report['tests']}, ensure_ascii=False))
