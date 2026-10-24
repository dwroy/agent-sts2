"""Fixed temporary locks reproduce the production cycle; no production path or process is changed."""
import fcntl
import multiprocessing as mp
from pathlib import Path
import tempfile
import unittest
from lock_admission import acquire_all

ROOT = Path(__file__).resolve().parent
CTX = mp.get_context("fork")


def refresher(k, live, ready, publish, done):
    with open(k, "a") as a, open(live, "a") as b:
        fcntl.flock(a, fcntl.LOCK_EX)
        ready.set()
        if not publish.wait(3):
            raise RuntimeError("fixture publication was not admitted")
        fcntl.flock(b, fcntl.LOCK_EX)
    done.set()


def old_checker(k, live, ready):
    with open(live, "a") as a, open(k, "a") as b:
        fcntl.flock(a, fcntl.LOCK_EX)
        ready.set()
        fcntl.flock(b, fcntl.LOCK_EX)


def repaired_checker(k, live, released, done):
    handles = acquire_all([live, k], lambda waiting, held: released.set())
    for handle in handles:
        handle.close()
    done.set()


class Locks(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.k = str(Path(self.temp.name) / "knowledge.lock")
        self.live = str(Path(self.temp.name) / "live.lock")
        self.children = []

    def tearDown(self):
        for child in self.children:
            if child.is_alive():
                child.terminate()
            child.join(3)
        self.temp.cleanup()

    def start(self, function, *args):
        child = CTX.Process(target=function, args=args)
        self.children.append(child)
        child.start()
        return child

    def probe_free(self, path):
        with open(path, "a") as handle:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(handle, fcntl.LOCK_UN)

    def test_old_order_reproduces_both_sides_of_cycle(self):
        k_ready, l_ready, publish, done = [CTX.Event() for _ in range(4)]
        self.start(refresher, self.k, self.live, k_ready, publish, done)
        self.assertTrue(k_ready.wait(3))
        self.start(old_checker, self.k, self.live, l_ready)
        self.assertTrue(l_ready.wait(3))
        publish.set()
        with self.assertRaises(BlockingIOError):
            self.probe_free(self.k)
        with self.assertRaises(BlockingIOError):
            self.probe_free(self.live)
        self.assertFalse(done.is_set())

    def test_release_all_before_knowledge_wait_allows_refresh_then_checker(self):
        k_ready, released, publish, refresh_done, checker_done = [CTX.Event() for _ in range(5)]
        refresh = self.start(refresher, self.k, self.live, k_ready, publish, refresh_done)
        self.assertTrue(k_ready.wait(3))
        checker = self.start(repaired_checker, self.k, self.live, released, checker_done)
        self.assertTrue(released.wait(3))
        self.probe_free(self.live)
        self.assertFalse(checker_done.is_set())
        publish.set()
        self.assertTrue(refresh_done.wait(3))
        self.assertTrue(checker_done.wait(3))
        refresh.join(3)
        checker.join(3)
        self.assertEqual((refresh.exitcode, checker.exitcode), (0, 0))

    def test_callback_failure_releases_partial_locks(self):
        k_ready, publish, done = [CTX.Event() for _ in range(3)]
        self.start(refresher, self.k, self.live, k_ready, publish, done)
        self.assertTrue(k_ready.wait(3))
        def fail(waiting, held):
            self.assertEqual(held, [])
            self.assertEqual(waiting, self.k)
            raise RuntimeError("fixture callback")
        with self.assertRaisesRegex(RuntimeError, "fixture callback"):
            acquire_all([self.live, self.k], fail)
        self.probe_free(self.live)
        publish.set()
        self.assertTrue(done.wait(3))

    def test_success_holds_entire_set_until_release(self):
        handles = acquire_all([self.live, self.k])
        for path in [self.live, self.k]:
            with self.assertRaises(BlockingIOError):
                self.probe_free(path)
        for handle in handles:
            handle.close()
        self.probe_free(self.live)
        self.probe_free(self.k)


if __name__ == "__main__":
    unittest.main(verbosity=2)
