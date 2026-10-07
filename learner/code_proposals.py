#!/usr/bin/env python3
"""Append-only learner proposals and evidence links; the scheduler never creates game claims."""
import argparse
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import datetime as dt

POLICY = 'Roy-2026-10-07-learning'
DOMAINS = {'combat', 'potion', 'sl', 'terminal', 'structure'}
TASKS = {'postmortem', 'experience-update', 'strategy-proposal', 'ascension-audit', 'experience-asc-audit', 'mechanics-audit',
         'fix-batch', 'silent-double-boss', 'silent-boss-calibration', 'boss-sim-automation', 'codex-only-brain'}
QUEUE = 'paper/materials/learning/code-proposals.jsonl'

def now(): return dt.datetime.now().astimezone().isoformat(timespec='seconds')

def fold(path):
    items = {}
    if not path.exists(): return items
    def apply(line):
        row = json.loads(line)
        if row.get('op') == 'add': items[row['id']] = row
        elif row.get('op') == 'update' and row.get('id') in items:
            items[row['id']].update({k:v for k,v in row.items() if k not in ('op','id')})
    previous = None
    with path.open() as handle:
        for line in handle:
            if not line.strip(): continue
            try: row = json.loads(line)
            except ValueError: row = {}
            if row.get('op') == 'recovery':
                if previous is None or row.get('partial_sha256') != hashlib.sha256(previous.rstrip('\n').encode()).hexdigest():
                    raise ValueError('invalid proposal partial-row recovery')
                previous = None
                continue
            if previous is not None: apply(previous)
            previous = line
    if previous is not None and previous.endswith('\n'): apply(previous)
    return items

def validate(item, root, ledger, runs):
    fields={'character','source_task','target_task','domains','summary','ledger','runs','proposal','experience',
            'rule_changes','authorization','implemented_commit'}
    if not isinstance(item,dict) or set(item)-fields: raise ValueError('unknown proposal fields')
    character = item.get('character')
    if not isinstance(character, str) or not re.fullmatch('[a-z][a-z0-9_]*', character): raise ValueError('invalid character')
    if item.get('source_task') not in TASKS or item.get('target_task') != 'strategy-proposal': raise ValueError('invalid task link')
    for key in ('domains','ledger','runs'):
        if not isinstance(item.get(key),list) or not item[key] or not all(isinstance(x,str) for x in item[key]):
            raise ValueError('missing string list: '+key)
    if not set(item['domains']) <= DOMAINS: raise ValueError('missing implementation domains')
    if 'experience' in item and (not isinstance(item['experience'],list) or not all(isinstance(x,str) for x in item['experience'])):
        raise ValueError('invalid experience links')
    if not isinstance(item.get('summary'), str) or not item['summary'].strip(): raise ValueError('missing summary')
    if not item.get('ledger') or not item.get('runs'): raise ValueError('missing ledger or evidence runs')
    evidence = set()
    for ident in item['ledger']:
        entry = ledger.get(ident)
        if not entry or entry.get('character') != character: raise ValueError('foreign or missing ledger item')
        evidence.update(e.get('run') for e in entry.get('evidence', []))
    for run in item['runs']:
        if run not in evidence or run not in runs or str(runs[run].get('character', 'IRONCLAD')).lower() != character:
            raise ValueError('run lacks own-character ledger evidence')
    path = Path(item.get('proposal', '')).resolve()
    allowed = [root / 'learner/runs', root / '.worktrees', root / 'paper/materials' / character]
    if path.suffix != '.md' or not any(path.is_relative_to(p.resolve()) for p in allowed) or not path.is_file():
        raise ValueError('proposal must be a preserved Markdown file inside the project')
    if item.get('rule_changes') is True and item.get('authorization') != POLICY: raise ValueError('rule change needs the existing Roy authorization link')
    return path

def required(entry):
    scope = entry.get('scope', '')
    return scope.startswith(('boss:', 'elite:', 'hallway:', 'card:', 'potion:', 'general:combat', 'general:sl',
        'general:terminal', 'general:potion', 'general:deck', 'general:plan', 'general:poison', 'general:shiv',
        'general:draw', 'general:discard', 'general:block', 'general:strength', 'general:dexterity', 'general:energy')) or bool(re.search(r'出牌|药水|SL|终局|战斗|伤害|格挡|施毒|抽牌|弃牌|敏捷|力量', entry.get('lesson', '')))

def audit_experience(before, after, proposals, character):
    old = {e['id']:e for e in before.get('entries', [])}
    missing = []
    for entry in after.get('entries', []):
        if old.get(entry['id']) == entry or entry.get('status') != 'active' or not required(entry): continue
        links = [p for p in proposals.values() if p.get('character') == character and entry['id'] in p.get('experience', [])
                 and p.get('source_task') in ('experience-update', 'experience-asc-audit') and p.get('target_task') == 'strategy-proposal']
        if not any(set(entry.get('evidence', [])) & set(p.get('runs', [])) and p.get('ledger') for p in links): missing.append(entry['id'])
    return missing

def append(path, row):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('a+b') as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        size = handle.seek(0,os.SEEK_END)
        if size:
            handle.seek(size-1)
            if handle.read(1) != b'\n':
                # Preserve a crashed append verbatim and mark it incomplete before adding the retry.
                start = size
                chunks = []
                while start:
                    begin = max(0,start-4096);handle.seek(begin);chunk = handle.read(start-begin)
                    newline = chunk.rfind(b'\n')
                    chunks.insert(0,chunk[newline+1:] if newline >= 0 else chunk)
                    if newline >= 0: break
                    start = begin
                partial = b''.join(chunks)
                recovery = {'op':'recovery','ts':now(),'partial_sha256':hashlib.sha256(partial).hexdigest()}
                handle.write(b'\n'+json.dumps(recovery).encode()+b'\n')
        handle.write((json.dumps(row, ensure_ascii=False) + '\n').encode())
        handle.flush();os.fsync(handle.fileno())

def report_links(report, proposals, character):
    ids = report.get('code_proposals')
    if not isinstance(ids, list) or not all(isinstance(i,str) for i in ids): return ['missing string code_proposals array']
    errors = []
    domains = report.get('implementation_domains')
    if not isinstance(domains,list) or not all(isinstance(d,str) and d in DOMAINS for d in domains):
        errors.append('missing or invalid implementation_domains array')
    for ident in ids:
        p = proposals.get(ident)
        if not p or p.get('character') != character: errors.append('foreign or missing proposal: ' + str(ident))
    if report.get('implementation_domains') and not ids: errors.append('implementation-domain lesson has no code proposal')
    return errors

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=['add', 'pending', 'check-experience'])
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--character', required=True)
    parser.add_argument('--before', type=Path)
    parser.add_argument('--after', type=Path)
    args = parser.parse_args();root = args.root.resolve();path = root / QUEUE
    if args.command == 'pending':
        print(json.dumps([p for p in fold(path).values() if p.get('character') == args.character and p.get('state') in ('pending','waiting')],ensure_ascii=False));return 0
    if args.command == 'check-experience':
        missing = audit_experience(json.loads(args.before.read_text()),json.loads(args.after.read_text()),fold(path),args.character)
        print(json.dumps({'missing':missing,'policy':POLICY},ensure_ascii=False));return 1 if missing else 0
    item = json.load(sys.stdin)
    if item.get('character') != args.character: raise ValueError('character differs from task')
    module_path = Path(__file__).with_name('ledger.py')
    spec = importlib.util.spec_from_file_location('proposal_ledger', module_path);ledger = importlib.util.module_from_spec(spec);spec.loader.exec_module(ledger)
    entries = ledger.fold(ledger.read_rows(str(root/'paper/materials/learning/ledger.jsonl')))
    proposal = validate(item,root,entries,ledger.load_runs(str(root/'logs/runs.jsonl')) or {})
    item['proposal'] = str(proposal)
    item['proposal_sha256'] = hashlib.sha256(proposal.read_bytes()).hexdigest()
    implemented = item.get('implemented_commit')
    if implemented is not None:
        if not isinstance(implemented,str) or not re.fullmatch('[0-9a-f]{7,40}',implemented) or subprocess.run(
                ['git','-C',str(root/'.worktrees/live'),'merge-base','--is-ancestor',implemented,'HEAD'],
                stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL).returncode:
            raise ValueError('implemented source is not an actual live ancestor')
    identity = hashlib.sha256(json.dumps(item,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:16]
    ident = args.character + '-proposal-' + identity
    path.parent.mkdir(parents=True,exist_ok=True)
    with (path.with_suffix('.lock')).open('a') as lock:
        fcntl.flock(lock,fcntl.LOCK_EX)
        if ident in fold(path): print(ident);return 0
        updates = [{'id':i,'by':'learner:'+item['source_task'],'where':{'proposal':[str(proposal)]},
                    'note':'代码提案 '+ident+' → task=strategy-proposal；'+POLICY} for i in item['ledger']]
        env = dict(os.environ,LEDGER_FILE=str(root/'paper/materials/learning/ledger.jsonl'),LEDGER_RUNS=str(root/'logs/runs.jsonl'),LEDGER_VERSIONS=str(root/'eval/versions.json'))
        result = subprocess.run([sys.executable,str(module_path),'update'],input='\n'.join(json.dumps(u,ensure_ascii=False) for u in updates),text=True,capture_output=True,env=env)
        if result.returncode: raise ValueError('ledger link failed: '+result.stderr.strip())
        append(path,{'op':'add','id':ident,'ts':now(),**item,'state':'implemented' if implemented else 'pending'})
    print(ident);return 0

if __name__ == '__main__':
    try: sys.exit(main())
    except (ValueError,OSError,KeyError,TypeError) as error:
        print(str(error),file=sys.stderr);sys.exit(2)
