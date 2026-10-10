"""Fixed fake Git responses; no remote, keys, or Windows processes."""
import importlib.util
from pathlib import Path
import subprocess
import unittest

spec = importlib.util.spec_from_file_location("git_push_main", Path(__file__).resolve().parents[2] / "ops/git-push-main.py")
subject = importlib.util.module_from_spec(spec)
spec.loader.exec_module(subject)
SHA = "a" * 40


class PushMainTest(unittest.TestCase):
    def runner(self, head=SHA, urls=subject.ORIGIN, remote=SHA, fail_push=False):
        self.calls = []

        def run(argv, **kwargs):
            self.calls.append((argv, kwargs))
            command = argv[3]
            values = {"rev-parse": head, "remote": urls, "push": "ok", "ls-remote": f"{remote}\trefs/heads/main"}
            failed = command == "push" and fail_push
            return subprocess.CompletedProcess(argv, 1 if failed else 0, values[command], "non-fast-forward" if failed else "")
        return run

    def test_pinned_sha_windows_ssh_and_remote_verification(self):
        self.assertTrue(subject.push_main("/fixed", SHA, self.runner())["verified"])
        push, settings = next(c for c in self.calls if c[0][3] == "push")
        self.assertEqual(push[-3:], ["--porcelain", "origin", f"{SHA}:refs/heads/main"])
        self.assertIn(subject.SSH, settings["env"]["GIT_SSH_COMMAND"])
        self.assertIn("BatchMode=yes", settings["env"]["GIT_SSH_COMMAND"])
        self.assertFalse(any("force" in arg for arg in push))
        self.assertEqual(self.calls[-1][0][3], "ls-remote")

    def test_rejects_bad_sha_before_git(self):
        for value in ["main", SHA[:7], SHA + ";echo", "b" * 39]:
            with self.assertRaises(ValueError):
                subject.push_main("/fixed", value, self.runner())
            self.assertEqual(self.calls, [])

    def test_refuses_moved_main_and_other_destinations(self):
        for kwargs in [{"head": "b" * 40}, {"urls": "no_push"}, {"urls": subject.ORIGIN + "\nother"}]:
            with self.assertRaises(ValueError):
                subject.push_main("/fixed", SHA, self.runner(**kwargs))
            self.assertFalse(any(c[0][3] == "push" for c in self.calls))

    def test_preserves_push_failure_and_remote_mismatch(self):
        for kwargs in [{"fail_push": True}, {"remote": "b" * 40}]:
            with self.assertRaises(RuntimeError):
                subject.push_main("/fixed", SHA, self.runner(**kwargs))
        self.assertEqual(sum(c[0][3] == "push" for c in self.calls), 1)


if __name__ == "__main__":
    unittest.main()
