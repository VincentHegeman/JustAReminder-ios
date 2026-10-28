import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve, sep, extname } from 'node:path';
const root = resolve('www');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.webmanifest':'application/manifest+json','.json':'application/json'};
createServer(async(req,res)=>{
 try {
  const raw = new URL(req.url || '/', 'http://localhost').pathname;
  let path = resolve(join(root, decodeURIComponent(raw)));
  if(!(path===root || path.startsWith(root+sep))){res.writeHead(403);res.end('Forbidden');return;}
  if((await stat(path)).isDirectory())path=join(path,'index.html');
  const data=await readFile(path);res.writeHead(200,{'Content-Type':(types[extname(path)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store'});res.end(data);
 } catch {res.writeHead(404);res.end('Not found');}
}).listen(4173,'127.0.0.1',()=>console.log('Open http://localhost:4173 in je browser (Ctrl+C om te stoppen).'));
