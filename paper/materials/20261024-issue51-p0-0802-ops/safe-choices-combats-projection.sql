SELECT r.patch_major,r.win,
 (SELECT json_group_array(json_extract(d.value,'$.id')) FROM json_each(r.raw_json,'$.players[0].deck') d),
 (SELECT json_group_array(json_object('act_index',a.key,'point_index',p.key,
 'rooms',json((SELECT json_group_array(json_object('room_type',json_extract(room.value,'$.room_type'),'encounter_id',json_extract(room.value,'$.model_id'),'turns_taken',json_extract(room.value,'$.turns_taken'))) FROM json_each(p.value,'$.rooms') room)),
 'damage_taken',json_extract(p.value,'$.player_stats[0].damage_taken'),
 'card_choices',json((SELECT json_group_array(json_object('card_id',json_extract(cc.value,'$.card.id'),'was_picked',json_extract(cc.value,'$.was_picked'))) FROM json_each(p.value,'$.player_stats[0].card_choices') cc))))
 FROM json_each(r.raw_json,'$.map_point_history') a JOIN json_each(a.value) p)
 FROM runs r WHERE r.character='SILENT' AND r.ascension=10 AND r.n_players=1 AND r.is_valid=1 AND r.was_abandoned=0 AND r.has_modifiers=0 AND r.patch_major IN ('v0.107','v0.108','v0.109','v0.110','v0.111');
