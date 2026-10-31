"""Read-only file/grep inventory for #86; writes only this materials directory."""
from pathlib import Path
import collections
import csv
from datetime import datetime
import hashlib
import json
import os
import subprocess

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
HOST = ROOT.parents[1]
LIVE = HOST / '.worktrees/live'

# Family rows are based on inspected callsites; grep-evidence retains line-level references.
FAMILIES = {
    'catalog.json': ('build-catalog.py', 'knowledge/catalog.ts; knowledge/query-sources.ts; knowledge/render/data.ts', '刷新末步', 'stats'),
    '_legacy-meta.json': ('build-catalog.py', 'knowledge/catalog.ts:fragment/readCompatibleKnowledgeText', '刷新末步', 'stats'),
    'mechanics-observed.json': ('build-catalog.py <- common/monster-db.json', 'knowledge/catalog.ts:fragment', '刷新末步', 'stats'),
    'model-observed.json': ('build-catalog.py <- common/move-model.json', 'knowledge/catalog.ts:fragment', '刷新末步', 'stats'),
    'monster-db.json': ('build-monster-db.py', 'knowledge/monster-db.ts; knowledge/mechanics.ts; reflex/combat-plan.ts; sim/boss-start.ts; combo-simulation.mts; monster-db-check.py', '局后刷新', 'stats'),
    'move-model.json': ('build-monster-db.py --move-model-out; build-move-model.py', 'knowledge/move-model.ts; reflex/rollout-live.ts; sim/boss-start.ts; build-fight-value.py; combo-simulation.mts', '局后刷新/显式单producer', 'stats'),
    'card-upgrades.json': ('build-card-upgrades.py', 'knowledge/card-upgrades.ts -> sim/build-sim-facts.ts; sim/thief-card-value.ts', '局后刷新', 'stats'),
    'monster-records.json': ('build-monster-db.py', 'knowledge/monster-db.ts; sim/global-build-pool.ts; monster-db-check.py', '局后刷新', 'stats'),
    'outcome-stats.json': ('build-outcome-stats.py; outcome_logdb.py', 'knowledge/experience.ts; knowledge/outcome-facts.ts; sim/boss-clock.ts; hand/screens/card-value.ts,event.ts,rest.ts', '局后刷新', 'stats'),
    'room-costs.json': ('build-room-costs.py', 'knowledge/room-costs.ts; sim/boss-clock.ts; sim/route-projection.ts; knowledge/render/stats-text.ts', '局后刷新', 'stats'),
    'boss-damage.json': ('build-boss-damage.py', 'sim/boss-clock.ts; eval/boss-clock-recompute.ts', '局后刷新', 'stats'),
    'potion-equivalents.json': ('refresh-potion-equivalents.sh -> build-potion-equivalents.py', 'knowledge/potion-equivalents.ts; reflex/potion-cost.ts; reflex/combat-plan.ts; reflex/thief.ts; v6/direction-runtime.ts; v6/potion-entries.ts', '局后刷新', 'stats'),
    'fight-value.json': ('build-fight-value.py all/train', 'reflex/fight-value.ts', '--all/原训练准入', 'stats'),
    'fight-value-gates.json': ('build-fight-value.py all/train', 'reflex/rollout.ts', '--all/原训练准入', 'stats'),
    'construction-opportunities.json': ('build-construction-opportunities.py', 'construction/data.ts; v6/projection-input.ts; refresh-v6-history.py', 'Silent局后刷新', 'stats'),
    'v6-history.json': ('refresh-v6-history.py -> build-v6-history.py/combo-simulation.mts', 'sim/v6-history-pack.ts; ops/report.py; learning_runtime_store.py依赖校验', 'Silent局后刷新/原方法门', 'stats'),
    'monster-db-check.md': ('monster-db-check.py', '人工报告；无agent/src实际读取命中', '局后刷新', 'report-export'),
    'experience.json': ('原角色学习者; knowledge-runtime候选完成回调', 'knowledge/experience.ts; reflex/jev-experience.ts; brain/tools/query-guidance.ts; knowledge/render/*; ops/experience-pending.py; proposal_dispatch.py', '学习发布', 'K1'),
    'strategy-entries.json': ('Silent学习者; knowledge-runtime候选完成回调', 'knowledge/strategy-entries.ts; brain/decision-knowledge.ts; brain/tools/query-guidance.ts', '学习发布', 'K1-existing'),
    'reflex.json': ('角色学习者; 原K1候选发布', 'v6/knowledge.ts; reflex/jev/combat-entries.ts; brain/tools/reflex-knowledge.ts', '学习发布', 'K1'),
    'reflex-vocab.json': ('角色学习者; 原K1候选发布', 'v6/knowledge.ts; reflex/jev/combat-entries.ts', '学习发布', 'K1'),
    'build-cores.json': ('角色学习者; 原K1候选发布', 'v6/knowledge.ts; reflex/jev/combat-entries.ts; refresh-v6-history.py; learning_runtime_data.py', '学习发布', 'K1'),
    'boss-trust.json': ('agent/tools/boss-sim/refresh-silent.py -> silent_calibration.py; Ironclad原发布', 'sim/boss-trust.ts; sim/boss-lines.ts; sim/build-sim-facts.ts; sim/thief-card-value.ts; v6/projection-input.ts; ops/boss_sim_jobs.py', '原校准cadence/显式发布', 'stats-B'),
    'open-book.json': ('build-open-book.py; ops/open_book_refresh.py/原候选', 'knowledge/open-book.ts', '原外部参考/知识发布', 'K1'),
    'opening-value.json': ('opening_value.py extract/train（输出名为动态拼接）', 'v6/card-value.ts', '显式冻结训练；非每局自动训练', 'stats-B'),
    'double-boss.json': ('原角色学习者/知识发布', 'knowledge/double-boss.ts', '学习发布', 'K1-new-asset'),
    'construction-support.json': ('原角色学习者/知识发布', 'construction/support.ts; v6/projection-input.ts', '学习发布', 'K1-new-asset'),
    'construction-templates.json': ('原角色学习者/知识发布', 'construction/data.ts; v6/projection-input.ts', '学习发布', 'K1-new-asset'),
    'jev-hints.json': ('原角色学习者/知识发布', 'knowledge/jev-hints.ts; knowledge/render/data.ts; reflex/jev consumer', '学习发布', 'K1-new-asset'),
    'sl-elites.json': ('原角色学习者/知识发布', 'sl/elites.ts -> sl/controller.ts', '学习发布', 'K1-new-asset'),
    'ds-handbook.md': ('原角色学习/历史知识发布', 'core/config.ts:handbookFile; knowledge/render/data.ts -> render/old-knowledge.ts', '显式发布', 'K1-text-asset'),
    'ironclad-guide.md': ('原角色学习/历史知识发布', 'knowledge/render/data.ts:guideFileName -> render/old-knowledge.ts（其余字面命中多为注释）', '显式发布', 'K1-text-asset'),
    'mechanics.json': ('build-catalog.py仅创建空stub; 后续学习者维护', 'knowledge/catalog.ts递归查询; 非自动推理规则', '首次stub/学习发布', 'K1-new-asset'),
    'model.json': ('build-catalog.py仅创建空stub; 后续学习者维护', 'knowledge/catalog.ts递归查询; 非自动推理规则', '首次stub/学习发布', 'K1-new-asset'),
    'event-pages.json': ('build-event-pages.py --only-producer event-pages', 'knowledge/event-pages.ts', '显式固定方法刷新', 'stats-B'),
    'shared-experience.json': ('原通用性核验学习者; common K1候选', 'knowledge/shared-experience.ts; brain/tools/query-guidance.ts; knowledge/render/*', '学习发布', 'K1'),
    'silent/pending/*': ('原冻结学习任务/草稿owner', 'knowledge/catalog.ts递归可达; learner原任务; 不在K1 importFiles中', '原任务草稿修订', 'draft-unpublished'),
    'lessons.md': ('learner历史复盘; ops/ordinary_close.py; 新入口learning_runtime.py', 'knowledge/render/data.ts:loadPostmortems -> brain/tools/kb-tools.ts:kb_postmortem; brain/knowledge.ts; render/experience-text.ts; learner/lib/runs.ts', '复盘完成追加/运营发布', 'learning.sqlite-view'),
}


def details(name):
    key = family(name)
    if key in FAMILIES:
        return FAMILIES[key]
    if '/build-statistics-v1/' in name:
        return ('eval/own_build_stats.py', 'eval/verify_own_build_stats.py; eval/build_stats_view.py; ops/external_stock_cli.py/run-index; knowledge/catalog.ts递归', '显式自有冻结统计', 'stats-self-C')
    if '/decision-fields-v1/' in name:
        return ('eval/sts2fun_decision_fields.py', 'eval/build_stats_view.py; verify_own_build_stats.py; external_stock_source.py动态artifact引用', '显式外部投影', 'stats-external-C')
    if '/builds-v1/' in name:
        return ('eval/sts2fun_build_stats.py', 'strategy-archetypes.ts仅archetypes; ops/external_stock_source.py动态artifact引用; eval/*build*', '显式外部投影', 'K1-reference-archetypes/remaining-stats')
    if name.endswith('/silent-a10.json'):
        return ('eval/sts2fun_stats.py', 'brain/tools/external-stats-tools.ts:load（直接join路径，绕过knowledgeFile）', '显式外部聚合', 'stats-external-C')
    raise ValueError('unclassified family: ' + name)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def classify(name):
    p = Path(name)
    if name.startswith('data/learning-runtime') or name.startswith('data/logdb'):
        return 'D'
    if name.startswith('data/') or '/external/' in name or '/build-statistics-v1/' in name:
        return 'C'
    if p.name in {'catalog.json', 'monster-db-check.md', '_legacy-meta.json', 'mechanics-observed.json', 'model-observed.json',
                  'monster-db.json', 'move-model.json', 'card-upgrades.json', 'monster-records.json', 'outcome-stats.json',
                  'room-costs.json', 'boss-damage.json', 'potion-equivalents.json', 'fight-value.json', 'fight-value-gates.json',
                  'construction-opportunities.json', 'v6-history.json'}:
        return 'A'
    return 'B'


def family(name):
    if '/build-statistics-v1/games/' in name:
        return 'build-statistics-v1/games/*'
    if '/pending/' in name:
        return 'silent/pending/*'
    return Path(name).name


def stat(path):
    try:
        s = path.stat()
        return {'bytes': s.st_size, 'mtime_ns': s.st_mtime_ns, 'symlink': path.is_symlink()}
    except FileNotFoundError:
        return {'bytes': None, 'missing': True}


def main():
    names = git('ls-files').splitlines()
    data = [n for n in names if n.startswith('knowledge/') and not n.startswith(('knowledge/builders/', 'knowledge/schemas/'))
            and Path(n).suffix in {'.json', '.jsonl', '.md'}]
    data += [n for n in ['notes/monster-db-check.md', 'notes/lessons.md'] if n in names]
    code = []
    for n in names:
        if not n.startswith(('agent/src/', 'agent/tools/', 'knowledge/builders/', 'learner/', 'ops/', 'eval/', 'tools/', '.agents/')):
            continue
        if n.startswith(('ops/codex-ops/', 'learner/runs/')):
            continue
        if Path(n).suffix not in {'.ts', '.mts', '.py', '.sh', '.sql', '.yaml', '.json'}:
            continue
        if '/tests/' in n or '/test/' in n or Path(n).name.startswith('test_') or Path(n).name.endswith(('.test.ts', '.spec.ts')):
            continue
        p = ROOT / n
        if p.is_file() and not p.is_symlink() and p.stat().st_size < 2_000_000:
            code.append((n, p.read_text(errors='replace').splitlines()))
    terms = {Path(n).name for n in data if family(n) != 'build-statistics-v1/games/*'}
    terms.update(['knowledgeFile(', 'knowledgeDataDirs(', 'runtimeDataFile(', 'runtimeKnowledgeFile(',
                  'data/game-data.json', 'fight-value-rows', 'data/learning-runtime', 'data/logdb',
                  'build-statistics-v1', 'knowledge/external', 'knowledge-refresh.lock', 'readFileSync(', 'read_text('])
    hits = collections.defaultdict(list)
    for n, lines in code:
        for i, line in enumerate(lines, 1):
            for term in terms:
                if term in line:
                    hits[term].append({'file': n, 'line': i, 'text': line.strip()[:420]})
    (OUT / 'grep-evidence.json').write_text(json.dumps(hits, ensure_ascii=False, indent=2) + '\n')
    rows = []
    for n in sorted(set(data)):
        local = stat(ROOT / n)
        rows.append({'path': n, 'class': classify(n), 'family': family(n), 'base_bytes': local.get('bytes'),
                     'base_sha256': hashlib.sha256((ROOT / n).read_bytes()).hexdigest() if local.get('bytes') is not None else None,
                     'live': stat(LIVE / n), 'evidence_key': Path(n).name,
                     'cadence': '每轮刷新/派生' if classify(n) == 'A' else '原学习/发布/离线导入',
                     'reference_status': 'literal_matches_need_callsite_review' if hits.get(Path(n).name) else 'dynamic_or_archive_needs_family_review'})
        producer, consumers, cadence, destination = details(n)
        rows[-1].update(producer=producer, consumers=consumers, cadence=cadence, destination=destination)
    (OUT / 'files.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n')
    with (OUT / 'files.tsv').open('w') as f:
        w = csv.writer(f, delimiter='\t')
        w.writerow(['path', 'class', 'family', 'base_bytes', 'live_bytes', 'base_sha256', 'grep_key', 'producer', 'consumers', 'cadence', 'destination'])
        for r in rows:
            w.writerow([r['path'], r['class'], r['family'], r['base_bytes'], r['live'].get('bytes'), r['base_sha256'], r['evidence_key'], r['producer'], r['consumers'], r['cadence'], r['destination']])
    summary = {}
    for category in 'ABCD':
        selected = [r for r in rows if r['class'] == category]
        summary[category] = {'tracked_files': len(selected), 'base_bytes': sum(r['base_bytes'] or 0 for r in selected),
                             'live_bytes': sum(r['live'].get('bytes') or 0 for r in selected)}
    # Metadata only: never open production databases, take application locks, or follow links.
    sizes = []
    def tree_size(start):
        total = count = 0
        if start.is_dir() and not start.is_symlink():
            for base, dirs, leaves in os.walk(start, followlinks=False):
                dirs[:] = [d for d in dirs if not (Path(base) / d).is_symlink()]
                for leaf in leaves:
                    p = Path(base) / leaf
                    if not p.is_symlink():
                        total += stat(p).get('bytes') or 0
                        count += 1
        return {'files': count, 'logical_bytes': total}
    for root_rel in ['data/knowledge-runtime', 'data/learning-runtime', 'data/logdb', 'data/external']:
        start = HOST / root_rel
        total = count = skipped = 0
        if start.is_dir() and not start.is_symlink():
            for base, dirs, leaves in os.walk(start, followlinks=False):
                dirs[:] = [d for d in dirs if not (Path(base) / d).is_symlink()]
                for leaf in leaves:
                    p = Path(base) / leaf
                    if p.is_symlink():
                        skipped += 1
                        continue
                    s = stat(p)
                    total += s.get('bytes') or 0
                    count += 1
        sizes.append({'path': root_rel, 'files': count, 'logical_bytes': total, 'skipped_links': skipped,
                      'subdirectories': [{'path': str(p.relative_to(HOST)), **tree_size(p)} for p in sorted(start.iterdir()) if p.is_dir() and not p.is_symlink()] if start.is_dir() else [],
                      'children': [{'name': p.name, **stat(p)} for p in sorted(start.iterdir()) if p.is_file()] if start.is_dir() else []})
    live_extra = []
    for base, dirs, leaves in os.walk(LIVE / 'knowledge', followlinks=False):
        dirs[:] = [d for d in dirs if d not in {'builders', 'schemas'} and not (Path(base) / d).is_symlink()]
        for leaf in leaves:
            p = Path(base) / leaf
            name = str(p.relative_to(LIVE))
            if p.suffix in {'.json', '.jsonl', '.md'} and name not in data and not p.is_symlink():
                live_extra.append({'path': name, 'class': classify(name), **stat(p), 'status': 'live_only_metadata_observation'})
    extra = []
    for p in sorted((HOST / 'data').glob('fight-value-rows*.jsonl')) + [HOST / 'data/game-data.json']:
        extra.append({'path': str(p.relative_to(HOST)), **stat(p), 'class': 'C'})
    result = {'time': datetime.now().astimezone().isoformat(), 'base': git('rev-parse', 'HEAD'),
              'live_head': subprocess.check_output(['git', '-C', str(LIVE), 'rev-parse', 'HEAD'], text=True).strip(),
              'summary': summary, 'runtime_sizes': sizes, 'extra_C': extra, 'live_extra': live_extra,
              'warning': 'LIVE metadata is a non-atomic observation, not a migration input. This metadata audit never opens a production DB; the separate read-k1/readback probes are documented independently.'}
    (OUT / 'summary.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'summary': summary, 'runtime_sizes': [{k: v for k, v in s.items() if k != 'children'} for s in sizes],
                      'files': len(rows), 'source_files': len(code)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
