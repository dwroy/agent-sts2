SELECT r.patch_major,r.win,json_extract(r.raw_json,'$.build_id'),(SELECT json_group_array(json_object('id',json_extract(x.value,'$.id'),'added',json_extract(x.value,'$.floor_added_to_deck'))) FROM json_each(r.raw_json,'$.players[0].deck') x),(SELECT json_group_array(json_object('id',json_extract(x.value,'$.id'),'added',json_extract(x.value,'$.floor_added_to_deck'))) FROM json_each(r.raw_json,'$.players[0].relics') x),(SELECT json_group_array(json_object(
 'act',CAST(a.key AS INTEGER)+1,'point',CAST(p.key AS INTEGER)+1,
 'stats_n',json_array_length(p.value,'$.player_stats'),
 'hp',json_extract(p.value,'$.player_stats[0].current_hp'),
 'max_hp',json_extract(p.value,'$.player_stats[0].max_hp'),
 'damage',json_extract(p.value,'$.player_stats[0].damage_taken'),
 'healed',json_extract(p.value,'$.player_stats[0].hp_healed'),
 'gold_spent',json_extract(p.value,'$.player_stats[0].gold_spent'),
 'rooms',json((SELECT json_group_array(json_object('kind',json_extract(x.value,'$.room_type'),
   'id',json_extract(x.value,'$.model_id'),'turns',json_extract(x.value,'$.turns_taken')))
   FROM json_each(p.value,'$.rooms') x)),
 'choices',json((SELECT json_group_array(json_object('id',json_extract(x.value,'$.card.id'),
   'picked',json_extract(x.value,'$.was_picked'))) FROM json_each(p.value,'$.player_stats[0].card_choices') x)),
 'gained',json((SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'$.player_stats[0].cards_gained') x)),'removed',json((SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'$.player_stats[0].cards_removed') x)),'upgraded',json((SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'$.player_stats[0].upgraded_cards') x)),
 'transformed',json((SELECT json_group_array(json_object('old',json_extract(x.value,'$.original_card.id'),
   'new',json_extract(x.value,'$.final_card.id'))) FROM json_each(p.value,'$.player_stats[0].cards_transformed') x)),
 'relic_picks',json((SELECT json_group_array(json_extract(x.value,'$.choice')) FROM json_each(p.value,'$.player_stats[0].relic_choices') x
    WHERE json_extract(x.value,'$.was_picked')=1)),
 'bought_relics',json((SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'$.player_stats[0].bought_relics') x)),'removed_relics',json((SELECT json_group_array(CASE WHEN x.type='text' THEN x.value ELSE json_extract(x.value,'$.id') END) FROM json_each(p.value,'$.player_stats[0].relics_removed') x))))
 FROM json_each(r.raw_json,'$.map_point_history') a JOIN json_each(a.value) p) FROM runs r WHERE r.character='SILENT' AND r.ascension=10 AND r.n_players=1 AND r.is_valid=1 AND r.was_abandoned=0 AND r.has_modifiers=0 AND r.patch_major IN (?,?,?,?,?)
