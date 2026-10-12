from pathlib import Path
import base64,hashlib,importlib.util,json,re,subprocess
exec(compile(Path('/tmp/sts2-0907-deploy-common.py').read_text(),'common','exec'))
oldgit=git
def git(*args,**kw):return oldgit('-c','core.quotepath=false',*args,**kw)
ARC=ROOT/'paper/materials/silent/20261009-1639-events'
record=json.loads(Path('/tmp/sts2-20261009-1639-prepare.json').read_text())
assert record['cli']==14 and git('rev-parse','HEAD').strip()==record['base_head']
assert set(git('diff','--cached','--name-only').splitlines())==set(record['staged_paths'])
d=json.loads(Path('/tmp/sts2-20261009-1639-paper-result.json').read_text());assert d['rc']==0
summary=json.loads(base64.b64decode(d['content_base64']['paper/data/summary.json']))
verification=json.loads(base64.b64decode(d['content_base64']['paper/data/verification.json']))
assert sum(v is True for v in verification['checks'].values())==5 and verification['checks']['runs.jsonl decision-count mismatches']==[]
log=Path('/tmp/sts2-20261009-1639-paper-dataset.log');raw=log.read_text()
assert len(re.findall(r'^OK   ',raw,re.M))==5 and 'key scan: CLEAN' in raw
assert summary['performance_policy']=='codex-successful-brain-v1' and summary['include_non_codex'] is False
count=summary['runs_total'];play,shadow=summary['decisions']['play_total'],summary['decisions']['shadow'];total=play+shadow
assert count==verification['row_counts']['runs.csv']
m=json.loads((ARC/'manifest.json').read_text())
assert m['owned_cli']==14 and m['evidence_update_rows']==8 and m['proposal_link_rows']==6
assert m['support_evidence']==10 and m['repeat_evidence']==1 and not m['new_pure_bugs'] and not m['queue_append']
assert m['lesson_append_bytes']==19245 and m['source_total_verification_count']==m['ops_readonly_source_checks_reexecuted']==105
def digest(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for chunk in iter(lambda:f.read(1048576),b''):h.update(chunk)
 return h.hexdigest()
for p,item in m['originals'].items():assert digest(p)==item['sha256'],p
changed=d['changed'];physical_newer=[]
for path in changed:
 assert path.startswith('paper/data/') or re.fullmatch(r'paper/materials/[a-z]+/cost.md',path)
 data=base64.b64decode(d['content_base64'][path]);assert hashlib.sha256(data).hexdigest()==d['after'][path]
 blob=subprocess.check_output(['git','hash-object','-w','--stdin'],cwd=ROOT,input=data).decode().strip()
 git('update-index','--add','--cacheinfo','100644,'+blob+','+path)
 if digest(ROOT/path)!=d['after'][path]:physical_newer.append(path)
LP,LESSON='paper/materials/learning/ledger.jsonl','notes/lessons.md'
spec=importlib.util.spec_from_file_location('ledger1639final',ROOT/'learner/ledger.py')
ledger=importlib.util.module_from_spec(spec);spec.loader.exec_module(ledger)
tmp=Path('/tmp/sts2-20261009-1639-final-index.jsonl');tmp.write_text(git('show',':'+LP))
assert not ledger.check_file(str(tmp),ledger.load_runs(),ledger.load_versions())
check=run(['nice','-n','19','python3','-B','learner/ledger.py','check']).stdout;assert '0 problem(s)' in check
assert git('show',':'+LESSON)==git('show',record['base_head']+':'+LESSON)+(ARC/'owned-lessons-addition-original.md').read_text()
assert git('show',':'+LP)==git('show',record['base_head']+':'+LP)+(ARC/'owned-postmortem-original-cli.jsonl').read_text()
latest=json.loads((ROOT/'ops/codex-ops/learn.json').read_text())
assert latest['batches']['20261009-161301']['state']=='done' and latest['batches']['20261009-161301']['rc']==0
assert latest['runs']['C6Z8ATNBNHZ7']=={'attempts':1,'batch':'20261009-161301'}
pending=json.loads((ROOT/'notes/silent-historical-core-builds-dispatch.json').read_text())
assert pending['request_id']=='roy-20261009-historical-core-builds' and pending['state']=='pending' and pending['batch'] is None
ts=stamp();meta={k:v for k,v in d.items() if k!='content_base64'}
meta.update(cut=summary['generated_at'],source_cut_bytes=summary['source_cut_bytes'],checks=verification['checks'],row_counts=verification['row_counts'],
 raw_runs=count,raw_decisions=total,performance_policy=summary['performance_policy'],include_non_codex=False,key_scan='CLEAN',
 physical_newer_preserved=physical_newer,paper_invocations=1,pm_original_cli=14,evidence_update_rows=8,support_evidence=10,
 repeat_evidence=1,proposal_link_rows=6,new_pure_bugs=[],old_pure_bug_repeat=['silent-0256'],queue_append=False,
 source_total_verification_count=105,ops_readonly_source_checks_reexecuted=105,source_originals=len(m['originals']),
 formal_append_bytes=19245,original_errata_count=2,no_ops_game_knowledge_added=True,
 no_pm_merge_version_shipped_or_check_requested=True,no_production_process_mutation=True,record_only=True,
 ledger_check=check,normal_completed_batch=True,attempts=1,
 parent_request='roy-20261009-historical-core-builds',parent_state='pending',parent_actual_batch=None,
 supplement='roy-20261009-historical-core-builds-paper-trace',supplement_is_second_task=False,
 observer_codex1_archive='pending',experience133_checks_receipt='paper/materials/silent/20261009-1639-checks-experience133/closure.json',
 prior_request_checks_commit=record['base_head'])
(ARC/'paper-snapshot.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
(ARC/'paper-dataset.txt').write_bytes(log.read_bytes())
ops_aborts={'kind':'Read-only verification helper assumptions corrected; no source or historic record changed.',
 'first_attempt':{'exit':1,'check':'Formal append starts with draft-v2','finding':'Formal 19245-byte append starts with original append-lesson.sh/lesson-draft.md 18733 bytes, then two errata; draft-v2 was a later separate draft and was not the executed append.'},
 'second_attempt':{'exit':1,'check':'Python checks object equals parsed verification JSON','finding':'Source verify.py uses tuples; original JSON serializes them as arrays. Normalizing the reexecuted object through JSON produces exact 105-check equality.'},
 'source_writes':0,'source_all_original_files_preserved':True}
(ARC/'ops-readonly-verification-history.json').write_text(json.dumps(ops_aborts,ensure_ascii=False,indent=2)+'\n')
line=(f'- {ts} 运维codex16:39学习闭环：20261009-161301局C6Z8ATNBNHZ7正常done/rc0、attempts1，无缺失/提案审计错误；report.json/Markdown/out末JSON一致，19245字节正式追加与原appended-section及6071133字节旧前缀SHA全等、标题一次；保留18733字节实际命令草稿、分开的draft-v2与两段原勘误（F22 T1格挡14及勘误时间），物理原文不再追加。14所属原CLI按字节/顺序纳入（8旧条目证据更新含10support/1repeat、6提案关联），旧claim/首证/prior/状态/版本保持，无新条目/重登记/shipped。只有silent-0256已列的纯bug重复，无新阻塞、队列不追加；原提案7f6ac5f447be5acc/9e14d9e11b63d153及文件SHA核实，沿自动strategy链不复派、不冒称实现；打法/机制仍由学习者。{len(m["originals"])}源原件SHA保持，原105核验只读重执行经JSON序列化全等；辅助验证对draft-v2/tuple的错误假设更正另存，不改历史。完整dirty知识快照、前三次SL未执行结算/退出、末击毛伤/过量、执行最优线比例、未选方案整场对照、silent事前时钟比值、F24后资源、药水表未加载原因及实际账单等原未记录限制保持。论文唯一一次--no-raw exit0、切点{summary["generated_at"]}、{count}局/{total}原决策（play{play}/shadow{shadow}），五校验通过、计数不匹配空、key scan CLEAN，{len(changed)}生成快照精确纳入、physical/index台账0问题；他人产出/后续刷新保持。Roy全历史构筑父请求及论文补充已独立保存唯一pending、实际batch null、准确缺任务/路由/wrapper安全入口，.codex1观察者归档覆盖pending；16:47记录提交{record["base_head"]}，经验133完整302文件3435过2跳独立结案、不重复上线/登记/补测。此处仅复盘记录/数据，无新游戏代码合入/版本/生产动作；A10 done/attempts3与exp100原失败保持；回执{ARC.relative_to(ROOT)}/paper-snapshot.json。\n')
append_owned(LOG,line);append_owned('notes/ops-handoff.md','\n'+line)
append_owned('ops/inbox-dev.md',f'\n- {ts} [运维 codex] C6Z8ATNBNHZ7复盘闭环完成：19245字节原正式文本及两段原勘误、14原CLI（8证据更新/6提案关联，10support/1repeat）精确纳入，只有0256旧纯bug重复、队列不追加。90源原件SHA、105核验只读序列化复核一致，原未知/失败保留；两提案沿自动链。论文单次--no-raw、五校验通过、台账0问题，{len(changed)}快照；全历史构筑父请求/论文补充唯一pending及归档入口缺口沿16:47回执，不冒报已派发或游戏知识。经验133完整检查已独立结案。回执{ARC.relative_to(ROOT)}/paper-snapshot.json。\n')
extra=[str(p.relative_to(ROOT)) for p in ARC.rglob('*') if p.is_file() and str(p.relative_to(ROOT)) not in record['staged_paths']]
git('add','-f','--',*extra)
allpaths=set(git('diff','--cached','--name-only').splitlines())
assert allpaths==set(record['staged_paths'])|set(changed)|set(extra)|{LOG,'notes/ops-handoff.md','ops/inbox-dev.md'}
assert 'paper/materials/learning/code-proposals.jsonl' not in allpaths
rawpaths={p for p in allpaths if p.startswith(str(ARC.relative_to(ROOT))+'/')}
git('-c','core.whitespace=cr-at-eol','diff','--cached','--check','--',*sorted(allpaths-rawpaths))
git('-c','core.whitespace=cr-at-eol,-blank-at-eof,-blank-at-eol','diff','--cached','--check','--',*sorted(rawpaths))
scan=run(['nice','-n','19','/home/dw/.local/bin/gitleaks','stdin','--no-banner','--redact','--log-level','error'],data=git('diff','--cached','--no-ext-diff','--no-textconv'),check=False)
Path('/tmp/sts2-20261009-1639-final-gitleaks.log').write_text(scan.stdout);assert scan.returncode==0
assert git('rev-parse','HEAD').strip()==record['base_head']
git('commit','--quiet','-m','ops: close C6Z8 postmortem and refresh paper\n\n'+FOOTER)
sha=git('rev-parse','HEAD').strip()
for path in changed:assert hashlib.sha256(subprocess.check_output(['git','show','HEAD:'+path],cwd=ROOT)).hexdigest()==d['after'][path]
for p,item in m['originals'].items():assert digest(p)==item['sha256']
assert not git('diff','--cached','--name-only').strip()
receipt={'commit':sha,'paper_cut':summary['generated_at'],'paper_paths':changed,'checks_passed':5,'runs':count,'raw_decisions':total,
 'pm_cli':14,'source_originals':len(m['originals']),'new_pure_bugs':0,'batch_state':'done','attempts':1,
 'parent_request_state':'pending','parent_batch':None,'observer_codex1_archive':'pending','experience133_fullchecks':'passed',
 'physical_newer_preserved':physical_newer,'gitleaks_exit':0,'index_clean':True}
Path('/tmp/sts2-20261009-1639-final.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(receipt,ensure_ascii=False,indent=2),flush=True)
