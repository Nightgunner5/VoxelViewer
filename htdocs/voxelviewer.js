var canvas, gl, terrainTexture, terrainImage, workers, sleeping, vertexPositionAttribute, textureCoordAttribute, vertexNormalAttribute, vertexLightingAttribute;
var vertexBuffer, indexBuffer, normalBuffer, texcoordBuffer, lightingBuffer;
var haveChunks = {}, active = false, dirty = false;

/*var buffers = {
	vertices: new Float32Array( 65535 ), // 3 per vertex
	indices: new Uint32Array( 21845 ), // 1 per vertex
	normals: new Int8Array( 65535 ), // 3 per vertex
	texcoords: new Uint8Array( 43690 ), // 2 per vertex
	lighting: new Float32Array( 21845 ), // 1 per vertex
	len: {
		vertices: 0,
		indices: 0,
		normals: 0,
		texcoords: 0,
		lighting: 0
	},
	t: {
		vertices: Float32Array,
		indices: Uint32Array,
		normals: Int8Array,
		texcoords: Uint8Array,
		lighting: Float32Array // TODO: Convert to Uint8?
	},
	append: function( buf, values ) {
		var b = this[buf];

		if ( this.len[buf] + values.length >= b.length ) {
			var _b = new (this.t[buf])( b.length * 2 );
			for ( var i = 0; i < this.len[buf]; i++ )
				_b[i] = b[i];

			b = this[buf] = _b;
		}

		for ( var i = 0; i < values.length; i++ )
			b[buffers.len[buf]++] = values[i];
	}
};*/

window.addEventListener( 'load', function() {
	canvas = document.getElementById( 'glcanvas' );
	gl = canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' );
	if ( !gl ) {
		alert( 'Your browser does not seem to support WebGL.' );
		return;
	}
	gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
	gl.clearDepth(1.0); // Clear everything
	gl.enable(gl.DEPTH_TEST); // Enable depth buffering
	gl.depthFunc(gl.LEQUAL); // Near things obscure far things
	gl.enable(gl.BLEND); // Enable blending
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // Blend by alpha
	gl.enable(gl.CULL_FACE); // Enable culling
	gl.cullFace(gl.BACK); // Cull back faces
	gl.frontFace(gl.CCW);

	vertexBuffer = gl.createBuffer();
	indexBuffer = gl.createBuffer();
	normalBuffer = gl.createBuffer();
	texcoordBuffer = gl.createBuffer();
	lightingBuffer = gl.createBuffer();

	initTextures();
	initShaders();
	startWorkers();
	setInterval( draw, 15 );
}, false );

function initTextures() {
	terrainTexture = gl.createTexture();
	terrainImage = new Image();
	terrainImage.onload = function () {
		handleTextureLoaded(terrainImage, terrainTexture);
	}
	terrainImage.src = "terrain.png";
}

function handleTextureLoaded(image, texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function initShaders() {
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	// Create the shader program
	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	// If creating the shader program failed, alert
	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Unable to initialize the shader program.");
	}

	gl.useProgram(shaderProgram);

	vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
	gl.enableVertexAttribArray(vertexPositionAttribute);

	textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(textureCoordAttribute);

	vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(vertexNormalAttribute);

	vertexLightingAttribute = gl.getAttribLocation(shaderProgram, "aVertexLighting");
	gl.enableVertexAttribArray(vertexLightingAttribute);
}

function getShader(gl, id) {
	var shaderScript = document.getElementById(id);

	// Didn't find an element with the specified ID; abort.
	if (!shaderScript) {
		return null;
	}

	// Walk through the source element's children, building the
	// shader source string.
	var theSource = "";
	var currentChild = shaderScript.firstChild;

	while (currentChild) {
		if (currentChild.nodeType == 3) {
			theSource += currentChild.textContent;
		}

		currentChild = currentChild.nextSibling;
	}

	// Now figure out what type of shader script we have,
	// based on its MIME type.
	var shader;

	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null; // Unknown shader type
	}

	// Send the source to the shader object
	gl.shaderSource(shader, theSource);

	// Compile the shader program
	gl.compileShader(shader);

	// See if it compiled successfully
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}

function sendChunkRequest( worker ) {
	if ( !( 'world' in haveChunks ) )
		haveChunks['world'] = {};
	var _x = active ? Math.floor( -camPos.e( 1 ) / 16 ) : 0;
	var _z = active ? Math.floor( -camPos.e( 2 ) / 16 ) : 0;
	for ( var x = 0; x < 5; x++ ) {
		if ( !( x + _x in haveChunks['world'] ) )
			haveChunks['world'][x + _x] = {};
		if ( !( -x + _x in haveChunks['world'] ) )
			haveChunks['world'][-x + _x] = {};
		for ( var z = 0; z < 5; z++ ) {
			if ( !( -z + _z in haveChunks['world'][-x + _x] ) ) {
				haveChunks['world'][-x + _x][-z + _z] = false;
				worker.postMessage( { action: 'getChunk', world: 'world', x: -x + _x, z: -z + _z } );
				console.log( 'Sent request for chunk (' + (-x + _x) + ', ' + (-z + _z) + ')' );
				return;
			}
			if ( !( -z + _z in haveChunks['world'][x + _x] ) ) {
				haveChunks['world'][x + _x][-z + _z] = false;
				worker.postMessage( { action: 'getChunk', world: 'world', x: x + _x, z: -z + _z } );
				console.log( 'Sent request for chunk (' + (x + _x) + ', ' + (-z + _z) + ')' );
				return;
			}
			if ( !( z + _z in haveChunks['world'][-x + _x] ) ) {
				haveChunks['world'][-x + _x][z + _z] = false;
				worker.postMessage( { action: 'getChunk', world: 'world', x: -x + _x, z: z + _z } );
				console.log( 'Sent request for chunk (' + (-x + _x) + ', ' + (z + _z) + ')' );
				return;
			}
			if ( !( z + _z in haveChunks['world'][x + _x] ) ) {
				haveChunks['world'][x + _x][z + _z] = false;
				worker.postMessage( { action: 'getChunk', world: 'world', x: x + _x, z: z + _z } );
				console.log( 'Sent request for chunk (' + (x + _x) + ', ' + (z + _z) + ')' );
				return;
			}
		}
	}
	sleeping.push( worker );
}

setInterval( function() {
	if ( active && sleeping.length ) {
		sendChunkRequest( sleeping.shift() );
	}
}, 50 );

function updateProgress() {
	var have = 0, need = 81, inprogress = 0;
	for ( var x = -4; x < 5; x++ ) {
		for ( var z = -4; z < 5; z++ ) {
			if ( x in haveChunks['world'] ) {
				if ( z in haveChunks['world'][x] ) {
					if ( haveChunks['world'][x][z] ) {
						have++;
					} else {
						inprogress++;
					}
				}
			}
		}
	}
	var p = ~~( ( have + inprogress / 2 ) / need * 1000 ) / 10;
	document.getElementById( 'progress' ).style.width = p + '%';
	document.getElementById( 'percent' ).innerHTML = p + '%';
	if ( have == need ) {
		active = true;
		document.getElementById( 'loading' ).style.display = 'none';
		document.getElementById( 'loaded' ).style.display = 'block';
	}
}

var unknownBlockTypes = {};

function startWorkers() {
	sleeping = [];
	workers = [];
	vertices = [];
	indices = [];
	normals = [];
	texcoords = [];
	lighting = [];
	for ( var i = 0; i < 4; i++ ) {
		var worker = new Worker( 'worker.js' );
		worker.onmessage = function( event ) {
			var message = event.data;
			switch ( message.action ) {
				case 'chunk':
					haveChunks[message.world][message.x][message.z] = {
						vertices: new Float32Array( message.vertices ),
						indices: new Uint16Array( message.polys ),
						normals: new Int8Array( message.normals ),
						texcoords: new Uint8Array( message.texcoords ),
						lighting: new Uint8Array( message.lighting )
					};
//					rebuff();
					dirty = true;
					updateProgress();
					sendChunkRequest( this );
					console.log( 'Recieved chunk (' + message.x + ', ' + message.z + ')' );
					break;
				case 'chunkNotFound':
					haveChunks[message.world][message.x][message.z] = true;
					updateProgress();
					sendChunkRequest( this );
					console.log( 'Chunk (' + message.x + ', ' + message.z + ') was not found' );
					break;
				case 'unknownBlockType':
					unknownBlockTypes[message.id] = message.name;
					break;
				default:
//					console.log( message );
			}
		};
		sendChunkRequest( worker );
		workers.push( worker );
	}
}

/*function rebuff() {
	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, buffers.vertices, gl.DYNAMIC_DRAW );

	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
	gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, buffers.indices, gl.DYNAMIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, buffers.normals, gl.DYNAMIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, buffers.texcoords, gl.DYNAMIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, lightingBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, buffers.lighting, gl.DYNAMIC_DRAW );

	gl.flush();
	gl.finish();
	dirty = true;
}*/

var keys = {
	w: false,
	a: false,
	s: false,
	d: false,
	q: false,
	e: false,
	z: false,
	x: false
};

function kd( event ) {
	var code = event.keyCode || event.which, key = String.fromCharCode( code ).toLowerCase();
	if ( key in keys ) {
		keys[key] = true;
		return false;
	}
}
function ku( event ) {
	var code = event.keyCode || event.which, key = String.fromCharCode( code ).toLowerCase();
	if ( key in keys ) {
		keys[key] = false;
		return false;
	}
}
function blur( event ) {
	for ( var key in keys ) {
		keys[key] = false;
	}
}

var perspectiveMatrix = makePerspective( 45, 640.0 / 480.0, 0.1, 100.0 );
var camPos, camX, camY, camZ;
function resetCam() {
	camPos = $V([16, 16, -100]);
	camX = -Math.PI / 4;
	camY = 0;
	camZ = Math.PI / 4;
	for ( var key in keys )
		keys[key] = false;
}
resetCam();

setInterval( function() {
	if ( !active ) return;

	var mv = [];
	mv.push( 0, 0, 0 );
	var rot = 0;

	if ( keys.a ) {
		mv[0] += 0.25;
	}
	if ( keys.d ) {
		mv[0] -= 0.25;
	}
	if ( keys.w ) {
		mv[1] -= 0.25;
	}
	if ( keys.s ) {
		mv[1] += 0.25;
	}
	if ( keys.q ) {
		mv[2] += 0.25;
	}
	if ( keys.e ) {
		mv[2] -= 0.25;
	}

	if ( keys.z ) {
		rot -= 0.05;
	}
	if ( keys.x ) {
		rot += 0.05;
	}

	if ( mv[0] || mv[1] || mv[2] || rot )
		dirty = true;
	else
		return;

	camZ += rot;
	camPos = camPos.add($V(mv).rotate(-camZ, Line.Z));
}, 15 );

function getNearbyChunks() {
	var chunks = [];

	var x1 = -camPos.e( 1 ),
		z1 = -camPos.e( 2 );//,
		//x2 = x1 + Math.cos( camZ ) * 200,
		//z2 = z1 + Math.sin( camZ ) * 200,
		//x3 = x1 + Math.cos( camZ + Math.PI / 2 ) * 200,
		//z3 = z1 + Math.sin( camZ + Math.PI / 2 ) * 200;

	//for ( var x = Math.floor( Math.min( Math.min( x1, x2 ), x3 ) / 16 ); x < Math.ceil( Math.max( Math.max( x1, x2 ), x3 ) / 16 ); x++ ) {
	for ( var x = Math.floor( x1 / 16 - 4 ); x < Math.ceil( x1 / 16 + 4 ); x++ ) {
		if ( x in haveChunks['world'] ) {
			//for ( var z = Math.floor( Math.min( Math.min( z1, z2 ), z3 ) / 16 ); z < Math.ceil( Math.max( Math.max( z1, z2 ), z3 ) / 16 ); z++ ) {
			for ( var z = Math.floor( z1 / 16 - 9 ); z < Math.ceil( z1 / 16 + 9 ); z++ ) {
				if ( z in haveChunks['world'][x] ) {
					if ( typeof haveChunks['world'][x][z] == 'object' ) {
						chunks.push( [x, z] );
					}
				}
			}
		}
	}

	return chunks.sort( function( a, b ) {
		return Math.pow( x1 - a[0] * 16, 2 ) + Math.pow( z1 - a[1] * 16, 2 ) - Math.pow( x1 - b[0] * 16, 2 ) - Math.pow( z1 - b[1] * 16, 2 );
	} ).map( function( chunk ) {
		return haveChunks['world'][chunk[0]][chunk[1]];
	} );
}

function draw() {
//	if ( !active ) return;
	if ( !dirty ) return;
	dirty = false;

	gl.clear( gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	var pUniform = gl.getUniformLocation( shaderProgram, 'uPMatrix' );
	gl.uniformMatrix4fv( pUniform, false, new Float32Array( perspectiveMatrix.flatten() ) );

	var mvMatrix = Matrix.I( 4 )
			.x(Matrix.RotationX( camX ).ensure4x4())
			.x(Matrix.RotationY( camY ).ensure4x4())
			.x(Matrix.RotationZ( camZ ).ensure4x4())
			.x(Matrix.Translation( camPos ).ensure4x4());

	var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

	var normalMatrix = mvMatrix.inverse();
	normalMatrix = normalMatrix.transpose();
	var nUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
	gl.uniformMatrix4fv(nUniform, false, new Float32Array(normalMatrix.flatten()));

	getNearbyChunks().forEach( function( chunk ) {
		gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, chunk.vertices, gl.STREAM_DRAW );

		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
		gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, chunk.indices, gl.STREAM_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, chunk.normals, gl.STREAM_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, chunk.texcoords, gl.STREAM_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, lightingBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, chunk.lighting, gl.STREAM_DRAW );

		gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
		gl.vertexAttribPointer( vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0 );

		gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
		gl.vertexAttribPointer( textureCoordAttribute, 2, gl.UNSIGNED_BYTE, false, 0, 0 );

		gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
		gl.vertexAttribPointer( vertexNormalAttribute, 3, gl.BYTE, false, 0, 0 );

		gl.bindBuffer( gl.ARRAY_BUFFER, lightingBuffer );
		gl.vertexAttribPointer( vertexLightingAttribute, 2, gl.UNSIGNED_BYTE, false, 0, 0 );

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, terrainTexture);
		gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

		gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
		gl.drawElements(gl.TRIANGLES, chunk.indices.length, gl.UNSIGNED_SHORT, 0);
	} );
}