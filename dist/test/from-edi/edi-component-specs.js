'use strict';

var assert = require('assert');
var sinon = require('sinon');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Edi = require('../../lib/edi');

var _require = require("../../lib/edi-errors.js");

var JsonSchemaValidationError = _require.JsonSchemaValidationError;


suite('Edi Components', function () {
  var jsonSchema, ediConfig;

  setup(function () {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/test-simple-schema.json.schema"), 'utf8'));
    ediConfig = {
      segmentSeparator: "'\n",
      dataElementSeparator: "+",
      dataComponentSeparator: ":",
      releaseCharacter: "?"
    };
  });

  suite('EdiSegmentGroup', function () {
    var seg;

    suite('Array of Segments', function () {
      setup(function () {
        seg = new Edi.EdiSegmentGroup("array_of_segments", jsonSchema.properties.array_of_segments);
      });

      test('should parse multiple segments', function () {
        ediConfig.segmentSeparator = "'";
        var reader = new Edi.EdiSegmentReader("FOO+bar?:123'FOO+foo?:456'FOO+tum?:789'", ediConfig);

        var expected = [{ date_value: "bar:123" }, { date_value: "foo:456" }, { date_value: "tum:789" }];

        var actual = seg.parse(reader, ediConfig);
        assert.deepEqual(actual, expected);
      });
    });

    suite('Array of Objects', function () {
      setup(function () {
        seg = new Edi.EdiSegmentGroup("array_of_objects", jsonSchema.properties.array_of_objects);
      });

      test('should parse multiple objects', function () {
        ediConfig.segmentSeparator = "'";
        var reader = new Edi.EdiSegmentReader("BAR+bar?:123'BAR+foo?:456'BAR+tum?:789'", ediConfig);

        var expected = [{ my_bar_seg: { bar_val: "bar:123" } }, { my_bar_seg: { bar_val: "foo:456" } }, { my_bar_seg: { bar_val: "tum:789" } }];

        var actual = seg.parse(reader, ediConfig);
        assert.deepEqual(actual, expected);
      });
    });

    suite('Nested Segments', function () {
      setup(function () {
        seg = new Edi.EdiSegmentGroup("nested_segment_groups", jsonSchema.properties.nested_segment_groups);
      });

      test('should parse segments', function () {
        var input = fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/segment-group-input.edi"), 'utf8');

        var reader = new Edi.EdiSegmentReader(input, ediConfig);
        var expected = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/from-edi/fixtures/segment-group-parse-success.json"), 'utf8'));

        var actual = seg.parse(reader, ediConfig);
        assert.deepEqual(actual, expected);
      });
    });
  });

  suite('EdiSegment', function () {
    var seg;
    setup(function () {
      seg = new Edi.EdiSegment("measurement", jsonSchema.properties.measurement);
    });

    test("should parse from edi", function () {
      var input = "MEA+Test1:Test2+Test3+++Test4'\n";
      var reader = new Edi.EdiSegmentReader(input, ediConfig);

      var expected = {
        "foo": {
          "foo_bar1": "Test1",
          "foo_bar2": "Test2"
        },
        "bar1": "Test3",
        "bar4": "Test4"
      };

      var actual = seg.parse(reader, ediConfig);
      assert.deepEqual(actual, expected);
    });

    test("should advance to next data element when segment is also DataElement", function () {
      var comp = new Edi.EdiSegment("foo", jsonSchema.properties.measurement);
      var reader = new Edi.EdiSegmentReader("MEA+Test1:Test2+Test3+++Test4'\n", ediConfig);
      var nextDataElementSpy = sinon.spy(reader, 'nextDataElement');

      comp.parse(reader);
      sinon.assert.callCount(nextDataElementSpy, 5);
    });

    test("should not advance to next data element when segment has DataElements + DataComponents", function () {
      var comp = new Edi.EdiSegment("foo", jsonSchema.properties.measurement.properties.foo);
      var reader = new Edi.EdiSegmentReader("FOO+Test1:Test2::Test4'\n", ediConfig);
      var nextDataElementSpy = sinon.spy(reader, 'nextDataElement');

      comp.parse(reader);
      sinon.assert.notCalled(nextDataElementSpy);
    });
  });

  suite('EdiSegment as DataElement Container', function () {
    var seg;
    setup(function () {
      jsonSchema.properties.measurement.properties.foo.edi_tag = "FOO";
      seg = new Edi.EdiSegment("measurement-foo", jsonSchema.properties.measurement.properties.foo);
    });

    test("should parse via single DataComponent", function () {
      var input = "FOO+Test1:::Test4'\n";
      var reader = new Edi.EdiSegmentReader(input, ediConfig);
      var expected = { "foo_bar1": "Test1", "foo_bar4": "Test4" };

      var actual = seg.parse(reader);
      assert.deepEqual(actual, expected);
    });
  });

  suite('EdiDataElement', function () {
    var element, reader;
    setup(function () {
      element = new Edi.EdiDataElement("foo", jsonSchema.properties.measurement.properties.foo);
    });

    test("should parse with data components", function () {
      var input = "MEA+test1:test2::test4'\n";
      var reader = new Edi.EdiSegmentReader(input, ediConfig);
      var actual = element.parse(reader);
      var expected = { foo_bar1: 'test1', foo_bar2: 'test2', foo_bar4: 'test4' };
      assert.deepEqual(actual, expected);
    });
  });

  suite('EdiDataComponent', function () {

    test("should parse single item", function () {
      var comp = new Edi.EdiDataComponent("bar2", jsonSchema.properties.measurement.properties.bar2);
      var input = "MEA+Test1'\n";
      var reader = new Edi.EdiSegmentReader(input, ediConfig);

      var actual = comp.parse(reader);
      assert.equal(actual, "Test1");
    });

    test("should parse with multiple components", function () {
      var comp = new Edi.EdiDataComponent("bar2", jsonSchema.properties.measurement.properties.bar2);
      var input = "MEA+Test1:Test2'\n";
      var reader = new Edi.EdiSegmentReader(input, ediConfig);
      var actual = comp.parse(reader);
      assert.equal(actual, "Test1");
    });
  });
});