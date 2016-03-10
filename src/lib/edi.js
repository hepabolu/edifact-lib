let _ = require('lodash');
let helpers = require('./edi-helpers.js');
let Validator = require('jsonschema').Validator;
let {JsonSchemaValidationError} = require("./edi-errors.js");

function ediItemFromConfig(name, config, level) {

  if(config.edi_tag) {
    return new EdiSegment(name, config, level);
  }

  if(config.type === "array") {
    return new EdiSegmentGroup(name, config, level);
  }

  if(config.edi_ref && ['C', 'S'].indexOf(config.edi_ref[0]) > -1) {
    return new EdiDataElement(name, config);
  }

  if(config.edi_ref) {
    return new EdiDataComponent(name, config);
  }

  throw new Error("Unknown EDI type: \n" + JSON.stringify(config));
}

/**
The replacement expression based on special "EDI" characters used
*/
function getEdiEscapeRegex(config = {}) {
  return new RegExp("(["
    + config.segmentSeparator
    + config.dataElementSeparator
    + config.dataComponentSeparator
    + config.releaseCharacter
    + "])", "g");
}

/**
Used to render out edi items but omit where there isnt any data
at the last items on the list
*/
function getListOfEdiItems(data, list, config) {
  let items = [];
  let forceAdd = false;

  for (let i = (list.length - 1); i >= 0; i--) {
    let item = list[i];
    var val = item.toEdi(data[item.name], config);

    if(val) {
      forceAdd = true;
      items.unshift(val);
    } else if (forceAdd || !item.config.canOmit) {
      //the rest of the items can be omitted
      items.unshift("");
    }
  };

  return items;
}

class EdiBase {
  constructor(name, config) {
    this.name = name;
    this.config = {
      __type: this.constructor.name,
      edi_order: config.edi_order,
      edi_ref: config.edi_ref,
      required: config.required
    };
  }

  parseConfig(properties, level) {
    let items = [];
    for(let name in properties) {
      items.push(ediItemFromConfig(name, properties[name], level));
    }

    //reverse looping to ensure can omit is only up until last
    // none required property
    for(let i = items.length - 1; i >= 0; i--) {
      if(!items[i].config.required) {
        items[i].config.canOmit = true;
      } else {
        break;
      }
    }

    return _.sortBy(items, (item) => { return item.config.edi_order; });
  }

  toEdi(data, config) {
    throw new Error("toEdi: Not implemented");
  }
}

class EdiSegment extends EdiBase {
  constructor(name, config, level = 0) {
    super(name, config);
    this.config.level = level;
    this.config.tag = config.edi_tag;
    this.items = this.parseConfig(config.properties, level + 1);
  }

  toEdi(data, config) {
    if(data) {
      config.totalSegments ++;
      var items = getListOfEdiItems(data, this.items, config);
      items.unshift(this.config.tag);

      return items.join(config.dataElementSeparator) + config.segmentSeparator;
    } else {
      return null;
    }
  }
}

class EdiSegmentGroup extends EdiBase {
  constructor(name, config, level) {
    super(name, config);
    this.config.level = level;
    this.items = this.parseConfig(config.items.properties, level + 1);

    if(this.items.length > 0) {
      if(this.items[0].config.tag) {
        this.config.groupTag = this.items[0].config.tag;
      } else if(config.items.edi_tag) {
        //This is an group where the main item is the captcha group and the children are DataElements / DataComponents
        this.config.groupTag = config.items.edi_tag;
      }
    } else {
      console.error("Error finding properties", config);
      throw new Error("EdiSegmentGroup: Requires at least one property and the first items property must have an EDI_TAG");
    }
  }

  toEdi(data, config) {
    if(_.isArray(data) && !_.isEmpty(data)) {
      var segs = [];

      for(var i = 0; i < data.length; i++) {
        var row = data[i];

        if(this.items[0].config.__type === "EdiSegment") {
          for (let item of this.items) {
            var val = item.toEdi(row[item.name], config);

            if(val) {
              segs.push(val);
            }
          }
        } else {
          //This is an group where the main item is the captcha group and the children are DataElements / DataComponents
          var seg = [this.config.groupTag];
          config.totalSegments ++;

          for (let item of this.items) {
            var val = item.toEdi(row[item.name], config);

            if(val) {
              seg.push(val);
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
}

class EdiDataElement extends EdiBase {
  constructor(name, config) {
    super(name, config);
    this.items = this.parseConfig(config.properties);
  }

  toEdi(data, config) {
    if(data) {
      var items = getListOfEdiItems(data, this.items, config);
      return items.join(config.dataComponentSeparator)
    }
  }
}

class EdiDataComponent extends EdiBase {
  constructor(name, config) {
    super(name, config);
  }

  toEdi(data, config) {
    //add the replace expression to the config if it isnt already set.
    config.escapeRegEx = config.escapeRegEx || getEdiEscapeRegex(config);

    if(_.isString(data)) {
      return data.replace(config.escapeRegEx, config.releaseCharacter + "$1");
    }

    return data;
  }
}


class Edi extends EdiBase {

  constructor(jsonSchema) {
    super("", jsonSchema.properties);
    this.__validate(jsonSchema);
    this.jsonSchema = jsonSchema;
    helpers.flattenRefs(jsonSchema.definitions, jsonSchema);

    this.ediSchemaItems = this.parseConfig(jsonSchema.properties, 0);
  }

  toEdi(value, config) {
    this.__validateData(value);
    config = this.__getConfig(config);
    config.totalSegments = 0;

    let edis = [];

    for(let item of this.ediSchemaItems) {
      //Special case for UNT
      if(item.config.tag === "UNT") {
        if(value[item.name]) {
          value[item.name].numberOfSegmentsInMessage = config.totalSegments + 1;
        } else {
          //create the UNT if not exists and add 1 for this new item
          value[item.name] = {
            numberOfSegmentsInMessage: config.totalSegments + 1
          }
        }
      }


      edis.push(item.toEdi(value[item.name], config));
    }

    return _.compact(edis).join("");
  }

  //privates
  __validate(jsonSchema) {
    if(jsonSchema.type !== "object") {
      throw new Error("Root type must be an 'object'");
    }
  }

  __validateData(data) {
    let result = new Validator().validate(data, this.jsonSchema);
    if (!result.valid) {
      throw new JsonSchemaValidationError(result.errors);
    }
  }

  __getConfig(config = {}) {
    config = _.clone(config);
    config.segmentSeparator = config.segmentSeparator || "'\n";
    config.dataElementSeparator = config.dataElementSeparator || "+";
    config.dataComponentSeparator = config.dataComponentSeparator || ":";
    config.releaseCharacter = config.releaseCharacter || "?";
    return config;
  }
}

module.exports = {
  Edi,
  EdiSegment,
  EdiSegmentGroup,
  EdiDataElement,
  EdiDataComponent
};
