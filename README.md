pcapi.js
========

A javascript API for PCAPI. Check PCAPI's [documenation](https://github.com/edina/pcapi/blob/master/docs/PC_design_1_3.odt)


[![Build Status](https://travis-ci.org/edina/pcapi.js.svg?branch=master)](https://travis-ci.org/edina/pcapi.js.svg?branch=master)

### Running tests

First thing you need to do is to install all the dependencies:
```
npm install
```
For running tests you need to run either:
```
npm -g install gulp
gulp test
```
or
```
node_modules/gulp/bin/gulp test
```

For running systests you need to create a config.js inside the js folder that will follow the config.example.js logic. You need a url of where the PCAPI is installed and then run the systetsts like this:

```
node_modules/phantomjs/bin/phantomjs tests/sysindex.html
```


### Building library
For building the library on dist folder
```
gulp build
```
