"""Verify actual publication/consumer evidence and emit an honest H0 continuation checkpoint."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

OUT=Path(__file__).resolve().parent
WORK=OUT.parents[2]
ROOT=Path('/home/dw/Projects/agent-sts2')
LIVE=ROOT/'.worktrees/live'
PAPER=WORK/'paper/materials/20261017-human-pace-h0'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def load(p):return json.loads(p.read_text())
def git(*args):return subprocess.check_output(['git','-C',str(LIVE),*args],text=True).strip()
def canonical(entry):return hashlib.sha256(json.dumps(entry,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
def counts(path):
    text=path.read_text()
    files=[int(x) for x in re.findall(r'Test Files\s+(\d+) passed',text)]
    tests=[int(x) for x in re.findall(r'\bTests\s+(\d+) passed',text)]
    assert len(files)==len(tests)==2,(str(path),files,tests)
    return {'files':sum(files),'tests':sum(tests),'sections':list(zip(files,tests))}

pub=load(OUT/'publication.json');assert pub['publication'] and pub['merged'] and not pub.get('error')
for commit in [pub['source'],pub['merged'],pub['receipt_source'],pub['publication']]:
    assert re.fullmatch('[a-f0-9]{40}',commit)
    subprocess.run(['git','-C',str(LIVE),'merge-base','--is-ancestor',commit,'HEAD'],check=True)
assert git('rev-parse',pub['publication']+'^{tree}')==pub['fixed_release_tree']
receipt=load(Path(pub['consumer_receipt']['path']));assert sha(Path(pub['consumer_receipt']['path']))==pub['consumer_receipt']['sha256']
assert receipt['status']=='passed' and receipt['kind']=='fixed-consumer' and receipt['live_commit']==pub['merged']
for ref in receipt['evidence']:assert sha(Path(ref['path']))==ref['sha256']
current=load(LIVE/'knowledge/characters/silent/experience.json');entries={e['id']:e for e in current['entries']}
assert current['version']==receipt['experience_version'],'Current live version changed; require a new actual fixed consumer, never rewrite an old receipt.'
refs={r['id']:r for r in receipt['entries']};assert len(refs)==9
for ident,ref in refs.items():assert canonical(entries[ident])==ref['sha256']
assert (OUT/'source-sandbox-v2.exit').read_text().strip()=='0'
assert load(OUT/'test-history-restored-v2.json')['restored']
assert pub['live_sandbox_exit']==0
actual=Path(pub['attempt']);source_counts=counts(OUT/'source-sandbox-v2.log');live_counts=counts(actual/'live-sandbox.log')
new_proposal=(OUT/'proposal-implemented.log').read_text().strip();assert re.fullmatch('silent-proposal-[0-9a-f]{16}',new_proposal)
cache=load(OUT/'tuning-cache-v2.json');questions=load(OUT/'questions.json')
boss_ids=['silent-g1a-test-subject-calibration-boundary','silent-g1a-aeonglass-calibration-boundary','silent-g1a-queen-calibration-boundary','silent-h0-kaiser-crab-calibration-boundary','silent-h0-knowledge-demon-calibration-boundary','silent-h0-insatiable-calibration-boundary']
fixed='silent-g1a-fixed-production-boundary';paper='silent-paper-krane-weak-multihit';measurement='silent-h0-end-turn-measurement-boundary'
coverage={
 'h0-target-boss-mechanism-evidence':[refs[i] for i in boss_ids],
 'h0-frozen-inputs-and-residual-diagnosis':[refs[fixed],refs[measurement]],
 'h0-evidence-backed-model-repair':[refs[paper]],
 'h0-fixed-split-recalibration-and-gates':[refs[fixed],*[refs[i] for i in boss_ids]],
 'h0-live-experience-source-consumer':[refs[fixed],refs[paper]],
 'h0-limitations-and-objections':[refs[fixed],refs[measurement]],
}
artifact_paths=[PAPER/'phase-report.md',PAPER/'phase-manifest.json',OUT/'diagnosis.json',OUT/'all-target-frame-sources.jsonl',OUT/'all-target-attempts-summary.jsonl',OUT/'compiled-v2-manifest.json',OUT/'validation-resume-plan-v2.json',Path(cache['archive'])/'phase1-completed.json',Path(cache['archive'])/'tuning-fit.json',OUT/'publication.json',OUT/'notification.json']
checkpoint={'phase':'证据、窄源码修正、107调参缓存及实际live经验读回已交付；481验证待接续','new_artifacts':[{'path':str(p),'sha256':sha(p)} for p in artifact_paths],'unfinished':['同一冻结新对象的481验证keys/B2+B3共962行未计算；修后六Boss四闸及A0–4/A5–9/A10验证残差未知。','另外五目标尚未从这些选择窗口中隔离可修的招式/阶段因果错误；24 no solve及组合挡差异保持未知。','新生产H1/螺旋镖/刷新输入与冻结full模型不同；部分预算、自然采用/收益、F49联合率、0332与宽父不由本阶段关闭。','正式release_id、唯一精确新组合外部检查及ledger shipped由ops核实际发布后登记；异议已实际双追加，不代ops/watcher/Roy ACK。'],'next':'同原owner/thread H0/r1执行validation-resume-plan-v2.json：核276输入/241编译模块SHA及214调参缓存，至多4个nice19 Node仅算原481验证keys，保持全588行序号种子、T1/pre与原四闸；使用已冻结训练Platt，禁止验证拟合、重复旧107/旧full或发布空trust。','execution_plan':{'path':str(OUT/'validation-resume-plan-v2.json'),'sha256':sha(OUT/'validation-resume-plan-v2.json')},'no_new_trust_published':True,'batch_boundary_reason':'原生240分钟；实测新对象耗时约旧1.50倍，旧全样本约9.65 CPU小时。此批完成可审计源码/知识阶段，保剩余必要计算沿原线程继续，不请求Roy再批。'}
tests={'tsc':0,'vitest':0,'cases':8,'source_sandbox':{'exit':0,**source_counts,'log':str(OUT/'source-sandbox-v2.log'),'sha256':sha(OUT/'source-sandbox-v2.log')},'actual_live_sandbox':{'exit':0,**live_counts,'log':str(actual/'live-sandbox.log'),'sha256':sha(actual/'live-sandbox.log'),'code_commit':pub['merged'],'tree':pub['preflight_tree']},'original_source_failure':{'exit':1,'passed':4275,'failed':1,'reason':'新增原型模块违反原rollout导入边界；现移入既有适配层，原断言和原日志保留。','log':str(OUT/'source-sandbox.log')},'negative_regression':{'exit':1,'expected_failure':'原未修编译源码实际13对日志10；9个旧预测均与日志不同，修后9个相符。','log':str(OUT/'repair-negative.log')},'fixed_intent_probe':{'passed':9,'independent_runs':1,'isolation_groups':8,'path':str(OUT/'repair-probe-v2-output.json')},'actual_adapter_probe':{'B2':True,'B3':True,'observed_contexts':6,'path':str(OUT/'adapter-probe-v4-output.json')},'consumer':{'passed':9,'kind':'fixed-consumer','natural_effect':None},'new_validation':{'keys_completed':0,'keys_pending':481,'four_gate_after':None},'external_full':'交原调度器检查本次精确发布树；未冒用H1/G4或旧绿'}
result={'task':'strategy-proposal','character':'silent','batch':'20261017-095852-strategy-proposal','base':'54e36d0830ab640130557b62a078b25954912ff4','fixes':[{'item':'Roy 已授权 H0：静默 Boss 证据窄修与校准阶段1','commit':pub['source'],'merged_commit':pub['merged'],'test':'SILENT A2有效纸鹤聚合体六已见上下文，固定9意图/8隔离组、B2/B3构造及源/实际新组合sandbox通过；481验证待接续。','fails_without_fix':True,'evidence_runs':['ZZMYZ5UBCG72'],'ledger':['silent-0500','silent-0501']}],'merged':pub['merged'],'publication':pub['publication'],'fixed_release_tree':pub['fixed_release_tree'],'experience_version':receipt['experience_version'],'version':pub['version'],'release_id':pub.get('release_id'),'release_id_status':pub['release_id_status'],'commits':{'source':pub['source'],'refresh':pub.get('refresh_commit'),'before_code':pub['before_code'],'code_merge':pub['merged'],'consumer_source':pub['receipt_source'],'publication':pub['publication']},'tests':tests,'code_proposals':['silent-proposal-6ddd086196022f15','silent-proposal-a6cf9f726a971b59','silent-proposal-7b0badc658e4fb1b',new_proposal],'implementation_domains':['combat','structure'],'proposal_results':[{'id':'silent-proposal-6ddd086196022f15','status':'implemented','commit':pub['source'],'reason':'原窄修实现在live祖先；CLI以附implemented_commit的新内容身份另追加下项，未手改原队列状态。'},{'id':new_proposal,'status':'implemented','commit':pub['source'],'reason':'CLI核实际live祖先后登记。'},{'id':'silent-proposal-a6cf9f726a971b59','status':'waiting','reason':'原手工计数初稿保留，数字由7b0bad修正；剩余量测/长轨迹因果未隔离，不冒实现。'},{'id':'silent-proposal-7b0badc658e4fb1b','status':'waiting','reason':'203/179/178/24更正与限制已入经验；更宽assay、组合挡和481验证仍待同原任务具体证据，不改指标过闸。'}],'report':str(OUT/'report.md'),'learning_result':{'request_id':'roy-20261017-human-pace-h0','revision':1,'input_sha256':'982c4264158fe5426423cf02477f22822d1a2b5e8bff058c7575a52bd6f7da54','outcome':'continue','coverage':coverage,'consumer_receipt':pub['consumer_receipt'],'questions':questions,'checkpoint':checkpoint}}
text=f'''# H0/r1 源码与知识阶段实际交付，481验证待同线程接续

源码 {pub['source']} 已成为实际live祖先；合入 {pub['merged']}，固定发布 {pub['publication']} / tree {pub['fixed_release_tree']}。经验{receipt['experience_version']}，专题名{pub['version']}，正式release_id由ops核号，未冒用旧号。本报告不关闭H0/0332/human-pace。

源沙箱{source_counts['files']}文件/{source_counts['tests']}题与实际新组合{live_counts['files']}文件/{live_counts['tests']}题通过（均含tsc）；首轮架构失败、负向13≠10、旧consumer EPERM等原件保留。实际生产加载/渲染/定向查询9对象通过，receipt {pub['consumer_receipt']['path']}，SHA {pub['consumer_receipt']['sha256']}。这是固定读取，不是自然消费或胜率效果。

六目标923尝试/178独立已结束Silent局，24战203命令窗口/179可回放/178净HP相符/24未知，17旧末帧时点疑点；14,124原端点offset/len/SHA完整。唯一支持的物理修正仅ZZMYZ5UBCG72 A2纸鹤聚合体四招六上下文/1独立局，A10及其他角色/未见条件保持旧路。全表、原四闸失败与独立样本不足、A10/F49、原角色来源和异议见{PAPER/'phase-report.md'}。

新冻结full对象 {cache['model_sha256']} / artifact {cache['artifact']}，107调参keys已完成（各端106成功、1 no solve），原200样本/切点/种子/keys不动。9意图与8隔离组及B2/B3构造等价证明纯helper迁移复用214调参行，旧原型与旧缓存不覆盖。481验证未运行，不输出修后Brier/闸门通过或空trust。生产H1/螺旋镖/刷新边界与研究对象逐SHA分列于真实receipt证据，不把冻结full模型冒称当前线上认证。

账本silent-0500/0501仍proposed，经CLI关联实际source/merge/pub；CLI implemented新ID {new_proposal}，原队列与计数勘误历史保留，不冒shipped。授权根双通知已追加并逐offset读回，原文3项questions同completion.json；ops→watcher→Roy各自收到/ACK及外部精确组合检查均不代签。

下一步执行{OUT/'validation-resume-plan-v2.json'}，同owner/thread/r1只算481验证keys，不重算107或旧full，不用验证拟合或放宽门槛。条件、未知、可执行命令及SHA见completion.json checkpoint；旧报告/输入/失败/源码缓存均保留。
'''
(OUT/'report.md').write_text(text)
(OUT/'completion.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'report':str(OUT/'report.md'),'completion':str(OUT/'completion.json'),'completion_sha256':sha(OUT/'completion.json'),'outcome':'continue','publication':pub['publication'],'receipt':pub['consumer_receipt']},ensure_ascii=False))
