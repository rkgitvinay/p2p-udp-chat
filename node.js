const dgram = require('dgram');
const stun = require('node-stun');
const upnp = require('nat-upnp');

const client = dgram.createSocket('udp4');
const upnpClient = upnp.createClient();

const signalingServer = { address: '144.24.127.147', port: 5000 }; // Replace with relay.js server IP

let publicIP = null;
let publicPort = null;
let peerAddress = null;
let peerPort = null;

// Discover public IP and port using STUN
const discoverPublicIP = async () => {
  return new Promise((resolve, reject) => {
    const stunClient = stun.createClient();
    stunClient.request('stun.l.google.com', 19302, (err, res) => {
      if (err) reject(err);
      else {
        publicIP = res.public.address;
        publicPort = res.public.port;
        console.log(`Public IP: ${publicIP}, Public Port: ${publicPort}`);
        resolve();
      }
    });
  });
};

// Register with signaling server
const registerWithServer = (name) => {
  const message = JSON.stringify({ type: 'register', name, publicIP, publicPort });
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

// Enable UPnP port mapping
const enablePortMapping = () => {
  upnpClient.portMapping(
    {
      public: publicPort || 5000, // Use discovered or default port
      private: publicPort || 5000,
      ttl: 3600,
    },
    (err) => {
      if (err) console.error('UPnP port mapping failed:', err);
      else console.log('UPnP port mapping successful!');
    }
  );
};

// Listen for incoming messages
client.on('message', (msg, rinfo) => {
  try {
    const message = JSON.parse(msg.toString());
    if (message.type === 'target-info' || message.type === 'peer-info') {
      peerAddress = message.address;
      peerPort = message.port;
      console.log(`Connected to peer: ${peerAddress}:${peerPort}`);
      console.log('You can now start chatting!');
    } else if (message.type === 'chat') {
      console.log(`Peer: ${message.data}`);
    }
  } catch (err) {
    console.error('Error processing incoming message:', err);
  }
});

// Chat interface
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Initialize and run the peer
(async () => {
  try {
    await discoverPublicIP();
    enablePortMapping();

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
            console.log('Waiting for connection to peer...');
          }
        });
      });
    });
  } catch (err) {
    console.error('Initialization failed:', err);
  }
})();
