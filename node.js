const dgram = require('dgram');
const readline = require('readline');

const client = dgram.createSocket('udp4');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const signalingServer = { address: '144.24.127.147', port: 5000 }; // Replace with your signaling server's public IP
let peerAddress = null;
let peerPort = null;

// Register with the signaling server
const registerWithServer = (name) => {
  const message = JSON.stringify({ type: 'register', name });
  client.send(message, signalingServer.port, signalingServer.address, (err) => {
    if (err) console.error('Error sending registration:', err);
    else console.log('Registered with signaling server.');
  });
};

// Request connection to target peer
const connectToPeer = (target) => {
  const message = JSON.stringify({ type: 'connect', target });
  client.send(message, signalingServer.port, signalingServer.address, (err) => {
    if (err) console.error('Error requesting connection:', err);
    else console.log(`Requested connection to ${target}`);
  });
};

// Listen for incoming messages
client.on('message', (msg, rinfo) => {
  console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${msg}`);
  try {
    const message = JSON.parse(msg.toString());

    if (message.type === 'target-info' || message.type === 'peer-info') {
      peerAddress = message.address;
      peerPort = message.port;
      console.log(`Connected to peer: ${peerAddress}:${peerPort}`);
      console.log('You can now start chatting!');

      // Send initial punch-through packets
      for (let i = 0; i < 5; i++) {
        const punchMessage = JSON.stringify({ type: 'punch', data: 'hello' });
        client.send(punchMessage, peerPort, peerAddress, (err) => {
          if (err) console.error('Error punching hole:', err);
        });
      }
    } else if (message.type === 'chat') {
      console.log(`Peer: ${message.data}`);
    } else {
      console.log(`Unknown message type: ${message.type}`);
    }
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }
});


// Command-line interface for chat
rl.question('Enter your name: ', (name) => {
  registerWithServer(name);

  rl.question('Enter target peer name: ', (target) => {
    connectToPeer(target);

    // Enable chat after connection
    rl.on('line', (line) => {
      if (peerAddress && peerPort) {
        // Send chat message to peer
        const chatMessage = JSON.stringify({ type: 'chat', data: line });
        console.log(`Sending message to ${peerAddress}:${peerPort} - ${line}`);
        client.send(chatMessage, peerPort, peerAddress, (err) => {
          if (err) console.error('Error sending message:', err);
        });
      } else {
        console.log('Waiting for connection to peer...');
      }
    });
  });
});
