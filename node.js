const dgram = require('dgram');
const readline = require('readline');

const client = dgram.createSocket('udp4');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const signalingServer = { address: '144.24.127.147', port: 5000 }; // Replace with your server's public IP
let peerAddress = null;
let peerPort = null;

const registerWithServer = (name) => {
    const message = JSON.stringify({ type: 'register', name });
    client.send(message, signalingServer.port, signalingServer.address, (err) => {
      if (err) console.error('Error sending registration:', err);
      else console.log('Registered with signaling server.');
    });
};
  
const connectToPeer = (target) => {
    const message = JSON.stringify({ type: 'connect', target });
    client.send(message, signalingServer.port, signalingServer.address, (err) => {
      if (err) console.error('Error requesting connection:', err);
      else console.log(`Requested connection to ${target}`);
    });
};
  
client.on('message', (msg, rinfo) => {
    const message = JSON.parse(msg.toString());
  
    if (message.type === 'target-info' || message.type === 'peer-info') {
      peerAddress = message.address;
      peerPort = message.port;
      console.log(`Peer info received: ${peerAddress}:${peerPort}`);
  
      // Send initial punch-through packet as a JSON message
      const punchMessage = JSON.stringify({ type: 'punch', data: 'hello' });
      client.send(punchMessage, peerPort, peerAddress, (err) => {
        if (err) console.error('Error punching hole:', err);
      });
    } else {
      console.log(`Peer says: ${message.data}`);
    }
});
  
  // Command-line interface
rl.question('Enter your name: ', (name) => {
    registerWithServer(name);
  
    rl.question('Enter target peer name: ', (target) => {
      connectToPeer(target);
  
      rl.on('line', (line) => {
        if (peerAddress && peerPort) {
          const chatMessage = JSON.stringify({ type: 'chat', data: line });
          client.send(chatMessage, peerPort, peerAddress, (err) => {
            if (err) console.error('Error sending message:', err);
          });
        } else {
          console.log('Peer not connected yet.');
        }
      });
    });
});