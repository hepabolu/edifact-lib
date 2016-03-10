"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var RequiredPropertyError = function (_Error) {
  _inherits(RequiredPropertyError, _Error);

  function RequiredPropertyError() {
    var config = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

    _classCallCheck(this, RequiredPropertyError);

    var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(RequiredPropertyError).call(this));

    _this.propertyName = config.propertyName;
    _this.causingSchema = config.causingSchema;
    _this.segment = config.segment;
    _this.filledData = config.filledData;

    _this.message = "Required property is missing: \"" + _this.propertyName + "\":\n" + JSON.stringify(_this, null, 2);
    return _this;
  }

  return RequiredPropertyError;
}(Error);

var JsonSchemaValidationError = function (_Error2) {
  _inherits(JsonSchemaValidationError, _Error2);

  function JsonSchemaValidationError(errors) {
    _classCallCheck(this, JsonSchemaValidationError);

    var _this2 = _possibleConstructorReturn(this, Object.getPrototypeOf(JsonSchemaValidationError).call(this, "Json Schema Validation Errors:\n" + JSON.stringify(errors, null, 2)));

    _this2.errors = errors;
    return _this2;
  }

  return JsonSchemaValidationError;
}(Error);

module.exports = {
  RequiredPropertyError: RequiredPropertyError,
  JsonSchemaValidationError: JsonSchemaValidationError
};