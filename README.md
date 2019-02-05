# serial-server
Serial Port Server

## Installation

```sh
npm i -g https://github.com/vshymanskyy/serial-server.git
```
## Usage

```log
serial-server <port> [options]

Options:
  --version               Show version number                                              [boolean]
  --bind, --addr          server endpoint address                          [default: "0.0.0.0:5123"]
  --baudRate, -b, --baud                                                  [number] [default: 115200]
  --dataBits                                                      [choices: 8, 7, 6, 5] [default: 8]
  --stopBits                                                            [choices: 1, 2] [default: 1]
  --parity                       [choices: "none", "even", "mark", "odd", "space"] [default: "none"]
  --auth                                                                       [array] [default: []]
  --tunnel                Create tunnel link automatically                                  [string]
  --config                Path to JSON config file
  -h, --help              Show help                                                        [boolean]

Copyright 2019 Volodymyr Shymanskyy
```
