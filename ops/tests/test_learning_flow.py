"""Fixed learner workflow fixtures. Never launch engines, play or touch project state."""
import copy
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
RUN = 'SILENT000001'


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, REPO / path)
    module = importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module


audits = load('audits','ops/ascension_audit.py')
proposals = load('proposals','learner/code_proposals.py')
dispatch = load('dispatch','ops/proposal_dispatch.py')
checks = load('checks','ops/learner_checks.py')
jobs = load('flow_jobs','ops/learner_jobs.py')


class Fixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.scripts = str(REPO/'ops')

    def write(self, relative, value):
        path=self.root/relative;path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(value);return path


class ClimbAudits(Fixture):
    def setUp(self):
        super().setUp();self.state={'batches':{}}
        self.events=[];self.notices=[];self.saved=[];self.started=[]
        self.finished=[{'run_id':RUN,'character':'SILENT','ascension':10}]
        self.addCleanup(patch.stopall)
        patch.dict(os.environ,{'CODEX_OPS_DIR':str(self.root/'state')}).start()

    def observe(self, levels, character='silent'):
        configs=[{'character':'silent','target_ascension_mode':'climb','target_ascension':level,
                  'run_id':RUN,'ts':str(i)} for i,level in enumerate(levels)]
        return audits.observe(self.state,configs,character,lambda r:r['character'],lambda r:r['target_ascension'])

    def start(self,argv,*args):
        self.started.append(argv);return 101,None

    def launch(self,stamp='first',alive=lambda pid:False,available=lambda tree:True):
        return audits.dispatch(self.state,str(self.root),self.scripts,'silent',self.finished,alive,
                stamp,self.start,available,persist=lambda s:self.saved.append(copy.deepcopy(s)),notice=self.notices.append)

    def test_install_baseline_and_every_later_observed_climb_are_deduplicated(self):
        self.assertEqual(self.observe([0,1,9,10]),['silent:A10'])
        self.assertEqual(self.state['ascension_audits']['silent:A10']['previous'],9)
        self.assertEqual(self.observe([0,1,9,10]),[])
        self.assertEqual(self.observe([0,1,9,10,11,12]),['silent:A11','silent:A12'])
        self.assertEqual(self.observe([13],character='ironclad'),[])

    def test_fixed_mode_and_unobserved_intermediate_levels_never_create_rules(self):
        self.observe([9]);self.observe([12])
        self.assertNotIn('silent:A10',self.state['ascension_audits'])
        self.assertNotIn('silent:A11',self.state['ascension_audits'])
        self.assertEqual(audits.observe(self.state,[{'target_ascension_mode':'fixed','level':20}],
                         'silent',lambda r:'silent',lambda r:r['level']),[])

    def test_waits_for_completed_own_level_evidence_then_persists_before_start(self):
        self.observe([9,10]);self.finished=[]
        self.assertIsNone(self.launch())
        self.finished=[{'run_id':RUN,'character':'IRONCLAD','ascension':10}]
        self.assertIsNone(self.launch())
        self.finished=[{'run_id':RUN,'character':'SILENT','ascension':9}]
        self.assertIsNone(self.launch())
        self.finished[0]['ascension']=10
        self.assertEqual(self.launch(),('first-ascension-audit',101))
        self.assertEqual(self.saved[0]['batches']['first-ascension-audit']['state'],'launching')
        self.assertEqual(self.started[0][-3:],['ascension-audit','10','9'])
        self.assertEqual(self.started[0][6],str(self.root/'.worktrees/ascension-audit-silent-a10-1'))
        self.assertIsNone(self.launch('dedup',alive=lambda pid:True))

    def test_dirty_existing_audit_tree_refuses_without_using_normal_writer(self):
        self.observe([9,10]);(self.root/'.worktrees/ascension-audit-silent-a10-1').mkdir(parents=True)
        self.assertIsNone(self.launch(available=lambda tree:False))
        self.assertEqual(self.started,[])
        self.assertEqual(self.state['ascension_audits']['silent:A10']['attempts'],0)

    def test_lease_survives_lost_pid_and_retry_uses_a_new_tree(self):
        self.observe([9,10]);self.launch()
        path=self.root/'state/learner/ascension-audit-silent-a10.lock'
        with path.open('a') as lease:
            fcntl.flock(lease,fcntl.LOCK_EX|fcntl.LOCK_NB)
            self.assertIsNone(self.launch('held'))
            self.assertEqual(self.state['batches']['first-ascension-audit']['state'],'running')
        self.assertIsNone(self.launch('lost'))
        self.assertEqual(self.state['batches']['first-ascension-audit']['state'],'lost')
        self.state['ascension_audits']['silent:A10']['retry_at']=0
        self.assertEqual(self.launch('retry'),('retry-ascension-audit',101))
        self.assertTrue(self.started[-1][6].endswith('a10-2'))
        self.assertIn('first-ascension-audit',self.state['batches'])

    def test_launch_failure_is_persisted_and_three_attempts_are_exhausted(self):
        self.observe([9,10])
        def fail(*args): raise OSError('fixed launch failure')
        self.start=fail
        self.assertIsNone(self.launch())
        request=self.state['ascension_audits']['silent:A10']
        self.assertEqual(request['state'],'failed')
        self.assertEqual(self.saved[-1]['ascension_audits']['silent:A10']['last_failure'],'fixed launch failure')
        request.update(attempts=3,retry_at=0)
        self.assertIsNone(self.launch('exhausted'))
        self.assertEqual(request['state'],'exhausted');self.assertEqual(len(self.notices),1)
        self.launch('again');self.assertEqual(len(self.notices),1)

    def report(self, **updates):
        path=Path(self.state['batches']['first-ascension-audit']['worktree'])/'learner/runs/audit/report.md'
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text('Fixed learner audit; unknown fields listed.')
        report={'task':'ascension-audit','character':'silent','level':10,'runs':[RUN],'complete':True,
                'coverage':['floors','combat_counts','healing','campfires','rules','assumptions'],
                'report':str(path),'code_proposals':[],'implementation_domains':[]}
        report.update(updates)
        self.write('state/learner/first-ascension-audit.out','```json\n'+json.dumps(report)+'\n```\n')

    def finish(self, checker=lambda r,b:[]):
        audits.finish(self.state,'first-ascension-audit',0,str(self.root),str(self.root/'state/learner'),
                lambda kind,msg:self.events.append(kind),self.notices.append,proposal_check=checker)

    def test_valid_read_only_audit_has_preserved_report_no_merge_or_version(self):
        self.observe([9,10]);self.launch();self.report();self.finish()
        request=self.state['ascension_audits']['silent:A10']
        self.assertEqual(request['state'],'done');self.assertEqual(len(request['report_sha256']),64)
        self.assertNotIn('merged',request);self.assertEqual(self.events,['ascension-audit-done'])
        self.finish();self.assertEqual(len(self.events),1)

    def test_incomplete_or_foreign_report_and_proposal_failure_retry(self):
        for update in ({'coverage':['floors']},{'runs':['OTHER0000001']},{'character':'ironclad'},
                       {'coverage':None},{'runs':[{}]}):
            self.state={'batches':{}};self.observe([9,10]);self.launch();self.report(**update);self.finish()
            self.assertEqual(self.state['ascension_audits']['silent:A10']['state'],'failed')
        self.state={'batches':{}};self.observe([9,10]);self.launch();self.report()
        self.finish(lambda r,b:['missing code proposal'])
        self.assertIn('missing code proposal',self.state['batches']['first-ascension-audit']['errors'])

    def test_late_finish_keeps_current_retry_lease(self):
        self.observe([9,10]);self.launch();self.report()
        request=self.state['ascension_audits']['silent:A10'];request['batch']='newer'
        self.finish();self.assertEqual(request['batch'],'newer')
        self.assertEqual(self.state['batches']['first-ascension-audit']['state'],'late-finish')


class CodeProposals(Fixture):
    def setUp(self):
        super().setUp()
        self.markdown=self.write('learner/runs/task/proposal.md','Fixed learner claim with observed evidence.')
        self.ledger={'silent-0001':{'character':'silent','evidence':[{'run':RUN}]}}
        self.runs={RUN:{'run_id':RUN,'character':'SILENT'}}
        self.item={'character':'silent','source_task':'experience-update','target_task':'strategy-proposal',
                   'domains':['combat'],'summary':'Observed fixed proposal','ledger':['silent-0001'],
                   'runs':[RUN],'proposal':str(self.markdown),'experience':['entry-1']}

    def test_requires_own_role_ledger_and_preserved_proposal_and_rule_authorization(self):
        self.assertEqual(proposals.validate(self.item,self.root,self.ledger,self.runs),self.markdown)
        cases=[{'character':'ironclad'},{'runs':['OTHER0000001']},{'ledger':['silent-9999']},
               {'proposal':'/tmp/unpreserved.md'},{'rule_changes':True},{'source_task':'ops'},
               {'domains':['future-rule']},{'arbitrary':True}]
        for update in cases:
            with self.subTest(update=update),self.assertRaises(ValueError):
                proposals.validate({**self.item,**update},self.root,self.ledger,self.runs)
        proposals.validate({**self.item,'rule_changes':True,'authorization':proposals.POLICY},self.root,self.ledger,self.runs)

    def test_changed_combat_experience_cannot_ship_only_prose(self):
        entry={'id':'entry-1','scope':'boss:OBSERVED','lesson':'Observed combat lesson','status':'active','evidence':[RUN]}
        after={'entries':[entry]}
        self.assertEqual(proposals.audit_experience({'entries':[]},after,{},'silent'),['entry-1'])
        self.assertEqual(proposals.audit_experience({'entries':[]},after,{'p':self.item},'silent'),[])
        self.assertEqual(proposals.audit_experience(after,after,{},'silent'),[])
        self.assertEqual(proposals.audit_experience({'entries':[]},after,{'p':{**self.item,'character':'ironclad'}},'silent'),['entry-1'])
        self.assertEqual(proposals.audit_experience({'entries':[]},after,{'p':{**self.item,'experience':['wrong']}},'silent'),['entry-1'])
        retired={'entries':[{**entry,'status':'retired'}]}
        self.assertEqual(proposals.audit_experience(after,retired,{},'silent'),[])

    def test_report_requires_typed_domains_and_own_proposal_links(self):
        valid={'code_proposals':['p'],'implementation_domains':['combat']}
        self.assertEqual(proposals.report_links(valid,{'p':self.item},'silent'),[])
        for report in ({},{'code_proposals':[],'implementation_domains':['sl']},
                       {'code_proposals':[{}],'implementation_domains':[]},
                       {'code_proposals':['p'],'implementation_domains':['unobserved']},
                       {'code_proposals':['foreign'],'implementation_domains':[]}):
            self.assertTrue(proposals.report_links(report,{'p':self.item},'silent'))

    def test_queue_is_append_only_and_truncated_tail_never_invents_success(self):
        path=self.root/proposals.QUEUE
        proposals.append(path,{'op':'add','id':'p',**self.item,'state':'pending'})
        proposals.append(path,{'op':'update','id':'p','state':'waiting'})
        with path.open('a') as handle:handle.write('{"op":"update","id":"p","state":"implemented"}')
        self.assertEqual(proposals.fold(path)['p']['state'],'waiting')
        original = path.read_bytes()
        proposals.append(path,{'op':'update','id':'p','reason':'retry preserved'})
        self.assertTrue(path.read_bytes().startswith(original))
        self.assertEqual(proposals.fold(path)['p']['state'],'waiting')
        self.assertEqual(proposals.fold(path)['p']['reason'],'retry preserved')

    def test_cli_deduplicates_and_links_actual_ledger_via_cli(self):
        entry={'op':'add','id':'silent-0001','ts':'2026-10-07T00:00:00+08:00','character':'silent',
               'kind':'fight','claim':'Fixed evidence','evidence':[{'run':RUN}], 'first_run':RUN,
               'prior':'unknown','status':'observed','by':'learner:postmortem','asc':10}
        self.write('paper/materials/learning/ledger.jsonl',json.dumps(entry)+'\n')
        self.write('logs/runs.jsonl',json.dumps(self.runs[RUN])+'\n')
        argv=[sys.executable,str(REPO/'learner/code_proposals.py'),'add','--root',str(self.root),'--character','silent']
        first=subprocess.run(argv,input=json.dumps(self.item),capture_output=True,text=True)
        self.assertEqual(first.returncode,0,first.stderr)
        second=subprocess.run(argv,input=json.dumps(self.item),capture_output=True,text=True)
        self.assertEqual(second.returncode,0,second.stderr)
        self.assertEqual(first.stdout,second.stdout)
        rows=(self.root/proposals.QUEUE).read_text().splitlines()
        self.assertEqual(len(rows),1)
        ledger=(self.root/'paper/materials/learning/ledger.jsonl').read_text()
        self.assertIn(first.stdout.strip(),ledger);self.assertIn('task=strategy-proposal',ledger)


class ProposalConsumption(Fixture):
    def setUp(self):
        super().setUp();self.state={'batches':{}};self.calls=[]
        self.write('logs/runs.jsonl',json.dumps({'run_id':RUN,'character':'SILENT'})+'\n')
        self.queue=self.root/proposals.QUEUE
        proposals.append(self.queue,{'op':'add','id':'p','character':'silent','target_task':'strategy-proposal',
                                    'runs':[RUN],'state':'pending'})

    def launch(self,stamp='first',alive=lambda pid:False):
        def start(state,root,scripts,task,character,runs,key,reason,alive,stamp):
            self.calls.append((task,runs,key))
            ident=stamp+'-strategy-proposal';state['batches'][ident]={'task':task,'state':'running','pid':10,'key':key}
            return ident,10
        return dispatch.dispatch(self.state,str(self.root),self.scripts,'silent',alive,stamp,start)

    def test_pending_proposal_is_not_starved_by_a_continuously_open_bug_queue(self):
        called=[]
        def start(state,root,scripts,task,character,runs,key,reason,alive,stamp):
            if called: return None
            called.append(task)
            ident=stamp+'-'+task;state['batches'][ident]={'task':task,'state':'running','pid':10,'key':key}
            return ident,10
        with patch.object(jobs,'pending',return_value=[]),patch.object(jobs,'fix_key',return_value='ongoing-bugs'),\
             patch.object(jobs,'strategy_job',return_value=None),patch.object(jobs,'calibration_job',return_value=None),\
             patch.object(jobs,'dispatch_write',side_effect=start):
            result=jobs.check_jobs(self.state,str(self.root),self.scripts,'silent',lambda pid:True,'first')
        self.assertEqual(called,['strategy-proposal'])
        self.assertEqual(result['code_proposal'],('first-strategy-proposal',10))
        self.assertIsNone(result['fixes'])

    def test_pending_proposals_dispatch_once_and_keep_dead_attempt_logs(self):
        self.assertEqual(self.launch(),('first-strategy-proposal',10))
        self.assertEqual(self.state['batches']['first-strategy-proposal']['proposal_ids'],['p'])
        self.assertIsNone(self.launch('busy',alive=lambda pid:True))
        self.launch('lost')
        self.assertEqual(self.state['batches']['first-strategy-proposal']['state'],'lost')

    def test_waiting_proposal_only_retries_after_new_own_character_run(self):
        proposals.append(self.queue,{'op':'update','id':'p','state':'waiting','seen_runs':1})
        self.assertIsNone(self.launch())
        with (self.root/'logs/runs.jsonl').open('a') as handle:handle.write(json.dumps({'run_id':'OTHER0000001','character':'IRONCLAD'})+'\n')
        self.assertIsNone(self.launch())
        with (self.root/'logs/runs.jsonl').open('a') as handle:handle.write(json.dumps({'run_id':'SILENT000002','character':'SILENT'})+'\n')
        self.assertIsNotNone(self.launch())

    def test_repair_is_persistent_and_does_not_require_another_postmortem(self):
        self.state['proposal_repairs']={'old':{'character':'silent','state':'pending','runs':[RUN]}}
        self.launch();batch=self.state['batches']['first-strategy-proposal']
        self.assertEqual(batch['proposal_repair'],'old');self.assertNotIn('proposal_ids',batch)
        batch['state']='done';self.launch('after')
        self.assertEqual(self.state['proposal_repairs']['old']['state'],'done')

    def git_fixture(self):
        live=self.root/'.worktrees/live';live.mkdir(parents=True)
        def git(*args):
            return subprocess.check_output(['git','-C',str(live),*args],stderr=subprocess.DEVNULL,text=True).strip()
        git('init','-q');(live/'fixed.txt').write_text('fixed baseline')
        git('add','fixed.txt');git('commit','-q','-m','Fixed workflow fixture')
        return live,git('rev-parse','HEAD')

    def test_no_change_requires_clean_actual_base_report_and_all_dispositions(self):
        live,base=self.git_fixture();path=self.write('learner/runs/task/report.md','No source change; evidence insufficient.')
        batch={'task':'strategy-proposal','character':'silent','worktree':str(live),'proposal_ids':['p']}
        report={'base':base,'fixes':[],'merged':None,'report':str(path),
                'proposal_results':[{'id':'p','state':'waiting','reason':'needs independent runs'}]}
        self.assertIsNotNone(dispatch.no_change(report,batch,str(self.root)))
        self.assertIsNone(dispatch.no_change({**report,'proposal_results':[]},batch,str(self.root)))
        (live/'dirty.txt').write_text('edits preserved')
        self.assertIsNone(dispatch.no_change(report,batch,str(self.root)))

    def test_resolution_verifies_all_live_sources_before_writing_any_success(self):
        live,base=self.git_fixture();batch={'character':'silent','proposal_ids':['p','q']}
        original=self.queue.read_bytes()
        rows=[{'id':'p','state':'duplicate','reason':'actual prior implementation','commit':base},
              {'id':'q','state':'implemented','reason':'unmerged source','commit':'f'*40}]
        with self.assertRaises(ValueError):dispatch.resolve({'proposal_results':rows},batch,str(self.root),self.scripts)
        self.assertEqual(self.queue.read_bytes(),original)
        rows[1]={'id':'q','state':'waiting','reason':'missing resource counterfactual'}
        dispatch.resolve({'proposal_results':rows},batch,str(self.root),self.scripts)
        self.assertEqual(proposals.fold(self.queue)['p']['state'],'duplicate')

    def test_legacy_batch_grandfathered_new_batch_enforces_links(self):
        self.assertEqual(dispatch.links({}, {'character':'silent'},str(self.root),self.scripts),[])
        self.assertTrue(dispatch.links({}, {'character':'silent','proposal_policy':proposals.POLICY},str(self.root),self.scripts))

    def test_finish_records_waiting_without_fake_merge_or_full_checks(self):
        live,base=self.git_fixture();path=self.write('learner/runs/task/report.md','Observed evidence incomplete; keep original rules.')
        report={'task':'strategy-proposal','base':base,'fixes':[],'merged':None,'report':str(path),
                'code_proposals':['p'],'implementation_domains':['combat'],
                'proposal_results':[{'id':'p','state':'waiting','reason':'requires new independent runs'}]}
        batch={'task':'strategy-proposal','character':'silent','worktree':str(live),'proposal_ids':['p'],
               'proposal_policy':proposals.POLICY}
        out=self.write('state/learner/fixed.out','```json\n'+json.dumps(report)+'\n```\n')
        notices=[];events=[]
        checks.finish_write_batch('fixed',batch,0,str(self.root),str(out.parent),
                lambda kind,msg:events.append(msg),notices.append,run_checks=True)
        self.assertEqual(batch['state'],'done');self.assertIsNone(batch['merged'])
        self.assertIn('no_change_proposals',batch);self.assertNotIn('checks',batch)
        self.assertEqual(proposals.fold(self.queue)['p']['state'],'waiting')
        self.assertEqual(notices,[]);self.assertIn('不冒造合入',events[0])

    def test_finish_keeps_actual_merge_fact_but_fails_missing_proposal_links(self):
        live,base=self.git_fixture()
        report={'task':'strategy-proposal','merged':base}
        batch={'task':'strategy-proposal','character':'silent','worktree':str(live),'proposal_policy':proposals.POLICY}
        out=self.write('state/learner/fixed.out','```json\n'+json.dumps(report)+'\n```\n')
        notices=[]
        checks.finish_write_batch('fixed',batch,0,str(self.root),str(out.parent),lambda *args:None,
                notices.append,run_checks=False)
        self.assertEqual(batch['state'],'failed');self.assertEqual(batch['merged'],base)
        self.assertTrue(batch['proposal_repair_needed']);self.assertTrue(batch['checks_pending'])
        self.assertTrue(notices)

    def test_actual_experience_commit_is_audited_instead_of_report_claim(self):
        subprocess.check_call(['git','-C',str(self.root),'init','-q'])
        path=self.write('knowledge/characters/silent/experience.json',json.dumps({'entries':[]}))
        def commit(message):
            subprocess.check_call(['git','-C',str(self.root),'add',str(path)])
            subprocess.check_call(['git','-C',str(self.root),'commit','-q','-m',message])
            return subprocess.check_output(['git','-C',str(self.root),'rev-parse','HEAD'],text=True).strip()
        commit('Fixed baseline')
        entry={'id':'lesson','scope':'general:terminal','status':'active','lesson':'Observed terminal value','evidence':[RUN]}
        path.write_text(json.dumps({'entries':[entry]}));source=commit('Fixed new experience')
        batch={'task':'experience-update','character':'silent','proposal_policy':proposals.POLICY}
        self.assertEqual(dispatch.experience_audit({'commit':source,'code_proposals':['p']},batch,str(self.root),self.scripts),['lesson'])
        proposals.append(self.queue,{'op':'add','id':'lesson-proposal','character':'silent','experience':['lesson'],
                'source_task':'experience-update','target_task':'strategy-proposal','runs':[RUN],'ledger':['silent-0001']})
        self.assertEqual(dispatch.experience_audit({'commit':source},batch,str(self.root),self.scripts),[])


if __name__ == '__main__': unittest.main()
