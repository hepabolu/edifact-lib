'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _ = require('lodash');
var helpers = require('./edi-helpers.js');
var Validator = require('jsonschema').Validator;

var _require = require("./edi-errors.js");

var JsonSchemaValidationError = _require.JsonSchemaValidationError;


function ediItemFromConfig(name, config, level) {

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
    return new EdiDataComponent(name, config);
  }

  throw new Error("Unknown EDI type: \n" + JSON.stringify(config));
}

/**
The replacement expression based on special "EDI" characters used
*/
function getEdiEscapeRegex() {
  var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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

    this.name = name;
    this.config = {
      __type: this.constructor.name,
      edi_order: config.edi_order,
      edi_ref: config.edi_ref,
      required: config.required
    };
  }

  _createClass(EdiBase, [{
    key: 'parseConfig',
    value: function parseConfig(properties, level) {
      var items = [];
      for (var name in properties) {
        items.push(ediItemFromConfig(name, properties[name], level));
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
    var level = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];

    _classCallCheck(this, EdiSegment);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(EdiSegment).call(this, name, config));

    _this.config.level = level;
    _this.config.tag = config.edi_tag;
    _this.items = _this.parseConfig(config.properties, level + 1);
    return _this;
  }

  _createClass(EdiSegment, [{
    key: 'toEdi',
    value: function toEdi(data, config) {
      if (data) {
        config.totalSegments++;
        var items = getListOfEdiItems(data, this.items, config);
        items.unshift(this.config.tag);

        return items.join(config.dataElementSeparator) + config.segmentSeparator;
      } else {
        return null;
      }
    }
  }]);

  return EdiSegment;
}(EdiBase);

var EdiSegmentGroup = function (_EdiBase2) {
  _inherits(EdiSegmentGroup, _EdiBase2);

  function EdiSegmentGroup(name, config, level) {
    _classCallCheck(this, EdiSegmentGroup);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(EdiSegmentGroup).call(this, name, config));

    _this2.config.level = level;
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
            var seg = [this.config.groupTag];
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

            segs.push(seg.join(config.dataElementSeparator) + config.segmentSeparator);
          }
        }

        segs = _.compact(segs);
        return segs.length ? segs.join("") : null;
      } else {
        return null;
      }
    }
  }]);

  return EdiSegmentGroup;
}(EdiBase);

var EdiDataElement = function (_EdiBase3) {
  _inherits(EdiDataElement, _EdiBase3);

  function EdiDataElement(name, config) {
    _classCallCheck(this, EdiDataElement);

    var _this3 = _possibleConstructorReturn(this, Object.getPrototypeOf(EdiDataElement).call(this, name, config));

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
  }]);

  return EdiDataElement;
}(EdiBase);

var EdiDataComponent = function (_EdiBase4) {
  _inherits(EdiDataComponent, _EdiBase4);

  function EdiDataComponent(name, config) {
    _classCallCheck(this, EdiDataComponent);

    return _possibleConstructorReturn(this, Object.getPrototypeOf(EdiDataComponent).call(this, name, config));
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
  }]);

  return EdiDataComponent;
}(EdiBase);

var Edi = function (_EdiBase5) {
  _inherits(Edi, _EdiBase5);

  function Edi(jsonSchema) {
    _classCallCheck(this, Edi);

    var _this5 = _possibleConstructorReturn(this, Object.getPrototypeOf(Edi).call(this, "", jsonSchema.properties));

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

      var edis = [];

      var _iteratorNormalCompletion3 = true;
      var _didIteratorError3 = false;
      var _iteratorError3 = undefined;

      try {
        for (var _iterator3 = this.ediSchemaItems[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
          var item = _step3.value;

          //Special case for UNT
          if (item.config.tag === "UNT") {
            if (value[item.name]) {
              value[item.name].numberOfSegmentsInMessage = config.totalSegments + 1;
            } else {
              //create the UNT if not exists and add 1 for this new item
              value[item.name] = {
                numberOfSegmentsInMessage: config.totalSegments + 1
              };
            }
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
      var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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

module.exports = {
  Edi: Edi,
  EdiSegment: EdiSegment,
  EdiSegmentGroup: EdiSegmentGroup,
  EdiDataElement: EdiDataElement,
  EdiDataComponent: EdiDataComponent
};