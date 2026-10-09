import pathlib,json,hashlib,re,importlib.util,subprocess,collections
p=pathlib.Path(__file__).parent;root=p.parents[2];old=json.load((p/'lessons-before.json').open());raw=(root/'notes/lessons.md').read_bytes();draft=(p/'draft-v3.md').read_bytes();assert hashlib.sha256(raw[:old['bytes']]).hexdigest()==old['sha256'];assert raw[old['bytes']:old['bytes']+len(draft)]==draft;assert len(re.findall(rb'^## NBJBVSBNPYQB',raw,re.M))==1
check=int((p/'ledger-check.exit').read_text());assert check==0
spec=importlib.util.spec_from_file_location('ledger',root/'learner/ledger.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);entries=m.fold(m.read_rows());updates=[json.loads(l) for l in (p/'ledger-update-input.jsonl').open()];ids=[u['id'] for u in updates]
for u in updates:
 e=entries[u['id']];assert e['character']=='silent' and 'NBJBVSBNPYQB' in e['where']['lessons'];assert any(v['run']=='NBJBVSBNPYQB' and v['role']==u['evidence'][0]['role'] and v.get('note')==u['evidence'][0]['note'] for v in e['evidence'])
proposals=[(p/'proposal-resource-chain.stdout').read_text().strip(),(p/'proposal-saturated-choice.stdout').read_text().strip()];records={}
with (root/'paper/materials/learning/code-proposals.jsonl').open() as h:
 for line in h:
  try:r=json.loads(line)
  except ValueError:continue
  if r.get('id') in proposals:
   if r.get('op')=='add':records[r['id']]=r
   elif r.get('op')=='update' and r['id'] in records:records[r['id']].update(r)
for ident in proposals:
 r=records[ident];assert r['character']=='silent' and r['runs']==['NBJBVSBNPYQB'] and r['target_task']=='strategy-proposal' and r['proposal_sha256']==hashlib.sha256(pathlib.Path(r['proposal']).read_bytes()).hexdigest();assert not r.get('implemented_commit')
unknown='完整dirty运行树；缺帧末伤及毒性爆发内部拆分；boss时钟所需／估计与比值；护栏反事实实际代价；F39最大HP下降直接来源；替代出牌／留药／构筑完整配对；日志前耗时及实付费用'
report='''## 复盘回报
- 已追加：NBJBVSBNPYQB（A10，第49层，女王 QUEEN／火炬头聚合体 TORCH_HEAD_AMALGAM；末次T3以6血15挡对36攻击阵亡，完整需损21、存活至少差16血）
- 新的纯 bug（file:line，每条一行；没有写「无」）：
  - 无
- 写成「未记录」的项：NBJBVSBNPYQB：'''+unknown+'''
- 学习账本：NBJBVSBNPYQB：新增 无；更新 '''+'、'.join(ids)+'''（老错 silent-0079）；`ledger.py check` 退出码 0
- 代码提案（证据/账本/CLI id/实现任务，证据不足明确写限制）：NBJBVSBNPYQB F48T1—T6→F49T1资源链，关联silent-0228及机制账本，CLI '''+proposals[0]+'''；F49T1同盘5血换17伤、T2—T3减益和格挡，关联silent-0079／0069及机制账本，CLI '''+proposals[1]+'''。两项均交独立strategy-proposal，缺完整固定配对，保留现行规则；本任务未实现、未上线。
'''
result={'task':'postmortem','appended':['NBJBVSBNPYQB'],'skipped':[],'bugs':[],'ledger':{'added':[],'updated':ids,'repeats':['silent-0079'],'check':0},'code_proposals':proposals,'implementation_domains':['combat','potion','sl','terminal'],'report':str((p/'report.md').resolve())}
(p/'report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');(p/'report.md').write_text(report+'\n```json\n'+json.dumps(result,ensure_ascii=False)+'\n```\n');audit={'prefix_preserved':True,'section_equals_draft_v3':True,'title_count':1,'appended_bytes':len(draft),'source_checks':json.load((p/'verification-before.json').open())['count'],'ledger_updates':ids,'repeat_ids':['silent-0079'],'check':check,'proposal_sha_valid':True,'unknowns':unknown};(p/'verification-after.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n')
code_paths=['agent/src/reflex/combat-plan.ts','agent/src/reflex/turn-solver.ts','agent/src/sl/explore.ts','agent/src/sim/boss-sim.ts','agent/src/reflex/potion-cost.ts'];identity={'live_head_at_final_check':subprocess.check_output(['git','-C',str(root/'.worktrees/live'),'rev-parse','HEAD'],text=True).strip(),'run_code':'10168ac71+dirty','source_hashes':{f:hashlib.sha256((root/'.worktrees/live'/f).read_bytes()).hexdigest() for f in code_paths}};(p/'source-identity.json').write_text(json.dumps(identity,ensure_ascii=False,indent=2)+'\n')
manifest={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in p.iterdir() if f.is_file() and f.name!='manifest-sha256.json'};(p/'manifest-sha256.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print(report);print(json.dumps(result,ensure_ascii=False));print('正文与旧前缀核验通过，13个账本条目与2个提案链接有效，源核验1852项。')
