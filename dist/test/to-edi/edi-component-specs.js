'use strict';

var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var Edi = require('../../lib/edi');

var _require = require("../../lib/edi-errors.js");

var JsonSchemaValidationError = _require.JsonSchemaValidationError;


suite('Edi Components', function () {
  var jsonSchema, ediConfig;

  setup(function () {
    jsonSchema = JSON.parse(fs.readFileSync(path.resolve(process.env.PWD, "src/test/to-edi/fixtures/test-simple-schema.json.schema"), 'utf8'));
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

      test('should write multiple segments toEdi', function () {
        ediConfig.segmentSeparator = "'";
        var data = [{ date_value: "bar:123" }, { date_value: "foo:456" }, { date_value: "tum:789" }];

        var actual = seg.toEdi(data, ediConfig);
        assert.deepEqual(actual, "FOO+bar?:123'FOO+foo?:456'FOO+tum?:789'");
      });
    });

    suite('Array of Segments by DataElement', function () {
      setup(function () {
        var array_of_segments = {
          "edi_order": 2,
          "type": "array",
          "maxItems": 2,
          "title": "Foos",
          "items": {
            "edi_order": 1,
            "edi_tag": "FOO",
            "edi_ref": "C1222",
            "title": "Values",
            "type": "object",
            "properties": {
              "value1": {
                "edi_order": 1,
                "edi_ref": "2005",
                "type": "string"
              },
              "value2": {
                "edi_order": 2,
                "edi_ref": "2006",
                "type": "string"
              }
            }
          }
        };

        seg = new Edi.EdiSegmentGroup("array_of_segments", array_of_segments);
      });

      test('should render as single DataElement with DataComponents', function () {
        ediConfig.segmentSeparator = "'";
        var data = [{ value1: "bar1", value2: "foo1" }, { value1: "bar2", value2: "foo2" }];

        var actual = seg.toEdi(data, ediConfig);
        assert.deepEqual(actual, "FOO+bar1:foo1'FOO+bar2:foo2'");
      });
    });

    suite('Array of Objects', function () {
      setup(function () {
        seg = new Edi.EdiSegmentGroup("array_of_objects", jsonSchema.properties.array_of_objects);
      });

      test('should write multiple objects toEdi', function () {
        ediConfig.segmentSeparator = "'";
        var data = [{ my_bar_seg: { bar_val: "bar:123" } }, { my_bar_seg: { bar_val: "foo:456" } }, { my_bar_seg: { bar_val: "tum:789" } }];

        var actual = seg.toEdi(data, ediConfig);
        assert.deepEqual(actual, "BAR+bar?:123'BAR+foo?:456'BAR+tum?:789'");
      });
    });
  });

  suite('EdiSegment', function () {
    var seg;
    setup(function () {
      seg = new Edi.EdiSegment("measurement", jsonSchema.properties.measurement);
    });

    test("should initialise with correct properties", function () {
      assert.equal(seg.name, "measurement");
      assert.equal(seg.config.tag, "MEA");
      assert.equal(seg.config.edi_order, 1);
      assert.equal(seg.config.level, 0);
      assert(seg.config.required);
    });

    test("should have correct children", function () {
      assert.equal(seg.items.length, 5);
      assert.equal(seg.items[0].name, "foo");
      assert.equal(seg.items[1].name, "bar1");
      assert.equal(seg.items[0].constructor.name, "EdiDataElement");
      assert.equal(seg.items[1].constructor.name, "EdiDataComponent");
    });

    test("should toEdi with blank elements", function () {
      var data = {
        "foo": {
          "foo_bar1": "Test1",
          "foo_bar2": "Test2"
        },
        "bar1": "Test3",
        "bar4": "Test4"
      };

      var actual = seg.toEdi(data, ediConfig);
      assert.deepEqual(actual, "MEA+Test1:Test2+Test3+++Test4'\n");
    });

    test("should toEdi with required elements", function () {
      var data = {
        "foo": {
          "foo_bar1": "Test1"
        },
        "bar2": "Test4"
      };

      var actual = seg.toEdi(data, ediConfig);
      assert.deepEqual(actual, "MEA+Test1:++Test4'\n");
    });

    test("should reset segment count on UNH segment toEdi", function () {
      ediConfig.totalSegments = 10;
      seg.config.tag = "UNH";
      seg.toEdi({}, ediConfig);
      assert.equal(ediConfig.totalSegments, 1);
    });

    test("should increment totalMessages on UNH segment toEdi", function () {
      ediConfig.totalMessages = 10;
      seg.config.tag = "UNH";
      seg.toEdi({}, ediConfig);
      assert.equal(ediConfig.totalMessages, 11);
    });
  });

  suite('EdiSegment as DataElement Container', function () {
    var seg;
    setup(function () {
      jsonSchema.properties.measurement.properties.foo.edi_tag = "FOO";
      seg = new Edi.EdiSegment("measurement-foo", jsonSchema.properties.measurement.properties.foo);
    });

    test("should render with single DataComponent", function () {
      var data = { "foo_bar1": "Test1", "foo_bar4": "Test4" };

      var actual = seg.toEdi(data, ediConfig);
      assert.deepEqual(actual, "FOO+Test1:::Test4'\n");
    });
  });

  suite('EdiDataElement', function () {
    var element;
    setup(function () {
      element = new Edi.EdiDataElement("foo", jsonSchema.properties.measurement.properties.foo);
    });

    test("should initialise with correct properties", function () {
      assert.equal(element.name, "foo");
      assert.equal(element.config.tag, undefined);
      assert.equal(element.config.edi_ref, "C5422");
      assert.equal(element.config.edi_order, 1);
      assert(!element.config.required);
    });

    test("should have correct children", function () {
      assert.equal(element.items.length, 4);
      assert.equal(element.items[0].name, "foo_bar1");
      assert.equal(element.items[0].constructor.name, "EdiDataComponent");
    });

    test("should toEdi with 'required' fields", function () {
      var data = { "foo_bar1": "Test1" };

      var actual = element.toEdi(data, ediConfig);
      assert.deepEqual(actual, "Test1:");
    });

    test("should toEdi with blank fields", function () {
      var data = { "foo_bar1": "Test1", "foo_bar4": "Test4" };

      var actual = element.toEdi(data, ediConfig);
      assert.deepEqual(actual, "Test1:::Test4");
    });
  });

  suite('EdiDataComponent', function () {
    var comp;
    setup(function () {
      comp = new Edi.EdiDataComponent("bar2", jsonSchema.properties.measurement.properties.bar2);
    });

    test("should initialise with correct properties", function () {
      assert.equal(comp.name, "bar2");
      assert.equal(comp.config.tag, undefined);
      assert.equal(comp.config.edi_ref, "2122");
      assert.equal(comp.config.edi_order, 3);
      assert(comp.config.required);
    });

    test("should have no children", function () {
      assert.equal(comp.items, undefined);
    });

    test("should toEdi should escape text", function () {
      var data = "Hello? Let's get + them : with that's";
      var expected = "Hello?? Let?'s get ?+ them ?: with that?'s";
      var actual = comp.toEdi(data, ediConfig);

      assert.deepEqual(actual, expected);
    });
  });
});