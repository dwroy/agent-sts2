/** Record actual model-data reads, including absent leaves, without supplying substitute knowledge. */
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
const original=fs.readFileSync,write=fs.writeFileSync;
const reads=new Map();
fs.readFileSync=function(path,...args){
 const name=path instanceof URL?fileURLToPath(path):typeof path==='string'?resolve(path):null;
 if(name&&/\/knowledge\/characters\/(?!silent\/)/.test(name))throw new Error('H0 forbidden foreign character knowledge: '+name);
 try{
  const value=original.call(this,path,...args);
  if(name&&(/\/knowledge\/.+\.json$/.test(name)||/\/data\/game-data\.json$/.test(name)))reads.set(name,{path:name,status:'read',sha256:createHash('sha256').update(value).digest('hex')});
  return value;
 }catch(error){
  if(name&&/\/knowledge\/.+\.json$/.test(name))reads.set(name,{path:name,status:'unavailable',error:error.code??String(error)});
  throw error;
 }
};
syncBuiltinESMExports();
process.on('exit',()=>{if(process.env.H0_READ_GUARD_OUT)write.call(fs,process.env.H0_READ_GUARD_OUT,JSON.stringify([...reads.values()],null,2)+'\n');});
