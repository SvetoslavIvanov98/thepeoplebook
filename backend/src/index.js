require('dotenv').config();
const app = require('./app');
const http = require('http');
const { initSocket } = require('./services/socket.service');

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
