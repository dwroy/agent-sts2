import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

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
