# Contributing Guide

Contributing to `firebase-server` is fairly easy. This document shows you how to
get the project, run all provided tests and generate a production ready build.

It also covers provided npm scripts, that help you developing on `firebase-server`.

## Dependencies

To make sure, that the following instructions work, please install the following dependencies
on you machine:

- Node.js
- npm
- Git

## Installation

To get the source of `firebase-server` clone the git repository via:

`git clone https://github.com/urish/firebase-server`

This will clone the complete source to your local machine. Navigate to the project folder
and install all needed dependencies via **npm**:

`npm install`

Well done! `firebase-server` is now installed and you can start tinkering with it.

## Building

`firebase-server` comes with a few **npm scripts** which help you to automate
the development process. The following npm scripts are provided:

#### npm test

`npm test` executes (as you might thought) the unit tests, which are located
in the `test` directory. The task uses the **mocha** test runner to execute
the tests, and **istanbul** for tracking the code coverage. This task also checks
the coding for potential programming errors using **eslint**.

#### npm run debug

`npm run debug` executes the unit tests in debugging mode (runs mocha without 
the coverage tool)

#### npm run test-es5

`npm run test-es5` runs a really basic sanity test that uses ES5-only features,
and can therefore execute on node 0.10 / 0.12 without using a transpiler.

## Contributing/Submitting changes

- Checkout a new branch based on `master` and name it to what you intend to do:
  - Example:
    ````
    $ git checkout -b BRANCH_NAME
    ````
  - Use one branch per fix/feature
- Make your changes
  - Make sure to provide a spec for unit tests (in `test/server.spec.js` or similar)
  - Run your tests with `npm test`
  - When all tests pass, everything's fine
- Commit your changes
  - Please provide a git message which explains what you've done
  - Commit to the forked repository
- Make a pull request

If you follow these instructions, your PR will land pretty safety in the main repo!
