import dgram from 'dgram';
import { multiaddr } from '@multiformats/multiaddr';

const server = dgram.createSocket('udp4');

const peers = {};

server.on('message', (msg, rinfo) => {
  try {
    const message = JSON.parse(msg.toString());

    if (message.type === 'register') {
      // Register the peer using multiaddress
      const peerMultiaddr = multiaddr(`/ip4/${rinfo.address}/udp/${rinfo.port}`);
      peers[message.name] = peerMultiaddr;
      console.log(`Registered ${message.name} at ${peerMultiaddr.toString()}`);
    } else if (message.type === 'connect') {
      const targetMultiaddr = peers[message.target];
      if (targetMultiaddr) {
        // Send target info to the requester
        const targetInfo = JSON.stringify({
          type: 'target-info',
          multiaddr: targetMultiaddr.toString(),
        });
        server.send(targetInfo, rinfo.port, rinfo.address);

        // Send requester info to the target
        const requesterMultiaddr = multiaddr(`/ip4/${rinfo.address}/udp/${rinfo.port}`);
        const requesterInfo = JSON.stringify({
          type: 'peer-info',
          multiaddr: requesterMultiaddr.toString(),
        });
        const targetOptions = targetMultiaddr.toOptions(); // Extract IP and port
        server.send(requesterInfo, targetOptions.port, targetOptions.host);
      } else {
        console.error(`Target ${message.target} not found`);
      }
    }
  } catch (err) {
    console.error('Error processing message:', err.message);
  }
});

server.bind(5000, () => {
  console.log('Signaling server listening on port 5000');
});