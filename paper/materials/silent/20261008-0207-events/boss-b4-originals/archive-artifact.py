"""Archive the completed batch without generated caches or unrelated role records."""
import hashlib
import json
from pathlib import Path
import shutil

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


evidence = json.loads((OUT / 'dispatch-evidence.json').read_text())
assert json.loads((OUT / 'acceptance.json').read_text())['accepted'] is False
assert (OUT / 'before-trust.json').read_bytes() == (OUT / 'after-trust.json').read_bytes()
identity = {'evidence_key': evidence['key'], 'base': evidence['dispatch_base'],
            'dataset': sha(OUT / 'dataset/fights.jsonl'), 'split': sha(OUT / 'split.json'),
            'before_trust': sha(OUT / 'before-trust.json'),
            'acceptance': sha(OUT / 'acceptance.json'),
            'batch': '20261007-215921-fix-batch'}
artifact_id = hashlib.sha256(json.dumps(identity, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
target = ROOT / 'experiments/boss-sim/silent' / artifact_id
target.mkdir(parents=True, exist_ok=False)

# Root-level records are fixed small analysis files; generated tsx caches are directories.
for source in sorted(OUT.iterdir()):
    if source.is_file() and source.suffix in ('.py', '.ts', '.json', '.jsonl', '.md', '.log', '.txt', '.sha256', '.rc', '.toml'):
        shutil.copy2(source, target / source.name)
for name in ['history', 'fixed-input', 'before-results', 'after-results', 'before-serial-results',
             'before-tail-results', 'target-replay-results', 'tune-scale-07', 'tune-scale-10']:
    source = OUT / name
    if source.exists():
        shutil.copytree(source, target / name)
dataset = target / 'dataset'
dataset.mkdir()
for name in ['sources.jsonl', 'fights.jsonl', 'turns.jsonl', 'extraction.json']:
    shutil.copy2(OUT / 'dataset' / name, dataset / name)

# Preserve original full-prefix SHA/length in extraction.json. Archive role-only metadata,
# keeping raw selected lines exactly rather than serializing parsed objects again.
extraction = json.loads((OUT / 'dataset/extraction.json').read_text())
eligible = set(extraction['eligible_run_ids'])
attempt_keys = {(r['run_id'], r['floor'], r['sl']['attempt'], r['sl']['started_at'])
                for r in map(json.loads, (OUT / 'dataset/sources.jsonl').read_text().splitlines())
                if r.get('sl') and r['sl'].get('started_at')}
filtered = {}
for name in ['runs-snapshot.jsonl', 'sl-snapshot.jsonl']:
    kept = []
    for raw in (OUT / 'dataset' / name).read_bytes().splitlines(keepends=True):
        row = json.loads(raw)
        if row.get('run_id') not in eligible:
            continue
        if name == 'sl-snapshot.jsonl' and (row.get('run_id'), row.get('floor'), row.get('attempt'), row.get('started_at')) not in attempt_keys:
            continue
        kept.append(raw)
    destination = dataset / name.replace('-snapshot', '-silent-snapshot')
    destination.write_bytes(b''.join(kept))
    filtered[name] = {'rows': len(kept), 'archived_path': str(destination.relative_to(target)),
                      'sha256': sha(destination), 'bytes': destination.stat().st_size}

gate = target / 'acceptance'
gate.mkdir()
for name in ['before.isolation.json', 'after.isolation.json']:
    shutil.copy2(OUT / 'acceptance' / name, gate / name)
(target / 'artifact-identity.json').write_text(json.dumps(identity, ensure_ascii=False, indent=1) + '\n')
(target / 'metadata-filter.json').write_text(json.dumps(filtered, ensure_ascii=False, indent=1) + '\n')
readme = f'''# silent / THE_INSATIABLE B4：20261007-215921-fix-batch

结果 rejected；没有候选源码、live 合入或 eval 版本。调度基准 {evidence['dispatch_base']}，证据 key {evidence['key']}。

before/after 由原 trust.py 生成，使用同一个 197 场扩充集、原 tune 与切点；目标 boss 基准独立重复，其他 boss 原始样本按 exact key/输入 SHA 核对复用。sim.ms 是耗时，不参与重复数值核对；实盘与五回合隔离仍由不可变基准 runner 逐字节核对。

fights/sources/turns、split、provenance、原重放输出、固定输入、逐回合表、原帧夹具、来源字节索引、tune 专用网格、验收及全部初稿错误均在本目录。SL predicted_death 截尾不补败局。原 run/SL 全文件前缀 SHA 与字节数见 extraction.json；归档元数据仅保留本角色已结束局及 boss 尝试对应行，过滤详情见 metadata-filter.json。完整原前缀副本仍留原批临时目录。

模拟源码和原工具可由基准 Git 提交取回，所有模型输入逐文件 SHA 在 before-provenance.json；唯一非 Git 输入 game-data.json 已复制在 fixed-input/，运行时校准输入也另存固定副本。acceptance.py、trust.py、backtest-runner.ts、isolation.ts 均与基准相同；baseline-acceptance.py 仅为原件备份。

复现：在该基准独立 checkout 中恢复 learner/runs/20261007-215924-boss-sim-batch 的原相对布局（将本目录文件复制回该目录）；PATH 加 ~/.local/node/bin、TMPDIR 指该目录，所有 runner 在 agent/ 执行，nice 19、后台最多四进程。命令与固定参数见 replay-commands.json/runtime-input-audit.json，原始行号种子与分段证明见 parallel-replay-plan.json/parallel-replay-proof.json。重新运行时使用新的输出目录，避免覆盖本档案。以 build-paired.py 的原调用生成两侧 trust，按报告中的原 acceptance CLI 验收；BASE/BASE 应因没有严格改善被拒绝。源快照 tar/node_modules 和 tsx 缓存不归档；原验收 runner 的固定输出与 SHA 已保存。

最终详细报告在 paper/materials/silent/boss-sim-b4-THE_INSATIABLE-20261007-215921.md；本目录 report.md/report.json 为批回报副本。tune 0.7 试验没有进入 after 或验证选参，也没有实盘改变。
'''
(target / 'README.md').write_text(readme)
manifest = {'artifact_id': artifact_id, 'identity': identity,
            'files': {str(p.relative_to(target)): {'sha256': sha(p), 'bytes': p.stat().st_size}
                      for p in sorted(target.rglob('*')) if p.is_file()}}
(target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + '\n')
(OUT / 'artifact-path.txt').write_text(str(target) + '\n')
print(json.dumps({'artifact': str(target), 'files': len(manifest['files']),
                  'bytes': sum(r['bytes'] for r in manifest['files'].values()),
                  'filtered_metadata': filtered}, ensure_ascii=False))
