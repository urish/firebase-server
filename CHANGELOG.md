# Changelog

## 1.0.2 - 2019-05-08
- fix #138: security vulnerability affecting `jwt-simple` package

## 1.0.1 - 2018-11-29
- fix #133: cli package vulnerability

## 1.0.0 - 2018-08-29
- chore: upgrade dependencies (lodash, debug), addresses CVE-2017-16137, CVE-2018-3721
- feat #130: add `--version` cli option

## 1.0.0-rc.2 - 2018-05-28
- fix #123: Cannot run server v1.0.0-rc.1

## 1.0.0-rc.1 - 2018-05-20
- docs: update usage example in README

## 1.0.0-rc.0 - 2018-05-20
- Migrate project to TypeScript
- Drop node 6.x support
- Add `address()`, `getPort()` methods
- `close()` method now returns a promise
- Upgrade the Firebase JS Library to 5.x
- Upgrade the `ws` library to 5.x
- Split send payloads according to firebase's custom continuation format ([#115](https://github.com/urish/firebase-server/pull/115), contributed by [andrewparmet](https://github.com/andrewparmet))
- Align 'now' in Targaryen with firebase-server time ([#112](https://github.com/urish/firebase-server/pull/112), contributed by [dotdoom](https://github.com/dotdoom))

## 0.12.0 - 2017-11-16
- REST API support ([#95](https://github.com/urish/firebase-server/pull/95), contributed by [p-salido](https://github.com/p-salido))
- Daemonization option ([#111](https://github.com/urish/firebase-server/pull/111), contributed by [p-salido](https://github.com/p-salido))

## 0.11.0 - 2017-08-19
- Migrate to Targaryen 3 ([#100](https://github.com/urish/firebase-server/pull/100), contributed by [dotdoom](https://github.com/dotdoom))
- Support passing a WebSocket.Server options object to the FirebaseServer constructor ([#101](https://github.com/urish/firebase-server/pull/101), contributed by [tommie](https://github.com/tommie))
- Fix security rules validation for updates ([#99](https://github.com/urish/firebase-server/pull/99), contributed by [dotdoom](https://github.com/dotdoom))
- Add support for -s option (shared auth secret) ([#91](https://github.com/urish/firebase-server/pull/91), contributed by [dchaley](https://github.com/dchaley))

## 0.10.1 - 2017-05-17
- Properly fill in auth object for Android ([#89](https://github.com/urish/firebase-server/pull/89), contributed by [dotdoom](https://github.com/dotdoom))

## 0.10.0 - 2017-05-11
- Add rules option to cli ([#83](https://github.com/urish/firebase-server/pull/83), contributed by [mediavrog](https://github.com/mediavrog))

## 0.9.1 - 2017-02-16
- Fix: CLI fails to start on Mac OS X ([#80](https://github.com/urish/firebase-server/issues/80))

## 0.9.0 - 2017-02-06
- Update `targaryen` dependency to 2.3.3 ([#76](https://github.com/urish/firebase-server/pull/76), contributed by [bmcbarron](https://github.com/bmcbarron))
- Add CLI `data` / `file` parameters ([#78](https://github.com/urish/firebase-server/pull/78), contributed by [mediavrog](https://github.com/mediavrog))

## 0.8.1 - 2017-01-29
- Fix dropped listener callbacks for null nodes ([#75](https://github.com/urish/firebase-server/pull/75), contributed by [bmcbarron](https://github.com/bmcbarron))

## 0.8.0 - 2017-01-22
- Specify firebase client library as a dependency ([#71](https://github.com/urish/firebase-server/pull/71), contributed by [crowdcst](https://github.com/crowdcst))
- Fix compatibility with Android client (path) ([#74](https://github.com/urish/firebase-server/pull/74), contributed by [dotdoom](https://github.com/dotdoom))

## 0.7.1 - 2016-11-28
- Fix deprecation warning with Firebase 3.6.x ([#68](https://github.com/urish/firebase-server/pull/68), contributed by [mironal](https://github.com/mironal))
- Fix broken unit tests with Firebase >= 3.3.0

## 0.7.0 - 2016-08-13
- Upgrade `ws` dependency to 1.1.1 (latest version)

## 0.6.0 - 2016-06-22
- Switch to Firebase 3.x. For firebase 2 support, use version 0.5.4 ([#51](https://github.com/urish/firebase-server/pull/51), contributed by [nfarina](https://github.com/nfarina))

## 0.5.4 - 2016-03-08
- Bugfix: large JSON messages spanning over several websocket frames cause errors ([#39](https://github.com/urish/firebase-server/pull/39), contributed by [abhishekgahlot](https://github.com/abhishekgahlot)) 

## 0.5.3 - 2016-02-03
- Add a `firebase-server` command line tool (CLI). See [README](README.md) for details.

## 0.5.2 - 2016-01-06
- Support admin authentication with raw secret ([#34](https://github.com/urish/firebase-server/pull/34)), contributed by [Alaneor](https://github.com/Alaneor)) 

## 0.5.1 - 2015-12-13

- Add callback on close ([#32](https://github.com/urish/firebase-server/pull/32)), contributed by [jamiemchale](https://github.com/jamiemchale))

## 0.5.0 - 2015-10-28
- Add Custom Authentication ([#15](https://github.com/urish/firebase-server/pull/15), 
  [#25](https://github.com/urish/firebase-server/pull/25), [#26](https://github.com/urish/firebase-server/pull/26)
  contributed by [jamestalmage](https://github.com/jamestalmage))
- Support ServerValue.TIMESTAMP (see [#18](https://github.com/urish/firebase-server/issues/18))
- Use debug module instead of hand-rolled logging solution ([#28](https://github.com/urish/firebase-server/pull/28), contributed by [jamestalmage](https://github.com/jamestalmage))
- Bugfix: Transactions fail for nodes with priority value (see [#23](https://github.com/urish/firebase-server/issues/23))

## 0.4.0 - 2015-10-24

- Basic support for Firebase Security rules through [targaryen](https://github.com/goldibex/targaryen) (fixes [#11](https://github.com/urish/firebase-server/issues/11))
- Switch from `MockFirebase` to the official Firebase client library ([#13](https://github.com/urish/firebase-server/pull/13), contributed by [jamestalmage](https://github.com/jamestalmage))
- Deprecate the `getData()` method. Use instead the new `getValue()` method which returns a promise 
- Add an `exportData()` method for fetching the data along with priority values

## 0.3.1 - 2015-08-18

- Bugfix: Wire protocol does not match Firebase server (fixes [#9](https://github.com/urish/firebase-server/issues/9), contributed by [azell](https://github.com/azell))

## 0.3.0 - 2015-07-21

- Implement `update()` (fixes [#5](https://github.com/urish/firebase-server/issues/5))
- Implement `transaction()`
- Bugfix: `remove()` triggers two value events (fixes [#6](https://github.com/urish/firebase-server/issues/6))

## 0.2.0 - 2015-06-12

- Upgrade `MockFirebase` to 0.11.0, as well as other dependencies.
- Bugfix: Value callbacks were always triggered with null first ([#2](https://github.com/urish/firebase-server/issues/2))

## 0.1.1 - 2015-05-23

- Fix a bug with supporting Firebase client library 2.2.4+ (fixes [#1](https://github.com/urish/firebase-server/issues/1))

## 0.1.0 - 2014-11-21

- Firebase 2.0 Support

## 0.0.2 - 2014-09-06

- Add `close()` method to stop the server
- Add `getData()` method that returns a copy of the server's data 
- Add functional tests
- Make logging optional (through `FirebaseServer.enableLogging()`)

## 0.0.1 - 2014-09-05

- Initial release
