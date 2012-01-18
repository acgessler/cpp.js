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
// are the default values, so you can omit them if you're fine
// with them.
var settings = { 

   // character / string that starts a preprocessor command, 
   // only honoured at the beginning of a line.
   signal_char : '#' 
}

// create an instance of the library. `settings` may also be
// omitted to use default values everywhere.
var cpp = cpp_js( settings );

// predefine some symbols, the same effect could be reached
// by prepending the corresponding #define's to the source
// code to be preprocessed but this is way nicer.
var predefined = {
   DEBUG : '',               // equivalent to `#define DEBUG`
   ANOTHER_DEFINE : '248935' // equivalent to `#define ANOTHER_DEFINE 248935`
};

// and invoke the preprocesser on the given text. The returned source
// no longer contains any preprocessor commands and input strings 
// containing not a single preprocessor command are returned unchanged, 
// i.e. cpp.run(cpp.run(text, ...)) == cpp.run(text, ...)
var preprocessed_source = cpp.run(text, predefined);

```




