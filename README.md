This tool allows you to share/access your serial terminal over the internet.  
Based on [xterm.js](https://xtermjs.org/), [localtunnel](https://localtunnel.me).

**Works on:** 
<img src="https://cdn.rawgit.com/simple-icons/simple-icons/develop/icons/linux.svg" width="18" height="18" /> Linux,
<img src="https://cdn.rawgit.com/simple-icons/simple-icons/develop/icons/windows.svg" width="18" height="18" /> Windows,
<img src="https://cdn.rawgit.com/simple-icons/simple-icons/develop/icons/apple.svg" width="18" height="18" /> MacOS

**Features:**
- Automatic tunneling from local machine to a public-accessible link
- Multi-user access
- Simple password-based authentication (with multiple credentials)
- Read-only access for specific users
- ANSI escape codes support: colors, mouse, window resize, window title
- **Bonus:** share your OS shell. Just specify `shell` instead of serial port

## Example

```sh
> serial-server /dev/ttyACM0 --baud=115200 --auth=vova:MyPaSS --tunnel=vsh-device01
Server listening on 0.0.0.0:5123
Preparing your tunnel...
Opened port /dev/ttyACM0,115200
Tunnel link: https://vsh-device01.localtunnel.me
```
Visit the provided tunnel link. It will ask for the password, then present you with a remote terminal:

![examples](/docs/example_browser.png)

## Installation

```sh
npm i -g https://github.com/vshymanskyy/serial-server.git
```

## Usage

```log
serial-server <port> [options]

Options:
  --version               Show version number                                              [boolean]
  --bind, --addr          Server endpoint address                          [default: "0.0.0.0:5123"]
  --baudRate, -b, --baud                                                  [number] [default: 115200]
  --dataBits                                                      [choices: 8, 7, 6, 5] [default: 8]
  --stopBits                                                            [choices: 1, 2] [default: 1]
  --parity                       [choices: "none", "even", "mark", "odd", "space"] [default: "none"]
  --auth                  Password protection. Can add multiple users (user:pass)            [array]
  --readonly, --ro        List of users with readonly access (comma-separated)
  --tunnel                Create tunnel link automatically                                  [string]
  --config                Path to JSON config file
  -h, --help              Show help                                                        [boolean]

Copyright 2019 Volodymyr Shymanskyy
```
