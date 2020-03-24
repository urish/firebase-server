# Migrating to the Firebase Local Emulators

## Introduction

As of May 2019 there are officially supported emulators for many Firebase services, removing the need for a third-party solution like `firebase-server`.

For more information on the emulators, check out the official documentation:
https://firebase.google.com/docs/emulator-suite/connect_and_prototype?database=Firestore

To use the official emulators you will need to install the Firebase CLI:
https://firebase.google.com/docs/cli

After you have the Firebase CLI installed, run the following command to configure the emulators:

```bash
firebase init emulators
```

## Running the emulators

You can start the emulators with the following command:
```bash
firebase emulators:start
```

If you have configured the Realtime Database emulator you should see some output like this:
```bash
$ firebase emulators:start
i  emulators: Starting emulators: database
✔  hub: emulator hub started at http://localhost:4400
i  database: database emulator logging to database-debug.log
✔  database: database emulator started at http://localhost:9000
i  database: For testing set FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000
✔  emulators: All emulators started, it is now safe to connect.
```

The database will start with an empty data set and will use the security rules file specified in your `firebase.json` file.

## Connecting to the emulators

### Web SDK

You can connect to the running emulators by
changing the `databaseURL` in `initializeApp`:

```js
import * as firebase from 'firebase/app';
import 'firebase/database';

const app = firebase.initializeApp({
  databaseURL: `http://localhost:9000?ns=your-database`,
});

app.database().ref().on('value', (snap) => {
  console.log('Got value: ', snap.val());
});
```

Take note of the `?ns=` parameter. Normally you will want to set this to your project ID, but if you are using multiple Realtime Database shards in your project you can point to a specific one.

### Admin SDK

The Firebase Admin SDK will connect to the emulator if you set the `FIREBASE_DATABASE_EMULATOR_HOST` environment variable:

```bash
export FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000
npm run start-admin-server
```

## Unit Testing

### Running your test suite

If you want to use the emulators from a unit test, the `firebase emulators:exec <script>` command will:

  1. Start the emulators
  1. Run your test script `<script>`
  1. Cleanly shut down the emulators after your tests finish

For example:

```bash
$ firebase emulators:exec "echo \"Hello World\"; echo \$FIREBASE_DATABASE_EMULATOR_HOST"
i  emulators: Starting emulators: database
i  database: database emulator logging to database-debug.log
✔  database: database emulator started at http://localhost:9000
i  database: For testing set FIREBASE_DATABASE_EMULATOR_HOST=localhost:9000
i  Running script: echo "Hello World"; echo $FIREBASE_DATABASE_EMULATOR_HOST
Hello World
localhost:9000
✔  Script exited successfully (code 0)
i  emulators: Shutting down emulators.
i  database: Stopping database emulator
```

So for example you could run:

```bash
firebase emulators:exec "npm run test"
```

### Testing security rules

The Firebase Testing SDK allows you to write Node unit tests that test your security rules and database structure:

```bash
npm install --save-dev @firebase/testing
```

You can write unit tests as follows:
```js
const firebase = require("@firebase/testing");

const DB_NAME = "database-emulator-example";

const adminDb = firebase.initializeAdminApp({
   databaseName: DB_NAME 
}).database();


describe("my test", () => {
  it("should allow anyone to read profiles", async () => {

    // Impersonate a user 'alice'
    const alice = firebase.initializeTestApp({
      databaseName: DB_NAME,
      auth: {
        uid: "alice"
      }
    });

    // Impersonate a user 'bob'
    const bob = firebase.initializeTestApp({
      databaseName: DB_NAME,
      auth: {
        uid: "bob"
      }
    });

    // Set some data
    await adminDb
      .ref("users/alice")
      .set({
        name: "Alice",
        profilePicture: "http://cool_photos/alice.jpg"
      });

    // Check that everyone can read it
    await firebase.assertSucceeds(alice.ref("users/alice").once("value"));
    await firebase.assertSucceeds(bob.ref("users/alice").once("value"));
  });
});
```

These tests should be run using `firebase emulators:exec` (see above) because the testing SDK relies on the environment variables which are automatically set by `emulators:exec`.

The testing SDK includes other convenient methods for changing security rules, clearing data, etc.  For more information, check out the official documentation:
https://firebase.google.com/docs/database/security/test-rules-emulator