"""Replay 09:37 with the actual STS2 board template and an isolated second project."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--kit',required=True)
parser.add_argument('--config',required=True)
args=parser.parse_args()
kit=Path(args.kit).resolve();config_path=Path(args.config).resolve()
sys.path.insert(0,str(kit))
import board
from test_machine import Machine
try:
    import yaml
except ImportError:
    template=json.loads(config_path.read_text())
else:
    template=yaml.safe_load(config_path.read_text())


class STS2Replay(Machine):
    def setUp(self):
        super().setUp()
        # Retain the project template, changing only isolated test admission/probe paths.
        data=copy.deepcopy(template)
        data['dispatcher']['heavy'].update(enabled=True,machine_state=str(self.shared),probe=['fixed'])
        (self.root/'.agents/board.yaml').write_text(json.dumps(data))
        second=copy.deepcopy(data);second['repo']='fixture/second-project'
        second['roles']['dev']['agent_prefix']='fixture-issue-'
        (self.other/'.agents/board.yaml').write_text(json.dumps(second))
        self.a,self.b=board.Board(self.root),board.Board(self.other)


case='test_0937_two_project_replay_legacy36_exits_then_ops33_before_foreign_dev'
result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([STS2Replay(case)]))
print(json.dumps(dict(template_sha256=hashlib.sha256(config_path.read_bytes()).hexdigest(),
    kit_sources={name:hashlib.sha256((kit/name).read_bytes()).hexdigest()
                 for name in ('board.py','heavy.py','machine.py','watchdog.py')},
    projects=[template['repo'],'fixture/second-project'],scenario='legacy #36 -> ops #33 -> foreign dev #35',
    passed=result.wasSuccessful(),production_actions=False),indent=2))
raise SystemExit(not result.wasSuccessful())
