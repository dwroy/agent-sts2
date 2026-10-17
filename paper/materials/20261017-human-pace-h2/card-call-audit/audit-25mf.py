#!/usr/bin/env python3
"""Read frozen H1 projections and their original selected ranges; no SQL, model or game."""
import collections,gzip,hashlib,json
from pathlib import Path
from datetime import datetime
ROOT=Path(__file__).resolve().parents[4]
SRC=ROOT/'paper/materials/20261017-human-pace-h1/natural/inputs-25MFNPAE37R2'
OUT=Path(__file__).resolve().parent

def rows(name):
 with gzip.open(SRC/(name+'.jsonl.gz'),'rt') as f:return [json.loads(x) for x in f]

def raw(row):
 s=row['_source']
 with (ROOT/s['path']).open('rb') as f:f.seek(s['off']);b=f.read(s['len'])
 assert hashlib.sha256(b).hexdigest()==s['sha256']
 return json.loads(b)

def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def main():
 ds=[r for r in rows('decisions') if r.get('label')=='reward/card']
 bs=[r for r in rows('brain') if r.get('label')=='reward/card']
 ns=[r for r in rows('codex-calls') if r.get('label')=='reward/card']
 states=rows('states'); entries=[]
 for d in ds:
  original=raw(d)
  before=[s for s in states if s.get('floor')==d['floor'] and s.get('screen')=='REWARD' and s.get('ts','')<=d['ts']]
  s=max(before,key=lambda x:x['ts']) if before else None
  frame=raw(s)['state'] if s else None
  reward=frame.get('reward',{}) if frame else {}
  offers=[{k:v for k,v in c.items() if k in ['index','card_id','upgraded','name']} for c in reward.get('card_options',[])]
  entries.append({'ts':d['ts'],'floor':d['floor'],'decision_id':d['decision_id'],'source':d['_source'],'state_source':s['_source'] if s else None,
    'reasked':original.get('reasked'),'reused_answer':original.get('reused_answer'),'result':original.get('result'),
    'chosen':original.get('chosen'),'expect':original.get('expect'),'fingerprint_sha256':digest(original.get('fingerprint')),
    'options_sha256':digest(original.get('questions',{}).get('pick',{}).get('criteria',{})),
    'offers':offers,'offer_set_sha256':digest(offers),'deck_size':s.get('deck_size') if s else None,
    'pending':reward.get('pending_card_choice'),'reward_keys':list(reward)})
 floors=collections.Counter(d['floor'] for d in ds)
 result={'at':datetime.now().astimezone().isoformat(),'run':'25MFNPAE37R2','input_manifest':str(SRC.relative_to(ROOT)/'manifest.json'),
  'card_decisions':len(ds),'card_brain_rows':len(bs),'card_native_calls':len(ns),'unique_native_question_ids':len({r['question_id'] for r in ns}),
  'brain_reasks':sum(r.get('reasks',0) for r in bs),'brain_attempt_counts':dict(collections.Counter(r.get('attempts') for r in bs)),
  'native_outcomes':dict(collections.Counter(r.get('outcome') for r in ns)),
  'decision_reasked':sum(r['reasked'] is True for r in entries),'decision_reused':sum(r['reused_answer'] is True for r in entries),
  'floors':dict(sorted(floors.items())),'multiple_same_floor':{str(f):[r for r in entries if r['floor']==f] for f,n in floors.items() if n>1},
  'all_card_entries':entries,'brain_sources':bs,'native_sources':ns,
  'limits':'33次拿牌决策/33个原生问题分别计数；同层两次不能凭层号称重复调用。以原始待选项、已完成动作和状态核实；不推断未核实的奖励机制。约20次是转达中的惯常值，本任务不另造历史对照窗口。'}
 (OUT/'result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k not in ['all_card_entries','multiple_same_floor','brain_sources','native_sources']},ensure_ascii=False))
 for f,es in result['multiple_same_floor'].items():print(f,[(e['deck_size'],e['chosen'],[c.get('card_id') for c in e['offers']],e['options_sha256'][:8],e['state_source']['off'] if e['state_source'] else None) for e in es])
if __name__=='__main__':main()
