pcapi.js
========

A javascript API for PCAPI. Check PCAPI's [documenation](https://github.com/edina/fieldtrip-open/wiki/apis#user-content-pcapi)


[![Build Status](https://travis-ci.org/edina/pcapi.js.svg?branch=master)](https://travis-ci.org/edina/pcapi.js.svg?branch=master)

### Running tests

First thing you need to do is to install all the dependencies:
```
npm install
```
For running tests you need to run either:
```
npm run test
```

For running systests you need to create a config.js inside the js folder that will follow the config.example.js logic. You need a url of where the PCAPI is installed and then run the systetsts like this:

```
node_modules/phantomjs/bin/phantomjs tests/sysindex.html
```


### Building library
For releasing the library
```
npm run release
```
