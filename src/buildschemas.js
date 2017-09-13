/*
 * Build all schemas by dereferencing the refs in the base schemas
 */

const derefs = require("json-schema-deref-sync");
const fs = require("fs");

let srcSchemaPath = "./src-schemas";
let files = fs.readdirSync(srcSchemaPath);
let options = {};
options.baseFolder = "src-schemas/subschemas";
let dstSchemaPath = "../schemas";

files.forEach(function(f) {
  if (f.substr(-4) == "json") {
    // we have a schema
    var schema = require(srcSchemaPath + "/" + f);
    var fullSchema = derefs(schema, options);
    var outputFile = dstSchemaPath + "/" + f;
    fs.writeFileSync(outputFile, JSON.stringify(fullSchema));
  }
}, this);
