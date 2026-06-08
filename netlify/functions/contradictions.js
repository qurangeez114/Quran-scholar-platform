const https = require('https');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  if (event.httpMethod === 'OPTIONS') return {statusCode:200, headers:cors, body:''};

  const SB_URL = 'ylosytbxpzxzwfzjpaej.supabase.co';
  const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlsb3N5dGJ4cHp4endmempwYWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNDY1MjcsImV4cCI6MjA5MTcyMjUyN30.yqigL9ILlXkQ7zi37rX3AUs7vjQBobTKuV-KzkSsAAs';

  const path = '/rest/v1/contradiction_analysis?select=*&limit=200';

  return new Promise((resolve) => {
    const options = {
      hostname: SB_URL, port: 443, path: path, method: 'GET',
      headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: 200, headers: cors, body: data }));
    });
    req.on('error', (e) => resolve({ statusCode: 500, headers: cors, body: JSON.stringify({error: e.message}) }));
    req.setTimeout(20000, () => { req.destroy(); resolve({ statusCode: 504, headers: cors, body: JSON.stringify({error:'timeout'}) }); });
    req.end();
  });
};
