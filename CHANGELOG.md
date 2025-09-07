# CHANGELOG

# 0.1.0 (Narmada)

- Mainnet support
- DashPay seedphrases (no create / register yet)
- Multi wallet and identity
- Reworked UI screens
- Dash UI kit v1 integration [[Link]](https://github.com/AlexeyTripleA/dash-ui-kit)
- Tokens on homepage

## What's Changed
* Implement dash-ui kit by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/4
* Move out components from all pages into UI kit by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/24
* Seedphrases support by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/36
* Keypair management methods by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/43
* Implement import seed phrase screen by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/33
* Implement multi network, wallets, identities, private keys and settings menu by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/37
* AppConnect list and removal in the API by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/46
* Prepublish fixes of seedphrases integration by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/50

**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.9...1.0.0

## 0.0.9
Updated Dash Platform SDK dependency to 1.1.4

## What's Changed
* Bump dash-platform-sdk package dependency by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/42


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.8...0.0.9

## 0.0.8

A small bugfix that resolves "Signing Error" when there is more than one AUTHENTICATION / HIGH public keys in the identity.

## What's Changed
* Fix signing error when identity has more than one public key of one type by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/28

**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.7...0.0.8

## 0.0.7
A small bugfix that resolves "Signing Error" when there is more than one AUTHENTICATION / HIGH public keys in the identity.

## What's Changed
* Fix signing error when identity has more than one public key of one type by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/28

**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.7...0.0.8

## 0.0.7

Improved error handling, support non-unique identities during import, and update Dash Platform SDK to v1.1.3

## Major changes
* Extension code is now minified through Webpack (re-enabled optimizations)

## What's Changed
* Bugfixes after a integration tests by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/26
* Support non-unique identities on import private keys screen by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/27


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.6...0.0.7

## 0.0.6
Upgrade the Dash Platform SDK to v1.1.1 (fixes FetchError)

## What's Changed
* Upgrade Dash Platform SDK to v1.1.1 by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/21


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.5...0.0.6

## 0.0.5
## What's Changed
* Pre publish preparation by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/20


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.4...0.0.5

## 0.0.4
Same as previous, but fixed the build

## What's Changed
* Lint fix by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/19


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.3...0.0.4

## 0.0.3
Introduces AppConnect flow where a user can connect a wallet and authorize sharing information about your wallet's identities with the website

<img width="300" alt="image" src="https://github.com/user-attachments/assets/4b8456ae-9f5c-4481-acc0-a137a9462abf" />

## What's Changed
* Implement AppConnect flow by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/18


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.2...0.0.3

## 0.0.2

Frontend stabilization, improved data loading, and additional checks on approve state transition screen

## What's Changed
* Screen states optimization by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/17


**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/compare/0.0.1...0.0.2

# 0.0.1

First build

Features:
* Only testnet network
* Import Identity by private key
* Single identity support
* Inject DashPlatformSDK on all websites
* API for initiating signing transaction flow


## What's Changed
* Improve code architecture by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/1
* Interface redesign by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/3
* Update readme file by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/11
* Implement identity initialization flow by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/12
* Refactor messaging engine by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/2
* Implement code lint by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/13
* Release and build on CI by @pshenmic in https://github.com/pshenmic/dash-platform-extension/pull/15
* Fix approve state transition by @AlexeyTripleA in https://github.com/pshenmic/dash-platform-extension/pull/16

## New Contributors
* @pshenmic made their first contribution in https://github.com/pshenmic/dash-platform-extension/pull/1
* @AlexeyTripleA made their first contribution in https://github.com/pshenmic/dash-platform-extension/pull/3

**Full Changelog**: https://github.com/pshenmic/dash-platform-extension/commits/0.0.1
