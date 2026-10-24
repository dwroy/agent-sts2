"""Composition controls for #57 admission and the frozen #56 registration pipeline."""
import os
from pathlib import Path
import subprocess
import sys
import unittest

REPO = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(REPO / 'ops'), str(REPO / 'ops/tests')]
import publication_gate
from publication_registration_fixture import World


class PublicationRegistration(unittest.TestCase):
    def test_publication_waiting_starts_four_candidates_while_parent_global_lock_remains_held(self):
        with World() as world, world.runtime():
            world.tick(waiting=True)
            self.assertEqual(len(world.started), 4)
            self.assertTrue(all(row.get('external_source') for row in world.state['batches'].values()))
            with self.assertRaises(ValueError):
                publication_gate.admit_game(world.root, world.directory, os.getpid())

    def test_late_global_holds_reject_real_admission_after_durable_registration_and_prepare(self):
        for name in ('PAUSE', 'ACCOUNT_DRAIN', 'LLM_DRAIN', publication_gate.MARKER):
            with self.subTest(marker=name), World() as world, world.runtime(FIXTURE_HOLD_PREPARE='1'):
                world.late_rejection(flag=name)

    def test_replaced_candidate_mode_is_rejected_before_model_transport(self):
        with World() as world, world.runtime(FIXTURE_HOLD_PREPARE='1'):
            world.late_rejection(corrupt_mode=True)

    def test_a_foreign_batch_barrier_never_authorizes_registration(self):
        with World() as world, world.runtime():
            batch = '20260101-000001-strategy-proposal'
            result = subprocess.run(['bash', str(world.root / 'ops/codex-ops-learner.sh'), batch, '', 'silent',
                'strategy-proposal', str(world.root / '.worktrees/codex-strategy-silent-20260101-000001'),
                'strategy-proposal', 'external:lane-unit-0'], capture_output=True, timeout=5,
                env={**os.environ, 'LEARNER_REGISTRATION_GATE': str(world.directory / 'learner/registration/foreign.lock')})
            self.assertEqual(result.returncode, 2)
            self.assertFalse(list(world.observations.glob('*.json')))


if __name__ == '__main__': unittest.main()
