const dgram = require('dgram');
const server = dgram.createSocket('udp4');

const peers = {};

server.on('message', (msg, rinfo) => {
  const message = JSON.parse(msg.toString());
  
  if (message.type === 'register') {
    // Register the peer
    peers[message.name] = { address: rinfo.address, port: rinfo.port };
    console.log(`Registered ${message.name} at ${rinfo.address}:${rinfo.port}`);
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
    }
  }
});

server.bind(5000, () => {
  console.log('Signaling server listening on port 5000');
});
