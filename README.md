firebase-server
===============

Firebase Web Socket Protocol Server. Useful for emulating the Firebase server in tests.

Copyright (C) 2013, 2014, Uri Shaked <uri@urish.org>

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

new FirebaseServer(5000, 'test.firebase.localhost', {
	states: {
		CA: 'California',
		AL: 'Alabama',
		KY: 'Kentucky'
	}
});
```

After running this server, you can create a Firebase client instance that connects to it:

```js
var client = new Firebase('ws://test.firebase.localhost:5000');
client.on('value', function(snap) {
	console.log('Got value: ', snap.value());
});
```

Don't forget to point the host `test.firebase.localhost` to your local IP address (in `/etc/hosts` or similar).

### Debug logging

You can enable debug logging by calling the `enableLogging()` method:

```js
var FirebaseServer = require('firebase-server');

FirebaseServer.enableLogging(true);
// Create a FirebaseServer instance, etc.
```

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
