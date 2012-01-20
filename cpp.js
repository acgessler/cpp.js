/*

cpp.js - Simple implementation of the C Preprocessor in Javascript

Copyright (c) 2011, Alexander C. Gessler
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the 
following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of the ASSIMP team, nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of the ASSIMP Development Team.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function cpp_js(settings) {

	// http://blog.stevenlevithan.com/archives/faster-trim-javascript
	var trim = function (str) {
		str = str.replace(/^\s+/, '');
		for (var i = str.length - 1; i >= 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};

	// dictionary of default settings, including default error handlers
	var default_settings = {
		signal_char : '#',
		
		warn_func : function(s) {
			console.log(s);
		},
		
		error_func : function(s) {
			console.log(s);
			throw s;
		},
		
		include_func : null,
		completion_func : null
	};
	
	// apply default settings
	if (settings) {
		for(var k in default_settings) {
			if (!(k in settings)) {
				settings[k] = default_settings[k];
			}
		}
	}
	else {
		settings = default_settings;
	}
	
	if (settings.include_func && !settings.completion_func) {
		settings.error_func("include_func but not completion_func specified");
	}
	
	// generate a 3 tuple (command, arguments, code_block)
	var block_re = new RegExp("^"+settings.signal_char+
		"(\\w+)[ \t]*(.*?)[ \t]*$","m"
	);
	
	// (match identifiers according to 6.4.2.1, do not match 'defined',
	// do not match quote strings either)
	var is_identifier_re = /\b(d(?!efined)|[a-ce-zA-Z_])\w*(?![\w"])/g;
	
	// same, but checks if the entire string is an identifier
	var is_identifier_only_re = /^(d(?!efined)|[a-ce-zA-Z_])\w*$/g;
	
	// defined <identifier>
	var defined_no_parens_re = /defined\s+([a-zA-Z_]\w*)/g;
	
	// defined (<identifier>)
	var defined_re = /defined\s*\((\s*[a-zA-Z_]\w*\s*)\)/g;
	
	// __defined_magic_<identifier>_ (a special sentinel value used to
	// temporarily exclude operands to defined from macro substitution.
	var defined_magic_sentinel_re = /__defined_magic_([a-zA-Z_]\w*)_/;
	
	// Match hexadecimal, octal and decimal integer literals with or
	// without L,l,U,u suffix and separate all components.
	var is_integer_re = /\b(\+|-|)(0|0x|)([1-9a-f][0-9a-f]*|0)([ul]*)\b/ig;
	
	// Grab doubly quoted strings
	var is_string_re = /"(.*?)"/g;
	
	// Grab compound assignments. Extra fix for !=, ==, <=, >= needed
	var is_assignment_re = /[+\-*%\/&^|]?=/g; 
	
	// Grab instances of the increment/decrement operators
	var is_increment_re = /--|\+\+/g;
	
	// Grav <included_file> or "included_file"
	var include_re = /(?:<(.*)>|"(.*)")(.*)/;
	
	
	var state = {};
	
	return {
	
		clear : function() {
			state = {};
		},
		
		defined : function(k) {
			return k in state;
		},
	
		define : function(k,v) {
			if (!this._is_identifier(k)) {
				settings.error_func("not a valid preprocessor identifier: '" + k + "'");
			}
			state[k] = v || '';
		},
		
		undefine : function(k,v) {
			delete state[k];
		},
		
		define_multiple : function(dict) {
			for(var k in dict) {
				this.define(k,dict[k]);
			}
		},
		
		subs : function(text) {
			var new_text = text;
			for (var k in state) {
				new_text = new_text.replace(new RegExp("\\b"+k+"\\b"),state[k]);
			}
			
			// keep substituting until no further substitutions are possible
			return new_text == text ? new_text : this.subs(new_text);
		}, 
	
		run : function(text, name) {
			name = name || '<unnamed>';
			
			var blocks = text.split(block_re);
			
			var out = new Array(Math.floor(blocks.length/3) + 2), outi = 0;
			for (var i = 0; i < out.length; ++i) {
				out[i] = '';
			}
			
			var ifs_nested = 0, ifs_failed = 0, if_done = false, line = 1;
			var if_stack = [];
			
			// wrapped error function, augments line number and file
			var error = function(text) {
				settings.error_func("(cpp) error("+name+":"+line+"): " + text);
			};
			
			// wrapped warning function, augments line number and file
			var warn = function(text) {
				settings.warn_func("(cpp) warning("+name+":"+line+"): " + text);
			};
			
			var skip = false;
			var self = this;
			
			var process_directive = function(command, elem) {
				switch (command) {
				case "define":
					var e = elem.split(/\s/,2);
					self.define(trim(e[0]), e[1] 
						? trim(e[1]) 
						: undefined
					);
					break;
					
				case "undef":
					self.undefine(elem);
					break;
					
				case "include":
					elem = self.subs(elem);
					var parts = elem.match(include_re);
					if (parts[3]) {
						error("unrecognized characters in include: " + elem);
					}
					var file = (parts[1] || '') + (parts[2] || '');
					
					if (!settings.include_func) {
						error("include directive not supported, " +
							"no handler specified");
					}
					
					console.log('fetch ' + file);
					settings.include_func(file, function(contents) {
						if (contents === null) {
							error("failed to access include file: " +
								file);
						}
					console.log('got ' + file);
						var s = {};
						for(var k in settings) {
							s[k] = settings[k]; 
						}
						
						s.completion_func = function(data, lines, new_state) {
							out.length = outi;
							
							outi += lines.length;
							out = out.concat(lines);
							console.log(out);
							console.log('include ' + file);
							state = new_state;
							for (++i; i < blocks.length; ++i) {
								if(!process_block(i,blocks[i])) {
									return false;
								}
							}
							console.log('give result');
							console.log(out);
							self._result(out, state);
						};
						
						var processor = cpp_js(s);
						processor.define_multiple(state);
						processor.run(contents, file);
					});
					return false;
					
				case "error":
					error("#error: " + elem);
					break;
					
				case "pragma":
					// silently ignore unrecognized pragma
					// directives (i.e. all at this time)
					break;
					
				default:
					warn("unrecognized preprocessor command: "
						+ command
					);
					break;
				};
				return true;
			};
			
			var process_block = function(i, elem) {
				var elem = blocks[i];
				switch(i % 3) {
				// code line, apply macro substitutions and copy
				// to output.
				case 0:
					line += elem.split('\n').length-1;
					if (!ifs_failed) {
						out[outi++] = self.subs(elem);
					}
					break;
				// preprocessor statement, such as ifdef, endif, ..
				case 1:
					//++line;
					command = elem;
					break;
				// the rest of the preprocessor line, self is where
				// expression evaluation happens
				case 2:
					var done = true;
					switch (command) {
						case "ifdef":
						case "ifndef":
							if (!elem) {
								error("expected identifier after " + 
									command);
							}
							// translate ifdef/ifndef to regular if by 
							// using defined()
							elem = "(defined " + elem + ")";
							if(command == 'ifndef') {
								elem = '!' + elem;
							}
							// fallthrough
							
						case "if":
							if_stack.push(false);
							if (!elem.length) {
								error("expected identifier after if");
							}
							// fallthrough
							
						case "else":
						case "elif":
							var not_reached = false;
							if (command == 'elif' || command == 'else') {
								not_reached = if_stack[if_stack.length-1];
								if (ifs_failed > 0) {
									--ifs_failed;
								}
								
								if (command == 'else' && elem.length) {
									warn('ignoring tokens after else');
								}
							}
							
							if (ifs_failed > 0 || not_reached || 
								(command != 'else' && 
								!self._eval(elem, error, warn)
								
							)){
								++ifs_failed;
							}
							else {
								// we run self branch, so skip any further else/
								// elsif branches
								if_stack[if_stack.length-1] = true;
							}
							break;
							
						case "endif":
							if(!if_stack.length) {
								error("endif with no matching if");
							}
							if (ifs_failed > 0) {
								--ifs_failed;
							}
							if_stack.pop();
							// ignore trailing junk on endifs
							break;
							
						default:
							done = ifs_failed > 0;
					};

					// not done yet, so this is a plain directive (i.e. include)
					if(!done) {
						if(!process_directive(command, elem)) {
							return false;
						}
					}
					break;
				}
				return true;
			};
			
			for (var i = 0; i < blocks.length; ++i) {
				if(!process_block(i,blocks[i])) {
					return null;
				}
			}
			
			if(if_stack.length > 0) {
				error("unexpected EOF, expected endif");
			}
			
			return this._result(out, state);
		},
		
		_result : function(arr, state) {
			// drop empty lines at the end
			for (var i = arr.length-1; i >= 0; --i) {
				if (!arr[i]) {
					arr.pop();
				}
				else {
					break;
				}
			}
		
			var text = arr.join('\n');
			if (settings.completion_func) {
				settings.completion_func(text,arr, state);
			}
			
			return text;
		},
		
		_is_identifier : function(identifier) {
			// Note: important to use match() because test() would update
			// the 'lastIndex' regexp property.
			return !!identifier.match(is_identifier_only_re);
		},
		
		_eval : function(val, error, warn) {
			var old_val = val;
		
			// see C99/6.10.1.2-3
			console.log('_eval: ' + val);
			
			// string literals are not allowed 
			if (val.match(is_string_re)) {
				error('string literal not allowed in if expression');
			}
			
			// neither are assignment or compound assignment ops
			if (val.replace(/[=!<>]=/g,'').match(is_assignment_re)) {
				error('assignment operator not allowed in if expression');
			}
			
			// same for increment/decrement - we need to catch these
			// cases because they might be used to exploit eval().
			if (val.match(is_increment_re)) {
				error('--/++ operators not allowed in if expression');
			}
			
			// XXX handle character constants
			
			// drop the L,l,U,u suffixes for integer literals
			val = val.replace(is_integer_re,'$1$2$3');
			
			// macro substitution - but do not touch unary operands to 'defined',
			// this is done by substituting a safe sentinel value (which starts
			// with two underscores and is thus reserved).
			val = val.replace(defined_no_parens_re,'defined($1)');
			
			console.log('_eval: ' + val);
			
			val = val.replace(defined_re,' __defined_magic_$1_ ');
			
			console.log('_eval: ' + val);
			
			val = this.subs(val);
		
			// re-substitute defined() terms and quote the argument
			val = val.replace(defined_magic_sentinel_re,'defined("$1")');
			
			console.log('eval: ' + val);
			
			// replace all remaining identifiers with '0'
			val = val.replace(is_identifier_re,' 0 ');
			
			console.log('eval: ' + val);
			
			// bring defined() function into direct scope
			var defined = this.defined;
			
			// what remains should be safe to use with eval().
			try {
				var res = !!eval(val);
			}
			catch (e) {
				error("error in expression: " + old_val);
			}
			
			console.log('res: ' + res);
			return res;
		},
	};
};

// node.js interface
if (typeof module !== 'undefined' && module.exports) {
    module.exports.create = cpp_js;
}



