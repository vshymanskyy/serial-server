#!/usr/bin/env node
'use strict';

const SerialPort = require('serialport')
const express = require('express')
const helmet = require('helmet')
const http = require('http')
const ws = require('ws')
const auth = require('basic-auth')
const basicAuth = require('express-basic-auth')
const compression = require("compression")
const yargs = require('yargs')
const url = require('url')
const chalk = require('chalk')

const argv =
  yargs
  .usage('$0 [options] <port>')
  .options({
    'bind': {
      alias: ['addr'],
      describe: 'Server endpoint address',
      default: "0.0.0.0:5123",
      coerce:  (opt) => {
        let u = url.parse('http://' + opt)
        return {
          host: u.hostname || '0.0.0.0',
          port: parseInt(u.port) || 5123
        }
      }
    },
    'baudRate': {
      alias: ['b', 'baud'],
      type:  'number',
      default: 115200
    },
    'dataBits': {
      choices: [8, 7, 6, 5],
      default: 8
    },
    'stopBits': {
      choices: [1, 2],
      default: 1
    },
    'parity': {
      choices: ['none', 'even', 'mark', 'odd', 'space'],
      default: 'none'
    },
    'auth': {
      type: 'array',
      describe: 'Password protection. Can add multiple users (user:pass)',
    },
    'tunnel': {
      type: 'string',
      desc: 'Create tunnel link automatically'
    },
  })
  .required(1, chalk.bold.red('Serial Port not specified'))
  .strict()
  .config()
  .epilog('Copyright 2019 Volodymyr Shymanskyy')
  .alias('h', 'help')
  .wrap(Math.min(120, yargs.terminalWidth()))
  .argv;
  
Object.assign(argv, {
  bindingOptions: {
    vtime: 1
  }
});

argv.port = argv._[0];

let users = {}
if (argv.auth) {
  for (let auth of argv.auth) {
    let [user, pass] = auth.split(':');
    users[user] = pass;
  }
}

function verifyClient(client) {
  let req = client.req;
  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  
  if (!argv.auth) {
    console.log(`New connection [${ip}]`)
    return true
  }

  const cred = auth(client.req);
  for (let i in users) {
    if (cred.name == i && cred.pass == users[i]) {
      console.log(`User ${chalk.yellow.bold(cred.name)} connected [${ip}]`)
      return true
    }
  }
  console.log(`User ${cred.name}`, chalk.red.bold("rejected"), `[${ip}]`)
  return false
}

let app = express();
let server = http.createServer(app);
let wss = new ws.Server({ server, verifyClient });

app.use(helmet())

if (argv.auth) {
  app.use(basicAuth({
    users,
    challenge: true,
    unauthorizedResponse: (req) => "Unauthorized."
  }));
}

app.use(compression());

// serve static files from /public and /node_modules
app.use('/', express.static(__dirname + '/public'));

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
      port_write(Buffer.from(msg.data));
    } else if (msg.type == 'resize') {
      port_resize(msg.cols, msg.rows);
    }
  });
}

let port_write  = function(data) {};
let port_resize = function(cols, rows) {};

if (argv.port === 'shell') {
  const pty = require('node-pty-prebuilt');
  let shell = process.env[process.platform === 'win32' ? 'COMSPEC' : 'SHELL'];

  let sh = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.env.HOME,
    env: process.env
  });

  console.log(`Spawned shell pid: ${sh.pid}`);

  sh.on('data', broadcast);

  port_write = function(data) {
    sh.write(data)
  }
  
  port_resize = function(cols, rows) {
    sh.resize(cols, rows);
  }

} else {

  let port = new SerialPort(argv.port, argv);

  port.on('open', () => {
    console.log(`Opened port ${port.path},${port.baudRate}`);
  });
  port.on('data', broadcast);

  port_write = function(data) {
    port.write(data)
  }

}



//TODO: handle port reconnection

// start the servers:
server.listen(argv.bind, (err) => {
  console.log(`Server listening on ${argv.bind.host}:${argv.bind.port}`);

  if (argv.tunnel || argv.tunnel==='') {
    console.log(`Preparing your tunnel...`);

    const localtunnel = require('localtunnel');
    localtunnel(argv.bind.port, { subdomain: argv.tunnel }, function(err, tunnel) {
      console.log(`Tunnel link: ${chalk.blue.bold(tunnel.url)}`);
    });
  }
});
wss.on('connection', connectClient);
