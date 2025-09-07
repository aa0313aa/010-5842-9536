const https = require('https');
const repo = 'aa0313aa/010-5842-9536';
const options = {
  headers: { 'User-Agent': 'node.js' }
};
https.get(`https://api.github.com/repos/${repo}/pages/builds`, options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const arr = JSON.parse(data);
      if (!Array.isArray(arr) || arr.length === 0) return console.log('No Pages builds found');
      const latest = arr[0];
      console.log('status:', latest.status);
      console.log('log_url:', latest.html_url || latest.url || 'n/a');
      console.log('updated_at:', latest.updated_at);
    } catch (e) {
      console.error('Failed to parse response', e.message);
      console.error(data);
    }
  });
}).on('error', e => console.error('Request failed', e.message));
