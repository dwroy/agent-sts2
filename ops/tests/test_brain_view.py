"""Fixed logs only. No game, live files, actual Herdr server or model calls."""
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1]))
import brain_view as view
from herdr_titles import learner_title
try:
    from issue_session_support import Board
except ModuleNotFoundError as error:
    if error.name != "issue_session_support":
        raise
    Board = None


class BrainView(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def append(self, file, row):
        with (self.root / file).open('a') as stream:
            stream.write(json.dumps(row) + '\n')

    def test_finished_attempt_and_tools_are_readable_without_dumping_raw_data(self):
        text = view.render_brain(dict(ts='2026-10-22T01:00:00Z', run_id='RUN000000001',
            question_id='q-1', engine='codex', model='gpt-6.1-sol', requested_effort='high',
            label='reward/card', payload={'state': {'facts': {'floor': 12}}, 'private': 'PAYLOAD_PRIVATE'},
            question='请选择一张牌', answer={'choice': 'A', 'reason': '补充防御'}, latency_ms=1400,
            tool_calls=[dict(name='kb_experience', input={'query': 'QUERY_PRIVATE', 'character': 'silent', 'limit': 3,
                'player_id': 'PLAYER_PRIVATE'}, output='RETURN_PRIVATE', ms=10, outputBytes=100)],
            native_receipt={'effort': 'high', 'source': 'turn_context'}))
        for required in ('F12', 'reward/card', 'q-1', 'codex', 'gpt-6.1-sol', 'high', 'kb_experience',
                         'query=文本/13字', '100 B', '10 ms', 'choice=A', '补充防御', '1400 ms'):
            self.assertIn(required, text)
        for private in ('PAYLOAD_PRIVATE', 'QUERY_PRIVATE', 'RETURN_PRIVATE', 'PLAYER_PRIVATE', 'player_id'):
            self.assertNotIn(private, text)

    def test_actual_route_shop_and_plan_contracts_show_choices_and_final_summary(self):
        for answer, expected in (
            ({'route': ['n1', 'n3', 'n7'], 'reason': '固定路线理由'}, ['n1', 'n3', 'n7', '固定路线理由']),
            ({'plan': ['buy_card1', 'remove:c0'], 'reason': '固定商店理由'}, ['buy_card1', 'remove:c0', '固定商店理由']),
            ({'archetype': '固定构筑方向', 'want': ['CARD_A'], 'summary': '固定构筑计划摘要'}, ['固定构筑方向', 'CARD_A', '固定构筑计划摘要']),
            ({'approach': 'setup', 'setup_cards': ['CARD_A'], 'potions': [{'potion': 'POTION_A', 'use': 'save', 'player_id': 'PLAYER_PRIVATE'}], 'summary': '固定战斗计划摘要'},
             ['setup', 'CARD_A', 'POTION_A', 'save', '固定战斗计划摘要']),
        ):
            text = view.answer_summary({**answer, 'player_id': 'PLAYER_PRIVATE', 'reasoning': 'PRIVATE_THINKING'})
            for required in expected:
                self.assertIn(required, text)
            self.assertNotIn('PLAYER_PRIVATE', text)
            self.assertNotIn('PRIVATE_THINKING', text)
        self.assertLess(len(view.answer_summary({'plan': ['x' * 1000] * 100, 'reason': 'y' * 1000})), 1300)

    def test_redaction_precedes_truncation_and_removes_terminal_controls(self):
        # Deliberately synthetic canaries; no real credentials or personal data.
        canary = 'sk-' + 'aB7cD8eF9' * 6
        text = view.safe_text('授权 Bearer ' + canary + ' api_key="hidden-value" player_id=private-name '
            'https://private.invalid/path person@example.invalid \x1b]52;c;encoded\x07', 1000)
        for hidden in (canary, 'hidden-value', 'private-name', 'private.invalid', 'example.invalid', '\x1b', '\x07'):
            self.assertNotIn(hidden, text)
        self.assertNotIn(canary[:25], view.safe_text(canary, 25))
        self.assertEqual(view.params({'token': canary, 'sql': canary}), 'sql=文本/57字')

    def test_error_timeout_and_both_fallbacks_are_visible_without_error_body(self):
        text = view.render_brain(dict(error='PRIVATE_ERROR', error_kind='timeout', accepted=False,
            fell_back_from='codex', agent={'fallback': 'time'}, latency_ms=15, primary_ms=20))
        for word in ('!!! 错误', '!!! 超时', '!!! 兜底 time', '35 ms'):
            self.assertIn(word, text)
        self.assertNotIn('PRIVATE_ERROR', text)
        self.assertIn('!!! 兜底 codex', view.render_brain({'fell_back_from': 'codex'}))

    def test_tail_handles_partial_invalid_rotation_truncation_and_missing_file(self):
        path = self.root / 'brain.jsonl'
        tail = view.JsonlTail(path)
        self.assertEqual(tail.read(), [])
        path.write_bytes(b'{"n":1}\ninvalid\n{"n":')
        self.assertEqual(tail.read(), [{'n': 1}])
        self.assertEqual(tail.read(), [])
        with path.open('ab') as out:
            out.write(b'2}\n[]\n')
        self.assertEqual(tail.read(), [{'n': 2}])
        path.write_text('{"n":3}\n')
        self.assertEqual(tail.read(), [{'n': 3}])
        path.write_text('{"n":9}\n')
        self.assertEqual(tail.read(), [{'n': 9}])
        path.rename(self.root / 'old.jsonl')
        path.write_text('{"n":4}\n')
        self.assertEqual(tail.read(), [{'n': 4}])
        path.write_bytes(b'x' * 40 + b'\n{"n":5}\n')
        self.assertEqual(view.JsonlTail(path, initial=15).read(), [{'n': 5}])

    def test_poll_updates_run_title_once_keeps_complete_questions_and_waits(self):
        emitted, titles = [], []
        viewer = view.Viewer(self.root, lambda title: titles.append(title) or True, emitted.append)
        self.append('run-config.jsonl', {'run_id': 'RUN000000001'})
        self.append('brain.jsonl', dict(run_id='OLD000000001', question_id='old'))
        self.append('brain.jsonl', dict(run_id='RUN000000001', question_id='q1', answer={'choice': 'A'}))
        self.append('brain-wait.jsonl', dict(run_id='RUN000000001', state='paused', decision_type='event', question_id='q2'))
        viewer.poll()
        count = len(emitted)
        viewer.poll()
        self.assertEqual(len(emitted), count)
        self.assertEqual(titles, ['对局大脑 · RUN000000001'])
        self.assertIn('q1', '\n'.join(emitted))
        self.assertNotIn('题 old', '\n'.join(emitted))
        self.assertIn('等待状态 paused', '\n'.join(emitted))
        self.append('run-config.jsonl', {'run_id': 'RUN000000002'})
        self.append('brain.jsonl', dict(run_id='RUN000000002', question_id='q3', engine='deepseek', effort='max'))
        viewer.poll()
        self.assertEqual(titles[-1], '对局大脑 · RUN000000002')
        self.assertIn('deepseek', '\n'.join(emitted))
        self.assertIn('max', '\n'.join(emitted))

    def test_retry_title_without_spamming_header_and_fallback_without_config(self):
        emitted, calls = [], []
        viewer = view.Viewer(self.root, lambda text: calls.append(text) or len(calls) > 1, emitted.append)
        self.append('brain.jsonl', {'run_id': 'RUN000000001'})
        viewer.poll()
        viewer.poll()
        self.assertEqual(len(calls), 2)
        self.assertEqual(sum('只读' in text for text in emitted), 1)

    def test_empty_view_has_readable_title_and_no_config_can_follow_new_run(self):
        titles = []
        viewer = view.Viewer(self.root, lambda text: titles.append(text) or True, lambda text: None)
        viewer.poll()
        self.assertEqual(titles, ['对局大脑 · 等待开局'])
        for run in ('RUN000000001', 'RUN000000002'):
            self.append('brain.jsonl', {'run_id': run})
            viewer.poll()
            self.assertEqual(titles[-1], '对局大脑 · ' + run)
        self.append('brain.jsonl', {'run_id': 'unsafe-credential-like-value'})
        viewer.poll()
        self.assertEqual(titles[-1], '对局大脑 · RUN000000002')

    def test_switch_is_file_based_and_environment_takes_precedence(self):
        with patch.dict(os.environ, {'CODEX_OPS_BRAIN_VIEW': ''}):
            self.assertTrue(view.enabled(self.root))
            (self.root / 'hosting').write_text('brain_view=off\n')
            self.assertFalse(view.enabled(self.root))
            with patch.dict(os.environ, {'CODEX_OPS_BRAIN_VIEW': 'herdr'}):
                self.assertTrue(view.enabled(self.root))
            with patch.dict(os.environ, {'CODEX_OPS_BRAIN_VIEW': 'off'}):
                self.assertFalse(view.enabled(self.root))
            with patch.object(view, 'command') as command:
                view.ensure(self.root, self.root, self.root)
                command.assert_not_called()

    def test_launch_is_separate_nice_and_never_signals_controller_or_exposes_subprocess_output(self):
        with patch.dict(os.environ, {'CODEX_OPS_BRAIN_VIEW': 'herdr'}), patch.object(view, 'command', return_value=False) as command:
            view.ensure(self.root, self.root, self.root)
        args = command.call_args.args[0]
        self.assertEqual(args[2:4], ['run', 'brain-view'])
        self.assertIn('nice', args)
        self.assertIn('watch', args)
        self.assertNotIn('--close-on-exit', args)
        self.assertNotIn('play', args)
        self.assertNotIn('stop', args)
        self.assertFalse(view.command(['/nonexistent/brain-view-fixture']))

    def test_stream_text_is_visible_before_final_brain_row_and_survives_rotation_and_run_switch(self):
        emitted, titles = [], []
        self.append('run-config.jsonl', {'run_id': 'STREAM000001'})
        folder = self.root / 'brain-live/STREAM000001'
        folder.mkdir(parents=True)
        text = folder / 'current.txt'
        text.write_text('推理摘要：固定分句。\n工具开始 kb_test\n')
        reader = view.Viewer(self.root, lambda title: titles.append(title) or True, emitted.append)
        reader.poll()
        self.assertIn('推理摘要：固定分句。', emitted)
        self.assertFalse((self.root / 'brain.jsonl').exists())
        before = list(emitted)
        reader.poll()
        self.assertEqual(emitted, before)
        text.rename(folder / 'previous.txt')
        text.write_text('工具返回 kb_test → 42 B · 10 ms\n')
        reader.poll()
        self.assertIn('工具返回 kb_test → 42 B · 10 ms', emitted)
        self.append('run-config.jsonl', {'run_id': 'STREAM000002'})
        next_folder = self.root / 'brain-live/STREAM000002'
        next_folder.mkdir(parents=True)
        (next_folder / 'current.txt').write_text('正文：下一局。\n')
        reader.poll()
        self.assertEqual(titles[-1], '对局大脑 · STREAM000002')
        self.assertIn('正文：下一局。', emitted)
        self.assertTrue((folder / 'previous.txt').exists())

    def test_stream_tail_keeps_partial_unicode_and_redacts_terminal_control(self):
        file = self.root / 'stream.txt'
        tail = view.TextTail(file)
        raw = '中文分句。\n'.encode()
        file.write_bytes(raw[:1])
        self.assertEqual(tail.read_text(), [])
        with file.open('ab') as out:
            out.write(raw[1:])
        self.assertEqual(tail.read_text(), ['中文分句。'])
        file.write_text('api_key="sk-fixedPrivateCredential"\x1b]0;unsafe\n')
        rendered = ''.join(tail.read_text())
        self.assertNotIn('sk-fixed', rendered)
        self.assertNotIn('\x1b', rendered)

    def test_stream_preserves_long_lines_and_sha_without_second_truncation(self):
        file = self.root / 'stream.txt'
        sha = 'a' * 64
        line = '完整答案：{"key_turns":[1,2]} ' + '固定中文，' * 2000 + '尾部标记'
        file.write_text('系统提示 SHA256 ' + sha + '\n' + line + '\n')
        lines = view.TextTail(file).read_text()
        self.assertIn(sha, lines[0])
        self.assertEqual(lines[1], line)

    def test_exec_completed_question_remains_visible_after_session_stream_stops(self):
        emitted, titles = [], []
        reader = view.Viewer(self.root, lambda title: titles.append(title) or True, emitted.append)
        self.append('run-config.jsonl', {'run_id': 'STREAM000001'})
        folder = self.root / 'brain-live/STREAM000001'
        folder.mkdir(parents=True)
        text = folder / 'current.txt'
        text.write_text('推理摘要：先前 session 流。\n')
        reader.poll()
        self.assertIn('推理摘要：先前 session 流。', emitted)
        text.unlink()
        row = dict(run_id='STREAM000001', question_id='exec-q2', label='reward/card',
            engine='codex', requested_effort='high', payload={'floor': 12},
            answer={'choice': 'A', 'reason': '固定 exec 答案'}, latency_ms=42)
        self.append('brain.jsonl', row)
        before = (self.root / 'brain.jsonl').read_bytes()
        reader.poll()
        output = '\n'.join(emitted)
        for value in ('exec-q2', 'F12', 'reward/card', 'high', '固定 exec 答案', '42 ms'):
            self.assertIn(value, output)
        count = len(emitted)
        reader.poll()
        self.assertEqual(len(emitted), count)
        self.assertEqual((self.root / 'brain.jsonl').read_bytes(), before)
        self.assertEqual(titles, ['对局大脑 · STREAM000001'])

    def test_exec_without_any_stream_shows_each_completed_question_and_next_run(self):
        emitted, titles = [], []
        reader = view.Viewer(self.root, lambda title: titles.append(title) or True, emitted.append)
        self.append('run-config.jsonl', {'run_id': 'EXEC00000001'})
        for question in ('exec-q1', 'exec-q2'):
            self.append('brain.jsonl', dict(run_id='EXEC00000001', question_id=question,
                label='reward/card', engine='codex', answer={'choice': 'A', 'reason': question}, latency_ms=9))
            reader.poll()
        output = '\n'.join(emitted)
        self.assertIn('exec-q1', output)
        self.assertIn('exec-q2', output)
        self.append('run-config.jsonl', {'run_id': 'EXEC00000002'})
        self.append('brain.jsonl', dict(run_id='EXEC00000002', question_id='next-q1', answer={'choice': 'B'}))
        reader.poll()
        self.assertIn('next-q1', '\n'.join(emitted))
        self.assertEqual(titles, ['对局大脑 · EXEC00000001', '对局大脑 · EXEC00000002'])

    def test_titles_keep_stable_learner_labels(self):
        for label, title in (
            ('learner-20261022-084301-postmortem', '学习大脑 · 20261022-084301 · 复盘'),
            ('learner-20261022-084301-experience-update', '学习大脑 · 20261022-084301 · 经验更新'),
            ('learner-20261022-084301-s2-strategy-proposal', '学习大脑 · 20261022-084301 · 策略提案（二组）'),
            ('learner-log-20261022-084301', '学习大脑 · 20261022-084301 · 复盘'),
        ):
            self.assertEqual(learner_title(label), title)
        self.assertEqual(learner_title('issue-36'), '')

    @unittest.skipIf(Board is None, 'R414 has no issue-session board; original protection test runs on main')
    def test_titles_keep_stable_learner_labels_protected_by_real_board_rules(self):
        board = Board.__new__(Board)
        board.root = self.root
        import yaml
        board.data = yaml.safe_load((Path(__file__).parents[2] / '.agents/board.yaml').read_text())
        for label, title in (
            ('learner-20261022-084301-postmortem', '学习大脑 · 20261022-084301 · 复盘'),
            ('learner-20261022-084301-experience-update', '学习大脑 · 20261022-084301 · 经验更新'),
            ('learner-20261022-084301-s2-strategy-proposal', '学习大脑 · 20261022-084301 · 策略提案（二组）'),
            ('learner-log-20261022-084301', '学习大脑 · 20261022-084301 · 复盘'),
        ):
            self.assertEqual(learner_title(label), title)
            with self.assertRaisesRegex(ValueError, 'protected board role'):
                board.protect(dict(label=label, title=title, pane='fixed', worktree=str(self.root / '.worktrees/fixture')))
        with self.assertRaisesRegex(ValueError, 'protected board role'):
            board.protect(dict(label='brain-view', pane='fixed', worktree=str(self.root / '.worktrees/fixture')))
        self.assertEqual(learner_title('issue-36'), '')


if __name__ == '__main__':
    unittest.main()
