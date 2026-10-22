"""Published game entry and project-owned machine protocol routing, no game calls."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest


class ProjectHeavy(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);self.root=Path(temp.name)
        import yaml
        self.config=yaml.safe_load((Path(__file__).parents[2]/'.agents/board.yaml').read_text())
        self.config['dispatcher']['install']='kit'
        self.path=self.root/'.agents/board.yaml';self.path.parent.mkdir()
        self.script=Path(__file__).parents[1]/'board_heavy.py'

    def start(self,role,*command):
        self.path.write_text(json.dumps(self.config))
        proc=subprocess.Popen([sys.executable,str(self.script),'--root',str(self.root),role,'--',*command],
                              cwd=self.root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
        stdout,stderr=proc.communicate(timeout=10)
        return proc,stdout,stderr

    def test_off_game_executes_original_command_in_place_without_kit_or_state(self):
        self.config['dispatcher']['heavy']['enabled']=False
        code='import os,json,sys;print(json.dumps([os.getpid(),sys.argv[1:]]))'
        proc,out,error=self.start('game',sys.executable,'-c',code,'fixed argument')
        self.assertEqual(proc.returncode,0,error)
        pid,args=json.loads(out);self.assertEqual(pid,proc.pid);self.assertEqual(args,['fixed argument'])
        self.assertFalse((self.root/'kit').exists());self.assertFalse((self.root/'machine').exists())

    def test_enabled_game_and_heavy_route_to_pinned_project_install_with_argv_intact(self):
        self.config['dispatcher']['heavy']['enabled']=True
        install=self.root/'kit';install.mkdir()
        (install/'heavy.py').write_text('import json,os,sys;print(json.dumps([os.getpid(),sys.argv[1:]]))')
        for role in ('game','ops'):
            proc,out,error=self.start(role,'fixed','two words')
            self.assertEqual(proc.returncode,0,error)
            pid,args=json.loads(out);self.assertEqual(pid,proc.pid)
            expected=(['game','--root',str(self.root)] if role=='game' else ['--root',str(self.root),'ops'])
            self.assertEqual(args,[*expected,'--','fixed','two words'])

    def test_enabled_missing_install_refuses_before_original_command(self):
        self.config['dispatcher']['heavy']['enabled']=True
        target=self.root/'called'
        proc,_,_=self.start('game',sys.executable,'-c','from pathlib import Path;Path("called").touch()')
        self.assertEqual(proc.returncode,1);self.assertFalse(target.exists())

    def test_empty_game_command_is_rejected_with_no_execution(self):
        self.config['dispatcher']['heavy']['enabled']=False
        proc,_,_=self.start('game');self.assertEqual(proc.returncode,1)


if __name__=='__main__':unittest.main()
