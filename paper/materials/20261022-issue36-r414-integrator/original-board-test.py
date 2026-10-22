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
