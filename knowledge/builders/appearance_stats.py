"""Mechanical, character-local offer probabilities and observed opportunity counts.

No catalog/drop-rate constants, final-deck backfill, simulator or game actions.
This collector runs inside the existing frozen raw-state scan.
"""
from collections import Counter, defaultdict
import hashlib
import json
import math
import statistics


KINDS = ('reward', 'shop', 'upgrade', 'remove')


def token(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def cluster_se(residuals, denominator):
    n = len(residuals)
    return math.sqrt(n / (n - 1) * sum(v*v for v in residuals) / denominator**2) if n > 1 and denominator else None


def wilson(successes, n):
    if not n:
        return None
    z = 1.959963984540054  # Standard normal 97.5% quantile, not a game parameter.
    p = successes / n
    d = 1 + z*z/n
    c = (p + z*z/(2*n))/d
    h = z * math.sqrt(p*(1-p)/n + z*z/(4*n*n))/d
    return [max(0, c-h), min(1, c+h)]


class AppearanceCollector:
    def __init__(self, character, cutoff, runs, coverage):
        self.character, self.cutoff, self.runs = character, cutoff, runs
        self.coverage = {r['run_id']: r for r in coverage}
        self.events, self.seen, self.shops = [], set(), set()
        self.floors, self.bosses, self.bad = defaultdict(set), set(), defaultdict(set)
        self.last_floor, self.last_ts, self.rollback = {}, {}, set()
        self.cards = defaultdict(set)
        self.floor_evidence = []
        self.excluded = Counter()

    def observe(self, rid, ts, state, ref):
        run = self.coverage[rid]
        if ts > run['ended'] or run['first_stop'] and ts > run['first_stop']['ts']:
            self.excluded['after_first_stop_or_end'] += 1
            return
        r = state.get('run') or {}
        floor, act = r.get('floor'), r.get('act_id')
        if type(floor) is not int or floor < 0 or not str(act).isdigit():
            self.excluded['unknown_floor_or_act'] += 1
            return
        if rid in self.rollback:
            return
        if ts < self.last_ts.get(rid, ''):
            self.excluded['out_of_order_timestamp'] += 1
            return
        if floor < self.last_floor.get(rid, floor):
            self.rollback.add(rid)
            self.excluded['floor_rollback_first_pass_cut'] += 1
            return
        self.last_floor[rid], self.last_ts[rid] = floor, ts
        if floor not in self.floors[rid]:
            self.floor_evidence.append(dict(kind='floor', run_id=rid, ts=ts, floor=floor,
                source={k: ref[k] for k in ('offset', 'bytes', 'sha256')}))
        self.floors[rid].add(floor)
        if state.get('in_combat') is True and state.get('turn') == 1 and r.get('boss_id'):
            # boss_id names the visible future boss in every room. A boss fight
            # needs explicit encounter evidence, not merely that run field.
            enemies = (state.get('combat') or {}).get('enemies') or []
            boss = str(r['boss_id']).removesuffix('_BOSS')
            if any(str(e.get('monster_id', e.get('id', ''))).removesuffix('_BOSS') == boss for e in enemies):
                self.bosses.add(floor)
        for c in r.get('deck') or []:
            if isinstance(c, dict) and isinstance(c.get('card_id'), str) and isinstance(c.get('rarity'), str):
                self.cards[c['card_id']].add(c['rarity'])

        def emit(kind, offers=None, complete=True):
            identity = [rid, floor, kind, offers if kind == 'reward' else None]
            key = token(identity)
            if key in self.seen:
                self.excluded['duplicate_' + kind] += 1
                return
            self.seen.add(key)
            self.events.append(dict(id=key, run_id=rid, ts=ts, floor=floor, act=int(act)+1,
                kind=kind, offers=offers, complete=complete,
                source={k: ref[k] for k in ('offset', 'bytes', 'sha256')}))

        def offered(items, kind):
            offers, complete = [], True
            for c in items:
                if not isinstance(c, dict) or not isinstance(c.get('card_id'), str) or not c['card_id']:
                    complete = False
                    continue
                ident, rarity, upgraded = c['card_id'], c.get('rarity'), c.get('upgraded')
                if not isinstance(rarity, str) or not rarity or type(upgraded) is not bool or kind == 'shop' and c.get('is_stocked') is not True:
                    complete = False
                    continue
                self.cards[ident].add(rarity)
                offers.append(dict(card_id=ident, rarity=rarity, upgraded=upgraded))
            if not complete:
                self.excluded['incomplete_' + kind] += 1
                self.bad[(rid, kind)].add(floor)
            return sorted(offers, key=lambda c: (c['card_id'], c['rarity'], c['upgraded'])), complete

        if state.get('screen') == 'REWARD':
            reward = state.get('reward') or {}
            items = reward.get('card_options')
            if isinstance(items, list) and items:
                offers, complete = offered(items, 'reward')
                emit('reward', offers, complete)
        if state.get('screen') == 'SHOP' and isinstance(state.get('shop'), dict) and (rid, floor) not in self.shops:
            shop = state['shop']
            # A not-yet-open shop with no stock is not proof of an empty inventory.
            if isinstance(shop.get('cards'), list) and shop['cards']:
                self.shops.add((rid, floor))
                offers, complete = offered(shop['cards'], 'shop')
                emit('shop', offers, complete)
                removal = shop.get('card_removal')
                if isinstance(removal, dict) and removal.get('available') is True and removal.get('used') is False:
                    emit('remove')
                elif not isinstance(removal, dict) or type(removal.get('available')) is not bool or type(removal.get('used')) is not bool:
                    self.bad[(rid, 'remove')].add(floor)
        if state.get('screen') in ('REST', 'REST_SITE'):
            options = (state.get('rest') or {}).get('options')
            if isinstance(options, list):
                if any(o.get('option_id') == 'SMITH' and o.get('is_enabled') is True for o in options if isinstance(o, dict)):
                    emit('upgrade')
                elif any(o.get('option_id') == 'SMITH' and type(o.get('is_enabled')) is not bool for o in options if isinstance(o, dict)):
                    self.bad[(rid, 'upgrade')].add(floor)
            else:
                self.bad[(rid, 'upgrade')].add(floor)

    def build(self, evidence, targets=()):
        events = sorted(self.events, key=lambda e: (e['run_id'], e['ts'], e['id']))
        runs = [dict(run_id=rid, ascension=r['row']['ascension'], version=r['row'].get('code'), ended=r['ended'],
                     source={k: r['source'][k] for k in ('offset', 'bytes', 'sha256')}) for rid, r in sorted(self.runs.items())]
        strata, cards, regressions = [], [], []
        groups = {}
        for source in ('reward', 'shop'):
            observations = [e for e in events if e['kind'] == source and e['complete']]
            by_run = Counter(e['run_id'] for e in observations)
            n = len(observations)
            strata.append(dict(source=source, n=n, n_runs=len(by_run), run_ids=sorted(by_run),
                excluded=sum(e['kind'] == source and not e['complete'] for e in events)))
            for ident, rarities in sorted(self.cards.items()):
                if len(rarities) != 1:
                    continue  # A changed/contradictory rarity must not create two independent identities.
                rarity = next(iter(rarities))
                successes, upgrades = Counter(), 0
                for e in observations:
                    matches = [c for c in e['offers'] if c['card_id'] == ident]
                    if matches:
                        successes[e['run_id']] += 1
                        upgrades += int(any(c['upgraded'] for c in matches))
                hits = sum(successes.values())
                p = hits/n if n else None
                mean_asc = sum(self.coverage[rid]['ascension']*count for rid, count in by_run.items())/n if n else None
                row = dict(source=source, rarity=rarity, card_id=ident, n=n, n_runs=len(by_run), appearances=hits,
                    upgraded_appearances=upgrades, probability=p,
                    se=cluster_se([successes[rid]-p*count for rid, count in by_run.items()], n) if n else None,
                    wilson95=wilson(hits, n), mean_ascension=mean_asc,
                    probability_a10=None, regression_se=None, regression_reason='进阶偏移尚不可识别',
                    unknown_reason=None if n else '没有完整的本角色该来源机会；不以其他来源或角色补值')
                cards.append(row)
                if n:
                    groups[(source, ident)] = (row, by_run, successes)
        # One additive ascension offset per rarity, shared by every card and
        # source in that rarity. Card/source fixed intercepts remove between-card differences.
        for rarity in sorted({c['rarity'] for c in cards}):
            local = [g for g in groups.values() if g[0]['rarity'] == rarity]
            xx = xy = 0.0
            for row, counts, hits in local:
                for rid, n in counts.items():
                    dx = self.coverage[rid]['ascension']-row['mean_ascension']
                    xx += n*dx*dx
                    xy += dx*(hits[rid]-n*row['probability'])
            slope = xy/xx if xx > 1e-10 else None
            scores = defaultdict(float)
            if slope is not None:
                for row, counts, hits in local:
                    for rid, n in counts.items():
                        dx = self.coverage[rid]['ascension']-row['mean_ascension']
                        scores[rid] += dx*(hits[rid]-n*(row['probability']+slope*dx))
            regressions.append(dict(rarity=rarity, offset=slope, se=cluster_se(list(scores.values()), xx),
                n_runs=len({rid for _, counts, _ in local for rid in counts}),
                unknown_reason=None if slope is not None else '组内无进阶变化，统一偏移不可识别；不假设为0'))
            for row, counts, hits in local:
                if slope is None:
                    row['regression_reason'] = regressions[-1]['unknown_reason']
                    continue
                value = row['probability']+slope*(10-row['mean_ascension'])
                if not 0 <= value <= 1:
                    row['regression_reason'] = 'A10线性概率越界；不夹值、不代替合并实测率'
                    continue
                influences = []
                for rid in scores:
                    n = counts.get(rid, 0)
                    dx = self.coverage[rid]['ascension']-row['mean_ascension']
                    residual = hits[rid]-n*(row['probability']+slope*dx)
                    influences.append(residual/row['n']+(10-row['mean_ascension'])*scores[rid]/xx)
                row.update(probability_a10=value, regression_se=cluster_se(influences, 1), regression_reason=None)
        remaining = []
        by_run = defaultdict(list)
        for e in events:
            by_run[e['run_id']].append(e)
        endpoints = sorted(set(targets) | self.bosses)
        for start in sorted({f for fs in self.floors.values() for f in fs}):
            for target in endpoints:
                if target <= start:
                    continue
                for kind in KINDS:
                    samples, censored, incomplete = [], [], []
                    for rid, floors in sorted(self.floors.items()):
                        if start not in floors:
                            continue
                        if target not in floors:
                            censored.append(rid)
                            continue
                        if any(f not in floors for f in range(start, target+1)) or any(start < f < target for f in self.bad[(rid, kind)]):
                            incomplete.append(rid)
                            continue
                        samples.append(dict(run_id=rid, count=sum(e['kind'] == kind and start < e['floor'] < target for e in by_run[rid])))
                    distribution = Counter(s['count'] for s in samples)
                    remaining.append(dict(from_floor=start, target_floor=target, kind=kind, n=len(samples),
                        median=statistics.median(s['count'] for s in samples) if samples else None,
                        distribution=[dict(count=c, n=n) for c, n in sorted(distribution.items())],
                        samples=samples, censored_run_ids=censored, incomplete_run_ids=incomplete,
                        unknown_reason=None if samples else '无同时覆盖起止层及中间层的首试观察；未来机会未知'))
        return dict(schema='v6-appearance-v1', character=self.character, cutoff=self.cutoff,
            design='observational', attempt='first', interval='from_floor < opportunity.floor < target_floor',
            runs=runs, evidence=evidence, strata=strata, cards=cards, ascension_offsets=regressions, remaining=remaining,
            excluded=dict(self.excluded), unknown_rarity_cards=sorted(k for k,v in self.cards.items() if len(v) != 1),
            labels=['duplicate_cards_count_once_per_opportunity', 'upgraded_and_base_share_card_identity',
                'upgraded_offer_does_not_grant_upgrade_opportunity', 'upgrade_targets_and_reward_upgrade_conflicts_unmodeled',
                'gold_and_purchase_affordability_unmodeled', 'opportunity_counts_are_observed_not_guaranteed'],
            limitations=['全部代码版本和实际进阶合并，版本仅来源；按来源/稀有度分组，分母为该来源全部完整机会，而非只含该稀有度的机会。',
                '直接读取本角色已结束局原始状态，不筛引擎、模型选择或已接受题面；SL首次截止与层回退后不增加独立机会。',
                '同局同层商店仅首次库存；奖励按完整选项签名去重，同层完全相同的独立再奖励可能合并；不推测未记录机会。',
                '每张牌按每机会至少出现一次计数（同屏重复不累加）；升级出现另计；从牌组读出的身份/稀有度只建索引，不倒填供给。',
                '剩余分布为抵达目标且逐层有帧的历史首试实际观察；死亡/首试截止与缺层单列，不给未见后续补零；有幸存/路线选择偏差。',
                '升级仅显式启用SMITH选项；删牌仅显式available且未used服务；计机会不计已执行动作，不保证金币、升级目标或互斥选择可满足。',
                '机会数仍为记录下限，逐层有帧不保证同层全部奖励/服务均被记录；隐藏、解锁与版本效应不能由缺席证明。',
                'SE按独立局cluster sandwich；Wilson95仅独立机会二项式参考区间，不能替代局聚类误差；少于2局SE未知。',
                '稀有度内共用一个进阶加性偏移、牌/来源固定截距；观察性OLS非因果，A10越界不夹值；不可识别不假设零。'])
