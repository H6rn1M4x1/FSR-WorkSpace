const https = require('https');
https.get('https://dolarapi.com/v1/dolares', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).map(d => d.casa)));
});
