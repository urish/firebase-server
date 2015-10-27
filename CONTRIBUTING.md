# Contributing Guide

Contributing to `firebase-server` is fairly easy. This document shows you how to
get the project, run all provided tests and generate a production ready build.

It also covers provided npm scripts, that help you developing on `firebase-server`.

## Dependencies

To make sure that the following instructions work, please install the following dependencies
on you machine:

- Node.js
- npm
- Git

You should also consider `nvm` or some similar tool which lets you switch between versions of Node quickly.

## Installation

To get the source of `firebase-server` clone the git repository via:

```sh
git clone https://github.com/urish/firebase-server
```

This will clone the complete source to your local machine. Navigate to the project folder
and install all needed dependencies via **npm**:

```sh
npm install
```

Well done! `firebase-server` is now installed and you can start tinkering with it.

## Building

`firebase-server` comes with a few **npm scripts** which help you to automate
the development process. The following npm scripts are provided:

#### npm test

`npm test` executes (as you might thought) the unit tests, which are located
in the `test` directory. The task uses the **mocha** test runner to execute
the tests, and **istanbul** for tracking the code coverage. This task also checks
the coding for potential programming errors using **eslint**.

*You should ensure `npm test` passes on node 0.10, and 4.x before submitting a PR*

#### npm run debug

`npm run debug` executes the unit tests in debugging mode. It skips the linter, 
and runs `mocha` without the coverage tool (the coverage tool slows tests and obfuscates error stack traces).

You can also just call `mocha` from the command line, if you installed mocha globally (`npm install --global mocha`).

#### npm run watch

`npm run watch` will watch the source files and rerun the tests every time a file changes.

You can also just call `mocha -w` from the command line, if you installed mocha globally (`npm install --global mocha`).

## Using ES6 Language Features

The test suite uses `babel` to provide ES6 language features *for the tests only*. 

*In the tests*:  
  Feel free to use any language feature supported by default in the latest *stable* version of Node 
  (4.1.2 at time of writing). ES6 features that are not yet adopted into the Node *stable* branch 
  should *not* be used (i.e. no features that require the `--es_staging` flag).

*In production code*:  
  You must stick to ES5 language features supported by Node 0.10.

## Contributing/Submitting changes

- If you are changing the API or adding features, it is **highly** recommended that
 you open an issue on GitHub to propose your change and get feedback before beginning work.
- Check out the [open issues](https://github.com/urish/firebase-server/issues) for ideas on where to contribute.
- Checkout a new branch based on `master` and name it to what you intend to do:
  - Example:
    ````
    $ git checkout -b BRANCH_NAME
    ````
  - Use one branch per fix/feature
- Make your changes
  - Make sure to provide a spec for unit tests (in `test/server.spec.js` or similar). 
    You should strive for 100% coverage of any code you add (this is not a strict requirement).
  - Run your tests with `npm test`
  - When all tests pass, everything is fine
- Commit your changes
  - Please provide a git message which explains what you have done.  
  - Commit to the forked repository
- Make a pull request

If you follow these instructions, your PR will land pretty safely in the main repo!

## Inspecting the Firebase Websocket Protocol

Chrome DevTools includes a very handy tool for inspecting Websocket communications, but it is a little hard to find.
Note the highlighted selections in the screenshot below:

![websocket debug screenshot](https://rawgit.com/urish/firebase-server/master/media/websocket-debug.png)

1. Open the Network Tab in Chrome Dev Tools.
2. Enable filtering and then filter by web sockets (by clicking `WS`).
3. Select the connection you are interested in (`.ws?v=...`)
4. Click on `Frames` to see the entire chat between the client and the server:

You can match requests and responses by looking at the d.r parameter, which is the sequential request id.
