'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Edi = require('../../lib/edi');

var _require = require("../../lib/edi-errors.js"),
    JsonSchemaValidationError = _require.JsonSchemaValidationError;

suite('Convert to EDI', function () {
  var jsonSchema;

  setup(function () {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "schemas/vermas.json.schema"), 'utf8'));
  });

  test('should fail when data invalid', function () {
    var edi = new Edi.Edi(jsonSchema);

    assert.throws(function () {
      edi.toEdi({ messageHeader: {} });
    }, /Json Schema Validation Errors/);
  });

  test('should write edi successfully', function () {
    var expected = fs.readFileSync(path.resolve(process.env.PWD, "src/test/to-edi/fixtures/test-success.edi"), 'utf8');
    var edi = new Edi.Edi(jsonSchema);
    var data = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/to-edi/fixtures/test-success.json"), 'utf8'));
    var actual = edi.toEdi(data);

    assert.deepEqual(actual, expected);
  });

  // test('should write edi successfully2', function() {
  //   let edi = new Edi.Edi(jsonSchema);
  //   let data = JSON.parse(fs.readFileSync(path.resolve("/Users/jlangley/Google Drive/MarineTransportInt/SOLAS/carrier-integrations/inttra/test5/sample_5.json"), 'utf8'));
  //   let actual = edi.toEdi(data);

  //   console.log(actual)
  // });
});