"""#54 Boss-label audit from already allowlisted fields; aggregate-only supplement."""
from collections import Counter, defaultdict
import math


def number(value):return type(value) in (int,float) and math.isfinite(value)


def summary(values):
    a=sorted(v for v in values if number(v))
    return {'n':len(a),'missing_n':len(values)-len(a),'mean':sum(a)/len(a) if a else None,'min':a[0] if a else None,'max':a[-1] if a else None}


def observations(r,uid):
    positions=Counter();out=[]
    for i,p in enumerate(r['nodes']):
        combat=[room for room in p['rooms'] if room['kind'] in ('monster','elite','boss')]
        single=len(p['rooms'])==len(combat)==1 and not p.get('partial')
        for room_index,room in enumerate(p['rooms']):
            if room['kind']!='boss' or not isinstance(room['id'],str):continue
            positions[p['act']]+=1;later=i+1<len(r['nodes']);hp=p['hp']
            known=single and number(room['turns']) and room['turns']>0
            contradiction=number(hp) and hp<=0 and (later or bool(r['win']))
            outcome=None
            if not known:label='unknown_room_attribution_or_turns'
            elif contradiction:label='unknown_nonpositive_hp_conflict'
            elif number(hp) and hp<=0:label='terminal_hp_nonpositive';outcome=False
            elif later:label='passed_by_later_record';outcome=True
            elif r['win'] and number(hp) and hp>0:label='terminal_run_win_positive_hp';outcome=True
            else:label='terminal_or_missing_hp_unresolved'
            previous=r['nodes'][i-1] if i else None
            previous_hp=previous['hp'] if previous and number(previous['hp']) else None
            out.append({'uid':uid,'content':r['content_sha256'],'build':r['build'],'act':p['act'],'boss':room['id'],
                'boss_position':positions[p['act']],'record_ordinal':p['node'],'point_index':p['point']-1,'room_index':room_index,'node_index':i,
                'outcome':outcome,'outcome_label':label,'has_later_record':later,'terminal_point':not later,
                'end_hp_zero':hp==0 if number(hp) else None,'run_win':bool(r['win']),'contradictory':contradiction,
                'single_room':single,'end_hp':hp if number(hp) else None,'end_max_hp':p['max_hp'] if number(p['max_hp']) else None,
                'previous_point_end_hp':previous_hp,'previous_point_end_max_hp':previous['max_hp'] if previous and number(previous['max_hp']) else None,
                'hp_proxy':previous_hp if single else None,'gross_damage':p['damage'] if single and number(p['damage']) else None,
                'healing':p['healed'] if single and number(p['healed']) else None})
    return out


RULES={
    'source':'仅使用#54原白名单缓存；不扩大字段或重新导出原库',
    'passed_by_later_record':'单战斗单房间、回合数为正且无HP矛盾，有后继记录；仅延续代理',
    'terminal_run_win_positive_hp':'上述条件成立，无后继、整局win且节点末HP为正；仅终局胜代理',
    'terminal_hp_nonpositive':'上述条件成立，无后继、整局非win且末HP非正；仅终止HP标签',
    'conflict':'末HP非正却有后继或整局win时保持unknown；不以整局win替代任何其他单战结果',
    'unknown':'多房间、非单战斗、回合缺失/非正、残缺统计及其余终止/HP不足均unknown',
    'win_rate_proxy':'仅前两类/前三类合计的描述比例，非已认证单战胜率',
    'indices':'act_index/point_index/room_index从0开始；boss_position是本幕已记录Boss访问从1开始；record_ordinal是记录序号，全部不是已核floor',
}


def aggregate(groups):
    rows=[];paths=defaultdict(list)
    for (version,cluster),runs in sorted(groups.items()):
        grouped=defaultdict(list);by_uid=defaultdict(set)
        for index,r in enumerate(runs):
            uid=(version,cluster,index);obs=observations(r,uid)
            for o in obs:grouped[o['act'],o['boss']].append(o);by_uid[uid].add((o['act'],o['boss']))
            by_act=defaultdict(list)
            for o in obs:by_act[o['act']].append(o)
            for act,sequence in by_act.items():
                if act!=3:continue
                paths[version,cluster,r['build'],tuple(o['boss'] for o in sequence)].append(sequence)
        for (act,boss),values in sorted(grouped.items()):
            known=[o for o in values if o['outcome'] is not None];wins=sum(o['outcome'] for o in known);uids={o['uid'] for o in values}
            crosses=Counter((o['build'],o['outcome_label'],o['has_later_record'],o['terminal_point'],o['end_hp_zero'],o['run_win'],o['contradictory']) for o in values)
            overlaps=Counter(key for uid in uids for key in by_uid[uid] if key!=(act,boss))
            positions=Counter((o['build'],o['boss_position'],o['record_ordinal'],o['point_index'],o['room_index']) for o in values)
            costs={key:summary([o[key] if o['single_room'] else None for o in values]) for key in ('gross_damage','healing','end_hp','end_max_hp')}
            costs.update(entry_hp={'n':0,'missing_n':len(values)},verified_net_hp_loss={'n':0,'missing_n':len(values)},
                         multi_room_or_partial_n=sum(not o['single_room'] for o in values),
                         definition='仅单房间给记录总受伤与治疗；缺真实入场快照，净HP损失未知；多房间节点总值不分给单个Boss')
            rows.append({'version':version,'cluster':cluster,'act':act,'act_index':act-1,'boss':boss,'encounters':len(values),'boss_record_n':len(values),
                'distinct_uploaded_runs':len(uids),'distinct_content_n':len({o['content'] for o in values}),
                'duplicate_boss_visits_n':len(values)-len(uids),'independent_players':None,'player_cluster_uncertainty':'unknown',
                'outcome_known':len(known),'missing_n':len(values)-len(known),'wins_proxy':wins,'unknown':len(values)-len(known),
                'win_rate_proxy':wins/len(known) if known else None,
                'hp_previous_node_end_proxy':summary([o['hp_proxy'] for o in values]),
                'previous_point_context_hp':summary([o['previous_point_end_hp'] for o in values]),
                'outcome_definition':RULES,'hp_definition':'前一节点结束HP代理，仅单房间归属；非真实Boss入场HP',
                'outcome_cross_counts':[{'build_id':key[0],'outcome_label':key[1],'has_later_record':key[2],'terminal_point':key[3],
                    'end_hp_zero':key[4],'run_win':key[5],'contradictory':key[6],'n':n} for key,n in sorted(crosses.items(),key=lambda x:str(x[0]))],
                'position_counts':[{'build_id':b,'boss_position':pos,'record_ordinal':ordinal,'point_index':point,'room_index':room,'verified_floor':None,'n':n}
                    for (b,pos,ordinal,point,room),n in sorted(positions.items())],
                'overlap_with':[{'act_index':a-1,'boss':other,'distinct_uploaded_runs':n} for (a,other),n in sorted(overlaps.items())],
                'snapshot':{'snapshot_timing':'真实战前快照未在原投影中；仅另列节点末/前节点末代理','entry_hp':None,'entry_max_hp':None,
                    'entry_deck_present':None,'entry_potions_present':None,'true_entry_snapshot_missing_n':len(values),'verified_floor_missing_n':len(values)},
                'costs':costs})
    ordered=[]
    for (version,cluster,build,path),sequences in sorted(paths.items(),key=lambda x:str(x[0])):
        position=[]
        for i,boss in enumerate(path):
            values=[seq[i] for seq in sequences]
            position.append({'boss_position':i+1,'boss':boss,'records':len(values),
                'outcomes':dict(Counter(o['outcome_label'] for o in values)),
                'verified_floor':None,'verified_floor_missing_n':len(values),
                'location_counts':[{'record_ordinal':ordinal,'point_index':point,'room_index':room,'verified_floor':None,'n':n}
                    for (ordinal,point,room),n in sorted(Counter((o['record_ordinal'],o['point_index'],o['room_index']) for o in values).items())],
                'previous_point_end_hp_proxy':summary([o['hp_proxy'] for o in values]),
                'previous_point_end_max_hp_proxy':summary([o['previous_point_end_max_hp'] if o['single_room'] else None for o in values]),
                'after_point_hp':summary([o['end_hp'] if o['single_room'] else None for o in values]),
                'after_point_max_hp':summary([o['end_max_hp'] if o['single_room'] else None for o in values]),
                'same_point_with_previous_boss_n':sum(i>0 and seq[i]['node_index']==seq[i-1]['node_index'] for seq in sequences)})
        ordered.append({'version':version,'cluster':cluster,'build_id':build,'act_index':2,'observed_boss_path':list(path),
            'distinct_uploaded_runs':len(sequences),'observed_path_length':len(path),'positions':position,
            'first_outcome_unknown_n':sum(seq[0]['outcome'] is None for seq in sequences),
            'second_boss_not_recorded_n':len(sequences) if len(path)<2 else 0,
            'second_outcome_unknown_n':sum(seq[1]['outcome'] is None for seq in sequences) if len(path)>=2 else None,
            'censoring_definition':'仅观察到的访问前缀；未记录第二Boss不等于输掉第二场，未核真实计划长度/楼层；同节点多房间不能拆出场间快照',
            'true_entry_or_between_snapshot_available_n':0})
    availability=[
        {'id':'result-semantics','status':'available_proxy_only','detail':'逐build/幕/完整Boss交叉计数与冻结规则在matchups；冲突与缺失不强行判胜负'},
        {'id':'independent-denominators','status':'partial','detail':'上传查询行、重复访问、相同脱敏内容和组间重叠均可核；独立玩家与同自然局重复上传未知'},
        {'id':'pre-boss-snapshot','status':'unavailable','detail':'原白名单缓存无真实entry HP/maxHP/牌组/升级/药水快照、时钟或已核floor；不扩字段、不用推定/终局替代'},
        {'id':'cost-semantics','status':'partial','detail':'单房间记录damage_taken/healing/end HP有效n与缺失数可核；缺真实entry，净HP损失不可核；多房间不拆'},
        {'id':'mechanisms','status':'unavailable_for_game_rules','detail':'只有ID与未核历史对齐的目录正block代理；版本化机制、攻防贡献及核心牌含义未知，不从名称推断'},
        {'id':'snapshot-validity','status':'partial','detail':'保留样本终局牌组非空已知；原json_group_array不能区分被排除空/缺失，终局药水/精确奖励前后时点未投影'},
        {'id':'privacy-and-license','status':'available_with_limits','detail':'本补包仅安全聚合，不含逐局/玩家标识；#54新授权的160代表轨迹在另一文件，不能冒充旧085327 aggregate-only已读范围'},
        {'id':'issue50-fourth-requirement','status':'partial','detail':'第三幕已记录有序Boss路径/位置、上传行分母和后继缺失可核；实际F48/F49、真战前/场间快照、牌组药水及攻防准备度仍不可用'},
    ]
    packet={'rules':RULES,'availability':availability,'rows':ordered,
            'exclusions':{'missing_boss_id_n':sum(room['kind']=='boss' and not isinstance(room['id'],str) for runs in groups.values() for r in runs for p in r['nodes'] for room in p['rooms']),
                'unknown_outcomes_retained':True,'scope':'仅已分簇投影；投影前排除见projection_audit，未分簇见archetypes.unassigned'},
            'terminal_snapshot_availability':{'selected_uploads':sum(len(runs) for runs in groups.values()),
                'normalized_nonempty_deck_n':sum(bool(r['deck']) for runs in groups.values() for r in runs),
                'original_field_present_n':None,'original_field_empty_n':None,'original_field_missing_n':None,
                'potions_present_n':None,'snapshot_timing':'unknown; 原聚合无法恢复源字段present/empty/missing区别'},
            'scope':'#54现有统计语义补包；仅复用已冻结白名单缓存，旧#51批仍需原owner另行冻结/接续；未关闭任何unit',
            'upload_unit':'SQLite查询的一行上传记录，内部序号仅内存计数；不等于独立玩家或去重后的自然局，序号不导出'}
    return rows,packet
