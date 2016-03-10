'use strict';

var path = require('path');
var fs = require('fs');

suite('Edi', function () {
  var directory = path.resolve(__dirname, 'edi');

  fs.readdirSync(directory).forEach(function (file) {
    if ('.js' === path.extname(file)) {
      require(path.resolve(directory, file));
    }
  });
});