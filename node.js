const dgram = require('dgram');
const readline = require('readline');
const SimplePeer = require('simple-peer');

const client = dgram.createSocket('udp4');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const signalingServer = { address: '144.24.127.147', port: 5000 }; // Replace with your server's public IP
let peer; // Will hold the simple-peer instance
let isInitiator = false;

// Register with signaling server
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
    else {
      console.log(`Requested connection to ${target}`);
      isInitiator = true; // This peer initiates the connection
    }
  });
};

// Send signaling data to signaling server
const sendSignalingData = (data) => {
  const message = JSON.stringify({ type: 'signal', data });
  client.send(message, signalingServer.port, signalingServer.address, (err) => {
    if (err) console.error('Error sending signaling data:', err);
  });
};

// Handle incoming messages
client.on('message', (msg, rinfo) => {
  try {
    const message = JSON.parse(msg.toString());

    if (message.type === 'peer-info') {
      console.log('Peer info received. Setting up WebRTC connection...');
      setupPeer(message.address, message.port);
    } else if (message.type === 'signal') {
      console.log('Received signaling data from peer.');
      peer.signal(message.data);
    }
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }
});

// Set up WebRTC connection using simple-peer
const setupPeer = (peerAddress, peerPort) => {
  peer = new SimplePeer({
    initiator: isInitiator,
    trickle: false, // Disable trickling ICE candidates for simplicity
  });

  // Handle generated signaling data
  peer.on('signal', (data) => {
    console.log('Generated signaling data:', data);
    sendSignalingData(data);
  });

  // Handle connection established
  peer.on('connect', () => {
    console.log('WebRTC connection established. You can now chat!');
    rl.on('line', (line) => {
      peer.send(line); // Send chat messages over WebRTC
    });
  });

  // Handle incoming messages
  peer.on('data', (data) => {
    console.log(`Peer: ${data.toString()}`);
  });

  // Handle connection errors
  peer.on('error', (err) => {
    console.error('WebRTC connection error:', err);
  });
};

// Start command-line interface
rl.question('Enter your name: ', (name) => {
  registerWithServer(name);

  rl.question('Enter target peer name: ', (target) => {
    connectToPeer(target);
  });
});
