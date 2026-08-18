const http = require('http');
const fs = require('fs');
const path = require('path');
const types = { '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html' };

http.createServer((request, response) => {
  const requested = request.url === '/' ? 'index.html' : request.url.split('?')[0];
  const file = path.join(__dirname, requested);
  if (!file.startsWith(__dirname)) return response.end('Not found');
  fs.readFile(file, (error, data) => {
    response.writeHead(error ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    response.end(error ? 'Not found' : data);
  });
}).listen(8080, () => console.log('http://localhost:8080'));
