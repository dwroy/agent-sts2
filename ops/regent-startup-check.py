"""Inspect the fixed private Regent save and open only its startup character menu."""
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.request import Request, urlopen

from instance_env import binding_env
from instance_gate import validate_health, validate_profile

spec = importlib.util.spec_from_file_location('regent_inspection', Path(__file__).with_name('regent-launch-inspect.py'))
probe = importlib.util.module_from_spec(spec);spec.loader.exec_module(probe)
BASE = 'http://127.0.0.1:18181'


def root_evidence(log):
    match = re.search(r'user://default/2026101302/modded/profile[0-9]+(?![A-Za-z0-9_])', log)
    if not match: raise ValueError('private modded save root is not proven by the native log')
    return match.group(0)


def eligible_action(state):
    # Startup only: never enter or replace an existing run, embark, select another role or run console commands.
    if state.get('run'): return None
    actions = state.get('available_actions') or []
    if state.get('screen') == 'MAIN_MENU' and 'open_character_select' in actions:
        return 'open_character_select'
    if state.get('screen') == 'MODAL':
        for action in ['dismiss_modal', 'confirm_modal']:
            if action in actions: return action
    return None


def summary(state):
    select = state.get('character_select') or {}
    if not isinstance(select, dict): raise ValueError('invalid character menu')
    characters = select.get('characters') or []
    roles = [{key: row.get(key) for key in ['character_id', 'is_locked']} for row in characters
             if isinstance(row, dict)]
    regent = next((row for row in roles if row['character_id'] == 'REGENT'), None)
    locked = regent.get('is_locked') if regent else None
    multiplayer = select.get('is_multiplayer')
    qualified = regent is not None and locked is False and multiplayer is False
    return {'screen': state.get('screen'), 'native_profile_id': state.get('native_profile_id'),
            'characters': roles, 'regent_present': regent is not None, 'regent_is_locked': locked,
            'is_multiplayer': multiplayer, 'qualified_for_regent': qualified, 'autoplay_started': False}


def fetch(route, action=None):
    request = Request(BASE + route)
    if action:
        request = Request(BASE + route, data=json.dumps({'action': action}).encode(), headers={'Content-Type':'application/json'})
    with urlopen(request, timeout=5) as response: envelope=json.load(response)
    if envelope.get('ok') is not True or not isinstance(envelope.get('data'), dict):
        raise ValueError('invalid private instance response')
    return envelope['data']


def inspect(binding, log, api=fetch):
    binding_env(binding)
    if binding.get('base_url') != BASE or binding.get('client_id') != '2026101302' or binding['process_id'] == 34676:
        raise ValueError('not the fixed new instance')
    save_root = root_evidence(log)
    if not save_root.endswith('/profile'+str(binding['native_profile_id'])):
        raise ValueError('logged native profile differs from the bound profile')
    def state():
        health=api('/health');validate_health(health,BASE,binding['process_id'])
        if health.get('instance_role') != 'human': raise ValueError('companion is not an independent solo')
        value=api('/state');validate_profile(value,str(binding['native_profile_id']))
        return value
    value=state();actions=[]
    for _ in range(3):
        action=eligible_action(value)
        if action is None: break
        value=state()
        if eligible_action(value) != action: break
        api('/action',action);actions.append(action)
        time.sleep(0.5);value=state()
    return {**summary(value),'save_root':save_root,'process_id':binding['process_id'],'base_url':BASE,'startup_actions':actions}


def main():
    if len(sys.argv)!=1: raise ValueError('startup check takes no arguments')
    root=Path(__file__).resolve().parent.parent;probe.lane_guard(root,os.environ)
    binding=json.loads((root/'ops/instance-binding.json').read_text())
    log=(root/'ops/codex-ops/regent-native/game.log').read_text(errors='replace')
    print(json.dumps(inspect(binding,log),ensure_ascii=False))


if __name__=='__main__':
    try: main()
    except (ValueError,OSError):
        print('Regent startup identity or menu is unverified; retained instance unchanged.',file=sys.stderr);sys.exit(78)
