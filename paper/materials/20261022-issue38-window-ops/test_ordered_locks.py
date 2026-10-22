import fcntl
import multiprocessing as mp
from pathlib import Path
import tempfile
import unittest
from ordered_locks import ORDER, acquire_ordered


def producer(paths, entered, request, done):
    with open(paths[0], 'a') as knowledge:
        fcntl.flock(knowledge, fcntl.LOCK_EX)
        entered.set()
        if not request.wait(3):
            raise RuntimeError('publish request absent')
        with open(paths[-1], 'a') as live:
            fcntl.flock(live, fcntl.LOCK_EX)
        done.set()


def checker(paths, waiting, acquired, release, knowledge_wait=False):
    def note(path, held):
        if knowledge_wait:
            assert Path(path).name == ORDER[0] and held == []
        else:
            assert Path(path).name == ORDER[1] and [Path(x).name for x in held] == [ORDER[0]]
        waiting.set()
    handles = acquire_ordered(paths, note)
    acquired.set()
    if not release.wait(3):
        raise RuntimeError('release absent')
    for handle in reversed(handles):
        handle.close()


class Ordered(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=Path(__file__).parent)
        self.paths = [str(Path(self.tmp.name) / name) for name in ORDER]
        self.children = []

    def tearDown(self):
        for child in self.children:
            if child.is_alive(): child.terminate()
            child.join(3)
        self.tmp.cleanup()

    def start(self, target, *args):
        child = mp.Process(target=target, args=args); child.start(); self.children.append(child); return child

    def test_refresh_can_finish_live_publication_before_checker(self):
        entered, request, done, waiting, acquired, release = [mp.Event() for _ in range(6)]
        refresh = self.start(producer, self.paths, entered, request, done)
        self.assertTrue(entered.wait(3))
        check = self.start(checker, self.paths, waiting, acquired, release, True)
        self.assertTrue(waiting.wait(3)); request.set()
        self.assertTrue(done.wait(3)); self.assertTrue(acquired.wait(3)); release.set()
        refresh.join(3); check.join(3)
        self.assertEqual((refresh.exitcode, check.exitcode), (0, 0))

    def test_knowledge_reservation_survives_ordinary_dataset_window(self):
        waiting, acquired, release = [mp.Event() for _ in range(3)]
        with open(self.paths[1], 'a') as ordinary, open(self.paths[2], 'a') as dataset:
            fcntl.flock(ordinary, fcntl.LOCK_EX); fcntl.flock(dataset, fcntl.LOCK_EX)
            check = self.start(checker, self.paths, waiting, acquired, release)
            self.assertTrue(waiting.wait(3)); self.assertFalse(acquired.is_set())
            with open(self.paths[0], 'a') as probe:
                with self.assertRaises(BlockingIOError): fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(dataset, fcntl.LOCK_UN); fcntl.flock(ordinary, fcntl.LOCK_UN)
        self.assertTrue(acquired.wait(3)); release.set(); check.join(3); self.assertEqual(check.exitcode, 0)

    def test_failed_wait_callback_releases_knowledge_reservation(self):
        def fail(*args): raise RuntimeError('fixed callback failure')
        with open(self.paths[1], 'a') as ordinary:
            fcntl.flock(ordinary, fcntl.LOCK_EX)
            with self.assertRaises(RuntimeError): acquire_ordered(self.paths, fail)
            with open(self.paths[0], 'a') as probe: fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_reverse_order_rejected_before_any_lock(self):
        with self.assertRaises(ValueError): acquire_ordered(list(reversed(self.paths)))


if __name__ == '__main__': unittest.main(verbosity=2)
