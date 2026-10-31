from pathlib import Path
import copy,fcntl,hashlib,json,os,subprocess,sys,time,traceback
R=Path('/home/dw/Projects/agent-sts2');L=R/'.worktrees/live';A=Path(__file__).resolve().parent;M=R/'paper/materials/20261024-issue51-event-publication-ops';D=R/'ops/codex-ops'
sys.path.insert(0,str(R/'ops'));sys.path.insert(0,str(A));from commit_helpers import git,commit_files
leaf='knowledge/characters/silent/strategy-entries.json';catleaf='knowledge/catalog.json';catkey='characters/silent/strategy-entries.json';B='ops:issue51-204311-event-publication'
raw=lambda j:(json.dumps(j,ensure_ascii=False,indent=2)+'\n').encode();sha=lambda data:hashlib.sha256(data).hexdigest();now=lambda:subprocess.check_output(['date','-Is'],text=True).strip()
def save(n,j):
 p=M/n;t=p.with_suffix(p.suffix+'.tmp');t.write_bytes(raw(j));os.replace(t,p)
def knowledge():return {str(p.relative_to(L)):sha(p.read_bytes()) for p in sorted((L/'knowledge').rglob('*')) if p.is_file() and not p.is_symlink() and '__pycache__' not in p.parts}
def probe(content,name):
 q=subprocess.run(['nice','-n','19','node','--import',str(L/'agent/node_modules/tsx/dist/loader.mjs'),str(A/'consumer.mts'),str(content),str(L),str(M/(name+'.json')),str(M/'assembly.json')],capture_output=True,timeout=90);(A/(name+'.log')).write_bytes(q.stdout+q.stderr);assert q.returncode==0,name
 j=json.loads((M/(name+'.json')).read_bytes());assert j['passed'] and j['fixed_production_id_queries']==6;return j
s={'at':now(),'phase':'preflight','worker_pid':os.getpid(),'worker_birth':Path('/proc/self/stat').read_text().rsplit(')',1)[1].split()[19],'published':False,'new_full_model_game_tick':0,'held_locks':[]};save('publication-state.json',s);locks=[]
try:
 os.close(os.open(A/'publish.once',os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600));assembly=json.loads((M/'assembly.json').read_bytes());commands=json.loads((M/'ledger-commands.json').read_bytes());assert len(commands)==6 and json.loads((M/'ledger-check.json').read_bytes())['rc']==0 and json.loads((M/'candidate-consumers.json').read_bytes())['passed']
 for n in ['ops/knowledge-refresh.lock','ops/live-merge.lock']:
  s.update(at=now(),phase='waiting-original-publication-lock',waiting_lock=n);save('publication-state.json',s);f=(R/n).open('a');fcntl.flock(f,fcntl.LOCK_EX);locks.append(f);s['held_locks'].append(n)
 s['live_lock_acquired_at']=now();timer=time.monotonic();save('publication-state.json',s)
 for name,root in [('live',L),('main',R)]:
  snap=assembly['snapshots'][name];assert sha((root/leaf).read_bytes())==snap['before_sha256'];assert sha((A/(name+'-candidate.json')).read_bytes())==snap['candidate_sha256']
  assert (root/leaf).read_bytes()==git(root,'show','HEAD:'+leaf)
 protected=knowledge();save('knowledge-before.json',protected)
 flags={n:sha((R/n).read_bytes()) if (R/n).is_file() else None for n in ['ops/STOP','notes/roy-manual-play.json','ops/codex-ops/LLM_DRAIN','ops/codex-ops/ACCOUNT_DRAIN','ops/codex-ops/PAUSE']};save('flags-before.json',flags)
 catalogs={}
 for name,root in [('live',L),('main',R)]:
  current=json.loads((root/catleaf).read_bytes());head=json.loads(git(root,'show','HEAD:'+catleaf));entry=copy.deepcopy(current['sources'][catkey]);entry.update(sha256=assembly['snapshots'][name]['candidate_sha256'],bytes=(A/(name+'-candidate.json')).stat().st_size)
  disk=copy.deepcopy(current);disk['sources'][catkey]=entry;index=copy.deepcopy(head);index['sources'][catkey]=entry;catalogs[name]={'before_disk':current,'before_head':head,'disk':disk,'index':index}
 save('catalog-preservation.json',catalogs);probe(A/'live-candidate-root','boundary-candidate-consumers');s.update(at=now(),phase='committing-exact-data-source',T=now());save('publication-state.json',s)
 assert not any((D/n).exists() for n in ['LLM_DRAIN','ACCOUNT_DRAIN','PAUSE']), 'global admission hold before source write'
 mainfiles={leaf:(A/'main-candidate.json').read_bytes(),catleaf:raw(catalogs['main']['index'])};maindisk={leaf:mainfiles[leaf],catleaf:raw(catalogs['main']['disk'])}
 source=commit_files(R,mainfiles,'main-event-context','feat: integrate learner special-event contexts',disk_files=maindisk);s.update(at=now(),source_commit=source['commit'],phase='source-committed-await-live-data-write');save('publication-state.json',s)
 livefiles={leaf:(A/'live-candidate.json').read_bytes(),catleaf:raw(catalogs['live']['index'])};livedisk={leaf:livefiles[leaf],catleaf:raw(catalogs['live']['disk'])}
 behavior=commit_files(L,livefiles,'live-event-context','feat: publish six learner Silent event strategies',disk_files=livedisk);s.update(at=now(),published=True,behavior=behavior,phase='live-data-written-await-tool-readback');save('publication-state.json',s)
 actual=probe(L,'actual-live-consumers');assert actual['library_entries']==75
 assert knowledge()=={**protected,leaf:assembly['snapshots']['live']['candidate_sha256'],catleaf:sha(livedisk[catleaf])}
 docs={str(root):json.loads((root/'eval/versions.json').read_bytes()) for root in [R,L]};number=max(int(e['release_id'].split('-R')[1]) for doc in docs.values() for e in doc['release_numbering']['releases'])+1;release=f'V6-R{number:03d}';name='V6.event-contexts-20261024-204311';registrations={}
 description=f'{now()}; original204311 event unit through authorized #51 data-only batch cadence. Publish six exact learner event text strategies, no rk or formal experience candidate conversion. Main/live69to75 strategies; original115 rk, R440 ordinary text/0618 proposed/0672 shipped and R438 runtime preserved. Source own frozen506:627 choices/340 runs across ascensions, A10 570choices/311runs,506 event encounters distinct from506 allowed runs. External270 build/act/event/choice statistic cells,85 descriptive comparisons; v0.111 one comparison and all builds two comparisons reach both-group n>=100, not causal or instant cost proof. Exact event identity/options guarded in body; existing trigger supports event question/act only, no automatic event identity or ascension gate. Six fixed production ID queries,6 non-event negatives and2 other-role negatives. Source unknown-version costs/unknown or unchosen branches, survivor/upload/route/deck bias and coarse eligibility proxies preserved. Six rk wait existing contract (event identity/option fields unsupported), six custom knowledge formal consumers pending. Formal readback not natural adoption/benefit; full playbook/threshold/scientific parents remain open. No source code/full/models/games/ticks or switches changed. Rollback only six IDs and own catalog row; retain later knowledge/registry history.'

 for tag,root in [('main',R),('live',L)]:
  doc=copy.deepcopy(docs[str(root)]);assert (root/'eval/versions.json').read_bytes()==git(root,'show','HEAD:eval/versions.json');doc['versions'].append({'name':name,'family':'V6','commit':behavior['commit'],'release_id':release,'release_status':'registered-primary-ops','source':description});doc['release_numbering']['releases'].append({'release_id':release,'commit':behavior['commit'],'aliases':[name]});registrations[tag]=commit_files(root,{'eval/versions.json':raw(doc)},'registry-'+tag,'ops: register '+release+' decision strategy data publication')
 s.update(at=now(),release_id=release,live=registrations['live']['commit'],phase='registered-await-ledger-channel-readback');save('publication-state.json',s)
 ledger=R/'paper/materials/learning/ledger.jsonl';offset=ledger.stat().st_size;rows={row['runtime_entry']['id']:row for row in assembly['source_rows']}
 for command in commands:
  entry_id=command['entry_id'];e=rows[entry_id]['runtime_entry'];item={'id':command['ledger_id'],'by':B,'where':{'knowledge':[leaf+'#'+entry_id],'commits':[source['commit'],behavior['commit']]},'note':release+' actual fixed production strategy ID query passed. Exact source '+rows[entry_id]['source_archive']+' sha256='+rows[entry_id]['sha256']+'. Silent A10/own version unknown; strategy retrieval projection only; prior experience/mechanism claim, scope, state and scientific parent not completed; natural adoption/benefit pending.'}
  if command['new_ledger_record']:item.update(status='shipped',version=name)
  q=subprocess.run(['nice','-n','19','python3',str(R/'learner/ledger.py'),'update'],input=raw(item),capture_output=True);(A/(entry_id+'-ledger-update.stdout')).write_bytes(q.stdout);(A/(entry_id+'-ledger-update.stderr')).write_bytes(q.stderr);assert q.returncode==0,q.stderr.decode()
 own=[line+'\n' for line in ledger.read_bytes()[offset:].decode().splitlines() if json.loads(line).get('by')==B];save('ledger-published.json',{'release_id':release,'own_lines':own,'commands':commands,'legacy_status_claims_not_rewritten':True})
 sys.path.insert(0,str(R/'learner'));import ledger as ledger_module
 folded=ledger_module.fold()
 for command in commands:
  item=folded[command['ledger_id']]
  if not command['new_ledger_record']:assert item['status']==command['prior_status'] and item['claim']==command['prior_claim']
 q=subprocess.run(['nice','-n','19','python3',str(R/'learner/ledger.py'),'check'],capture_output=True);save('ledger-check-after.json',{'rc':q.returncode,'stdout':q.stdout.decode(),'stderr':q.stderr.decode(),'real_run_inventory_checked':True});assert q.returncode==0
 assert all((sha((R/n).read_bytes()) if (R/n).is_file() else None)==value for n,value in flags.items())
 save('knowledge-preserved.json',{'other_live_knowledge_leaves_unchanged':True,'experience_unchanged':True,'catalog_uncommitted_refresh_preserved':True,'catalog_commit_only_own_row':True,'all_other_existing_strategy_entries_preserved':True,'flags_unchanged':True})
 save('publication.json',{'at':now(),'T':s['T'],'release_id':release,'name':name,'source':source,'behavior':behavior,'registrations':registrations,'live_entries_before':69,'live_entries_after':75,'main_entries_before':69,'main_entries_after':75,'strategy_ids_added_to_live':6,'semantic_candidate_new':6,'semantic_candidate_updates':0,'ids':assembly['ids'],'actual_tool_receipt':'actual-live-consumers.json','fixed_production_id_queries':6,'natural_brain_adoption_not_measured':True,'old_legacy_claim_status_preserved':True,'other_knowledge_and_dirty_catalog_preserved':True,'new_runtime_sources_full_models_games_ticks':0,'scientific_parents_open':True})
 s.update(at=now(),phase='published-registered-six-event-tools-ledger-verified',published=True)
except BaseException as e:
 s.update(at=now(),phase='stopped-at-actual-stage',error=repr(e));(A/'publication-error.log').write_text(traceback.format_exc())
finally:
 for f in reversed(locks):f.close()
 s['held_locks']=[];s['at']=now()
 if 'timer' in locals():s['live_lock_seconds']=time.monotonic()-timer;s['live_lock_released_at']=now()
 save('publication-state.json',s)
 (D/'queue'/(str(time.time_ns())+'-manual.md')).write_text('#51原204311六事件文字策略数据发布返回：'+json.dumps(s,ensure_ascii=False)+'。核paper/materials/20261024-issue51-event-publication-ops/publication-state.json、publication.json及actual-live-consumers.json；只认实际阶段，不重发/重模型/full，原R440/115rk与各版本独立分母保持，六rk/正式经验消费者及科学父保留；固定生产工具与自然大脑采用/收益分账。\n')
print(json.dumps({k:v for k,v in s.items() if k!='behavior'},ensure_ascii=False))
