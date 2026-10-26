"""Fixed raw-state statistics: denominators, censoring and pooled ascension offsets."""
import copy
import hashlib
import json
import subprocess
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'knowledge/builders'))
from appearance_stats import AppearanceCollector


def at(n):
    return f'2020-01-01T00:{n:02d}:00.000Z'


REF = dict(offset=12000000000, bytes=40, sha256='a'*64)
EVIDENCE = dict(path='/fixed/appearance-observations.jsonl', bytes=40, sha256='b'*64, records=1)


def card(ident='A', rarity='RARE', upgraded=False):
    return dict(card_id=ident, rarity=rarity, upgraded=upgraded, is_stocked=True)


def collector(ascensions=(0, 10)):
    runs = {f'r{i}': dict(row=dict(ascension=a, code=f'version-{i}'), source=REF, ended=at(50)) for i, a in enumerate(ascensions)}
    coverage = [dict(run_id=rid, ended=at(50), ascension=r['row']['ascension'], first_stop=None) for rid, r in runs.items()]
    return AppearanceCollector('silent', at(55), runs, coverage)


def frame(c, rid, floor, minute, screen='MAP', **extra):
    c.observe(rid, at(minute), dict(run=dict(floor=floor, act_id='0', deck=[]), screen=screen, **extra), REF)


def offer(c, rid, floor, minute, cards, source='reward'):
    payload = dict(reward=dict(card_options=cards)) if source == 'reward' else dict(shop=dict(cards=cards,
        card_removal=dict(available=True, used=False)))
    frame(c, rid, floor, minute, 'REWARD' if source == 'reward' else 'SHOP', **payload)


class AppearanceTest(unittest.TestCase):
    def test_probability_denominator_includes_other_rarities_and_repeat_cards_once(self):
        c = collector()
        offer(c, 'r0', 1, 1, [card(), card(upgraded=True)])
        offer(c, 'r0', 1, 2, [card(upgraded=True), card()])  # Same offer, another poll.
        offer(c, 'r1', 1, 1, [card('B', 'COMMON')])
        table = c.build(EVIDENCE)
        row = next(r for r in table['cards'] if r['card_id'] == 'A' and r['source'] == 'reward')
        self.assertEqual((row['n'], row['appearances'], row['upgraded_appearances'], row['probability']), (2, 1, 1, .5))
        self.assertEqual(row['n_runs'], 2)
        self.assertGreater(row['se'], 0)
        self.assertEqual(table['excluded']['duplicate_reward'], 1)
        self.assertEqual(len(c.floor_evidence), 2)
        self.assertEqual(c.floor_evidence[0]['source']['offset'], 12000000000)

    def test_shop_first_stock_not_purchases_and_missing_source_is_unknown(self):
        c = collector()
        frame(c, 'r0', 1, 0, 'SHOP', shop=dict(cards=[]))
        offer(c, 'r0', 1, 1, [card()], 'shop')
        offer(c, 'r0', 1, 2, [card('B')], 'shop')
        table = c.build(EVIDENCE)
        reward, shop = sorted(table['cards'], key=lambda r: r['source'])
        self.assertEqual((shop['n'], shop['appearances'], shop['probability']), (1, 1, 1))
        self.assertIsNone(shop['se'])
        self.assertEqual(reward['n'], 0)
        self.assertIsNone(reward['probability'])
        self.assertTrue(reward['unknown_reason'])
        self.assertIn('gold_and_purchase_affordability_unmodeled', table['labels'])

    def test_incomplete_stock_and_conflicting_rarity_do_not_fabricate_probability(self):
        c = collector()
        offer(c, 'r0', 1, 1, [card(), dict(card_id=None)], 'shop')
        offer(c, 'r1', 1, 1, [card('A', 'COMMON')])
        table = c.build(EVIDENCE)
        self.assertEqual(table['cards'], [])
        self.assertEqual(table['unknown_rarity_cards'], ['A'])
        self.assertEqual(next(s for s in table['strata'] if s['source'] == 'shop')['excluded'], 1)

    def test_known_absence_with_denominator_is_empirical_zero_not_missing(self):
        c = collector()
        frame(c, 'r0', 0, 0)
        c.observe('r0', at(0), dict(run=dict(floor=0, act_id='0', deck=[card()]), screen='MAP'), REF)
        offer(c, 'r0', 1, 1, [card('B')])
        row = next(r for r in c.build(EVIDENCE)['cards'] if r['card_id'] == 'A' and r['source'] == 'reward')
        self.assertEqual(row['probability'], 0)
        self.assertGreater(row['wilson95'][1], 0)
        self.assertIsNone(row['unknown_reason'])

    def test_pool_versions_and_all_ascensions_main_rate_with_shared_offset_only(self):
        c = collector((0, 10))
        offer(c, 'r0', 1, 1, [card('B')])
        offer(c, 'r1', 1, 1, [card()])
        offer(c, 'r1', 2, 2, [card('B')])
        table = c.build(EVIDENCE)
        row = next(r for r in table['cards'] if r['card_id'] == 'A' and r['source'] == 'reward')
        self.assertAlmostEqual(row['probability'], 1/3)
        # A and B share a rarity, so their equal/opposite trends share one zero slope.
        self.assertAlmostEqual(table['ascension_offsets'][0]['offset'], 0)
        self.assertAlmostEqual(row['probability_a10'], 1/3)
        self.assertEqual([r['version'] for r in table['runs']], ['version-0', 'version-1'])
        single = collector((10, 10))
        offer(single, 'r0', 1, 1, [card()])
        no_offset = single.build(EVIDENCE)['ascension_offsets'][0]
        self.assertIsNone(no_offset['offset'])
        self.assertTrue(no_offset['unknown_reason'])

    def test_remaining_distribution_censors_unseen_future_and_missing_floors(self):
        c = collector((0, 1, 2, 3))
        for rid in c.runs:
            frame(c, rid, 0, 0)
            offer(c, rid, 1, 1, [card()])
        for rid in ('r0', 'r1'):
            frame(c, rid, 2, 2, 'REST', rest=dict(options=[dict(option_id='SMITH', is_enabled=True)]))
            frame(c, rid, 2, 3, 'REST', rest=dict(options=[dict(option_id='SMITH', is_enabled=True)]))
            frame(c, rid, 3, 4)
        frame(c, 'r3', 3, 4)  # Missing floor 2.
        table = c.build(EVIDENCE, [3, 9])
        row = next(r for r in table['remaining'] if (r['from_floor'], r['target_floor'], r['kind']) == (0, 3, 'upgrade'))
        self.assertEqual((row['n'], row['median'], row['distribution']), (2, 1.0, [dict(count=1, n=2)]))
        self.assertEqual(row['censored_run_ids'], ['r2'])
        self.assertEqual(row['incomplete_run_ids'], ['r3'])
        missing = next(r for r in table['remaining'] if r['target_floor'] == 9)
        self.assertIsNone(missing['median'])
        self.assertTrue(missing['unknown_reason'])

    def test_nonzero_offset_is_an_appendix_and_out_of_range_estimates_stay_unknown(self):
        for asc, expected in [((0, 10), 1), ((0, 1), None)]:
            c = collector(asc)
            offer(c, 'r0', 1, 1, [card('B', 'COMMON')])
            offer(c, 'r1', 1, 1, [card('A', 'RARE')])
            table = c.build(EVIDENCE)
            row = next(r for r in table['cards'] if r['card_id'] == 'A' and r['source'] == 'reward')
            self.assertEqual(row['probability'], .5)
            self.assertEqual(row['probability_a10'], expected)
            self.assertGreater(next(r['offset'] for r in table['ascension_offsets'] if r['rarity'] == 'RARE'), 0)
            if expected is None:
                self.assertIsNone(row['regression_se'])
                self.assertIn('越界', row['regression_reason'])

    def test_first_stop_end_and_floor_rollback_do_not_multiply_attempts(self):
        c = collector()
        c.coverage['r0']['first_stop'] = dict(ts=at(2), floor=2, result='predicted_death')
        offer(c, 'r0', 1, 1, [card()])
        offer(c, 'r0', 2, 2, [card('B')])  # Inclusive first boundary.
        offer(c, 'r0', 3, 3, [card('C')])
        offer(c, 'r1', 3, 1, [card()])
        offer(c, 'r1', 2, 2, [card('D')])
        offer(c, 'r1', 4, 3, [card('E')])
        offer(c, 'r1', 4, 51, [card('F')])
        table = c.build(EVIDENCE)
        self.assertEqual(next(s['n'] for s in table['strata'] if s['source'] == 'reward'), 3)
        self.assertEqual({r['card_id'] for r in table['cards']}, {'A', 'B'})
        self.assertEqual(table['excluded']['after_first_stop_or_end'], 2)

    def test_upgraded_reward_does_not_add_smith_and_current_floor_is_excluded(self):
        c = collector((10,))
        offer(c, 'r0', 0, 0, [card(upgraded=True)])
        offer(c, 'r0', 1, 1, [card()])
        frame(c, 'r0', 2, 2, 'REST', rest=dict(options=[dict(option_id='SMITH', is_enabled=False)]))
        frame(c, 'r0', 3, 3)
        rows = [r for r in c.build(EVIDENCE, [3])['remaining'] if r['from_floor'] == 0]
        self.assertEqual(next(r['median'] for r in rows if r['kind'] == 'reward'), 1)
        self.assertEqual(next(r['median'] for r in rows if r['kind'] == 'upgrade'), 0)

    def test_real_after_run_refresh_publishes_table_and_raw_evidence_atomically(self):
        from v6_learning_loop_test import fixture, refresh, RUN, raw
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            target = fixture(root)
            states = root / 'logs/states.jsonl'
            row = json.loads(states.read_bytes())
            row['state'].update(screen='REWARD', reward=dict(card_options=[card()]))
            # Offer evidence need not have a numerically complete simulator frame.
            del row['state']['run']['current_hp']
            source = raw(row)
            states.write_bytes(source)
            captured = {}
            def runner(argv, **kwargs):
                result = subprocess.run(argv, **kwargs)
                if len(argv) >= 3 and argv[-3] == 'history' and result.returncode == 0:
                    # Capture the fixed audit before successful publication discards intermediates.
                    packet = json.loads(Path(argv[-2]).read_bytes())
                    captured['audit'] = Path(packet['data']['appearance']['evidence']['path']).read_bytes()
                return result
            receipt, code = refresh.refresh(root, root, 'silent', runner)
            self.assertEqual(code, 0, receipt)
            pack = json.loads(target.read_bytes())
            table = pack['data']['appearance']
            self.assertEqual(table['runs'][0]['run_id'], RUN)
            self.assertEqual(next(r['probability'] for r in table['cards'] if r['source'] == 'reward'), 1)
            audit = captured['audit']
            self.assertFalse(Path(table['evidence']['path']).exists())
            self.assertEqual(receipt['storage_cleanup']['state'], 'completed')
            self.assertEqual(hashlib.sha256(audit).hexdigest(), table['evidence']['sha256'])
            refs = [r['source'] for r in map(json.loads, audit.splitlines())]
            self.assertTrue(all(r['sha256'] == hashlib.sha256(source).hexdigest() for r in refs))
            self.assertIn('appearance', [s['name'] for s in pack['data']['sources']])
            self.assertEqual((root / 'knowledge/characters/regent/v6-history.json').read_bytes(), b'REGENT_PACKET')


def fixture():
    c = collector()
    for rid in c.runs:
        frame(c, rid, 0, 0)
        offer(c, rid, 1, 1, [card() if rid == 'r0' else card('B', 'COMMON')])
        frame(c, rid, 2, 2)
    return c.build(copy.deepcopy(EVIDENCE), [2])


if __name__ == '__main__':
    if sys.argv[1:] == ['--fixture']:
        print(json.dumps(fixture(), ensure_ascii=False, allow_nan=False))
    else:
        unittest.main()
