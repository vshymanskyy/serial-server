#!/usr/bin/env node
'use strict';

const SerialPort = require('serialport')
const express = require('express')
const helmet = require('helmet')
const http = require('http')
const ws = require('ws')
const auth = require('basic-auth')
const basicAuth = require('express-basic-auth')
const compression = require('compression')
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
    'readonly': {
      alias: ['ro'],
      desc: 'List of users with readonly access',
      coerce:  (opt) => (opt === true) ? "" : opt.split(',').filter(s => s.length)
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
    users[user] = pass || "";
  }
}

function userCheck(user, pass) {
  return users[user] === pass;
}

function userIsReadonly(user) {
  if (argv.readonly === undefined) return false; // not set
  if (argv.readonly === "") return true;         // option set with an empty list
  return argv.readonly.includes(user);
}

function verifyClient(info) {
  let req = info.req;
  let sock = req.client;

  let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  if (!argv.auth) {
    sock.session = {
      user:     "guest",
      readonly: true
    };
    console.log(`Guest connected [${ip}]`)
    return true
  }

  const cred = auth(req);
  if (!cred) return false;

  if (userCheck(cred.name, cred.pass)) {
    sock.session = {
      user:     cred.name,
      readonly: userIsReadonly(cred.name)
    };
    console.log(`User ${chalk.yellow.bold(cred.name)}${sock.session.readonly ? " (readonly)" : ""} connected [${ip}]`)
    return true
  }
  console.log(`User ${cred.name}`, chalk.red.bold("rejected"), `[${ip}]`)
  return false
}

let app = express();
let server = http.createServer(app);
let wss = new ws.Server({ server, verifyClient });

app.use(helmet())
app.use(compression())

if (argv.auth) {
  app.use(basicAuth({
    authorizer: userCheck,
    challenge:  true,
    unauthorizedResponse: (req) => "Unauthorized."
  }));
}

// serve static files from /public and /node_modules
app.use('/', express.static(__dirname + '/public'));

app.use('/node_modules/xterm/dist/', express.static(__dirname + '/node_modules/xterm/dist/'));

function broadcast(data) {
  broadcastMessage({ type: 'data', data: data.toString() });
}

function broadcastMessage(msg) {
  wss.clients.forEach((client) => {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify(msg));
    }
  });
}


function connectClient(client) {
  let sock = client._socket;

  client.send(JSON.stringify({ type: 'title', data: port_title() }));
  if (sock.session.readonly) {
    client.send(JSON.stringify({ type: 'input_disable' }));
    return; // Skip any messages, if in readonly mode
  }

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
let port_title  = function() {};

if (argv.port === 'shell') {
  const pty = require('node-pty-prebuilt');
  let shell = process.env[process.platform === 'win32' ? 'COMSPEC' : 'SHELL'];

  let sh = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: (process.platform === 'win32') ? process.env.USERPROFILE : process.env.HOME,
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

  port_title = function() {
    return argv.tunnel ? `${argv.tunnel} - ${sh.process}` : sh.process;
  }

  // Watch for title changes
  var prev_name;
  setInterval(() => {
    let name = port_title();
    if (prev_name !== name) {
      prev_name = name;
      broadcastMessage({ type: 'title', data: name });
    }
  }, 1000)

} else {

  let port = new SerialPort(argv.port, argv);

  port.on('open', () => {
    console.log(`Opened port ${port.path},${port.baudRate}`);
  });
  port.on('data', broadcast);

  port_write = function(data) {
    port.write(data)
  }

  port_title = function() {
    return argv.port;
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
