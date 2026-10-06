import json,sys
for line in sys.stdin:
 d=json.loads(line)
 if '王室猛毒' in str(d.get('journal',{})) or 'ROYAL_POISON' in str(d.get('expect',{})):
  print(json.dumps({'run':d.get('run_id'),'ts':d['ts'],'floor':d.get('floor'),'label':d['label'],'journal':d.get('journal')},ensure_ascii=False))
