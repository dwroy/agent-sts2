"""The minute entry only execs the dispatcher; activation uses fixed local fixtures."""
import contextlib
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import agent_board as adapter


class MinuteEntry(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root=Path(self.tmp.name); (self.root/'.agents').mkdir()
        source=Path(adapter.__file__).parents[1]
        config=adapter.Board(source).data
        config['dispatcher'].update(poll_source='minute', interval_minutes=5, minute_interval_minutes=1)
        (self.root/'.agents/board.yaml').write_text(json.dumps(config))
        self.board=adapter.Board(self.root)
        self.settings=config['dispatcher']
        kit=self.root/self.settings['install']; kit.mkdir(parents=True)
        (kit/'board.py').write_text("CAPABILITIES = {'minute-poll-v1','protected-handoff-v1'}\n")
        (kit/'polling.py').write_text('# fixed polling module\n')
        (kit/'conversation.py').write_text('# fixed conversation module\n')
        registry=self.root/self.settings['registry']; registry.parent.mkdir(parents=True,exist_ok=True)
        registry.write_text(json.dumps(dict(projects=[dict(root=str(self.root))])))
        self.env=patch.dict(os.environ,{},clear=True); self.env.start(); self.addCleanup(self.env.stop)

    def main(self,*argv):
        with patch.object(sys,'argv',['agent_board.py','--root',str(self.root),*argv]), contextlib.redirect_stdout(io.StringIO()) as output:
            rc=adapter.main()
        return rc,output.getvalue().strip()

    def test_old_control_keeps_stall_until_ops_switches_source(self):
        adapter.set_mode(self.board,'on')
        self.assertEqual(self.main('--poll'),(0,'{"state":"delegated"}'))
        adapter.set_mode(self.board,None,'minute')
        self.assertEqual(self.main('--stall'),(0,'{"state":"delegated"}'))
        with patch.object(adapter.os,'execv') as execute:
            self.main('--poll')
        argv=execute.call_args.args[1]
        self.assertEqual(argv,[sys.executable,str(self.root/self.settings['install']/'board.py'),
                               '--registry',str(self.root/self.settings['registry']),'--poll'])

    def test_disabled_pause_and_environment_off_do_not_exec(self):
        with patch.object(adapter.os,'execv') as execute:
            self.assertEqual(self.main('--poll'),(0,'{"state":"disabled"}'))
            adapter.set_mode(self.board,'on','minute')
            pause=self.root/self.settings['pause_files'][0]; pause.touch()
            self.assertEqual(self.main('--poll'),(0,'{"state":"paused"}')); pause.unlink()
            os.environ['CODEX_AGENT_BOARD']='off'
            self.assertEqual(self.main('--poll'),(0,'{"state":"disabled"}'))
            execute.assert_not_called()

    def test_source_change_and_enable_never_dispatch_or_lose_active_source(self):
        with patch.object(adapter.os,'execv') as execute:
            self.assertEqual(self.main('--set-poll-source','minute')[0],0)
            self.assertEqual(self.main('--set-enabled','on')[0],0)
            self.assertEqual(self.main('--show-poll-source'),(0,'minute'))
            self.assertEqual(self.main('--set-enabled','off')[0],0)
            self.assertEqual(self.main('--show-poll-source'),(0,'minute'))
            self.assertEqual(self.main('--set-poll-source','stall')[0],0)
            execute.assert_not_called()

    def test_missing_poll_module_blocks_activation_and_preserves_control(self):
        adapter.set_mode(self.board,'on')
        control=adapter.control_path(self.board); before=control.read_bytes()
        for name in ('polling.py','conversation.py'):
            helper=self.root/self.settings['install']/name; data=helper.read_bytes(); helper.unlink()
            self.assertEqual(self.main('--set-poll-source','minute')[0],1)
            self.assertEqual(control.read_bytes(),before); helper.write_bytes(data)
        (self.root/self.settings['install']/'board.py').write_text("CAPABILITIES = {'minute-poll-v1'}\n")
        self.assertEqual(self.main('--set-poll-source','minute')[0],1)
        self.assertEqual(control.read_bytes(),before)

    def test_minute_global_dry_run_is_available_before_activation(self):
        with patch.object(adapter.os,'execv') as execute:
            self.main('--poll','--dry-run')
        self.assertIn('--poll',execute.call_args.args[1]); self.assertIn('--dry-run',execute.call_args.args[1])
        self.assertFalse(adapter.control_path(self.board).exists())

    def test_queue_only_requires_complete_pin_when_explicitly_enabled(self):
        adapter.queue_installation(self.board)
        self.board.data['dispatcher']['merge_queue'] = dict(enabled=False)
        adapter.queue_installation(self.board)
        self.board.data['dispatcher']['merge_queue'] = dict(enabled=True)
        with patch.object(adapter, 'verify_queue_kit', side_effect=ValueError('incomplete pin')) as verify:
            with self.assertRaises(ValueError):
                adapter.set_mode(self.board, 'on')
            verify.assert_called_once_with(self.root, self.settings['install'])
        self.assertFalse(adapter.control_path(self.board).exists())

    def test_queue_cannot_exec_mixed_installation_even_for_dry_run(self):
        config = self.board.data
        config['dispatcher']['merge_queue'] = dict(enabled=True)
        (self.root / '.agents/board.yaml').write_text(json.dumps(config))
        with patch.object(adapter, 'verify_queue_kit', side_effect=ValueError('mixed')) as verify, \
                patch.object(adapter.os, 'execv') as execute:
            self.assertEqual(self.main('--poll', '--dry-run')[0], 1)
            verify.assert_called_once()
            execute.assert_not_called()

    def test_malformed_queue_enable_does_not_silently_keep_old_entry(self):
        for value in (True, dict(enabled='true'), dict(enabled=1)):
            self.board.data['dispatcher']['merge_queue'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                adapter.queue_installation(self.board)

    def test_retention_off_is_forwarded_and_minute_entry_has_no_stall_jobs(self):
        adapter.set_mode(self.board,'on','minute'); os.environ['CODEX_OPS_RETENTION']='off'
        with patch.object(adapter.os,'execv') as execute:
            self.main('--poll')
        self.assertIn('--no-reclaim',execute.call_args.args[1])
        text=Path(adapter.__file__).read_text()
        for job in ('brain_view.py','learner_tabs.py','module_health.py','sample-subscription-usage.ts','codex-ops.sh'):
            self.assertNotIn(job,text)
        scheduler=(Path(adapter.__file__).parent/'codex-ops.sh').read_text()
        self.assertIn('agent_board.py" --root "$ROOT" --stall',scheduler)


if __name__=='__main__': unittest.main()
