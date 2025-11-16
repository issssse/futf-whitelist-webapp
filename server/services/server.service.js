const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../servers.json');
let serverConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

function saveServers() {
  fs.writeFileSync(configPath, JSON.stringify(serverConfig, null, 2));
}

function getServerConfig(serverId) {
  return serverConfig.servers.find(s => s.id === serverId);
}

function getAllServers() {
  return serverConfig.servers;
}

function createServer(newServer) {
  serverConfig.servers.push(newServer);
  saveServers();
  return newServer;
}

function updateServer(serverId, data) {
  const index = serverConfig.servers.findIndex(s => s.id === serverId);
  if (index === -1) return null;
  serverConfig.servers[index] = { ...serverConfig.servers[index], ...data, id: serverId };
  saveServers();
  return serverConfig.servers[index];
}

function deleteServer(serverId) {
  const index = serverConfig.servers.findIndex(s => s.id === serverId);
  if (index === -1) return false;
  serverConfig.servers.splice(index, 1);
  saveServers();
  return true;
}

module.exports = {
  getServerConfig,
  getAllServers,
  createServer,
  updateServer,
  deleteServer,
};
