const https = require('https');
const repo = 'aa0313aa/010-5842-9536';
const options = { headers: { 'User-Agent': 'node.js' } };
function get(path){ return new Promise((res,rej)=>{
  https.get('https://api.github.com/repos/'+repo+path, options, r=>{
    let d=''; r.on('data',c=>d+=c); r.on('end',()=>{ try{ res(JSON.parse(d)); }catch(e){ rej(e); } });
  }).on('error',e=>rej(e));
})}
(async()=>{
  try{
    const workflows = await get('/actions/workflows');
    if(!workflows.workflows) return console.log('No workflows');
    for(const wf of workflows.workflows){
      console.log('\n==',wf.name,'==');
      try{
        const runs = await get('/actions/workflows/'+wf.id+'/runs?per_page=5');
        if(!runs.workflow_runs || runs.workflow_runs.length===0) console.log('  No recent runs');
        else for(const run of runs.workflow_runs) console.log('  ',run.status, run.conclusion, run.html_url, run.updated_at);
      }catch(e){ console.log('  failed to fetch runs',e.message); }
    }
  }catch(e){ console.error('Failed',e.message); }
})();
