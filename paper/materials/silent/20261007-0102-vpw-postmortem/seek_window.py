import json,os,sys
low,high,outpath=sys.argv[1:]
with open('logs/states.jsonl','rb') as f,open(outpath,'wb') as out:
 lo,hi=0,os.path.getsize('logs/states.jsonl')
 while hi-lo>200000:
  mid=(lo+hi)//2;f.seek(mid);f.readline();pos=f.tell();line=f.readline()
  if not line:hi=mid;continue
  if json.loads(line)['ts']<low:lo=pos
  else:hi=mid
 f.seek(lo)
 if lo:f.readline()
 count=0
 for line in f:
  d=json.loads(line)
  if d['ts']>high:break
  if d['ts']>=low:out.write(line);count+=1
 print('帧数',count,'起始偏移',lo,'结束偏移',f.tell())
