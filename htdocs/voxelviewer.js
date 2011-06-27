var canvas, gl, terrainTexture, terrainImage, workers, vertexPositionAttribute, textureCoordAttribute, vertexNormalAttribute, vertexLightingAttribute;
var vertexBuffer, indexBuffer, normalBuffer, texcoordBuffer, lightingBuffer, vertices, indices, normals, texcoords, lighting;
var haveChunks = {};

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
	gl.blendFunc(gl.SRC_ALPHA, gl.ZERO); // Blend by alpha
	gl.enable(gl.CULL_FACE); // Enable culling
	gl.cullFace(gl.BACK); // Cull back faces

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
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
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
	for ( var x = 0; x < 2; x++ ) {
		if ( !( x in haveChunks['world'] ) )
			haveChunks['world'][x] = {};
		if ( !( -x in haveChunks['world'] ) )
			haveChunks['world'][-x] = {};
		for ( var z = 0; z <= x; z++ ) {
			if ( !haveChunks['world'][-x][-z] ) {
				haveChunks['world'][-x][-z] = true;
				worker.postMessage( { action: 'getChunk', world: 'world', x: -x, z: -z } );
				return;
			}
			if ( !haveChunks['world'][x][-z] ) {
				haveChunks['world'][x][-z] = true;
				worker.postMessage( { action: 'getChunk', world: 'world', x: x, z: -z } );
				return;
			}
			if ( !haveChunks['world'][-x][z] ) {
				haveChunks['world'][-x][z] = true;
				worker.postMessage( { action: 'getChunk', world: 'world', x: -x, z: z } );
				return;
			}
			if ( !haveChunks['world'][x][z] ) {
				haveChunks['world'][x][z] = true;
				worker.postMessage( { action: 'getChunk', world: 'world', x: x, z: z } );
				return;
			}
		}
	}
}

function startWorkers() {
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
					gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
					vertices = vertices.concat( message.vertices );
					gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( vertices ), gl.DYNAMIC_DRAW );

					gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
					indices = indices.concat( message.polys );
					gl.bufferData( gl.ELEMENT_ARRAY_BUFFER, new Uint16Array( indices ), gl.DYNAMIC_DRAW );

					gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
					normals = normals.concat( message.normals );
					gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( normals ), gl.DYNAMIC_DRAW );

					gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
					texcoords = texcoords.concat( message.texcoords );
					gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( texcoords ), gl.DYNAMIC_DRAW );

					gl.bindBuffer( gl.ARRAY_BUFFER, lightingBuffer );
					lighting = lighting.concat( message.lighting );
					gl.bufferData( gl.ARRAY_BUFFER, new Float32Array( lighting ), gl.DYNAMIC_DRAW );
					// Fallthrough
				case 'chunkNotFound':
					setTimeout( sendChunkRequest, 500, this );
					break;
				default:
					console.log( message );
			}
		};
		sendChunkRequest( worker );
		workers.push( worker );
	}
}

var perspectiveMatrix = makePerspective( 45, 640.0 / 480.0, 0.1, 200.0 );
var mvMatrix = Matrix.I(4);
mvMatrix = mvMatrix.x(Matrix.Translation($V([0, 0, -100])).ensure4x4());

var keys = {
	w: false,
	a: false,
	s: false,
	d: false,
	q: false,
	e: false
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

setInterval( function() {
	var mv = [0, 0, 0];
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

	mvMatrix = mvMatrix.x(Matrix.Translation($V(mv)).ensure4x4());
}, 15 );

function draw() {
	gl.clear( gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

	var pUniform = gl.getUniformLocation( shaderProgram, 'uPMatrix' );
	gl.uniformMatrix4fv( pUniform, false, new Float32Array( perspectiveMatrix.flatten() ) );

	var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));

	var normalMatrix = mvMatrix.inverse();
	normalMatrix = normalMatrix.transpose();
	var nUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
	gl.uniformMatrix4fv(nUniform, false, new Float32Array(normalMatrix.flatten()));

	gl.bindBuffer( gl.ARRAY_BUFFER, vertexBuffer );
	gl.vertexAttribPointer( vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, texcoordBuffer );
	gl.vertexAttribPointer( textureCoordAttribute, 2, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
	gl.vertexAttribPointer( vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0 );

	gl.bindBuffer( gl.ARRAY_BUFFER, lightingBuffer );
	gl.vertexAttribPointer( vertexLightingAttribute, 1, gl.FLOAT, false, 0, 0 );

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, terrainTexture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);

	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, indexBuffer );
	gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
}