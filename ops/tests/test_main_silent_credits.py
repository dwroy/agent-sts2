"""Exercise the actual launcher admission block without starting a game or reading a login."""
import pathlib
import subprocess
import unittest


ROOT = pathlib.Path(__file__).resolve().parents[2]
MAIN = "/home/dw/Projects/agent-sts2"
HOME = MAIN + "/ops/codex-ops/accounts/codex1/brain"
SCOPE = "main-silent-codex1-20261015"


class MainSilentCreditLauncherTests(unittest.TestCase):
    def launch_scope(self, root=MAIN, live=MAIN + "/.worktrees/live", home=HOME, inherited="untrusted"):
        script = (ROOT / "ops/run.sh").read_text()
        start = script.index("unset BRAIN_CODEX_PAID_CREDITS\n")
        end = script.index("# Roy 2026-10-12: production Codex defaults", start)
        result = subprocess.run(["bash", "-c", script[start:end] + '\nprintf "%s" "${BRAIN_CODEX_PAID_CREDITS:-}"'],
                                env={"ROOT": root, "LIVE": live, "BRAIN_CODEX_HOME": home,
                                     "BRAIN_CODEX_PAID_CREDITS": inherited},
                                capture_output=True, text=True, check=True, timeout=5)
        return result.stdout

    def test_selected_main_home_gets_the_explicit_scope(self):
        self.assertEqual(self.launch_scope(), SCOPE)

    def test_other_roots_lanes_and_homes_clear_inherited_authorization(self):
        for patch in ({"root": "/another/space"}, {"root": MAIN + "/.worktrees/regent-climb"},
                      {"live": MAIN + "/.worktrees/regent-climb"}, {"live": MAIN + "/.worktrees/codex-dev"},
                      {"home": "/home/dw/.codex-brain"}, {"home": ""}):
            with self.subTest(patch=patch):
                self.assertEqual(self.launch_scope(**patch, inherited=SCOPE), "")


if __name__ == "__main__":
    unittest.main()
