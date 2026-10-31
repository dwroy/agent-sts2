from pathlib import Path
import json,hashlib,subprocess
R=Path.cwd();A=R/'.artifacts/ops-issue50-resume-1834-20261024';M=R/'paper/materials/20261024-issue50-resume-1834-ops'
now=subprocess.check_output(['date','-Is'],text=True).strip()
def save(n,d): (M/n).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
def ref(p):
 p=R/p;b=p.read_bytes();return {'path':str(p.relative_to(R)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
n=json.loads((M/'natural-plan-readback.json').read_text());sl=json.loads((M/'SL-readback.json').read_text());groups=[]
for g in n['groups']:
 qs=g['question_rows'];ch=[(i,q) for i,q in enumerate(qs) if q['checkpoint_requested']]
 assert g['questions']==g['accepted_and_logged'] and not g['anomalies']
 follow=[q['question_id'] for i,q in ch if i+1<len(qs) and qs[i+1]['prior_plan_matches_last_accepted'] is True]
 groups.append({'run':g['run'],'questions':len(qs),'accepted_logged':g['accepted_and_logged'],'nonempty_previous_plan_questions':sum(q['prior_plan_nonempty'] for q in qs),'next_question_matches':g['next_question_matches'],'checkpoint_requests_answered_logged':len(ch),'checkpoints_with_following_construction_question':len(follow),'checkpoint_following_ids':follow,'final_checkpoint_no_following_question':ch[-1][1]['question_id'],'reached_floor':g['canonical_end']['floor'],'victory':g['canonical_end']['victory'],'F48_F49_construction_questions':g['F48_questions']+g['F49_questions'],'agent_question_prefix':g['question_prefixes']})
unique=sorted({(x['run'],x['next_question']) for x in sl['rows'] if x['reload_ok'] and x['next_question_readback_verified']})
learning=[]
for base,run,lesson in [('learner/runs/20261024-131308-9f3949d1-8714-42c3-a37c-af5229e5d9e9-postmortem','BP9C8K9NSRZ0','BP9C8K9NSRZ0-lesson.md'),('learner/runs/20261024-164319-824e21ec-27a8-4473-98cd-03d4077a0d50-postmortem','P4ZBYNW92PPK','P4ZBYNW92PPK-lesson-draft.md')]:
 p=R/base/'whole-run-summary.json';d=json.loads(p.read_bytes());found=[]
 def walk(x,path=''):
  if isinstance(x,dict):
   for k,v in x.items():
    if k=='endgame' and isinstance(v,dict):found.append({'pointer':path+'/'+k,'sha256':hashlib.sha256(json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()})
    walk(v,path+'/'+k)
  elif isinstance(x,list):
   for i,v in enumerate(x):walk(v,path+'/'+str(i))
 walk(d)
 lp=R/base/lesson;lines=lp.read_text().splitlines();excerpt=[{'line':i+1,'text':s} for i,s in enumerate(lines) if '#50' in s or '**计划**' in s][:3]
 learning.append({'run':run,'summary':ref(str(p.relative_to(R))),'endgame_objects_in_whole_batch_summary':len(found),'first_pointers':found[:6],'lesson':ref(str(lp.relative_to(R))),'excerpts':excerpt,'meaning':'Existing learner artifacts explicitly consume the plan/checkpoint fields. Batch object count is not an independent-run denominator. This does not prove a formal double-boss threshold entry or its publication.'})
save('learning-consumption.json',{'at':now,'observed':learning,'third_run_4CR_learning_consumption':'not established in this bounded check','formal_threshold_publication':'pending; generic playbook candidates/reused IDs do not satisfy issue50 threshold acceptance','new_learning_dispatches':0})
save('verification.json',{'at':now,'issue':50,'groups':groups,'totals':{'independent_selected_runs':3,'questions_accepted_logged':sum(x['questions'] for x in groups),'next_question_matches':sum(x['next_question_matches'] for x in groups),'checkpoint_requests_answered_logged':18,'checkpoints_with_following_construction_question':15,'last_F47_checkpoints_no_following_question':3,'reached_F48':3,'reached_F49':1,'victories':0,'room_reload_records':sum(x['reload_ok'] is True for x in sl['rows']),'distinct_following_question_windows_after_reload':len(unique),'distinct_reload_question_windows':unique},'original_W546':'20/19 and two act1 checkpoints remain separate; original first-five subset not added','scope_limitations':['Selected late-floor runs, not an unbiased cohort or win-rate denominator.','All three run-config code commits remain null with original ENOBUFS; code ancestor evidence is separately correlated console filename/time/run marker plus config/question PID, not a repaired native commit stamp.','Logged/native receipts are high or missing in these historic runs; not an xhigh acceptance claim.','Same-process same-room SL is distinct from cold restart and lower-floor rollback. The three BP9 F24 reload attempts map to one following construction question.','No construction question at F48/F49; last plan/checkpoint at F47.','No native restart:true row or floor rollback in the bounded selected inventory.','No thresholds, safety HP, causal performance claim, source/knowledge changes, new full/model/game, or scientific-parent closure.'],'artifacts':{p.name:ref(str(p.relative_to(R))) for p in M.iterdir() if p.is_file() and p.name not in ['verification.json','record-commit.json']},'scripts':{p.name:ref(str(p.relative_to(R))) for p in A.iterdir() if p.suffix in ['.py','.mts']},'remaining':['Formal learner-derived mixed external/own double-boss threshold entry with provenance and actual live/tool readback.','Natural cold agent restart and lower-floor rollback readback.','Natural adoption and benefit remain independent.']})
print(json.dumps({'at':now,'groups':groups,'distinct_reload_windows':unique,'learning_endgame_objects':[x['endgame_objects_in_whole_batch_summary'] for x in learning]},ensure_ascii=False))
