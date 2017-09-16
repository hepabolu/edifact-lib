"use strict";

/*
 * Build all schemas by dereferencing the refs in the base schemas
 */

var derefs = require("json-schema-deref-sync");
var fs = require("fs");

var srcSchemaPath = "./src-schemas";
var files = fs.readdirSync(srcSchemaPath);
var options = {};
options.baseFolder = "src-schemas/subschemas";
var dstSchemaPath = "../schemas";

files.forEach(function (f) {
  if (f.substr(-4) == "json") {
    // we have a schema
    var schema = require(srcSchemaPath + "/" + f);
    var fullSchema = derefs(schema, options);
    var outputFile = dstSchemaPath + "/" + f;
    fs.writeFileSync(outputFile, JSON.stringify(fullSchema));
  }
}, undefined);