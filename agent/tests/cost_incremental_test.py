"""Fixed cost-cache append/rewrite and accounting equivalence checks."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'eval'))
import jsonl_cache
import cost


class CostCacheTest(unittest.TestCase):
    def test_append_partial_rewrite_truncate_revision_and_corruption(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); path=root/'facts.jsonl'
            path.write_bytes(b'{"n":1}\n{"n":')
            cache=jsonl_cache.JsonlCache(root/'cache','one')
            self.assertEqual(cache.rows(path,path.stat().st_size),([{'n':1}],0))
            with path.open('ab') as out: out.write(b'2}\ninvalid\n')
            self.assertEqual(cache.rows(path,path.stat().st_size),([{'n':1},{'n':2}],1))
            self.assertEqual(cache.decoded,3)
            cache.rows(path,path.stat().st_size)
            self.assertEqual(cache.decoded,3)
            # A fixed cut excludes later appends, even when facts were cached earlier.
            self.assertEqual(cache.rows(path,8),([{'n':1}],0))
            path.write_bytes(b'{"n":3}\n')
            self.assertEqual(cache.rows(path,8),([{'n':3}],0))
            cache.db.execute("UPDATE facts SET body='broken'"); cache.db.commit()
            self.assertEqual(cache.rows(path,8),([{'n':3}],0))
            cache.close()
            cache=jsonl_cache.JsonlCache(root/'cache','two')
            self.assertEqual(cache.rows(path,8),([{'n':3}],0))
            self.assertEqual(cache.decoded,1); cache.close()

    def test_compact_projection_preserves_accounting_and_cohort(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); (root/'logs').mkdir()
            now='2026-10-05T12:00:00Z'
            rows=[dict(ts=now,run_id='A',question_id='Q',engine='codex',label='act/plan',
                       answer=dict(run_plan={'private':'large'},route=['private']),
                       inputTokens=100,cacheHitTokens=80,outputTokens=20,
                       usage=dict(inputTokens=100,cacheHitTokens=80,outputTokens=20),
                       payload='PRIVATE_PROMPT'),
                  dict(ts=now,run_id='A',question_id='BAD',engine='codex',answer=None,error='failed')]
            (root/'logs/brain.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in rows))
            (root/'logs/runs.jsonl').write_text(json.dumps(dict(run_id='A',character='SILENT',ended=now))+'\n')
            learner=root/'learner/runs'; learner.mkdir(parents=True)
            (learner/'fixed.jsonl').write_text(''.join(json.dumps(r)+'\n' for r in [
                dict(type='learner_launch',task='fixed',params=dict(character='silent',runs='A')),
                dict(type='learner_output',text='PRIVATE_LEARNER_STREAM'),
                dict(type='learner_summary',ts=now,wall_ms=123,summary=dict(
                    engine='codex',sessionId='fixed',turns=1,tokens=dict(input=4,output=2))),
            ]))
            config=json.loads((ROOT/'eval/cost-config.json').read_text())
            cached=cost.collect(root,config,root/'claude',root/'codex')
            warm=cost.collect(root,config,root/'claude',root/'codex')
            original=cost.Sources
            with patch.object(cost,'Sources',side_effect=lambda _directory:original()):
                # collect closes an optional cache; the plain reader must remain supported.
                plain=cost.collect(root,config,root/'claude',root/'codex')
            for index in (0,1,3):
                self.assertEqual(cached[index],plain[index]);self.assertEqual(warm[index],plain[index])
            self.assertEqual(warm[2].cache.decoded,0)
            db=(root/'ops/component-cost-cache/facts.sqlite').read_bytes()
            self.assertNotIn(b'PRIVATE_PROMPT',db)
            self.assertNotIn(b'PRIVATE_LEARNER_STREAM',db)


if __name__=='__main__': unittest.main()
