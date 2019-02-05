'use strict';

const SerialPort = require('serialport')
const express = require('express')
const helmet = require('helmet')
const http = require('http')
const ws = require('ws')
const auth = require('basic-auth')
const basicAuth = require('express-basic-auth')
const compression = require("compression")

//TODO: --port --port --baud --auth=login:pass --tunnel=subdomain

let portName = process.argv[2];
let	portConfig = {
  baudRate: 115200,
  bindingOptions: {
    vtime: 1
  }
};

let users = {
  'admin': 'wow'
}

function verifyClient(client) {
  let req = client.req;
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  console.log("Connection from", ip)

  const cred = auth(client.req);
  for(var i in users) {
    if(cred.name == i && cred.pass == users[i]) {
      console.log("WS auth ok.")
      return true
    }
  }
  return false
}

let app = express();
let server = http.createServer(app);
let wss = new ws.Server({ server, verifyClient });

app.use(helmet())

app.use(basicAuth({
    users,
    challenge: true,
    unauthorizedResponse: (req) => "Unauthorized."
}));

app.use(compression());

// serve static files from /public and /node_modules
app.use('/', express.static('public'));

app.use('/node_modules/xterm/dist/', express.static(__dirname + '/node_modules/xterm/dist/'));

function broadcast(data) {
  data = data.toString();
  wss.clients.forEach((client) => {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify({ type: 'data', data }));
    }
  });
}


function connectClient(client) {
  client.on('message', (data) => {
    let msg = JSON.parse(data);
    if (msg.type == 'data') {
      myPort.write(Buffer.from(msg.data));
    }
  });
}


var myPort = new SerialPort(portName, portConfig);

myPort.on('open', () => {
  console.log('port open');
  console.log('baud rate: ' + myPort.baudRate);
});
myPort.on('data', broadcast);

//TODO: handle port reconnection

// start the servers:
server.listen(8080);
wss.on('connection', connectClient);

const localtunnel = require('localtunnel');
var tunnel = localtunnel(8080, { subdomain: "vsh-console" }, function(err, tunnel) {
  console.log(tunnel.url);
});
