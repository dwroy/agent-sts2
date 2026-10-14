"""Record actual final checks and publication without closing ops-owned shipped status."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
LIVE = PROJECT / '.worktrees/live'


def read(name):
    return json.loads((HERE / name).read_text())


def write(name, data):
    (HERE / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def git(*args):
    return subprocess.check_output(['git', '-C', str(LIVE), *args], text=True).strip()


state = read('publication.json')
assert (HERE / 'live-sandbox.exit').exists()
assert state.get('sandbox_exit') is not None
success = bool(state.get('publication') and state.get('merged') and state['sandbox_exit'] == 0)
source = state['source']
source_live_ancestor = subprocess.run(['git', '-C', str(LIVE), 'merge-base', '--is-ancestor', source, 'HEAD']).returncode == 0
assert not success or source_live_ancestor
log = (HERE / 'live-sandbox.log').read_text()
summary = [line.strip() for line in log.splitlines() if 'Test Files ' in line or 'Tests ' in line or 'Duration ' in line]
raw_source = read('tests-summary.json')
failed = []
for label, merge in [('first','19b02dcc884825226c193ac1616f0c397f38fae9'),('second','c4a8b0d65fdc5393b19855d68272bb08ca743fc4'),('third','65763022bbb3a5571671e8fab4ae0c92c52b2fd5')]:
    receipt = read('publication.' + label + '-failed.json')
    path = HERE / ('live-sandbox.' + label + '-failed.log')
    lines = path.read_text().splitlines()
    failed.append({'attempt':label,'merge':merge,'tree':receipt['tested_tree'],'exit':receipt['sandbox_exit'],
        'rollback_to':receipt['before_code'],'publication':None,'preserved_log':str(path),
        'log_sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
        'failures':[x.strip() for x in lines if x.startswith(' FAIL ')],
        'summary':[x.strip() for x in lines if 'Test Files ' in x or 'Tests ' in x]})
consumer = read('live-consumer-read.json') if success else None
notice = read('dual-notification.json') if (HERE / 'dual-notification.json').exists() else None
candidate = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
boss_table = read('boss-trust-table.json')
result = {'task':'fix-batch','base':(HERE/'base.txt').read_text().strip(),
 'fixes':[{'item':'Roy 已授权新功能：静默 boss 模拟校准','commit':source,
   'data_commit':'c53d5273269a3b82af3c7e62f5f8caabae5013ad','reused_code_commit':'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
   'actual_merge':state.get('merged'),'fixed_release_commit':state.get('publication'),'fixed_release_tree':state.get('publication_tree'),
   'version':state.get('version'),'release_id':None,'ledger':['silent-0463'],
   'test':{'source_fixed_coverage':read('source-coverage.json'),'live_sandbox_exit':state['sandbox_exit'],
      'live_summary':summary,'python_calibration':{'cases':12,'exit':0},'python_dispatch':{'cases':45,'exit':0},
      'candidate_consumer':{'checks':28,'exit':0},'live_consumer':consumer},
   'fails_without_fix':False,'nature':'authorized new feature periodic calibration; no production code or strategy thresholds changed'}],
 'skipped':[{'scope':'A0–4','validation':0,'missing':10},{'scope':'A5–9','validation':0,'missing':10},
   {'scope':'F49','validation':20,'missing':0,'reason':'gap and leak failed; no new F49 actual outcomes'},
   {'scope':'historical simulation errors','fights':3,'reason':'Retained original no-solve outcomes'},
   {'scope':'current production model reliability','reason':'99 inputs differ from the pinned experiment; not revalidated'},
   {'scope':'historical exact dirty trees and mid-fight code changes','reason':'Not fully reconstructable from recorded run-config metadata'}],
 'merged':state.get('merged'),'tests':{'source':raw_source,'live_sandbox_exit':state['sandbox_exit'],'live_summary':summary,
     'prior_live_failures':failed,'third_failed_cases_supplement':read('live-third-supplement-integrity.json'),
     'external_full':'scheduler; not claimed passed'},
 'code_proposals':[],'implementation_domains':[],
 'report':str(HERE/'report.md'),'calibration_report':str(ROOT/'paper/materials/silent/boss-sim-calibration.md'),
 'artifact':candidate['refresh']['artifact'],'archive':str(ROOT/'experiments/boss-sim/silent'/candidate['refresh']['artifact']),
 'counts':{'finished_runs':284,'attempts':1245,'usable_outcomes':502,'new_outcomes':21,'new_wins':15,'new_deaths':6,
     'censored':742,'missing_opening_uncensored':1,'tune':107,'validation':395,'successful_validation':393},
 'boss_table':boss_table,
 'a10':{s:candidate['residuals'][s]['val']['A10'] for s in ['t1','pre']},
 'f49':{s:candidate['stage_metrics'][s]['F49']['val'] for s in ['t1','pre']},
 'refresh':{'entry':'agent/tools/boss-sim/refresh-silent.py','dispatch':'ops/learner_jobs.py:calibration_job',
     'cadence':'ticks :13/:43 and learner finish; ascension or 20 new won/died boss attempts; censored SL does not count',
     'fixed_model':'7e1193cef9467416bc10c8e344a49f4fd98390c7','fixed_input_files':210,
     'split_cutoff_utc':candidate['split']['cutoff_ts'],'frozen_invocation_flags':['--previous','--dataset','--results','--provenance'],
     'default_current_model_not_claimed_pinned':True,'idempotency':read('idempotency-audit.json')},
 'commits':{'source':['c53d5273269a3b82af3c7e62f5f8caabae5013ad',source],
   'preserved_live_refresh':['309f4434f9c4da24311d492ee9a3b293dfb2419b','cc82ef5cbc3c14a304a70229b72fb39b17f60f13','ab3e6c70100b17b9210e2b12d93e8e8a4f311235'],
   'rolled_back_merges':[x['merge'] for x in failed] + ([] if success else [read('live-fourth-attempt.json')['live_merge']]),
   'final_attempt_merge':read('live-fourth-attempt.json')['live_merge'],'successful_merge':state.get('merged'),'publication':state.get('publication')},
 'source_live_ancestor':source_live_ancestor,'live_head_at_completion':git('rev-parse','HEAD'),
 'learning_notice':{'finding':read('questions.json'),'dual_append_receipt':notice,'watcher_received':False,'roy_notified':False},
 'ledger_status':'proposed only; ops owns shipped and official release_id',
 'request_closed':False,'natural_adoption':'not verified'}
if not success:
    result['skipped'].append({'scope':'live publication','reason':state.get('rolled_back') or state.get('blocked') or 'publication incomplete',
        'test_summary':summary,'requires_roy_approval':False})
write('result.json',result)
stamp=subprocess.check_output(['date','+%Y-%m-%d %H:%M:%S %Z'],text=True).strip()
(HERE/'completion-date.log').write_text(stamp+'\n')
completion=f'''## 最终实际合入与测试回执（{stamp}）

任务性质：Roy 已授权新功能的周期校准；没有新增游戏机制、策略阈值或其他队列 bug 修复。源码复用 cdf75af64fb5b118a5a808ecb3b05e2a05991c36（live 祖先）；校准来源提交 c53d5273269a3b82af3c7e62f5f8caabae5013ad 和 {source}。

本次最终 live 沙箱 exit={state['sandbox_exit']}；{'正式源码父合入和发布登记完成' if success else '发布受 live 检查阻塞，本次合入已经回退'}。actual merge={state.get('merged')}；固定发布 commit={state.get('publication')}，tree={state.get('publication_tree')}；内部版本={state.get('version')}，正式 release_id 由 ops 锁内核号。source 是否为最终 live 祖先：{source_live_ancestor}。未称 shipped 或自然采用。标准入口、固定排除列表、测试预算和断言均未修改。

合后最终摘要：{' / '.join(summary)}。

前三次整套原始失败和 rollback 保存于 publication.first/second/third-failed.json 与相应 live-sandbox 日志，绝不将补验改写为原命令通过。第三次两个失败用例在相同失败提交的1562文件固定快照、原预算下单 worker 补验通过；详见 live-third-supplement-integrity.json。最新整套仍以实际 exit 和摘要为准。三个已保存的原 live 知识刷新提交：309f4434f9c4da24311d492ee9a3b293dfb2419b、cc82ef5cbc3c14a304a70229b72fb39b17f60f13、ab3e6c70100b17b9210e2b12d93e8e8a4f311235。

账本 silent-0463 只经根 CLI 追加 proposed；shipped、正式核号、外部完整检查和 ops→watcher→Roy 确认属于后续实际验收，未代填。反证为 KNOWLEDGE_DEMON B2 验证36→39场、打穿比1.281→1.325；数量缺口0仍不达标。双通知实际追加回执：{'dual-notification.json' if notice else '没有已发布通知，不能冒报上线或送达'}。

定期触发已复用原调度器；固定模型重跑须沿 --dataset/--results/--provenance 的既有入口，裸命令默认当前模型不能当作旧模型固定重放。此次210输入SHA、整体Platt、107调参keys和切点保持，新21样本只扩验证；当前生产模型99项输入不同，本实验没有验证其改动。原档案和全部失败资料、过程工作树保留。

完整机器回执为 result.json；逐boss可信表、全部失败指标、来源局号/回合/版本和数据不足详见以下原实验报告及归档。本最终段独立记录部署结果，封存实验目录的字节与清单保持。

'''
original=(ROOT/'paper/materials/silent/boss-sim-calibration.md').read_text()
(HERE/'report.md').write_text(completion+original)
print(json.dumps({'success':success,'result':str(HERE/'result.json'),'source_live_ancestor':source_live_ancestor,'version':state.get('version')},ensure_ascii=False))
