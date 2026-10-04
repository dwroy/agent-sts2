"""knowledge/builders/build-fight-value.py wraps build-monster-db.observe_combat; the wrapper must accept and pass on every
argument the caller gives (build-monster-db feeds `piles` as the fourth), or the fight-value refresh dies with a
TypeError on the first fight (V4 ops, 2026-09-30)."""
import importlib.util
import inspect
import os
import unittest
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class ObserveWrapperTest(unittest.TestCase):
    def test_wrapper_takes_and_passes_the_piles(self):
        fv = load("build_fight_value", os.path.join(ROOT, "knowledge/builders/build-fight-value.py"))
        seen = []

        def original(fight, state, ts, piles=None):
            seen.append(piles)

        observe = fv._observe(original)
        fight = type("F", (), {})()
        # No turn in the state: the wrapper only calls through, it records nothing of its own.
        observe(fight, {}, 1.0, {"draw": []})
        observe(fight, {}, 2.0)
        self.assertEqual(seen, [{"draw": []}, None])

    def test_wrapper_takes_every_argument_observe_combat_takes(self):
        # build-monster-db's feed calls observe_combat with every parameter it has (5 since `observed`, MECH_RULES):
        # the wrapper must take as many, whatever is added next.
        fv = load("build_fight_value", os.path.join(ROOT, "knowledge/builders/build-fight-value.py"))
        bmd = load("build_monster_db", os.path.join(ROOT, "knowledge/builders/build-monster-db.py"))
        arity = len(inspect.signature(bmd.observe_combat).parameters)
        self.assertGreaterEqual(arity, 5)
        seen = []

        def original(*args, **named):
            seen.append((args, named))

        observe = fv._observe(original)
        fight = type("F", (), {})()
        args = [fight, {}, 1.0] + [object() for _ in range(arity - 3)]
        observe(*args)
        observe(fight, {}, 2.0, None, observed=True)
        self.assertEqual(seen, [(tuple(args), {}), ((fight, {}, 2.0, None), {"observed": True})])


if __name__ == "__main__":
    unittest.main()
