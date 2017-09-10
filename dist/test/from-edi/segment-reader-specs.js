'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Edi = require('../../lib/edi');

var _require = require("../../lib/edi-errors.js"),
    JsonSchemaValidationError = _require.JsonSchemaValidationError;

suite('Segment Reader', function () {
  var ediConfig, input;

  setup(function () {
    input = "THE+test:of+another++body::again?:?'\n'\nLET+be:with+?++other'\n";
    ediConfig = {
      segmentSeparator: "'",
      dataElementSeparator: "+",
      dataComponentSeparator: ":",
      releaseCharacter: "?"
    };
  });

  test('should split on segments and watch for escape character', function () {
    var reader = new Edi.EdiSegmentReader(input, ediConfig);

    assert.deepEqual(reader.next().value, "THE+test:of+another++body::again?:'");
    assert.deepEqual(reader.next().value, "LET+be:with+?++other");
  });

  test('should set segment tags', function () {
    var reader = new Edi.EdiSegmentReader(input, ediConfig);

    assert.deepEqual(reader.next().tag, "THE");
    assert.deepEqual(reader.next().tag, "LET");
  });

  test('should return data elements', function () {
    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    var actual = reader.current();

    assert.equal(actual.dataElements.length, 4);
    assert.deepEqual(actual.dataElements[0], ["test", "of"]);
  });

  test('should allow escaped data elements', function () {
    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    reader.next();
    var actual = reader.current();

    assert.equal(actual.dataElements.length, 3);
    assert.deepEqual(actual.dataElements[1], ["+"]);
  });

  test('should allow escape char to be escaped', function () {
    var input = "BGM+ABC:Some?:doc?+code??:BCD:Some Name+di-1234:1.0.1:234+9+CBA+dsc+eng";
    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    var expected = ['ABC', 'Some:doc+code?', 'BCD', 'Some Name'];
    assert.deepEqual(reader.currentDataElement(), expected);
  });

  test('should allow escaped data components', function () {
    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    var actual = reader.current();

    assert.equal(actual.dataElements.length, 4);
    assert.deepEqual(actual.dataElements[3][2], "again:'");
  });
});