'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
let _ = require('lodash');
var Edi = require('../../lib/edi');
let {JsonSchemaValidationError} = require("../../lib/edi-errors.js");

suite('Marshal', function() {
  var jsonSchema;

  setup(function() {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "schemas/vermas.json.schema"), 'utf8'));
  });

  suite('Convert to EDI', function() {

    test('should fail when data invalid', function() {
      let edi = new Edi.Edi(jsonSchema);

      assert.throws(function() {
        edi.toEdi({ messageHeader: {} });
      }, /Json Schema Validation Errors/);
    });

    test('should write edi successfully', function() {
      let expected = fs.readFileSync(path.resolve(process.env.PWD, "src/test/edi/fixtures/test-success.edi"), 'utf8');
      let edi = new Edi.Edi(jsonSchema);
      let data = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/edi/fixtures/test-success.json"), 'utf8'));
      let actual = edi.toEdi(data);

      assert.deepEqual(actual, expected);
    });
  });
});

