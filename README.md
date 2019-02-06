This tool allows you to share/access your serial terminal over the internet.


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
  --tunnel                Create tunnel link automatically                                  [string]
  --config                Path to JSON config file
  -h, --help              Show help                                                        [boolean]

Copyright 2019 Volodymyr Shymanskyy

```

## Example

```sh
serial-server /dev/ttyACM0 --baud=115200 --auth=vova:MyPaSS --tunnel=vsh-device01
```
![examples](/docs/example_console.png)

Visit the provided tunnel link. It will ask for the password, then present you with a remote terminal.
