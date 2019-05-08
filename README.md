firebase-server
===============

Firebase Web Socket Protocol Server. Useful for emulating the Firebase server in tests.

Copyright (C) 2013, 2014, 2015, 2016, 2017, 2018, 2019, Uri Shaked and contributors

[![Build Status](https://travis-ci.org/urish/firebase-server.png?branch=master)](https://travis-ci.org/urish/firebase-server)
[![Coverage Status](https://coveralls.io/repos/urish/firebase-server/badge.png)](https://coveralls.io/r/urish/firebase-server)
[![npm version](https://badge.fury.io/js/firebase-server.png)](https://badge.fury.io/js/firebase-server)

Installation
------------

You can install firebase-server through npm:

`npm install --save-dev firebase-server`

or yarn:

`yarn add -D firebase-server`

Usage Example
-------------

```js
const FirebaseServer = require('firebase-server');

new FirebaseServer(5000, 'localhost', {
  states: {
    CA: 'California',
    AL: 'Alabama',
    KY: 'Kentucky'
  }
});
```

After running this server, you can create a Firebase client instance that connects to it:

```js
import * as firebase from 'firebase/app';
import 'firebase/database';

const app = firebase.initializeApp({
  databaseURL: `ws://localhost:5000`,
});
app.database().ref().on('value', (snap) => {
  console.log('Got value: ', snap.val());
});
```

### Command Line Interface

This package installs a CLI script called `firebase-server`.
It can be installed locally or globally. If installed locally, use the
following path to start the server: `./node_modules/.bin/firebase-server`

The following command will start a firebase server on port 5555:

	firebase-server -p 5555

... and with a specified bind IP address:

	firebase-server -p 5555 -a 0.0.0.0

To bootstrap the server with some data you can use the `-d,--data` or the `-f,--file` option.
_Note: The file option will override the data option._

	firebase-server -d '{"foo": "bar"}'

	firebase-server -f ./path/to/data.json

To load [Firebase Security rules](https://firebase.google.com/docs/database/security/) upon startup you can use the `-r,--rules` option.

	firebase-server -r ./path/to/rules.json

You can also specify a shared client auth token secret with the `-s` argument:

	firebase-server -s some-shared-secret

To enable REST API, run:

	firebase-server -e

_Note: currently REST API does not implement authentication or
authorization._

To daemonize the server process, use:

	firebase-server -b

To write the PID to a file, use:

	firebase-server --pid /var/run/firebase-server.pid

_Note: PID file can be written with or without daemonization, and is NOT
written by default when daemonizing.

For more information, run:

	firebase-server -h

### FirebaseServer methods

The constructor signature is `FirebaseServer(portOrOptions, name, data)` where
`portOrOptions` is either a port number or a
[`WebSocket.Server`](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback)
options object with either `port` or `server` set. `name` is optional and is
just used to report the server name to clients. `data` is the initial contents
of the database.

If you want the server to pick a free port for you, simply use the value `0` for the port. You can then get the
assigned port number by calling the `getPort()` method on the returned server object.

FirebaseServer instances have the following API:

* `close(): Promise` - Stops the server (closes the server socket)
* `getValue()` - Returns a promise that will be resolved with the current data on the server
* `exportData()` - Returns a promise that will be resolved with the current data on the server, including priority values.
	This is similar to [DataSnapshot.exportVal()](https://www.firebase.com/docs/web/api/datasnapshot/exportval.html).
* `address()` - Returns the address the server is listening on
* `port(): number` - Returns the port number the server is listening on
* `setRules(rules)` - Sets the security rules for the server. Uses the [targaryen](https://github.com/goldibex/targaryen)
	library for rule validation.
* `setAuthSecret(secret)` - Sets the shared secret used for validating [Custom Authentication Tokens](https://www.firebase.com/docs/web/guide/login/custom.html).
* `setTime(timestamp)` - Sets the server time. The server time is returned by [ServerValue.TIMESTAMP](https://www.firebase.com/docs/web/api/servervalue/timestamp.html)
    and is also used for checking the validity of Custom Authentication Tokens.

### Debug logging

This project uses the excellent [`debug`](https://www.npmjs.com/package/debug) module for logging.
It is configured by setting an environment variable:

```sh
$ DEBUG=* mocha                                # log everything
$ DEBUG=firebase-server* mocha                 # log everything from firebase-server
$ DEBUG=firebase-server:token-generator mocha  # log output from specific submodule
```

Advanced options are available from the [`debug docs`](https://www.npmjs.com/package/debug)

License
----

Released under the terms of MIT License:

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
