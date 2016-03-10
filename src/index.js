var EdiReader = require('./lib/edi-reader.js');
var EdiWriter = require('./lib/edi-writer.js');
 
var text = "UNA:+.? '" +
"UNB+IATB:1+6XPPC+LHPPC+940101:0950+1'" +
"UNH+1+PAORES:93:1:IA'" +
"MSG+1:45'" +
"IFT+3+XYZCOMPANY AVAILABILITY'" +
"ERC+A7V:1:AMD'" +
"IFT+3+NO MORE FLIGHTS'" +
"ODI'" +
"TVL+240493:1000::1220+FRA+JFK+DL+400+C'" +
"PDI++C:3+Y::3+F::1'" +
"APD+74C:0:::6++++++6X'" +
"TVL+240493:1740::2030+JFK+MIA+DL+081+C'" +
"PDI++C:4'" +
"APD+EM2:0:1630::6+++++++DA'" +
"UNT+13+1'" +
"UNZ+1+1'";

text = "UNB+UNOA:2+THSAZME::LOCXMLAZME+EDRCHIEF+140820:1010+CIS1++CHIEFLIVE++++1'" +
"UNH+HEXREF+CUSDEC:D:04A:UN:109730'" +
"BGM+EFD::109++9'" +
"CST++EXD+1'" +
"LOC+36+IN'" +
"LOC+35+GB'" +
"RFF+ABO:4GB015956019000-CIS1'" +
"NAD+CZ+GB015956019000++Scraps R Us+123 Some Street+London++W4 STE+GB'" +
"NAD+CN+++We like scrap Ltd+456 Other Street+Delhi++110015+IN'" +
"UNS+D'" +
"DMS+HEXREF'" +
"MOA+39::GBP'" +
"CST++1000001+72042900'" +
"MEA+AAR++KGM:300'" +
"PAC+4++BL'" +
"PCI++Package marks:'" +
"MOA+123:1000'" +
"RFF+ZZZ'" +
"IMD+++:::A big load of paper::en'" +
"DOC+998:::ZZZ+BOOKING123:::::Z'" +
"CST++1000001+72042900'" +
"MEA+AAR++KGM:400'" +
"PAC+++VO'" +
"PCI++:'" +
"MOA+123:1200'" +
"RFF+ZZZ'" +
"IMD+++:::Some scrap iron::en'" +
"DOC+998:::ZZZ+BOOKING123:::::Z'" +
"UNS+S'" +
"CNT+11:1'" +
"UNT+30+HEXREF'" +
"UNZ+1+CIS1'";

// text = "UNB+UNOA:2+EDRCHIEF+THSAZME::LOCXMLAZME+140820:1016+0021053511+TEST61+CHIEFLIVE++++1'UNH+10929966876299+CUSRES:D:04A:UN:109730'BGM+EFD::109++29'DTM+7:201408201011:203'LOC+44+555::109'RFF+ABT:Z00003J:1'RFF+ABO:4GB015956019000-T61:F'RFF+AAE:14GB08X99987046010'RFF+ABS:A1'RFF+AHZ:1:H'DOC+960+A508254F40D7'MOA+40:1000.00'MOA+55:0.00'MOA+9:0.00'MOA+74:0.00'MOA+176:0.00'CST+1'TAX+5'MOA+123:1000.00'UNT+19+10929966876299'UNZ+1+0021053511'"
 
var edi = new EdiWriter({schemaUri: "schemas/vermas.json.schema"});
var fs = require("fs");
var data = JSON.parse(fs.readFileSync("test/fixtures/verimas-example-1.json"));
var text = edi.convertToEdiString(data, {segmentTerminator: "'\n"});


var edir = new EdiReader({schemaUri: "schemas/vermas.json.schema"});
var val = edir.parse(text)

console.log(JSON.stringify(val, null, 2));
console.log(text)

// .then(function(result) {
//   console.log(JSON.stringify(result, null, 4));
// }).catch(function(err) {
//   console.error(JSON.stringify(err));
//});



 
