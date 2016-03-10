# EDIFACT - LIB

An EDIFACT library used to validate and convert EDIFACT message formats to and from JSON.
Using **[JSON Schemas](http://json-schema.org/)** you can specify the format of a particular
EDIFact message which then allows the message to be marshaled in and out of the EDIFact format.

### CLI
You can use the CLI tool to convert between formats. First install the library globally to get access
to the command **edifact-json-to-edi**. You will then be able to run the command:

```
# edifact-json-to-edi -h

usage: edifact-json-to-edi [-h] [-v] [-i IN] [-o OUT] -s SCHEMA

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -i IN, --in IN        Input file. To use STDIN then use "-". Defaults to "-"
  -o OUT, --out OUT     File to write out to, utf-8 encoded without BOM. To 
                        use STDOUT then use "-". Defaults to "-"
  -s SCHEMA, --schema SCHEMA
                        Schema file or type to use. Types (vermas contrl)
```

Example:

```
# Using files
edifact-json-to-edi -s schemas/contrl.json.schema -i eg/contrl-message.json -o eg/contrl-message.edi

# Using streams
cat eg/contrl-message.json | edifact-json-to-edi -s schemas/contrl.json.schema > eg/contrl-message.edi

```
