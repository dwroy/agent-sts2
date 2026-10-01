"""tools/build-fight-value.py wraps build-monster-db.observe_combat; the wrapper must accept and pass on every
argument the caller gives (build-monster-db feeds `piles` as the fourth), or the fight-value refresh dies with a
TypeError on the first fight (V4 ops, 2026-09-30)."""
import importlib.util
import os
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class ObserveWrapperTest(unittest.TestCase):
    def test_wrapper_takes_and_passes_the_piles(self):
        fv = load("build_fight_value", os.path.join(ROOT, "tools/build-fight-value.py"))
        seen = []

        def original(fight, state, ts, piles=None):
            seen.append(piles)

        observe = fv._observe(original)
        fight = type("F", (), {})()
        # No turn in the state: the wrapper only calls through, it records nothing of its own.
        observe(fight, {}, 1.0, {"draw": []})
        observe(fight, {}, 2.0)
        self.assertEqual(seen, [{"draw": []}, None])


if __name__ == "__main__":
    unittest.main()
