'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
let _ = require('lodash');
var Edi = require('../../lib/edi');
let {JsonSchemaValidationError} = require("../../lib/edi-errors.js");

suite('Segment Reader', function() {
  var ediConfig, input;

  setup(function() {
    input = "THE+test:of+another++body::again?:?'\n'\nLET+be:with+?++other'\n";
    ediConfig = {
      segmentSeparator: "'",
      dataElementSeparator: "+",
      dataComponentSeparator: ":",
      releaseCharacter: "?"
    };
  });

  test('should split on segments and watch for escape character', function() {
    let reader = new Edi.EdiSegmentReader(input, ediConfig);

    assert.deepEqual(reader.next().value, "THE+test:of+another++body::again?:'");
    assert.deepEqual(reader.next().value, "LET+be:with+?++other");
  });

  test('should set segment tags', function() {
    let reader = new Edi.EdiSegmentReader(input, ediConfig);

    assert.deepEqual(reader.next().tag, "THE");
    assert.deepEqual(reader.next().tag, "LET");
  });

  test('should return data elements', function() {
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    let actual = reader.current();

    assert.equal(actual.dataElements.length, 4);
    assert.deepEqual(actual.dataElements[0], ["test", "of"]);
  });

  test('should allow escaped data elements', function() {
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    reader.next();
    let actual = reader.current();

    assert.equal(actual.dataElements.length, 3);
    assert.deepEqual(actual.dataElements[1], ["+"]);
  });

  test('should allow escape char to be escaped', function() {
    var input = "BGM+ABC:Some?:doc?+code??:BCD:Some Name+di-1234:1.0.1:234+9+CBA+dsc+eng";
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    var expected = [ 'ABC', 'Some:doc+code?', 'BCD', 'Some Name' ];
    assert.deepEqual(reader.currentDataElement(), expected);
  });

  test('should allow escape char to be escaped with an UNA segment', function() {
    var input = "UNA:+.? 'BGM+ABC:Some?:doc?+code??:BCD:Some Name+di-1234:1.0.1:234+9+CBA+dsc+eng";
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    var expected = [ 'ABC', 'Some:doc+code?', 'BCD', 'Some Name' ];
    assert.deepEqual(reader.currentDataElement(), expected);
  });

  test('should allow escaped data components', function() {
    let reader = new Edi.EdiSegmentReader(input, ediConfig);
    let actual = reader.current();

    assert.equal(actual.dataElements.length, 4);
    assert.deepEqual(actual.dataElements[3][2], "again:'");
  });

  test('should allow multiple escaped chars', function() {
    var input =
      "FOO+bar?:123 and another?:567:foo?:456 and?' more ????:bar ?+ baz'";

    var reader = new Edi.EdiSegmentReader(input, ediConfig);
    let actual = reader.current();
    var expected = [
      ['bar:123 and another:567', "foo:456 and' more ???", 'bar + baz'] ];

    assert.deepEqual(actual.dataElements, expected);
  });
});
