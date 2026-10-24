from pathlib import Path
import importlib.util,json,tempfile
sandbox=tempfile.TemporaryDirectory(prefix='issue36-review-'); B=Path(sandbox.name); R=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('tui',R/'ops/learner_tui.py');t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t)
cwd='/fixture/learner'; marker='[learner-batch:independent]'; prompt=marker+'\nOriginal authorized task'
def row(kind,**payload): return dict(type=kind,payload=payload)
pre=row('response_item',type='message',role='user',content=[dict(type='input_text',text=f'# AGENTS.md instructions for {cwd}\n\n<INSTRUCTIONS>\nFixed instructions.\n</INSTRUCTIONS>'),dict(type='input_text',text=f'<environment_context>\n  <cwd>{cwd}</cwd>\n  <shell>bash</shell>\n</environment_context>')])
proof=dict(turn_id='fixture-turn',cwd=cwd,sha256=t.prompt_hash('\n'.join(p['text'] for p in pre['payload']['content'])))
start=[row('session_meta',id='fixture-session',cwd=cwd),row('event_msg',type='task_started',turn_id='fixture-turn')]
finish=[row('turn_context',turn_id='fixture-turn',cwd=cwd),row('response_item',type='message',role='user',content=[dict(type='input_text',text=prompt)]),row('event_msg',type='task_complete',turn_id='fixture-turn',last_agent_message='Report saved')]
activities=[row('response_item',type='function_call',name='foreign-tool'),row('response_item',type='local_shell_call',call_id='foreign-shell'),row('response_item',type='message',role='assistant',content=[dict(type='output_text',text='Foreign earlier answer')])]
results=[]
for activity in [None,*activities]:
 for position in ['before-prelude','after-prelude'] if activity else ['clean']:
  rows=[*start,*([activity] if position=='before-prelude' else []),pre,*([activity] if position=='after-prelude' else []),*finish]
  native=B/'fixed-native.jsonl'; native.write_text(''.join(json.dumps(r)+'\n' for r in rows))
  receipt=dict(submitted=True,cwd=cwd,native_context_version=1,native_preludes=[proof],submissions=[dict(marker=marker,prompt_sha256=t.prompt_hash(prompt))],bindings=[dict(turn_id='fixture-turn',marker=marker,prompt_sha256=t.prompt_hash(prompt))],result=dict(rollout=str(native),session='fixture-session',turn='fixture-turn',code=0,message='Report saved'))
  try:t.verify_native(receipt);accepted=True;error=None
  except ValueError as e:accepted=False;error=str(e)
  results.append(dict(activity=activity['payload']['type'] if activity else 'none',position=position,python_native_accepted=accepted,error=error))
print(json.dumps(results)); sandbox.cleanup()
