cpp.js
========

#### C Preprocessor in Javascript ####

cpp.js is a tiny implementation of the C preprocessor (cpp) in Javascript (js).

My pet project medea.js uses this code to preprocess GLSL shaders, other use
cases might exist.

### License ###

Modified BSD license, see the LICENSE file for the full text. Means 
basically you can do everything with it, except claim you wrote it
and a copy of the license should always be distributed (a backlink
to this page is also fine).

### Usage ###

(This sample is effectively the entire documentation, feel free to contribute further contents).

```javascript

// setup basic settings for the preprocessor. The values below
// are the default values, you an omit them if you agree.
var settings = { 

   // character / string that starts a preprocessor command, 
   // only honoured at the beginning of a line.
   signal_char : '#' 
}

// create an instance of the library. `settings` may also be
// omitted at all to use only default values.
var pp = cpp_js( settings );

// predefine some symbols, the same effect could be reached
// by prepending the corresponding #define's to the source
// code for preprocessing but this is way nicer.
// cpp.js by itself does not predefine any symbols.
var predefined = {
   DEBUG : '',               // equivalent to `#define DEBUG`
   ANOTHER_DEFINE : '248935' // equivalent to `#define ANOTHER_DEFINE 248935`
};

pp.define_multiple(predefined);

// you can also do it step by step
pp.define('UNIVERSAL_TRUTH','42');
pp.undef('DEBUG');

// and query the current state of a particular define
pp.defined('DEBUG'); // => false

// now invoke the preprocesser on the given text. The returned source
// no longer contains any preprocessor commands. Note: input strings 
// containing not a single preprocessor command are returned unchanged, 
// i.e. pp.run(pp.run(text, ...)) == pp.run(text, ...)

// note that the processor keeps the state obtained from executing 
// the text block, so if run() is invoked on multiple text blocks,
// any defines from a block will also be available to its successors.
var preprocessed_source = pp.run(text);

// calling clear() resets all defined values, so the effect of 
// calling run() after clear()ing is the same as calling run()
// on a fresh instance of cpp.js.
pp.clear();

```


Running it from node.js is also possible:


```javascript

var cpp = require("./cpp");
var pp = cpp.create( settings );

// rest as above

```




