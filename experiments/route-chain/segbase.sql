-- Stretches between rest sites (the learner's 20261003-095235 q-seg CTE, A8+A9 to its cutoff): append e.g. SELECT act, nfight, count(*), count(*) FILTER (WHERE dead) FROM g WHERE r0>=0.6 GROUP BY ALL
WITH r AS (SELECT run_id, ascension FROM runs WHERE finished AND ascension IN (8,9) AND ended<='2026-10-02T21:59:05'),
f AS (SELECT fl.run_id, fl.floor, fl.act, r.ascension a, fl.room_node, fl.had_combat, fl.died, fl.entry_hp, fl.entry_max_hp, fl.exit_hp, fl.exit_max_hp FROM floors fl JOIN r USING(run_id)),
s AS (SELECT *, sum(CASE WHEN room_node IN ('RestSite','Ancient') THEN 1 ELSE 0 END) OVER (PARTITION BY run_id, act ORDER BY floor) seg FROM f),
g AS (SELECT run_id, a, act, seg, min(floor) f0, arg_min(exit_hp*1.0/nullif(exit_max_hp,0), floor) r0, arg_min(room_node, floor) n0,
  count(*) FILTER (WHERE had_combat AND room_node<>'Boss') nfight,
  count(*) FILTER (WHERE room_node IN ('Monster','Elite')) nme,
  count(*) FILTER (WHERE room_node='Unknown') nunk,
  count(*) FILTER (WHERE room_node='Unknown' AND had_combat) nunkf,
  count(*) FILTER (WHERE room_node='Elite') nel,
  count(*) FILTER (WHERE room_node='Shop') nshop,
  bool_or(died AND room_node<>'Boss') dead, bool_or(room_node='Boss') toboss FROM s WHERE seg>0 GROUP BY ALL)
