const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const peers = {}; // Store registered peers

server.on('message', (msg, rinfo) => {
  const message = JSON.parse(msg.toString());

  if (message.type === 'register') {
    // Register peer with its public IP/port
    peers[message.name] = { address: message.publicIP || rinfo.address, port: message.publicPort || rinfo.port };
    console.log(`Registered ${message.name} at ${peers[message.name].address}:${peers[message.name].port}`);
  } else if (message.type === 'connect') {
    const target = peers[message.target];
    if (target) {
      // Send target info to the requester
      const targetInfo = JSON.stringify({
        type: 'target-info',
        address: target.address,
        port: target.port,
      });
      server.send(targetInfo, rinfo.port, rinfo.address);

      // Send requester info to the target
      const requesterInfo = JSON.stringify({
        type: 'peer-info',
        address: rinfo.address,
        port: rinfo.port,
      });
      server.send(requesterInfo, target.port, target.address);
    } else {
      console.log(`Target ${message.target} not found.`);
    }
  }
});

server.bind(5000, () => {
  console.log('Signaling server listening on port 5000');
});