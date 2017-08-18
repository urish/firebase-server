firebase-server
===============

Firebase Web Socket Protocol Server. Useful for emulating the Firebase server in tests.

Copyright (C) 2013, 2014, 2015, 2016, 2017, Uri Shaked <uri@urish.org>

[![Build Status](https://travis-ci.org/urish/firebase-server.png?branch=master)](https://travis-ci.org/urish/firebase-server)
[![Coverage Status](https://coveralls.io/repos/urish/firebase-server/badge.png)](https://coveralls.io/r/urish/firebase-server)

Installation
------------

You can install firebase-server through npm:

`npm install --save-dev firebase-server`

Usage Example
-------------

```js
var FirebaseServer = require('firebase-server');

new FirebaseServer(5000, 'localhost.firebaseio.test', {
	states: {
		CA: 'California',
		AL: 'Alabama',
		KY: 'Kentucky'
	}
});
```

After running this server, you can create a Firebase client instance that connects to it:

```js
var client = new Firebase('ws://localhost.firebaseio.test:5000');
client.on('value', function(snap) {
	console.log('Got value: ', snap.val());
});
```

Don't forget to point the host `localhost.firebaseio.test` to your local IP address (in `/etc/hosts` or similar).

For more information, read the [blog post in the offical Firebase blog](https://www.firebase.com/blog/2015-04-24-end-to-end-testing-firebase-server.html).

### Command Line Interface

This package installs a CLI script called `firebase-server`. The following command will
start a firebase server on port 5555:

	node_modules/.bin/firebase-server -p 5555

To bootstrap the server with some data you can use the `-d,--data` or the `-f,--file` option.
_Note: The file option will override the data option._

	node_modules/.bin/firebase-server -d '{"foo": "bar"}'

	node_modules/.bin/firebase-server -f ./path/to/data.json

To load [Firebase Security rules](https://firebase.google.com/docs/database/security/) upon startup you can use the `-r,--rules` option.

	node_modules/.bin/firebase-server -r ./path/to/rules.json

For more information, run:

	node_modules/.bin/firebase-server -h

### FirebaseServer methods

The constructor signature is `FirebaseServer(portOrOptions, name, data)` where
`portOrOptions` is either a port number or a
[`WebSocket.Server`](https://github.com/websockets/ws/blob/master/doc/ws.md#new-websocketserveroptions-callback)
options object with either `port` or `server` set. `name` is optional and is
just used to report the server name to clients. `data` is the initial contents
of the database.

FirebaseServer instances have the following API:

* `close(callback)` - Stops the server (closes the server socket) and then calls the callback
* `getValue()` - Returns a promise that will be resolved with the current data on the server
* `exportData()` - Returns a promise that will be resolved with the current data on the server, including priority values.
	This is similar to [DataSnapshot.exportVal()](https://www.firebase.com/docs/web/api/datasnapshot/exportval.html).
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
