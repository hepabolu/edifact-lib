'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
let _ = require('lodash');
var Edi = require('../../lib/edi');
let {JsonSchemaValidationError} = require("../../lib/edi-errors.js");

suite('Parse EDI', function() {
  var jsonSchema, ediConfig;

  setup(function() {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "schemas/vermas.json.schema"), 'utf8'));
    ediConfig = {
      segmentSeparator: "'",
      dataElementSeparator: "+",
      dataComponentSeparator: ":",
      releaseCharacter: "?"
    };
  });

  test('should fail when data invalid', function() {
    let edi = new Edi.Edi(jsonSchema);

    assert.throws(function() {
      edi.toEdi({ messageHeader: {} });
    }, /Json Schema Validation Errors/);
  });

  test('should parse edi successfully', function() {
    let expected = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/test-success.json"), 'utf8'));
    let input = fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/test-success.edi"), 'utf8');
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    let edi = new Edi.Edi(jsonSchema);

    let actual = edi.parse(reader);

    assert.deepEqual(actual, expected);
  });
});
