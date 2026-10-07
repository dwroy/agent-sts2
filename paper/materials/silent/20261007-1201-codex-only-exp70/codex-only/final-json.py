"""Produce the launcher's fix-batch completion protocol from actual immutable manifests."""
import json
from pathlib import Path

P = Path(__file__).parent
load = lambda name: json.loads((P / name).read_text())
deployment = load('deployment.json')
original = load('source-manifest.json')
integration = load('integration-manifest.json')
final_source = load('sink-source-manifest.json')
assert deployment['status'] == 'released_ops_verification_pending'
assert deployment.get('main_sync_phase') == 'complete'
assert all(row['rc'] == 0 for row in deployment['tests'].values())
assert not deployment['main_feature_paths_with_other_changes']
data = {
    'task': 'fix-batch', 'base': original['base'],
    'fixes': [{
        'item': 'Roy 已授权独立功能：Codex-only 大脑等待与统计口径',
        'commit': final_source['source_commit'],
        'source_commits': [original['source_commit'], integration['source_commit'], final_source['source_commit']],
        'test': {'tsc': 0, 'vitest': 0, 'python': 0, 'source_files': 220, 'source_cases': 2356, 'serial_paths': 11,
                 'live_files': 223, 'live_cases': 2363, 'python_cases': 136, 'workers': 1},
        'fails_without_fix': True,
        'ablation': {'runtime_failed': 9, 'metrics_failed': 1, 'logging_failed': 2,
                     'restored_identically': True},
        'source_tests': [str(P / name) for name in ['source-manifest.json', 'integration-manifest.json', 'sink-source-manifest.json']],
    }],
    'skipped': ['其他队列 bug、boss 校准', '真实 LLM、play、key/.env、依赖安装和推送',
                '游戏知识/bug-infra 台账登记、改写旧报告'],
    'merged': deployment['actual_merge'],
    'tests': {'tsc': 0, 'vitest': 0, 'python': 0,
              'live': deployment['tests']['sandbox'], 'main': deployment['tests']['main_publication'],
              'full_external': 'pending', 'failure_and_retry_history': str(P / 'report.json')},
    'commits': {'original_source': original['source_commit'], 'curated_source': integration['source_commit'],
                'final_source': final_source['source_commit'], 'refresh': deployment['refresh_commit'],
                'actual_merge': deployment['actual_merge'], 'release': deployment['release_commit'],
                'main_runtime_activation': deployment['main_runtime_activation']['main_runtime_merge'],
                'main_tested_candidate': deployment['main_publication_source'],
                'main_records_merge': deployment['main_feature_source_sync_commit'],
                'main_records_source': deployment['main_records_source'], 'main': deployment['main_synced']},
    'release': {'commit': deployment['release_commit'], 'tree': deployment['release_tree'],
                'checked_commit': deployment['fixed_check_commit'], 'checked_tree': deployment['fixed_check_tree'],
                'version': deployment['version'], 'shipped': False, 'checks_pending': True},
    'statistics_fixed_cut': {'silent': {'raw_runs': 86, 'raw_wins': 10, 'codex_runs': 78, 'codex_wins': 10},
                             'ironclad': {'raw_runs': 481, 'raw_wins': 24, 'codex_runs': 7, 'codex_wins': 1},
                             'named_five': '全部实际成功回答为 DeepSeek',
                             'KQQELQSZ382Z': 'mixed: Codex 9 / DeepSeek 7，默认排除',
                             'policy': 'codex-successful-brain-v1'},
    'latest_quota_audit': {'cut_time': load('quota-followup.json')['cut_time'],
                          'oct7_runs': len(load('quota-followup.json')['all_oct7_runs_including_unfinished']),
                          'quota_events': len(load('quota-followup.json')['quota_events'])},
    'reports': {'md': str(P / 'report.md'), 'json': str(P / 'report.json'),
                'classification': str(P / 'run-classification.csv'), 'latest_quota_audit': str(P / 'quota-followup.json')},
    'remaining': ['调度器固定发布树完整沙箱外 tsc/vitest；运维核实 shipped 与已运行脚本加载版本。',
                  '未记载的历史脑题不能补造来源；显式全引擎口径和全部原始数据/费用/证据保留。'],
}
(P / 'completion.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
