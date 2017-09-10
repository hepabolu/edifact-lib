'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var helpers = require('./edi-helpers.js');
var Validator = require('jsonschema').Validator;

var _require = require("./edi-errors.js"),
    JsonSchemaValidationError = _require.JsonSchemaValidationError;

function ediItemFromConfig(name, config, level, parent) {

  if (config.edi_tag) {
    return new EdiSegment(name, config, level);
  }

  if (config.type === "array") {
    return new EdiSegmentGroup(name, config, level);
  }

  if (config.edi_ref && ['C', 'S'].indexOf(config.edi_ref[0]) > -1) {
    return new EdiDataElement(name, config);
  }

  if (config.edi_ref) {
    return new EdiDataComponent(name, config, parent);
  }

  throw new Error("Unknown EDI type: \n" + JSON.stringify(config));
}

/**
The replacement expression based on special "EDI" characters used
*/
function getEdiEscapeRegex() {
  var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  return new RegExp("([" + config.segmentSeparator + config.dataElementSeparator + config.dataComponentSeparator + config.releaseCharacter + "])", "g");
}

/**
Used to render out edi items but omit where there isnt any data
at the last items on the list
*/
function getListOfEdiItems(data, list, config) {
  var items = [];
  var forceAdd = false;

  for (var i = list.length - 1; i >= 0; i--) {
    var item = list[i];
    var val = item.toEdi(data[item.name], config);

    if (val) {
      forceAdd = true;
      items.unshift(val);
    } else if (forceAdd || !item.config.canOmit) {
      //the rest of the items can be omitted
      items.unshift("");
    }
  };

  return items;
}

var EdiBase = function () {
  function EdiBase(name, config) {
    _classCallCheck(this, EdiBase);

    if (!config) {
      throw new Error("EdiBase: Config is required");
    }

    this.name = name;
    this.config = {
      __type: this.constructor.name,
      edi_order: config.edi_order,
      edi_ref: config.edi_ref,
      required: config.required,
      dataType: config.type
    };
  }

  _createClass(EdiBase, [{
    key: 'parseConfig',
    value: function parseConfig(properties, level) {
      var items = [];
      for (var name in properties) {
        items.push(ediItemFromConfig(name, properties[name], level, this));
      }

      //reverse looping to ensure can omit is only up until last
      // none required property
      for (var i = items.length - 1; i >= 0; i--) {
        if (!items[i].config.required) {
          items[i].config.canOmit = true;
        } else {
          break;
        }
      }

      return _.sortBy(items, function (item) {
        return item.config.edi_order;
      });
    }
  }, {
    key: 'toEdi',
    value: function toEdi(data, config) {
      throw new Error("toEdi: Not implemented");
    }
  }]);

  return EdiBase;
}();

var EdiSegment = function (_EdiBase) {
  _inherits(EdiSegment, _EdiBase);

  function EdiSegment(name, config) {
    var level = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;

    _classCallCheck(this, EdiSegment);

    var _this = _possibleConstructorReturn(this, (EdiSegment.__proto__ || Object.getPrototypeOf(EdiSegment)).call(this, name, config));

    _this.config.level = level;
    _this.config.tag = config.edi_tag;
    _this.items = _this.parseConfig(config.properties, level + 1);
    return _this;
  }

  _createClass(EdiSegment, [{
    key: 'toEdi',
    value: function toEdi(data, config) {
      if (data) {
        //if this is an "edi_ref" then this is a "DataElement" segment containing "DataComponents" so
        // join using the "dataComponentSeparator" otherwise use the "dataElementSeparator"
        var joiner = this.config.edi_ref ? config.dataComponentSeparator : config.dataElementSeparator;

        if (this.config.tag === "UNH") {
          //Reset the total segments when a UNH is picked up
          config.totalSegments = 1;

          //Increase the total messages for the entire transfer
          config.totalMessages++;
        } else {
          config.totalSegments++;
        }

        var items = getListOfEdiItems(data, this.items, config);

        return this.config.tag + config.dataElementSeparator + items.join(joiner) + config.segmentSeparator;
      } else {
        return null;
      }
    }
  }, {
    key: 'parse',
    value: function parse(reader) {
      if (reader.current() && reader.current().tag === this.config.tag) {
        var ret = {};

        for (var i = 0; i < this.items.length; i++) {
          var val = this.items[i].parse(reader);

          if (!_.isUndefined(val)) {
            ret[this.items[i].name] = val;
          }
        }

        reader.next();
        return ret;
      }

      return undefined;
    }
  }]);

  return EdiSegment;
}(EdiBase);

var EdiSegmentGroup = function (_EdiBase2) {
  _inherits(EdiSegmentGroup, _EdiBase2);

  function EdiSegmentGroup(name, config, level) {
    _classCallCheck(this, EdiSegmentGroup);

    var _this2 = _possibleConstructorReturn(this, (EdiSegmentGroup.__proto__ || Object.getPrototypeOf(EdiSegmentGroup)).call(this, name, config));

    _this2.config.level = level;
    _this2.config.edi_ref = config.items.edi_ref;
    _this2.items = _this2.parseConfig(config.items.properties, level + 1);

    if (_this2.items.length > 0) {
      if (_this2.items[0].config.tag) {
        _this2.config.groupTag = _this2.items[0].config.tag;
      } else if (config.items.edi_tag) {
        //This is an group where the main item is the captcha group and the children are DataElements / DataComponents
        _this2.config.groupTag = config.items.edi_tag;
      }
    } else {
      console.error("Error finding properties", config);
      throw new Error("EdiSegmentGroup: Requires at least one property and the first items property must have an EDI_TAG");
    }
    return _this2;
  }

  _createClass(EdiSegmentGroup, [{
    key: 'toEdi',
    value: function toEdi(data, config) {
      if (_.isArray(data) && !_.isEmpty(data)) {
        var segs = [];

        for (var i = 0; i < data.length; i++) {
          var row = data[i];

          if (this.items[0].config.__type === "EdiSegment") {
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = this.items[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var item = _step.value;

                var val = item.toEdi(row[item.name], config);

                if (val) {
                  segs.push(val);
                }
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                  _iterator.return();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }
          } else {
            //This is an group where the main item is the captcha group and the children are DataElements / DataComponents
            var seg = [];
            config.totalSegments++;

            var _iteratorNormalCompletion2 = true;
            var _didIteratorError2 = false;
            var _iteratorError2 = undefined;

            try {
              for (var _iterator2 = this.items[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _item = _step2.value;

                var val = _item.toEdi(row[_item.name], config);

                if (val) {
                  seg.push(val);
                }
              }

              //if this is an "edi_ref" then this is a "DataElement" containing "DataComponents" so
              // join using the "dataComponentSeparator" otherwise use the "dataElementSeparator"
            } catch (err) {
              _didIteratorError2 = true;
              _iteratorError2 = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                  _iterator2.return();
                }
              } finally {
                if (_didIteratorError2) {
                  throw _iteratorError2;
                }
              }
            }

            var joiner = this.config.edi_ref ? config.dataComponentSeparator : config.dataElementSeparator;

            segs.push(this.config.groupTag + config.dataElementSeparator + seg.join(joiner) + config.segmentSeparator);
          }
        }

        segs = _.compact(segs);
        return segs.length ? segs.join("") : null;
      } else {
        return null;
      }
    }
  }, {
    key: 'parse',
    value: function parse(reader) {
      var current, segs, nest_order;

      //continue in the captcha group until no more matches)
      // allow for explicit nesting numbers
      while (reader.current() && _.startsWith(reader.current().tag, this.config.groupTag)) {
        if (reader.current().tag !== this.config.groupTag) {
          // explicit nesting, for now we assume only one level
          nest_order = reader.current().tag.match(/.{4}(.*)/)[1];
        }

        segs = segs || [];
        var val = {};

        if (nest_order) {
          segs[nest_order] = segs[nest_order] || {};
        }
        for (var i = 0; i < this.items.length; i++) {
          var dVal = this.items[i].parse(reader);
          if (dVal) {
            val[this.items[i].name] = dVal;
          }
        }

        if (!_.isEmpty(val)) {
          if (nest_order) {
            segs[nest_order] = val;
          } else {
            segs.push(val);
          }
        } else {
          reader.next();
        }
      }

      if (nest_order && segs[0] === undefined) {
        segs.shift();
      }

      return segs;
    }
  }]);

  return EdiSegmentGroup;
}(EdiBase);

var EdiDataElement = function (_EdiBase3) {
  _inherits(EdiDataElement, _EdiBase3);

  function EdiDataElement(name, config) {
    _classCallCheck(this, EdiDataElement);

    var _this3 = _possibleConstructorReturn(this, (EdiDataElement.__proto__ || Object.getPrototypeOf(EdiDataElement)).call(this, name, config));

    _this3.items = _this3.parseConfig(config.properties);
    return _this3;
  }

  _createClass(EdiDataElement, [{
    key: 'toEdi',
    value: function toEdi(data, config) {
      if (data) {
        var items = getListOfEdiItems(data, this.items, config);
        return items.join(config.dataComponentSeparator);
      }
    }
  }, {
    key: 'parse',
    value: function parse(reader) {
      var ret = {};
      for (var i = 0; i < this.items.length; i++) {
        var val = this.items[i].parse(reader);
        if (!_.isUndefined(val)) {
          ret[this.items[i].name] = val;
        }
      }

      reader.nextDataElement();

      if (!_.isEmpty(ret)) {
        return ret;
      } else {
        return undefined;
      }
    }
  }]);

  return EdiDataElement;
}(EdiBase);

var EdiDataComponent = function (_EdiBase4) {
  _inherits(EdiDataComponent, _EdiBase4);

  function EdiDataComponent(name, config, parent) {
    _classCallCheck(this, EdiDataComponent);

    var _this4 = _possibleConstructorReturn(this, (EdiDataComponent.__proto__ || Object.getPrototypeOf(EdiDataComponent)).call(this, name, config));

    _this4.config.parentConfig = parent ? parent.config : {};
    return _this4;
  }

  _createClass(EdiDataComponent, [{
    key: 'toEdi',
    value: function toEdi(data, config) {
      //add the replace expression to the config if it isnt already set.
      config.escapeRegEx = config.escapeRegEx || getEdiEscapeRegex(config);

      if (_.isString(data)) {
        return data.replace(config.escapeRegEx, config.releaseCharacter + "$1");
      }

      return data;
    }
  }, {
    key: 'parse',
    value: function parse(reader) {
      var data = reader.nextDataComponent();

      //if this parent is a segment and the segment is an DataElement
      // then fetch next data element
      // ie. FOO+1:2:3'  - Where 1,2,3 are data components
      var parentConfig = this.config.parentConfig;
      if (["EdiSegment", "EdiSegmentGroup"].indexOf(parentConfig.__type) >= 0 && !parentConfig.edi_ref) {
        reader.nextDataElement();
      }

      if (!_.isEmpty(data)) {

        switch (this.config.dataType) {
          case "integer":
          case "number":
            return parseInt(data);
          case "decimal":
            return parseFloat(data);
          default:
            return data;
        }
      } else {
        return undefined;
      }
    }
  }]);

  return EdiDataComponent;
}(EdiBase);

var Edi = function (_EdiBase5) {
  _inherits(Edi, _EdiBase5);

  function Edi(jsonSchema) {
    _classCallCheck(this, Edi);

    var _this5 = _possibleConstructorReturn(this, (Edi.__proto__ || Object.getPrototypeOf(Edi)).call(this, "", jsonSchema.properties));

    _this5.__validate(jsonSchema);
    _this5.jsonSchema = jsonSchema;
    helpers.flattenRefs(jsonSchema.definitions, jsonSchema);

    _this5.ediSchemaItems = _this5.parseConfig(jsonSchema.properties, 0);
    return _this5;
  }

  _createClass(Edi, [{
    key: 'toEdi',
    value: function toEdi(value, config) {
      this.__validateData(value);
      config = this.__getConfig(config);
      config.totalSegments = 0;
      config.totalMessages = 0;

      var edis = [];

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.ediSchemaItems[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var item = _step3.value;

          //Special case for UNT + UNZ
          if (item.config.tag === "UNT") {
            value[item.name] = value[item.name] || {};
            value[item.name].numberOfSegmentsInMessage = config.totalSegments + 1;
          } else if (item.config.tag === "UNZ") {
            value[item.name] = value[item.name] || {};
            value[item.name].interchangeControlCount = config.totalMessages;
          }

          edis.push(item.toEdi(value[item.name], config));
        }
      } catch (err) {
        _didIteratorError3 = true;
        _iteratorError3 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion3 && _iterator3.return) {
            _iterator3.return();
          }
        } finally {
          if (_didIteratorError3) {
            throw _iteratorError3;
          }
        }
      }

      return _.compact(edis).join("");
    }
  }, {
    key: 'parse',
    value: function parse(reader) {
      var current = reader.current();
      var ret = {};

      var _iteratorNormalCompletion4 = true;
      var _didIteratorError4 = false;
      var _iteratorError4 = undefined;

      try {
        for (var _iterator4 = this.ediSchemaItems[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
          var item = _step4.value;

          var val = item.parse(reader);
          if (!_.isUndefined(val)) {
            ret[item.name] = val;
          }
        }
      } catch (err) {
        _didIteratorError4 = true;
        _iteratorError4 = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion4 && _iterator4.return) {
            _iterator4.return();
          }
        } finally {
          if (_didIteratorError4) {
            throw _iteratorError4;
          }
        }
      }

      return ret;
    }

    //privates

  }, {
    key: '__validate',
    value: function __validate(jsonSchema) {
      if (jsonSchema.type !== "object") {
        throw new Error("Root type must be an 'object'");
      }
    }
  }, {
    key: '__validateData',
    value: function __validateData(data) {
      var result = new Validator().validate(data, this.jsonSchema);
      if (!result.valid) {
        throw new JsonSchemaValidationError(result.errors);
      }
    }
  }, {
    key: '__getConfig',
    value: function __getConfig() {
      var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      config = _.clone(config);
      config.segmentSeparator = config.segmentSeparator || "'\n";
      config.dataElementSeparator = config.dataElementSeparator || "+";
      config.dataComponentSeparator = config.dataComponentSeparator || ":";
      config.releaseCharacter = config.releaseCharacter || "?";
      return config;
    }
  }]);

  return Edi;
}(EdiBase);

var EdiSegmentReader = function () {
  function EdiSegmentReader(input, config) {
    _classCallCheck(this, EdiSegmentReader);

    this.config = config;
    this.segments = this.initSegments(input);
  }

  _createClass(EdiSegmentReader, [{
    key: 'initSegments',
    value: function initSegments(input) {
      var items = this.regexSplitter(input, this.config.segmentSeparator, this.config.releaseCharacter);
      var segments = [];
      for (var i = 0; i < items.length; i++) {
        var dataElms = this.regexSplitter(items[i], this.config.dataElementSeparator, this.config.releaseCharacter);
        var seg = {
          tag: dataElms[0],
          dataElements: [],
          value: items[i]
        };

        for (var j = 1; j < dataElms.length; j++) {
          var comps = this.regexSplitter(dataElms[j], this.config.dataComponentSeparator, this.config.releaseCharacter);

          for (var k = 0; k < comps.length; k++) {
            comps[k] = comps[k].replace(this.config.releaseCharacter + this.config.releaseCharacter, this.config.releaseCharacter, 'g');
          }

          seg.dataElements.push(comps);
        }

        segments.push(seg);
      }

      return segments;
    }
  }, {
    key: 'regexSplitter',
    value: function regexSplitter(input, split, esc) {
      var output = [];
      var lastIndex = 0;

      input.replace(new RegExp("\\" + split, "g"), function (val, index) {
        var es = input.substring(index, index - esc.length);
        var esAndPrev = input.substring(index, index - esc.length * 2);

        if (es !== esc || esAndPrev === esc + esc) {
          output.push(input.substring(lastIndex, index));
          lastIndex = index + split.length;
        }
      });

      //get last input items on the stack
      if (lastIndex < input.length) {
        output.push(input.substring(lastIndex));
      }

      //cleanup escape characters and trim
      for (var i = 0; i < output.length; i++) {
        output[i] = output[i].replace(esc + split, split).trim();
      }

      return output;
    }
  }, {
    key: 'current',
    value: function current() {
      return this.segments[0];
    }
  }, {
    key: 'next',
    value: function next() {
      return this.segments.shift();
    }
  }, {
    key: 'currentDataElement',
    value: function currentDataElement() {
      var cur = this.current();
      return cur ? this.current().dataElements[0] : undefined;
    }
  }, {
    key: 'nextDataElement',
    value: function nextDataElement() {
      var cur = this.current();
      return cur ? this.current().dataElements.shift() : undefined;
    }
  }, {
    key: 'currentDataComponent',
    value: function currentDataComponent() {
      var de = this.currentDataElement();
      return de ? this.currentDataElement()[0] : undefined;
    }
  }, {
    key: 'nextDataComponent',
    value: function nextDataComponent() {
      var de = this.currentDataElement();
      return de ? this.currentDataElement().shift() : undefined;
    }
  }]);

  return EdiSegmentReader;
}();

module.exports = {
  Edi: Edi,
  EdiSegment: EdiSegment,
  EdiSegmentGroup: EdiSegmentGroup,
  EdiDataElement: EdiDataElement,
  EdiDataComponent: EdiDataComponent,
  EdiSegmentReader: EdiSegmentReader
};