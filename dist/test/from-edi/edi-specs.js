'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Edi = require('../../lib/edi');

var _require = require("../../lib/edi-errors.js");

var JsonSchemaValidationError = _require.JsonSchemaValidationError;


suite('Parse EDI', function () {
  var jsonSchema, ediConfig;

  setup(function () {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "schemas/vermas.json.schema"), 'utf8'));
    ediConfig = {
      segmentSeparator: "'",
      dataElementSeparator: "+",
      dataComponentSeparator: ":",
      releaseCharacter: "?"
    };
  });

  test('should fail when data invalid', function () {
    var edi = new Edi.Edi(jsonSchema);

    assert.throws(function () {
      edi.toEdi({ messageHeader: {} });
    }, /Json Schema Validation Errors/);
  });

  test('should parse edi successfully', function () {
    var expected = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/test-success.json"), 'utf8'));
    var input = fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/test-success.edi"), 'utf8');
    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    var edi = new Edi.Edi(jsonSchema);

    var actual = edi.parse(reader);

    assert.deepEqual(actual, expected);
  });
});