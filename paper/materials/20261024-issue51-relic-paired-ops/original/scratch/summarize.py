import collections
import json
import pathlib

P = pathlib.Path(__file__).parent
PURCHASES = json.loads((P / 'purchase-evidence.json').read_text())
OFFERS = json.loads((P / 'offered-shop-evidence.json').read_text())
IDS = ['SNECKO_SKULL', 'ORNAMENTAL_FAN', 'CHEMICAL_X', 'MEMBERSHIP_CARD', 'POTION_BELT', 'WHETSTONE']


def grouped(items):
    out = []
    for key in sorted(set((x['stratum']['ascension'], x['stratum']['attempt_scope']) for x in items)):
        xs = [x for x in items if (x['stratum']['ascension'], x['stratum']['attempt_scope']) == key]
        out.append({'ascension': key[0], 'attempt_scope': key[1], 'game_version': 'unknown', 'opportunities': len(xs), 'independent_runs': len(set(x['stratum']['run_id'] for x in xs))})
    return out


def upgrade_delta(x):
    a = collections.Counter((c['card_id'], c['upgraded']) for c in x['before']['deck'])
    b = collections.Counter((c['card_id'], c['upgraded']) for c in x['after']['deck'])
    return [{'card_id': k[0], 'upgraded': k[1], 'count': n} for k, n in (b - a).items()]


out = []
for rid in IDS:
    buys = [x for x in PURCHASES if x['selected_relic']['relic_id'] == rid]
    offers = [x for x in OFFERS if any(r['relic_id'] == rid for r in x['selected_stock'])]
    a10 = [x for x in buys if x['stratum']['ascension'] == 10]
    scenes = []
    for x in a10:
        d, a, b = x['decision'], x['before'], x['after']
        scenes.append({'run_id': d['run_id'], 'floor': d['floor'], 'ascension': 10, 'attempt_scope': x['stratum']['attempt_scope'], 'game_version': 'unknown',
                      'price': x['selected_relic']['price'], 'gold_before': a['gold'], 'gold_after': b['gold'], 'hp': a['hp'],
                      'deck_size_before': len(a['deck']), 'deck_size_after': len(b['deck']), 'x_cards_before': [c['card_id'] for c in a['deck'] if c['costs_x']],
                      'potion_capacity_before': len(a['potions']), 'potion_capacity_after': len(b['potions']),
                      'occupied_before': sum(c['occupied'] for c in a['potions']), 'occupied_after': sum(c['occupied'] for c in b['potions']),
                      'upgrade_delta': upgrade_delta(x), 'whole_run_final_floor': x['stratum']['final_floor'], 'whole_run_victory': x['stratum']['victory'],
                      'decision_ref': {'offset': d['off'], 'bytes': d['len']}, 'before_ref': a['ref'], 'after_ref': b['ref']})
    offer_groups = []
    for g in grouped(offers):
        xs = [x for x in offers if x['stratum']['ascension'] == g['ascension'] and x['stratum']['attempt_scope'] == g['attempt_scope']]
        bs = {(x['decision']['run_id'], x['decision']['floor']) for x in buys}
        bought = [x for x in xs if (x['stratum']['run_id'], x['opening_decision']['floor']) in bs]
        affordable = [x for x in xs if any(r['relic_id'] == rid and r['price'] <= x['state']['gold'] for r in x['selected_stock'])]
        offer_groups.append({**g, 'bought_same_run_floor': len(bought), 'no_recorded_purchase_same_run_floor': len(xs) - len(bought), 'affordable_at_open_proxy': len(affordable)})
    out.append({'relic_id': rid, 'purchase_groups': grouped(buys), 'offer_groups': offer_groups, 'a10_purchase_scenes': scenes,
                'opportunity_definition': '每局每层首次open_shop_inventory后首个SHOP记录中已stocked的具名遗物；当时金币/牌组为开店代理，不替代后续每次购买前状态；未见购买不等于拒选理由，所有组可能同局重叠。'})
(P / 'purchase-statistics.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
for r in out:
    print(r['relic_id'], 'A10 purchases', len(r['a10_purchase_scenes']), 'A10 offers', [g for g in r['offer_groups'] if g['ascension'] == 10])
