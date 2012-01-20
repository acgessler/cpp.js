cpp.js
========

#### C Preprocessor in Javascript ####

cpp.js is a tiny implementation of the C preprocessor (cpp) in Javascript (js).

My pet project medea.js uses this code to preprocess GLSL shaders, other use
cases might even exist.

### License ###

Modified BSD license, see the LICENSE file for the full text. Means 
basically you can do everything with it, except claim you wrote it
and a copy of the license should always be distributed (a backlink
to this page is also fine).

### Usage ###

(This sample is effectively the entire documentation, feel free to contribute further contents).

```javascript

// Setup basic settings for the preprocessor. The values as shown below
// are the default values and can be omitted.
var settings = { 

   // character / string that starts a preprocessor command, 
   // only honoured at the beginning of a line.
   signal_char : '#',

   // function used to print warnings, the default 
   // implementation invokes console.log.
   warn_func : null,

   // function used to print critical errors, the default 
   // implementation invokes console.log and throws.
   error_func : null,
   
   // function to be invoked to fetch include files.
   // See the section "Handling include files" below.
   include_func : null,
}

// Create an instance of the library. `settings` is optional.
var pp = cpp_js( settings );

// Predefine some symbols, the same effect could be reached
// by prepending the corresponding #define's to the source
// code for preprocessing but this is way nicer.
// cpp.js by itself does not predefine any symbols.
var predefined = {
   DEBUG : '',               // equivalent to `#define DEBUG`
   ANOTHER_DEFINE : '248935' // equivalent to `#define ANOTHER_DEFINE 248935`
};

pp.define_multiple(predefined);

// Do the same step by step
pp.define('UNIVERSAL_TRUTH','42');
pp.undef('DEBUG');

// And query the current state of a particular define
pp.defined('DEBUG'); // => false

// Now invoke the preprocesser on the given text block.
// Keep in mind that the processor keeps the state obtained from executing 
// the text block, so if run() is invoked on multiple text blocks, any 
// defines from a block will also apply to its successors.

// However, a text block is assumed to be syntactically complete on its own, 
// i.e. all if's must be closed and may not leap into the next block.
var preprocessed_source = pp.run(text);

// Calling clear() resets all defined values. The effect is the same as if
// a fresh cpp.js instance with same settings was created.
pp.clear();

```

### node.js ###

cpp.js also works as a node.js module:


```javascript

var cpp = require("./cpp");
var pp = cpp.create( settings );

// ...
// same as above

```

### Handling #include files ###

By default, include directives cause errors. To enable `#include`-support, one
must specify an `include_func` in the initial settings. This function receives
the name of the include file that is requested and a closure to resume
preprocessing as soon as the file is available (the mechanism is thus 
compatible with asynchronous file reading, i.e. via AJAX or node.js).

**If include files are enabled, cpp.js becomes strictly asynchronous** and
`run()` always returns null. Therefore it is also necessary to specify an
`completion_func` callback in the settings, which is invoked as soon as 
preprocessing is complete, receiving the preprocessed text as parameter.

Specifying an `include_func` but no `completion_func` is not allowed.

The basic structure for this scenario is like this:

```javascript

settings.include_func = function(file, resumer, error) {
    do_fancy_magic_to_fetch_this_file(file, function(contents) {
		// call resumer(null) if the file is not accessible
	   resumer(contents);
	});
};

settings.completion_func = function(preprocessed_text) {
    // process result
};
```

### Conformance ###

cpp.js was written with the C99 language standard in mind and conforms in most
aspects. However, its expression evaluation engine is based on `eval`, whose
arithmetics are not strictly C-compliant (i.e. underflow/overflow).




