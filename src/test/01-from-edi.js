'use strict';

var path = require('path');
var fs   = require('fs');

suite('From Edi', function () {
  var directory = path.resolve(__dirname, 'from-edi');

  fs.readdirSync(directory).forEach(function (file) {
    if ('.js' === path.extname(file)) {
      require(path.resolve(directory, file));
    }
  });
});
