# Changelog

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
