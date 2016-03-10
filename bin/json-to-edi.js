#!/usr/bin/env node
'use strict';

// stdlib
var fs    = require('fs');
var path = require('path');

// 3rd-party
var argparse = require('argparse');
var _ = require('lodash');

// internal
var Edi = require('../dist/lib/edi.js');
var rootPath = path.resolve(__dirname, "..");

////////////////////////////////////////////////////////////////////////////////
var cli = new argparse.ArgumentParser({
  prog:     'edifact-json-to-edi',
  version:  require('../package.json').version,
  addHelp:  true
});

cli.addArgument([ '-i', '--in' ], {
  help:   'Input file. To use STDIN then use "-". Defaults to "-"',
  nargs:  '1',
  defaultValue: ['-']
});

cli.addArgument([ '-o', '--out' ], {
  help:   'File to write out to, utf-8 encoded without BOM. To use STDOUT then use "-". Defaults to "-"',
  nargs:  '1',
  defaultValue: ['-']
});

cli.addArgument([ '-s', '--schema' ], {
  help:   'Schema file or type to use. Types (vermas|contrl)',
  nargs:  '1',
  required: true
});
////////////////////////////////////////////////////////////////////////////////


var options = cli.parseArgs();
////////////////////////////////////////////////////////////////////////////////

function readFile(filename, encoding, callback) {
  if (filename === '-') {
    // read from stdin
    var chunks = [];

    process.stdin.on('data', function (chunk) {
      chunks.push(chunk);
    });

    setTimeout(function() {
      if(chunks.length == 0) {
        console.error("Use CTRL-D to end input");

        setTimeout(function() {
          if(chunks.length == 0) {
            callback({message: "Timeout reading stdin"});
          }
        }, 10000);
      }
    }, 1000);

    process.stdin.on('end', function () {
      return callback(null, Buffer.concat(chunks).toString(encoding));
    });
  } else {
    fs.readFile(filename, encoding, callback);
  }
}

function getSchema(schemaFile) {
  //get internal schema
  var internalFile = path.resolve(rootPath, "schemas", schemaFile + '.json.schema');
  var externalFile = path.resolve(process.env.PWD, options.schema);
  if (fs.existsSync(internalFile)) {
    //this is an internal reference
    return JSON.parse(fs.readFileSync(internalFile, 'utf8'));
  } else if (fs.existsSync(externalFile)) {
    // external file
    return JSON.parse(fs.readFileSync(externalFile, 'utf8'));
  } else {
    throw new Error("Unable to find schema internal or external: " + options.schema);
  }
}

options.in = options.in[0];
options.out = options.out[0];
options.schema = options.schema[0];


readFile(options.in, 'utf8', function (error, input) {
  if (error) {
    if (error.code === 'ENOENT') {
      console.error('File not found: ' + options.in);
      process.exit(2);
    }

    console.error(
      options.trace && error.stack ||
      error.message ||
      String(error));

    process.exit(1);
  }

  try {
    let schema = getSchema(options.schema);
    let edi = new Edi.Edi(schema);
    let data = JSON.parse(input);
    let output = edi.toEdi(data);

    if(options.out === '-') {
      console.log(output);
    } else {
      fs.writeFileSync(path.resolve(process.env.PWD, options.out), output, 'utf8');
    }

    process.exit(0);
  } catch (e) {
    console.error("Error occured: " + e.toString());
    process.exit(1);
  }
});

