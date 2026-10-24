"""#54 authorized decision-field audit; fixed JSON projection, no identity values."""
import argparse
from collections import Counter,defaultdict
import gzip
import json
from pathlib import Path

import sts2fun_build_projection as source
from sts2fun_build_stats import db_identity

FIELDS=('ancient_choice','bought_cards','bought_colorless','bought_relics','bought_potions','cards_removed',
        'event_choices','potion_choices','potion_used','potion_discarded','rest_site_choices','upgraded_cards','cards_gained')
TEXT_FIELDS={'ancient_choice':('TextKey','title','was_chosen'),'event_choices':('title',),
             'potion_choices':('choice','was_picked')}
CATEGORIES={
 'opening_blessing':{'fields':['ancient_choice'],'status':'act1_ancient_proxy','limit':'按幕/房间列ancient选项与was_chosen；第一幕仅作开局祝福代理，未证实际首节点或所有局开局字段完整。'},
 'shop':{'fields':['bought_cards','bought_colorless','bought_relics','bought_potions','cards_gained'],'status':'partial','limit':'仅bought_*为显式购买；shop所得牌/遗物只能作取得代理。无逐物价格、购买前金币或全部货架拒选。'},
 'removal':{'fields':['cards_removed'],'status':'recorded','limit':'记录移除ID，不能仅据此认定花钱删牌；结合房间也只是来源代理。'},
 'events':{'fields':['event_choices'],'status':'partial','limit':'记录title文本/键；没有变量与完整备选项，不由标题解释机制或收益。'},
 'potions':{'fields':['potion_choices','potion_used','potion_discarded','bought_potions'],'status':'node_level_only','limit':'获得候选/是否实选、节点使用/丢弃可记；无回合/动作顺序/即时HP，不能据此学精确用药时机。'},
 'rest_smith':{'fields':['rest_site_choices','upgraded_cards'],'status':'recorded_choice','limit':'记录选择ID与升级牌ID；current_hp为节点末，休息前HP不真实可用，前节点末HP仅代理。'},
}


def field_sql(name):
    path="'$.player_stats[0]."+name+"'"
    if name in TEXT_FIELDS:
        parts=','.join("'"+k+"',"+("CASE WHEN json_type(e.value,'$.title')='object' THEN json_object('key',json_extract(e.value,'$.title.key'),'table',json_extract(e.value,'$.title.table')) ELSE json_extract(e.value,'$.title') END" if k=='title' else "json_extract(e.value,'$."+k+"')") for k in TEXT_FIELDS[name])
        item="CASE WHEN e.type='object' THEN json_object("+parts+") ELSE NULL END"
    else:
        item="CASE WHEN e.type='text' THEN e.value WHEN e.type='object' THEN json_extract(e.value,'$.id') ELSE NULL END"
    return "'"+name+"',json_object('type',json_type(n.value,"+path+"),'raw_item_n',json_array_length(n.value,"+path+"),'items',json((SELECT json_group_array("+item+") FROM json_each(n.value,"+path+") e)))"


SQL="""SELECT r.patch_major,r.win,json_extract(r.raw_json,'$.build_id'),
 json_type(r.raw_json,'$.players[0].potions'),json_array_length(r.raw_json,'$.players[0].potions'),
 (SELECT json_group_array(CASE WHEN t.type='text' THEN t.value WHEN t.type='object' THEN json_extract(t.value,'$.id') ELSE NULL END) FROM json_each(r.raw_json,'$.players[0].potions') t),
 (SELECT json_group_array(json_object('act',CAST(a.key AS INTEGER)+1,'point',CAST(n.key AS INTEGER)+1,
 'stats_n',json_array_length(n.value,'$.player_stats'),'hp',json_extract(n.value,'$.player_stats[0].current_hp'),
 'gold',json_extract(n.value,'$.player_stats[0].current_gold'),'map_point_type',json_extract(n.value,'$.map_point_type'),
 'rooms',json((SELECT json_group_array(json_object('kind',json_extract(z.value,'$.room_type'),'id',json_extract(z.value,'$.model_id'))) FROM json_each(n.value,'$.rooms') z)),
 """+','.join(field_sql(f) for f in FIELDS)+""")) FROM json_each(r.raw_json,'$.map_point_history') a JOIN json_each(a.value) n)
 FROM runs r WHERE """+source.FILTER+' AND r.patch_major IN ('+','.join('?' for _ in source.VERSIONS)+')'


def normalize_items(field,items):
    out=[];invalid=0
    for item in items:
        if field in TEXT_FIELDS:
            if not isinstance(item,dict):invalid+=1;continue
            clean={}
            for key in TEXT_FIELDS[field]:
                value=item.get(key)
                if key in ('was_chosen','was_picked'):
                    clean[key]=value if value in (True,False,0,1) else None
                elif key=='title' and isinstance(value,dict):clean[key]={k:v for k,v in value.items() if k in ('key','table') and isinstance(v,str)} or None
                else:clean[key]=value if isinstance(value,str) else None
            if not any(v is not None for v in clean.values()):invalid+=1;continue
            out.append(clean)
        elif isinstance(item,str) and len(item)<=160 and all(c.isupper() or c.isdigit() or c in '._-' for c in item):out.append(item)
        else:invalid+=1
    return out,invalid


def project(db):
    con=source.connect(db);runs=[]
    try:
        for version,win,build,potion_type,potion_n,potions,nodes in con.execute(SQL,source.VERSIONS):
            parsed=sorted(json.loads(nodes),key=lambda n:(n['act'],n['point']))
            for node in parsed:
                for field in FIELDS:
                    node[field]['items'],node[field]['invalid_items']=normalize_items(field,node[field]['items'])
            potions,invalid=normalize_items('terminal_potions',json.loads(potions))
            runs.append({'version':version,'win':win,'build':build,'terminal_potions':{'type':potion_type,'raw_item_n':potion_n,'items':potions,'invalid_items':invalid},'nodes':parsed})
    finally:con.close()
    return sorted(runs,key=source.canonical)


def aggregate(runs):
    counts=defaultdict(Counter);items=defaultdict(lambda:{'n':0,'wins':0,'uploads':set(),'winning_uploads':set(),'hp':[],'previous_hp':[],'gold':[]})
    terminal=defaultdict(Counter);cohorts=Counter();invalid=Counter()
    for uid,r in enumerate(runs):
        version,build=r['version'],r['build'];cohorts[version,build]+=1
        t=r['terminal_potions'];tc=terminal[version,build,bool(r['win'])]
        tc['runs']+=1;tc['array_present']+=t['type']=='array';tc['empty_array']+=t['type']=='array' and t['raw_item_n']==0;tc['missing_or_null']+=t['type'] in (None,'null')
        tc['invalid_items']+=t['invalid_items'];tc['recorded_potion_slots']+=len(t['items'])
        previous=None
        for n in r['nodes']:
            rooms=tuple((x['kind'],x['id']) for x in n['rooms'])
            for field in FIELDS:
                f=n[field];c=counts[version,build,field];c['nodes']+=1
                if n['stats_n']!=1:c['non_solo_excluded']+=1;continue
                c['present_array']+=f['type']=='array';c['missing_or_null']+=f['type'] in (None,'null');c['wrong_type']+=f['type'] not in (None,'null','array')
                if f['type']!='array':continue
                c['empty_array']+=f['raw_item_n']==0;c['nonempty_array']+=bool(f['raw_item_n']);c['item_n']+=len(f['items']);c['invalid_items']+=f['invalid_items']
                for value in f['items']:
                    key=(version,build,n['act'],rooms,field,source.canonical(value).decode().strip())
                    cell=items[key];cell['n']+=1;cell['wins']+=r['win']==1;cell['uploads'].add(uid)
                    if r['win']==1:cell['winning_uploads'].add(uid)
                    for dst,v in [('hp',n['hp']),('previous_hp',previous),('gold',n['gold'])]:
                        if type(v) in (int,float):cell[dst].append(v)
            previous=n['hp'] if n['stats_n']==1 else None
    def metric(a,n):return {'n':len(a),'missing_n':n-len(a),'mean':sum(a)/len(a) if a else None}
    rows=[]
    for (v,b,a,rooms,f,value),cell in sorted(items.items(),key=lambda x:str(x[0])):
        rows.append({'version':v,'build_id':b,'act':a,'rooms':[{'kind':kind,'id':ident} for kind,ident in rooms],
                     'field':f,'value':json.loads(value),'item_occurrences':cell['n'],'distinct_uploaded_runs':len(cell['uploads']),
                     'whole_run_winning_uploads':len(cell['winning_uploads']),'whole_run_win_occurrences':cell['wins'],'whole_run_win_rate_descriptive':cell['wins']/cell['n'],
                     'node_end_hp':metric(cell['hp'],cell['n']),'previous_node_end_hp_proxy':metric(cell['previous_hp'],cell['n']),
                     'node_end_gold':metric(cell['gold'],cell['n'])})
    return {'cohorts':[{'version':v,'build_id':b,'n':n} for (v,b),n in sorted(cohorts.items())],
            'field_availability':[{'version':v,'build_id':b,'field':f,**dict(c)} for (v,b,f),c in sorted(counts.items())],
            'terminal_potions':[{'version':v,'build_id':b,'whole_run_win':w,**dict(c),'snapshot_timing':'run文件终局保存字段；实际奖励/死亡时点未记录，不等于战前持药'} for (v,b,w),c in sorted(terminal.items())],
            'categories':CATEGORIES,'rows':rows,
            'decision_unit_readiness':[
                {'unit':'1-potions','status':'partial_proxy','available':'节点获得/实选/使用/丢弃和终局保存药水数','unavailable':'回合时机、使用前HP、双Boss场间真实持药快照；不以无使用记录推断有机会未用'},
                {'unit':'2-rest-route','status':'partial_proxy','available':'休息选择、升级ID、已记录房间类型/精英节点数','unavailable':'选择前真实HP、未走分支/路线反事实；前节点末HP仅代理'},
                {'unit':'3-opening','status':'partial_proxy','available':'ancient选项/选择、早期拿牌ID和顺序；可与既有四表联读','unavailable':'历史版本对齐的牌机制/伤害防御分类、跳过动机、最低可行牌组阈值'}],
            'limits':['来源固定6348 Silent A10单人有效上传记录，版本/build分列。','分母是上传行/节点/条目；同局可多次选择，不视为独立玩家。','所有胜率是整局结局按条目计数的描述关联，不是单战通过率或因果收益。','字段缺失/空数组/非法类型及单人节点不成立分开列；缺字段不证明没有动作，不能当拒选对照；无实选标志的事件title不补造备选。','不选player_id、seed、时间、原局标识或原JSON；只交安全聚合。']}


def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('db','identity-receipt','provenance','cache','output'):p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--check',action='store_true');a=p.parse_args(argv)
    identity=db_identity(a.db,a.identity_receipt)
    provenance=json.loads(a.provenance.read_bytes())['provenance']
    if identity['sha256']!=provenance['database_sha256']:raise ValueError('database provenance differs')
    key={'database':identity,'query_sha256':source.sha(SQL.encode()),'projection_code_sha256':source.sha(Path(__file__).read_bytes())}
    a.cache.mkdir(parents=True,exist_ok=True);cache=a.cache/'decision-fields.json.gz';receipt=a.cache/'receipt.json'
    if receipt.exists():
        saved=json.loads(receipt.read_bytes());raw=cache.read_bytes()
        if saved['input']!=key or source.sha(raw)!=saved['cache_sha256']:raise ValueError('decision cache binding differs')
        runs=json.loads(gzip.decompress(raw))
    else:
        runs=project(a.db);raw=gzip.compress(source.canonical(runs),mtime=0);cache.write_bytes(raw)
        receipt.write_bytes(source.canonical({'input':key,'cache_sha256':source.sha(raw)}))
    if a.db.stat().st_size!=identity['size'] or a.db.stat().st_mtime_ns!=identity['mtime_ns']:raise ValueError('source database changed')
    output=aggregate(runs);output.update(source='external:sts2fun',design='observational',query_sha256=key['query_sha256'],
        script_sha256=key['projection_code_sha256'],database_identity=identity,
        provenance={k:provenance[k] for k in ('url','faq','downloaded_at','database_sha256','compressed_sha256','license') if k in provenance},
        request='https://github.com/dwroy/agent-sts2/issues/51#issuecomment-6378493412')
    outputs={'statistics.json':source.canonical(output),'safe-projection.sql':SQL.encode()+b'\n'}
    outputs['manifest.json']=source.canonical({'files':{name:{'bytes':len(raw),'sha256':source.sha(raw)} for name,raw in outputs.items()}})
    a.output.mkdir(parents=True,exist_ok=True)
    for name,raw in outputs.items():
        if a.check:
            if (a.output/name).read_bytes()!=raw:raise ValueError('decision output differs: '+name)
        else:(a.output/name).write_bytes(raw)
    print(json.dumps({'games':len(runs),'field_cells':len(output['field_availability']),'choice_cells':len(output['rows']),'checked':a.check}))
    return 0


if __name__=='__main__':raise SystemExit(main())
