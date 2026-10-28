"""Five real fixed wrappers publish while their parent still owns learn.lock."""
from pathlib import Path
import sys
import unittest

REPO = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(REPO / 'ops'), str(REPO / 'ops/tests')]
import learner_registration as registration


class RegistrationPipeline(unittest.TestCase):
    def test_unpublished_or_incomplete_registration_does_not_release_a_batch(self):
        import fcntl
        import tempfile
        with tempfile.TemporaryDirectory() as temp:
            directory=Path(temp); state={"batches":{}}
            def persist(value):registration.published(value)
            with registration.transaction(directory,persist):
                row=registration.reserve(directory,"learner-20260101-000001-strategy-proposal")
                row["pid"]=123
                state["batches"][row["batch"]]={"pid":123,"state":"running","external_source":"fixed-plan"}
                with open(row["path"],"a") as probe:
                    registration.checkpoint(state)
                    with self.assertRaises(BlockingIOError):fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)
                    state["batches"][row["batch"]].update(external_binding={"plan_id":"fixed-plan","dispatch_base":"a"*40},
                        external_lane="A",external_policy={"service_tier":"default"})
                    registration.checkpoint(state)
                    fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)
            # A parent failure never calls persist or marks an unregistered batch complete.
            with self.assertRaises(OSError):
                with registration.transaction(directory,lambda value: (_ for _ in ()).throw(OSError("fixed persist failure"))):
                    row=registration.reserve(directory,"learner-20260101-000002")
                    row["pid"]=124
                    registration.checkpoint({"batches":{}})
            with open(row["path"],"a") as probe:fcntl.flock(probe,fcntl.LOCK_EX|fcntl.LOCK_NB)

    def test_four_external_and_own_publish_before_next_slow_source_under_same_tick_lock(self):
        from publication_registration_fixture import World
        with World() as world, world.runtime():
            world.tick()
            self.assertEqual(len(world.started), 5)


if __name__=='__main__':unittest.main()
