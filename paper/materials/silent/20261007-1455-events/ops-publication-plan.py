from pathlib import Path
import fcntl,json,hashlib,subprocess,re
exec(compile(Path('/tmp/sts2-0907-deploy-common.py').read_text(),'common','exec'))
RESULT=Path('/tmp/sts2-20261007-1455-publish-result.json')
assert not RESULT.exists()
prep=json.loads(Path('/tmp/sts2-20261007-1455-prepare.json').read_text())
sandbox=json.loads(Path('/tmp/sts2-20261007-1455-exp73-sandbox.json').read_text())
assert sandbox['rc']==0 and sandbox['passed_files']>0 and sandbox['passed_cases']>0
feature=Path(prep['feature']); source=prep['source']; path='knowledge/characters/silent/experience.json'
assert git('write-tree',cwd=feature).strip()==sandbox['feature_tree']
assert not git('diff','--name-only',cwd=feature).strip()
feature_commit=commit('ops: integrate tested Silent experience 2026-10-07.19',feature)
assert git('diff','--name-only',prep['live_before'],feature_commit).splitlines()==[path]
raw_procs=Path('/tmp/sts2-20261007-1455-procs-before-publish.txt').read_text()
assert not re.search(r'^\d+ .*report\.py|^\d+ .*knowledge/builders/build-',raw_procs,re.M)
with (ROOT/'ops/live-merge.lock').open('a') as lock:
 try: fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 except BlockingIOError:
  save({'state':'lock_busy','source':source,'tested_feature':feature_commit});raise SystemExit(4)
 live_before=git('rev-parse','HEAD',cwd=LIVE).strip()
 assert run(['git','merge-base','--is-ancestor',prep['live_before'],live_before]).returncode==0
 assert git('rev-parse','HEAD:'+path,cwd=LIVE).strip()==git('rev-parse',source+'^:'+path).strip()
 parallel_delta=git('diff','--name-only',prep['live_before'],live_before,cwd=LIVE).splitlines()
 Path('/tmp/sts2-20261007-1455-live-advance.json').write_text(json.dumps({'checked_base':prep['live_before'],'live_before':live_before,'parallel_delta':parallel_delta,'source_only_integration':True},ensure_ascii=False,indent=2)+'\n')
 assert not git('diff','--cached','--name-only',cwd=LIVE).strip()
 assert not git('diff','--name-only','--',path,cwd=LIVE).strip()
 dirty=git('diff','--name-only',cwd=LIVE).splitlines()
 refresh=[p for p in dirty if p.startswith('knowledge/') or p=='notes/fight-value-backtest-silent.md']
 assert set(dirty)==set(refresh),dirty
 hashes={p:hashlib.sha256((LIVE/p).read_bytes()).hexdigest() for p in refresh}
 untracked_before=git('ls-files','--others','--exclude-standard',cwd=LIVE)
 ts=stamp()
 if refresh:
  git('add','--',*refresh,cwd=LIVE)
  refresh_commit=commit('Refresh generated knowledge before Silent exp73 integration',LIVE)
 else: refresh_commit=live_before
 # The tested feature differs by one experience blob. Latest generated refreshes
 # are retained by this three-way merge; no live code is replaced.
 git('merge','--no-ff',feature_commit,'-m','ops: publish tested Silent experience .19 without replacing refreshes\n\n'+FOOTER,cwd=LIVE)
 actual=git('rev-parse','HEAD',cwd=LIVE).strip()
 assert git('diff','--name-only',refresh_commit,actual,cwd=LIVE).splitlines()==[path]
 assert git('rev-parse','HEAD:'+path,cwd=LIVE).strip()==prep['experience_blob']
 assert run(['git','merge-base','--is-ancestor',source,actual]).returncode==0
 for p,h in hashes.items():assert hashlib.sha256((LIVE/p).read_bytes()).hexdigest()==h
 assert git('ls-files','--others','--exclude-standard',cwd=LIVE)==untracked_before
 vpath='eval/versions.json'
 original=(LIVE/vpath).read_text(); versions=json.loads(original)
 version='S1.exp73'
 assert not any(v['name']==version for v in versions['versions'])
 text=f'decision-log {ts}（静默经验.19固定源{source}，增2改10退0、141条49280字，源两轮tsc0/224文件2374例；7旧知识刷新重叠受阻后仅经验blob兜底，保留全部live代码及最新生成数据。固定组合基线93298980原入口tsc0/{sandbox["passed_files"]}文件{sandbox["passed_cases"]}例exit0/{sandbox["workers"]}worker；真实实际代码{actual}，最终发布完整外部另经learner-recheck，原额度断言失败历史保持。）'
 entry={'name':version,'family':'Silent','commit':actual,'source':text}
 marker='\n  ]\n}'
 assert marker in original
 stamp()
 (LIVE/vpath).write_text(original.replace(marker,',\n    '+json.dumps(entry,ensure_ascii=False,indent=6).strip().replace('\n','\n    ')+marker,1))
 line=f'- {ts} 运维codex为经验73提交/合入受阻兜底：源{source}/blob{prep["experience_blob"]}，.18→.19、增2改10退0/141条49280字；先保存当前自动刷新{refresh_commit}，仅经验增量实际live{actual}，其余代码/知识刷新保留；独立先前基线93298980固定组合沙箱tsc0/{sandbox["passed_files"]}文件{sandbox["passed_cases"]}例exit0。唯一S1.exp73指向实际代码，13项原CLI proposed由运维据实际上线登记shipped；来源01H1533KSS5C、2K4H3JEJHRSB、ULP4TN1GNHMK及第73节。142509基线冲突无源码/测试，main同步后协调经验工作树续派；原同树两次外部tsc0/vitest1仅旧warning regex失败保留，生产Codex-only不回滚，普通141302续修，完整发布外部另经本批独立learner-recheck。\n'
 with (LIVE/LOG).open('a') as out:out.write(line)
 git('add','--',vpath,LOG,cwd=LIVE)
 publication=commit('ops: register Silent experience .19 as S1.exp73',LIVE)
 assert run(['git','merge-base','--is-ancestor',source,publication]).returncode==0
 assert git('diff','--name-only',actual,publication,cwd=LIVE).splitlines()==sorted([vpath,LOG])
 # Main keeps its pending records and code, and imports only the immutable
 # experience source plus this task's generated refreshes and version record.
 root_before=git('rev-parse','HEAD').strip()
 assert not git('diff','--cached','--name-only').strip()
 preview=run(['nice','-n','19','git','merge-tree','--write-tree',root_before,source],check=False)
 assert preview.returncode in (0,1)
 tree=preview.stdout.splitlines()[0]
 assert git('diff','--name-only',root_before,tree).splitlines()==[path]
 m=run(['git','merge','--no-commit','--no-ff',source],check=False)
 Path('/tmp/sts2-20261007-1455-main-merge.txt').write_text(m.stdout)
 assert m.returncode in (0,1)
 assert set(git('diff','--cached','--name-only',root_before).splitlines())=={path}
 git('restore','--source='+source,'--staged','--worktree','--',path)
 assert not git('ls-files','-u').strip()
 assert git('diff','--cached','--name-only').splitlines()==[path]
 main_source=commit('ops: synchronize tested Silent experience .19 source',ROOT)
 for p in refresh:
  assert not git('diff','--name-only','--',p).strip(),p
  (ROOT/p).write_bytes((LIVE/p).read_bytes())
  git('add','--',p)
 root_vraw=(ROOT/vpath).read_text();root_versions=json.loads(root_vraw)
 assert not any(v['name']==version for v in root_versions['versions'])
 assert marker in root_vraw
 stamp()
 (ROOT/vpath).write_text(root_vraw.replace(marker,',\n    '+json.dumps(entry,ensure_ascii=False,indent=6).strip().replace('\n','\n    ')+marker,1))
 git('add','--',vpath)
 append_owned(LOG,line)
 main_publication=commit('ops: synchronize exp73 publication and generated refreshes',ROOT)
 assert git('rev-parse','HEAD:'+path).strip()==prep['experience_blob']
 for p in refresh:assert git('rev-parse','HEAD:'+p).strip()==git('rev-parse',publication+':'+p).strip()
 save({'state':'published','timestamp':ts,'source':source,'blob':prep['experience_blob'],'version':version,'tested_feature':feature_commit,'sandbox':sandbox,'live_before':live_before,'refresh_commit':refresh_commit,'refresh_paths':refresh,'refresh_sha256':hashes,'actual_code':actual,'publication':publication,'publication_tree':git('rev-parse',publication+'^{tree}').strip(),'main_source':main_source,'main_publication':main_publication,'parallel_code_preserved':True,'checked_base':prep['live_before'],'parallel_delta':parallel_delta,'untracked_preserved':True,'record_line':line,'experience_worktree_baseline':'coordinate separately','full_external_checks':'request independently'})
 print('PUBLISHED',publication,'CODE',actual,'MAIN',main_publication,flush=True)
