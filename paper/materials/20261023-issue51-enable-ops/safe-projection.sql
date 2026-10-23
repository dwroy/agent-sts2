SELECT r.patch_major,r.win,json_extract(r.raw_json,'$.build_id'),
 (SELECT json_group_array(json_extract(card.value,'$.id')) FROM json_each(r.raw_json,'$.players[0].deck') card),
 (SELECT json_group_array(CASE WHEN pot.type='object' THEN json_extract(pot.value,'$.id') WHEN pot.type='text' THEN pot.value ELSE NULL END) FROM json_each(r.raw_json,'$.players[0].potions') pot),
 (SELECT json_group_array(json_object(
   'act_index',a.key,'point_index',p.key,'floor',json_extract(p.value,'$.floor'),'floor_num',json_extract(p.value,'$.floor_num'),
   'map_point_type',json_extract(p.value,'$.map_point_type'),
   'rooms',json((SELECT json_group_array(json_object('room_type',json_extract(room.value,'$.room_type'),'model_id',json_extract(room.value,'$.model_id'),'turns_taken',json_extract(room.value,'$.turns_taken'))) FROM json_each(p.value,'$.rooms') room)),
   'current_hp',json_extract(p.value,'$.player_stats[0].current_hp'),'max_hp',json_extract(p.value,'$.player_stats[0].max_hp'),
   'damage_taken',json_extract(p.value,'$.player_stats[0].damage_taken'),'hp_healed',json_extract(p.value,'$.player_stats[0].hp_healed'),
   'deck_present',json_type(p.value,'$.player_stats[0].deck'),'deck_count',json_array_length(p.value,'$.player_stats[0].deck'),
   'potions_present',json_type(p.value,'$.player_stats[0].potions'),'potion_count',json_array_length(p.value,'$.player_stats[0].potions')
 )) FROM json_each(r.raw_json,'$.map_point_history') a JOIN json_each(a.value) p)
 FROM runs r WHERE r.character='SILENT' AND r.ascension=10 AND r.n_players=1 AND r.is_valid=1 AND r.was_abandoned=0 AND r.has_modifiers=0
 AND r.patch_major IN ('v0.107','v0.108','v0.109','v0.110','v0.111');
