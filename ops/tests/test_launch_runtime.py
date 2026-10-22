import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).parents[1]))
import launch_runtime as launch


class LaunchPublication(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup)
        self.root=Path(temp.name);self.live=self.root/'.worktrees/live';ops=self.root/'ops';ops.mkdir()
        for source in Path(launch.__file__).parent.glob('*.py'):shutil.copyfile(source,ops/source.name)
        for source in Path(launch.__file__).parent.glob('*.sh'):shutil.copyfile(source,ops/source.name)
        (self.root/'.gitignore').write_text('.worktrees/\nops/codex-ops/\nops/ablation-progress.json\nlogs/\n')
        header=(ops/'run.sh').read_text().split('mod_url=')[0]
        self.header=header
        self.write_release('exec','v1')
        (self.root/'agent').mkdir()
        (self.root/'agent/.keep').write_text('fixed\n')
        self.git(self.root,'init','-q','-b','main');self.commit()
        self.git(self.root,'worktree','add','--quiet','--detach',str(self.live),'HEAD')

    def git(self,path,*args):
        return subprocess.check_output(['git','-C',str(path),*args],stderr=subprocess.DEVNULL).decode().strip()

    def commit(self):
        self.git(self.root,'add','ops','.gitignore','agent')
        self.git(self.root,'-c','commit.gpgsign=false','commit','-qm','fixed launch fixture')
        return self.git(self.root,'rev-parse','HEAD')

    def write_release(self,mode,marker):
        ops=self.root/'ops'
        body=self.header.replace('BRAIN_CODEX_MODE=session',f'BRAIN_CODEX_MODE={mode}')
        body+='''printf '%s|%s|%s\\n' "$BRAIN_CODEX_MODE" "$BRAIN_CODEX_EFFORT" "$PUBLISHED_MARKER"
if [ "${FIXTURE_HOLD:-}" = 1 ]; then read -r _; printf '%s\\n' "$BRAIN_CODEX_MODE"; fi
'''
        (ops/'run.sh').write_text(body)
        (ops/'production-runtime.sh').write_text(f'export PUBLISHED_MARKER={marker}\n')
        (ops/'autoplay.sh').write_text(f'#!/bin/sh\nprintf "{marker}\\n"\n')
        (ops/'ablation.json').write_text(json.dumps(dict(arms=['code','jev'],i=20,total=20)))
        (ops/'launch-settings.json').write_text(json.dumps(dict(BRAIN_CODEX_EFFORT='high' if marker=='v1' else 'xhigh')))

    def pin(self):return launch.pin(self.root,self.live,self.git(self.live,'rev-parse','HEAD'))

    def invoke(self,kind='run'):
        script,env,_=launch.selection(self.root,self.live,kind)
        result=subprocess.run(['bash',str(script)],cwd=self.root,env=env,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr)
        return result.stdout.strip()

    def test_machine_game_helpers_are_published_critical_inputs(self):
        value=self.pin()
        for name in launch.MACHINE_LAUNCH:self.assertIn(name,value['critical'])
        helper=self.root/'ops/board_heavy.py';helper.write_text(helper.read_text()+'\n# Fixed new helper revision.\n')
        source=self.commit();self.assertEqual(self.invoke(),'exec|high|v1')
        self.git(self.live,'merge','--ff-only',source)
        with self.assertRaises(ValueError):launch.selection(self.root,self.live,'run')
        refreshed=self.pin();self.assertEqual(self.invoke(),'exec|high|v1')
        self.assertNotEqual(value['files']['ops/board_heavy.py'],refreshed['files']['ops/board_heavy.py'])

    def test_existing_v1_pin_can_upgrade_to_machine_game_input_manifest(self):
        value=self.pin()
        for name in launch.MACHINE_LAUNCH:value['critical'].pop(name)
        launch.atomic(launch.manifest_path(self.root),value)
        self.assertEqual(self.invoke(),'exec|high|v1')
        upgraded=self.pin()
        for name in launch.MACHINE_LAUNCH:self.assertIn(name,upgraded['critical'])
        self.assertEqual(self.invoke(),'exec|high|v1')

    def test_main_startup_and_policy_changes_wait_for_live_publication_and_pin(self):
        self.pin();self.assertEqual(self.invoke(),'exec|high|v1')
        self.write_release('session','v2');source=self.commit()
        self.assertEqual(self.invoke(),'exec|high|v1');self.assertEqual(self.invoke('autoplay'),'v1')
        self.git(self.live,'merge','--ff-only',source)
        with self.assertRaises(ValueError):launch.selection(self.root,self.live,'run')
        self.pin();self.assertEqual(self.invoke(),'session|xhigh|v2')
        self.assertEqual(self.invoke('autoplay'),'v2')

    def test_running_controller_keeps_admitted_parameters_after_publication(self):
        self.pin();script,env,_=launch.selection(self.root,self.live,'run');env['FIXTURE_HOLD']='1'
        child=subprocess.Popen(['bash',str(script)],cwd=self.root,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
        try:
            self.assertEqual(child.stdout.readline().strip(),'exec|high|v1')
            self.write_release('session','v2');source=self.commit();self.git(self.live,'merge','--ff-only',source);self.pin()
            child.stdin.write('\n');child.stdin.close()
            self.assertEqual(child.stdout.readline().strip(),'exec');self.assertEqual(child.wait(timeout=10),0)
            self.assertEqual(self.invoke(),'session|xhigh|v2')
        finally:
            if not child.stdin.closed:child.stdin.close()
            child.wait(timeout=10);child.stdout.close()

    def test_dirty_live_or_changed_bundle_is_retained(self):
        value=self.pin();(self.live/'ops/run.sh').write_text('echo unpublished\n')
        with self.assertRaises(subprocess.CalledProcessError):self.pin()
        (Path(value['bundle'])/'ops/run.sh').write_text('echo changed\n')
        with self.assertRaises(ValueError):launch.selection(self.root,self.live,'run')

    def test_shared_private_env_is_refused_without_reading_it(self):
        self.pin()
        (self.live/'agent').mkdir(exist_ok=True)
        (self.live/'agent/.env').symlink_to(self.root/'private-placeholder')
        with self.assertRaises(ValueError):self.pin()
        with self.assertRaises(ValueError):launch.selection(self.root,self.live)

    def test_main_environment_cannot_override_published_behavior(self):
        from unittest.mock import patch
        self.pin()
        with patch.dict(os.environ,{'BRAIN_CODEX_EFFORT':'main-override','V6_BUILD':'main-override','BRAIN_CODEX_HOME':'fixture-account'}):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual(env['BRAIN_CODEX_EFFORT'],'high');self.assertNotIn('V6_BUILD',env)
        self.assertEqual(env['BRAIN_CODEX_HOME'],'fixture-account')

    def test_parent_sim_and_ranking_policy_cannot_enter_pinned_launch(self):
        self.pin()
        injected={'SIM_ADAPTIVE':'off','SIM_FAILURE_EXIT':'off','SIM_FAILURE_RETRIES':'7',
            'S_BUILD_RANK':'on','S_READINESS':'on','S_COMBAT_RANK':'off'}
        with patch.dict(os.environ,injected,clear=True):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual({k:env[k] for k in injected if k in env},{})

    def test_sim_policy_can_be_published_explicitly(self):
        value={'SIM_ADAPTIVE':'shadow','SIM_FAILURE_EXIT':'on','SIM_FAILURE_RETRIES':'7'}
        self.assertEqual(launch.launch_settings({'ops/launch-settings.json':json.dumps(value).encode()}),value)

    def test_ranking_policy_can_be_published_explicitly(self):
        value={'S_BUILD_RANK':'shadow','S_READINESS':'on','S_COMBAT_RANK':'off'}
        self.assertEqual(launch.launch_settings({'ops/launch-settings.json':json.dumps(value).encode()}),value)

    def test_all_audited_parent_policy_is_removed(self):
        import launch_environment_audit as audit
        self.pin();rows=audit.inventory(Path(launch.__file__).parents[1])['variables']
        keys=[k for k,row in rows.items() if row['category'] in ('published-policy','generated-or-separately-authorized')]
        keys+=['BRAIN_ENGINE_CHOOSE_CARD','BRAIN_CODEX_MODEL_CHOOSE_CARD','BRAIN_DSH_MAX_CALLS']
        self.assertGreater(len(keys),150)
        injected=dict.fromkeys(keys,'unpublished-fixture-value')
        with patch.dict(os.environ,injected,clear=True):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual({k:env[k] for k in injected if k in env},{'BRAIN_CODEX_EFFORT':'high'})

    def test_token_budgets_and_timeout_are_nonsecret_publishable_policy(self):
        value={'BRAIN_CODEX_FIRST_TOKEN_MS':'3000','MAX_TOKENS':'600'}
        self.assertTrue(all(launch.behavior_key(k) and not launch.credential_key(k) for k in value))
        self.assertEqual(launch.launch_settings({'ops/launch-settings.json':json.dumps(value).encode()}),value)

    def test_fixed_bash_startup_sees_sim_policy_only_after_publication(self):
        path=self.root/'ops/run.sh'
        path.write_text(path.read_text()+'''printf 'SIM:%s|S:%s\\n' "${SIM_ADAPTIVE-unset}" "${S_BUILD_RANK-unset}"
''')
        source=self.commit();self.git(self.live,'merge','--ff-only',source);self.pin()
        parent={'HOME':str(self.root/'fixed-home'),'PATH':os.defpath,'SIM_ADAPTIVE':'off','S_BUILD_RANK':'on'}
        def invoke():
            with patch.dict(os.environ,parent,clear=True):script,env,_=launch.selection(self.root,self.live,'run')
            result=subprocess.run(['bash',str(script)],env=env,capture_output=True,text=True,timeout=10)
            self.assertEqual(result.returncode,0,result.stderr)
            return result.stdout.splitlines()[-1]
        self.assertEqual(invoke(),'SIM:unset|S:unset')
        (self.root/'ops/launch-settings.json').write_text(json.dumps({'SIM_ADAPTIVE':'shadow','S_BUILD_RANK':'shadow'}))
        source=self.commit();self.assertEqual(invoke(),'SIM:unset|S:unset')
        self.git(self.live,'merge','--ff-only',source);self.pin()
        self.assertEqual(invoke(),'SIM:shadow|S:shadow')

    def test_sim_and_other_policy_wait_for_live_publication(self):
        self.pin()
        policy={'SIM_ADAPTIVE':'shadow','SIM_FAILURE_EXIT':'off','SIM_FAILURE_RETRIES':'7',
            'S_BUILD_RANK':'on','S_READINESS':'on','S_COMBAT_RANK':'off',
            'GLOBAL_BUILD_EVAL':'off','COMBAT_PLANNER':'turn','MAX_TOKENS':'600',
            'BRAIN_CODEX_FIRST_TOKEN_MS':'3000','MECH_RULES':'off','GAME_DATA_DIR':'fixed-live-data'}
        (self.root/'ops/launch-settings.json').write_text(json.dumps(policy));source=self.commit()
        with patch.dict(os.environ,dict.fromkeys(policy,'unpublished-parent'),clear=True):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual({k:env[k] for k in policy if k in env},{})
        self.git(self.live,'merge','--ff-only',source)
        with self.assertRaises(ValueError):launch.selection(self.root,self.live,'run')
        self.pin()
        with patch.dict(os.environ,dict.fromkeys(policy,'unpublished-parent'),clear=True):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual({k:env[k] for k in policy},policy)

    def test_credentials_accounts_and_runtime_binding_keep_the_original_boundary(self):
        self.pin()
        preserved={'BRAIN_CODEX_HOME':'fixed-account','CODEX_HOME':'fixed-account',
            'CLAUDE_CONFIG_DIR':'fixed-account','JEV_SHARED_ENV_FILE':'fixed-provider-reference',
            'TYPESAFE_API_KEY_FILE':'fixed-key-reference','DEEPSEEK_API_KEY_FILE':'fixed-key-reference',
            'STS2_BASE_URL':'http://127.0.0.1:41000','STS2_EXPECTED_PROCESS_ID':'42',
            'STS2_EXPECTED_NATIVE_PROFILE_ID':'1','AUTOPLAY_READY':'fixed-ready','WAIT_PID':'123',
            'HOME':'fixed-home','PATH':os.defpath}
        with patch.dict(os.environ,preserved,clear=True):
            _,env,_=launch.selection(self.root,self.live,'run')
        self.assertEqual({k:env[k] for k in preserved},preserved)
        for key in (*preserved,*launch.UNPUBLISHABLE):
            with self.subTest(key=key),self.assertRaises(ValueError):
                launch.launch_settings({'ops/launch-settings.json':json.dumps({key:'fixed-value'}).encode()})

    def test_reload_selects_published_script_and_retains_previous_known_identity(self):
        first=self.pin()
        self.write_release('session','v2');source=self.commit();self.git(self.live,'merge','--ff-only',source);second=self.pin()
        spec=importlib.util.spec_from_file_location('launch_reload',Path(launch.__file__).with_name('autoplay-reload.py'))
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        runtime=module.Runtime(self.root,self.live,self.root/'ops/codex-ops')
        self.assertEqual(runtime.script,Path(second['bundle'])/'ops/autoplay.sh')
        self.assertIn(Path(first['bundle'])/'ops/autoplay.sh',runtime.allowed_scripts)
        for directory in (self.root/'ops',Path(first['bundle'])/'ops',Path(second['bundle'])/'ops'):
            row=dict(state='S',cwd=str(self.root),argv=('python3',str(directory/'report.py')))
            self.assertEqual(runtime.kind(row),'report')
        row=dict(state='S',cwd=str(self.root),argv=('python3',str(self.root/'foreign/report.py')))
        self.assertIsNone(runtime.kind(row))

    def test_missing_critical_publication_metadata_is_not_an_empty_success(self):
        value=self.pin();value['critical']={};launch.manifest_path(self.root).write_text(json.dumps(value))
        with self.assertRaises(ValueError):launch.selection(self.root,self.live)

    def test_cli_runs_published_header_and_rejects_behavior_arguments(self):
        self.pin()
        argv=[sys.executable,launch.__file__,'exec','--root',str(self.root),'--live',str(self.live),'--kind','run']
        result=subprocess.run(argv,capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(result.stdout.strip(),'exec|high|v1')
        result=subprocess.run([*argv,'--','--max-minutes','0'],capture_output=True,text=True,timeout=10)
        self.assertEqual(result.returncode,78);self.assertEqual(result.stdout,'')

    def test_bundle_mode_is_part_of_publication_identity(self):
        value=self.pin();path=Path(value['bundle'])/'ops/run.sh'
        self.assertEqual(path.stat().st_mode&0o777,value['modes']['ops/run.sh'])
        path.chmod((path.stat().st_mode&0o777)^0o100)
        with self.assertRaises(ValueError):launch.selection(self.root,self.live)

    def test_published_ablation_policy_and_runtime_cursor_are_separate(self):
        import ast
        from unittest.mock import patch
        (self.root/'ops/ablation.json').write_text(json.dumps(dict(arms=['code','jev'],i=0,total=2)))
        source=self.commit();self.git(self.live,'merge','--ff-only',source);value=self.pin()
        text=Path(launch.__file__).with_name('run.sh').read_text()
        fragment=text[text.index('arm=$(python3'):text.index('extra=()')]
        env={**os.environ,'OPS':str(Path(value['bundle'])/'ops'),'ROOT':str(self.root),'STS2_LAUNCH_BUNDLE':value['bundle']}
        def arm():return subprocess.run(['bash','-c',fragment+"printf '%s' \"$arm\""],env=env,capture_output=True,text=True,timeout=5)
        first=arm();self.assertEqual((first.returncode,first.stdout),(0,'code'))
        tree=ast.parse(Path(launch.__file__).with_name('report.py').read_text())
        fun=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='ablation_arm')
        namespace=dict(ROOT=str(self.root),os=os,json=json)
        exec(compile(ast.Module(body=[fun],type_ignores=[]),'<fixed ablation>','exec'),namespace)
        with patch.dict(os.environ,{'STS2_LAUNCH_BUNDLE':value['bundle']}):self.assertEqual(namespace['ablation_arm'](),{'arm':'code'})
        (self.root/'ops/ablation.json').write_text(json.dumps(dict(arms=['unpublished'],i=99,total=100)))
        second=arm();self.assertEqual((second.returncode,second.stdout),(0,'jev'))
        (self.root/'ops/ablation-progress.json').write_text('{}')
        self.assertEqual(arm().returncode,78)


if __name__=='__main__':unittest.main()
