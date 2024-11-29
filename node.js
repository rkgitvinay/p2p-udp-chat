const dgram = require('dgram');
const readline = require('readline');
const { multiaddr } = require('@multiformats/multiaddr');

// UDP socket setup
const socket = dgram.createSocket('udp4');

// Command-line interface setup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Multiaddress signaling server and peer variables
const signalingServerAddr = multiaddr('/ip4/144.24.127.147/udp/5000');
let peerMultiaddr = null; // Stores the peer's multiaddress

// Extract address and port from a multiaddress
const parseMultiaddr = (ma) => ma.toOptions();

// Register with the signaling server
const registerWithServer = (name) => {
  const message = JSON.stringify({ type: 'register', name });
  const { host, port } = parseMultiaddr(signalingServerAddr);
  socket.send(message, port, host, (err) => {
    if (err) console.error('Error registering with server:', err);
    else console.log('Registered with signaling server.');
  });
};

// Connect to a target peer
const connectToPeer = (target) => {
  const message = JSON.stringify({ type: 'connect', target });
  const { host, port } = parseMultiaddr(signalingServerAddr);
  socket.send(message, port, host, (err) => {
    if (err) console.error('Error requesting peer connection:', err);
    else console.log(`Requested connection to peer: ${target}`);
  });
};

// Handle incoming messages
socket.on('message', (msg, rinfo) => {
  try {
    const message = JSON.parse(msg.toString());
    console.log(`Received message from ${rinfo.address}:${rinfo.port}:`, message);

    if (message.type === 'peer-info') {
      // Received peer address
      peerMultiaddr = multiaddr(message.multiaddr);
      console.log(`Peer address received: ${peerMultiaddr.toString()}`);
      console.log('You can now start chatting!');

      // Send an initial punch-through packet
      const punchMessage = JSON.stringify({ type: 'punch', data: 'hello' });
      const { host, port } = parseMultiaddr(peerMultiaddr);
      socket.send(punchMessage, port, host, (err) => {
        if (err) console.error('Error sending punch message:', err);
      });
    } else if (message.type === 'chat') {
      // Handle chat messages
      console.log(`Peer: ${message.data}`);
    } else {
      console.log(`Unknown message type: ${message.type}`);
    }
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }
});

// Command-line interface for user input
rl.question('Enter your name: ', (name) => {
  registerWithServer(name);

  rl.question('Enter target peer name: ', (target) => {
    connectToPeer(target);

    rl.on('line', (line) => {
      if (peerMultiaddr) {
        // Send chat message to peer
        const chatMessage = JSON.stringify({ type: 'chat', data: line });
        const { host, port } = parseMultiaddr(peerMultiaddr);
        socket.send(chatMessage, port, host, (err) => {
          if (err) console.error('Error sending chat message:', err);
        });
      } else {
        console.log('Peer not connected yet.');
      }
    });
  });
});
