"""Record final read-only checks and hash-address the research deliverables."""
import datetime
import hashlib
import json
import pathlib
import subprocess

OUT=pathlib.Path(__file__).resolve().parent
ROOT=pathlib.Path('/home/dw/Projects/agent-sts2')
WORKTREE=ROOT/'.worktrees/issue-4-elite-calibration-20261021'
MANIFEST=ROOT/'.artifacts/ops-github-issues-adoption-20261021/issue-4-inputs.json'


def sha(b):
    return hashlib.sha256(b).hexdigest()


def save(name,data):
    (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')


def git(*args):
    return subprocess.check_output(['git',*args],cwd=WORKTREE)


manifest=json.loads(MANIFEST.read_bytes())
inventory=json.load(open(OUT/'fight-inventory.json'))
runs=json.load(open(OUT/'run-inventory.json'))
summary=json.load(open(OUT/'static-summary.json'))
assert len(inventory)==53 and len({r['id'] for r in inventory})==53
assert len(runs)==40 and len({r['run_id'] for r in inventory})==33
assert sum(r['observed']['censored_first_attempt'] for r in inventory)==1
assert sum(r['actual_opening_unknown'] for r in inventory)==1
assert summary['opening_hand_count_gaps']=={'4':2,'2':51}
assert len(summary['endpoint_discrepancies'])==2
assert sum(r['variants']['synthetic']['samples']+r['variants']['actual-opening']['samples'] for r in inventory)==3360
assert summary['states_verified']==2345 and summary['decisions_verified']==1546
assert len((OUT/'source-index.jsonl').read_text().splitlines())==3895
assert len((OUT/'turn-alignment.jsonl').read_text().splitlines())==340
assert len(json.load(open(OUT/'disagreements.json')))==3
assert all(r['state']=='waiting' for r in json.load(open(OUT/'proposal-drafts.json')))
assert len(json.load(open(OUT/'input-verification.json'))['files'])==99
for entry in manifest['files']:
    b=pathlib.Path(entry['path']).read_bytes()
    assert len(b)==entry['bytes'] and sha(b)==entry['sha256']
diff=git('diff','--binary');cached=git('diff','--cached','--binary');status=git('status','--porcelain=v1','--untracked-files=all')
assert not diff and not cached and not status
head=git('rev-parse','HEAD').decode().strip()
assert head==manifest['base']
(OUT/'worktree-end.diff').write_bytes(diff)
(OUT/'worktree-end-cached.diff').write_bytes(cached)
scans=[]
for name in ['initial','final']:
    p=OUT/f'gitleaks-{name}.json'
    if p.exists():
        findings=json.loads(p.read_bytes())
        scans.append({'pass':name,'report':str(p),'sha256':sha(p.read_bytes()),'findings':len(findings),'exit_code':0 if not findings else 1,'local_exclusions':[]})
checks={'checked_at':datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).isoformat(),
    'worktree':str(WORKTREE),'base':head,'git_status':status.decode(),'unstaged_diff_bytes':len(diff),'staged_diff_bytes':len(cached),
    'source_changes':False,'writes_scope':str(OUT),'inputs_rechecked':99,'input_mismatches':[],
    'inventory_structural_checks':'passed','gitleaks':scans,'tests':None,'new_mc':0,'network_requests':0,'model_requests':0,
    'merged':False,'published':False,'notifications_sent':False,'role_acknowledgements_written':False}
save('final-checks.json',checks)
artifacts=[]
for p in sorted(OUT.iterdir()):
    if p.is_file() and p.name not in ['artifact-index.json','result.json']:
        b=p.read_bytes();artifacts.append({'path':str(p),'bytes':len(b),'sha256':sha(b)})
save('artifact-index.json',{'scope':'本scratch产物；自引用文件artifact-index.json和result.json由消费者另行核SHA，避免循环哈希', 'artifacts':artifacts})
index=OUT/'artifact-index.json'
artifacts.append({'path':str(index),'bytes':index.stat().st_size,'sha256':sha(index.read_bytes())})
result={'task':'issue-4-elite-calibration','batch':manifest['batch'],'issue':4,'character':'silent','type':'research',
    'request_id':manifest['request_id'],'input_sha256':sha(MANIFEST.read_bytes()),'base':head,
    'status':'research_delivered_continuation_waiting','covered_runs':[r['run_id'] for r in runs],'covered_runs_count':40,
    'runs_with_elites':sorted({r['run_id'] for r in inventory}),
    'inventory':{'path':str(OUT/'fight-inventory.json'),'csv':str(OUT/'fight-inventory.csv'),'human_review':str(OUT/'fight-review.md'),
        'total':53,'static_checked':53,'independent_run_ids':33,'uncensored_fights':52,'matched_opening_uncensored':51,
        'excluded_count':1,'excluded':summary['excluded'],'no_solve_count':1,'no_solve':summary['actual_opening_unknown'],
        'turns_inventoried':340,'raw_sources_verified':3895},
    'excluded_count':1,'unknown_counts':{'first_attempt_outcome':1,'actual_opening_no_solve':1,'historical_run_knowledge_bytes':40,
        'draw_order':53,'unexecuted_counterfactual_successors':53,'full_simulator_action_state_trajectory':53,
        'causal_effect_attribution':53,'original_runtime_helper_bytes':2,'config_raw_line_offsets':42,'terminal_hp_event_attribution':2},
    'unknown_counts_overlap':True,
    'findings':{'raw_agent_view_removed':53,'replay_draw_multiset_mismatches':summary['draw_multiset_mismatches'],
        'opening_hand_count_gaps':summary['opening_hand_count_gaps'],'endpoint_discrepancies':summary['endpoint_discrepancies'],
        'original_death_rate_observed':4/52,'original_death_rate_simulated':summary['variants']['synthetic']['sim_rate'],
        'frozen_original_hp_bias':summary['variants']['synthetic']['sim_loss']-summary['variants']['synthetic']['observed_loss'],
        'entry_to_close_hp_bias':summary['variants']['synthetic']['sim_loss']-summary['entry_to_close_loss_mean']},
    'hypotheses':json.load(open(OUT/'hypotheses.json')),'proposals':json.load(open(OUT/'proposal-drafts.json')),
    'disagreements':json.load(open(OUT/'disagreements.json')),'report':str(OUT/'report.md'),
    'artifacts':artifacts,'tests':None,'merged':False,'published':False,'new_mc':0,'fixes':[],
    'code_proposals':[],'implementation_domains':[],
    'continuation':{'outcome':'continue','request_id':manifest['request_id'],'issue_remains_open':True,'owner':'original_ops_single_point',
        'next_step':'核报告与三项异议；沿既有CLI去重登记/通知并取得真实ops→watcher→Roy回执；先0MC原输入保真/端点固定断言，再有限相同实打前缀；四候选保持waiting。',
        'independent_holdout':'本53场均已阅；后续未读Silent A10新局按run/时间留出，当前缺证，未授权本会话启动游戏或模拟。',
        'acceptance_remaining':['mechanism_or_parameter_evidence','actual_knowledge_publication','live_ancestor_and_content_sha','consumer_readback','actual_role_notifications'],
        'notifications':{'prepared_disagreements':3,'sent_by_this_learner':False,'watcher_received':False,'roy_notified':False},
        'do_not_close_on':['report_completion','CEN_or_0332_subfix','P4','card_predictor','issue_comment_queued']}}
save('result.json',result)
print(json.dumps({'status':'research_delivered','files':len(artifacts)+1,'result':str(OUT/'result.json'),'sha256':sha((OUT/'result.json').read_bytes()),'worktree_clean':True,'scans':scans},ensure_ascii=False))
