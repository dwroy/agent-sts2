-- Per Monster/Elite room: its index kme among the map's Monster/Elite rooms of its stretch; append e.g. SELECT act, least(kme,5), count(*), count(*) FILTER (WHERE died) FROM h WHERE r0>=0.6 GROUP BY ALL
WITH r AS (SELECT run_id, ascension FROM runs WHERE finished AND ascension IN (8,9) AND ended<='2026-10-02T21:59:05'),
f AS (SELECT fl.run_id, fl.floor, fl.act, r.ascension a, fl.room_node, fl.had_combat, fl.died, fl.entry_hp, fl.entry_max_hp, fl.exit_hp, fl.exit_max_hp FROM floors fl JOIN r USING(run_id)),
s AS (SELECT *, sum(CASE WHEN room_node IN ('RestSite','Ancient') THEN 1 ELSE 0 END) OVER (PARTITION BY run_id, act ORDER BY floor) seg FROM f),
s2 AS (SELECT *, 
  sum(CASE WHEN room_node IN ('Monster','Elite') THEN 1 ELSE 0 END) OVER (PARTITION BY run_id, act, seg ORDER BY floor) kme,
  sum(CASE WHEN room_node='Unknown' THEN 1 ELSE 0 END) OVER (PARTITION BY run_id, act, seg ORDER BY floor ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) unk_before,
  first_value(exit_hp*1.0/nullif(exit_max_hp,0)) OVER (PARTITION BY run_id, act, seg ORDER BY floor) r0
  FROM s WHERE seg>0),
h AS (SELECT * FROM s2 WHERE room_node IN ('Monster','Elite'))
