
var cpp = require("./../../cpp");

console.log("- cpp.js test with examples from the C99 specification");
var fs = require('fs');

var settings = { 
   signal_char : '#',
   include_func : function(file, is_global, resumer, error) {
		fs.readFile(file, function(err,text) {
			resumer(err ? null : text.toString());
		});
   },
   
   completion_func : function(data) {
		console.log('OUTPUT ************************************************');
		console.log(data);
   }
};

var pp = cpp.create( settings );

fs.readFile('master.h', function(err,data){
  if(err) {
    console.error("Could not open file: %s", err);
    process.exit(1);
  }

  pp.run(data.toString());
});

