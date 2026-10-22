from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0,str(Path(__file__).parents[1]))
from board_resources import observe


class Resources(unittest.TestCase):
    def test_game_and_legacy_master_scoped_worker_and_queue_wrapper_excluded(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); proc=root/'proc'; proc.mkdir()
            live=root/'.worktrees/live/agent'; live.mkdir(parents=True)
            dev=root/'.worktrees/issue-36-fixture/agent'; dev.mkdir(parents=True)
            foreign=root/'outside'; foreign.mkdir()
            for n,argv,cwd in [(1,['node','src/index.ts','play'],live),
                (2,['node','node_modules/vitest/vitest.mjs'],dev),
                (3,['node','worker.js'],dev),
                (4,['python3','heavy.py','dev','--','node','node_modules/vitest/vitest.mjs'],dev),
                (5,['node','node_modules/vitest/vitest.mjs'],Path('/tmp'))]:
                p=proc/str(n);p.mkdir();(p/'cwd').symlink_to(cwd)
                (p/'cmdline').write_bytes(b'\0'.join(s.encode() for s in argv)+b'\0')
                (p/'stat').write_text(f'{n} (fixture) '+' '.join(['S']+['0']*18+['123']))
            value=observe(root,proc=proc)
            self.assertTrue(value['running']);self.assertEqual([r['pid'] for r in value['legacy']],[2])
            self.assertEqual(value['legacy'][0]['task'],'#36')


if __name__=='__main__':unittest.main()
