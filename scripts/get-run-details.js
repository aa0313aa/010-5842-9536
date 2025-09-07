const https = require('https');
const runId = process.argv[2] || '17527261001';
const repo = 'aa0313aa/010-5842-9536';
const options = { headers: { 'User-Agent': 'node.js' } };
https.get(`https://api.github.com/repos/${repo}/actions/runs/${runId}`, options, res=>{
  let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
    try{ const j=JSON.parse(d); console.log(JSON.stringify(j, null, 2)); }
    catch(e){ console.error('parse failed', e.message); console.log(d); }
  })
}).on('error',e=>console.error('request failed', e.message));
