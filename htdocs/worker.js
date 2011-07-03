var blockTypes = {
	AIR: 0,
	STONE: 1,
	GRASS: 2,
	DIRT: 3,
	COBBLESTONE: 4,
	WOOD: 5,
	SAPLING: 6,
	BEDROCK: 7,
	WATER: 8,
	STATIONARY_WATER: 9,
	LAVA: 10,
	STATIONARY_LAVA: 11,
	SAND: 12,
	GRAVEL: 13,
	GOLD_ORE: 14,
	IRON_ORE: 15,
	COAL_ORE: 16,
	LOG: 17,
	LEAVES: 18,
	SPONGE: 19,
	GLASS: 20,
	LAPIS_ORE: 21,
	LAPIS_BLOCK: 22,
	DISPENSER: 23,
	SANDSTONE: 24,
	NOTE_BLOCK: 25,
	BED_BLOCK: 26,
	POWERED_RAIL: 27,
	DETECTOR_RAIL: 28,
	WEB: 30,
	LONG_GRASS: 31,
	DEAD_BUSH: 32,
	WOOL: 35,
	YELLOW_FLOWER: 37,
	RED_ROSE: 38,
	BROWN_MUSHROOM: 39,
	RED_MUSHROOM: 40,
	GOLD_BLOCK: 41,
	IRON_BLOCK: 42,
	DOUBLE_STEP: 43,
	STEP: 44,
	BRICK: 45,
	TNT: 46,
	BOOKSHELF: 47,
	MOSSY_COBBLESTONE: 48,
	OBSIDIAN: 49,
	TORCH: 50,
	FIRE: 51,
	MOB_SPAWNER: 52,
	WOOD_STAIRS: 53,
	CHEST: 54,
	REDSTONE_WIRE: 55,
	DIAMOND_ORE: 56,
	DIAMOND_BLOCK: 57,
	WORKBENCH: 58,
	CROPS: 59,
	SOIL: 60,
	FURNACE: 61,
	BURNING_FURNACE: 62,
	SIGN_POST: 63,
	WOODEN_DOOR: 64,
	LADDER: 65,
	RAILS: 66,
	COBBLESTONE_STAIRS: 67,
	WALL_SIGN: 68,
	LEVER: 69,
	STONE_PLATE: 70,
	IRON_DOOR_BLOCK: 71,
	WOOD_PLATE: 72,
	REDSTONE_ORE: 73,
	GLOWING_REDSTONE_ORE: 74,
	REDSTONE_TORCH_OFF: 75,
	REDSTONE_TORCH_ON: 76,
	STONE_BUTTON: 77,
	SNOW: 78,
	ICE: 79,
	SNOW_BLOCK: 80,
	CACTUS: 81,
	CLAY: 82,
	SUGAR_CANE_BLOCK: 83,
	JUKEBOX: 84,
	FENCE: 85,
	PUMPKIN: 86,
	NETHERRACK: 87,
	SOUL_SAND: 88,
	GLOWSTONE: 89,
	PORTAL: 90,
	JACK_O_LANTERN: 91,
	CAKE_BLOCK: 92,
	DIODE_BLOCK_OFF: 93,
	DIODE_BLOCK_ON: 94,
	LOCKED_CHEST: 95,
	TRAP_DOOR: 96,
	name: function( id ) {
		for ( var name in this ) {
			if ( this[name] == id )
				return name;
		};
		return null;
	}
};
blockTypes.notOpaque = [blockTypes.AIR, blockTypes.SAPLING, blockTypes.WATER, blockTypes.STATIONARY_WATER, blockTypes.LAVA, blockTypes.STATIONARY_LAVA, blockTypes.LEAVES, blockTypes.GLASS, blockTypes.BED_BLOCK, blockTypes.POWERED_RAIL, blockTypes.DETECTOR_RAIL, blockTypes.WEB, blockTypes.LONG_GRASS, blockTypes.DEAD_BUSH, blockTypes.YELLOW_FLOWER, blockTypes.RED_ROSE, blockTypes.BROWN_MUSHROOM, blockTypes.RED_MUSHROOM, blockTypes.TORCH, blockTypes.FIRE, blockTypes.MOB_SPAWNER, blockTypes.REDSTONE_WIRE, blockTypes.CROPS, blockTypes.SIGN_POST, blockTypes.WOODEN_DOOR, blockTypes.LADDER, blockTypes.RAILS, blockTypes.WALL_SIGN, blockTypes.LEVER, blockTypes.STONE_PLATE, blockTypes.IRON_DOOR_BLOCK, blockTypes.WOOD_PLATE, blockTypes.STONE_BUTTON, blockTypes.SNOW, blockTypes.ICE, blockTypes.CACTUS, blockTypes.SUGAR_CANE_BLOCK, blockTypes.FENCE, blockTypes.PORTAL, blockTypes.CAKE_BLOCK, blockTypes.DIODE_BLOCK_OFF, blockTypes.DIODE_BLOCK_ON, blockTypes.TRAP_DOOR];

onmessage = function( event ) {
	var message = event.data;

	switch ( message.action ) {
		case 'getChunk':
			getChunk( message.world, message.x, message.z );
			break;
	}
};

onerror = function( event ) {
	postMessage( { action: 'error', event: event } );
};

var blocks, rawChunk;
function getChunk( world, chunkX, chunkZ ) {
	try {
		var http = new XMLHttpRequest();
		http.open( 'GET', world + '/chunk.' + chunkX + '.' + chunkZ + '.json.gz', false );
		http.send( null );
		rawChunk = JSON.parse( http.responseText );
	} catch (ex) {
		postMessage( { action: 'chunkNotFound', world: world, x: chunkX, z: chunkZ } );
		return;
	}

	var x = 0, y = -1, z = 0;
	blocks = {};
	rawChunk.forEach( function( block ) {
		y++;
		if ( y == 128 ) {
			y = 0;
			z++;
			if ( z == 16 ) {
				z = 0;
				x++;
			}
		}
		if ( !( x in blocks ) )
			blocks[x] = {};
		if ( !( y in blocks[x] ) )
			blocks[x][y] = {};

		var id = block & 0xff;
		block >>= 8;
		var data = block & 0xf;
		block >>= 4;
		var skylight = block & 0xf;
		block >>= 4;
		var emittedlight = block & 0xf;
		block >>= 4;

		blocks[x][y][z] = { id: id, data: data, skylight: skylight, emittedlight: emittedlight, x: x, y: y, z: z };
	} );

	function emitted( _x, _y, _z ) {
		var light = 0;
		for ( var x = Math.max( 0, _x - 3 ); x < Math.min( 16, _x + 3 ); x++ ) {
			for ( var y = Math.max( 0, _y - 3 ); y < Math.min( 128, _y + 3 ); y++ ) {
				for ( var z = Math.max( 0, _z - 3 ); z < Math.min( 16, _z + 3 ); z++ ) {
					light += Math.max( 0, blocks[x][y][z].emittedlight ) / ( Math.sqrt( ( _x - x ) * ( _x - x ), ( _y - y ) * ( _y - y ), ( _z - z ) * ( _z - z ) ) + 1 );
				}
			}
		}
	}

	for ( var x = 0; x < 16; x++ ) {
		for ( var z = 0; z < 16; z++ ) {
			for ( var y = 127; y >= 0; y-- ) {
				if ( blocks[x][y][z].id )
					break;
				blocks[x][y][z].skylight = 15;
			}
		}
	}

	for ( var x = 0; x < 16; x++ ) {
		for ( var y = 0; y < 128; y++ ) {
			for ( var z = 0; z < 16; z++ ) {
				blocks[x][y][z].light = blocks[x][Math.min( y + 1, 127 )][z].skylight + blocks[x][y][z].skylight// + emitted( x, y, z );
			}
		}
	}

	for ( var x = 0; x < 16; x++ ) {
		for ( var y = 0; y < 128; y++ ) {
			for ( var z = 0; z < 16; z++ ) {
				for ( var i = -1; i <= 1; i += 2 ) {
					for ( var j = -1; j <= 1; j += 2 ) {
						if ( x + i < 0 || x + i > 15 || z + j < 0 || z + j > 15 )
							continue;
						if ( blocks[x][y][z].light < blocks[x + i][y][z + j].skylight )
							blocks[x][y][z].light = ( blocks[x][y][z].light + blocks[x + i][y][z + j].skylight ) / 2;
					}
				}
			}
		}
	}

	for ( var x = 0; x < 16; x++ ) {
		for ( var y = 0; y < 128; y++ ) {
			for ( var z = 0; z < 16; z++ ) {
				blocks[x][y][z].light = Math.min( Math.max( blocks[x][y][z].light * 16, 0 ), 255 );
			}
		}
	}
	var vertices = [], polys = [], normals = [], texcoords = [], lighting = [];

	for ( var x = 0; x < 16; x++ ) {
		for ( var y = 0; y < 128; y++ ) {
			for ( var z = 0; z < 16; z++ ) {
				if ( blocks[x][y][z].id == 0 ) {
					continue;
				}

				if ( [blockTypes.LONG_GRASS, blockTypes.DEAD_BUSH, blockTypes.YELLOW_FLOWER, blockTypes.RED_ROSE].indexOf( blocks[x][y][z].id ) != -1 ) {
					continue; // TODO
				}

				if ( !blocks[x][y + 1] || !blocks[x][y + 1][z] || ( blocks[x][y + 1][z].id != blocks[x][y][z].id && blockTypes.notOpaque.indexOf( blocks[x][y + 1][z].id ) != -1 ) ) {
					if ( specialVerts( blocks[x][y][z].id, faces.TOP, x + chunkX * 16, y, z + chunkZ * 16 ) )
						vertices.push.apply( vertices, specialVerts( blocks[x][y][z].id, faces.TOP, x + chunkX * 16, y, z + chunkZ * 16 ) );
					else
						vertices.push(
							x + chunkX * 16,     z + chunkZ * 16,     y + 1,
							x + chunkX * 16 + 1, z + chunkZ * 16,     y + 1,
							x + chunkX * 16 + 1, z + chunkZ * 16 + 1, y + 1,
							x + chunkX * 16,     z + chunkZ * 16 + 1, y + 1
						);
					polys.push(
						vertices.length / 3 - 4, vertices.length / 3 - 3, vertices.length / 3 - 2,
						vertices.length / 3 - 4, vertices.length / 3 - 2, vertices.length / 3 - 1
					);
					normals.push(
						0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0
					);
					var uv, u, v;
					uv = getUV( blocks[x][y][z], faces.TOP );
					u = uv[0];
					v = uv[1];
					texcoords.push(
						u * 16,      v * 16,
						u * 16 + 15, v * 16,
						u * 16 + 15, v * 16 + 15,
						u * 16,      v * 16 + 15
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.TOP ) );
				}
				if ( blocks[x][y][z].id == blockTypes.WATER || blocks[x][y][z].id == blockTypes.STATIONARY_WATER )
					continue;
				if ( !blocks[x - 1] || !blocks[x - 1][y][z] || ( blocks[x - 1][y][z].id != blocks[x][y][z].id && blockTypes.notOpaque.indexOf( blocks[x - 1][y][z].id ) != -1 ) ) {
					if ( specialVerts( blocks[x][y][z].id, faces.WEST, x + chunkX * 16, y, z + chunkZ * 16 ) )
						vertices.push.apply( vertices, specialVerts( blocks[x][y][z].id, faces.WEST, x + chunkX * 16, y, z + chunkZ * 16 ) );
					else
						vertices.push(
							x + chunkX * 16, z + chunkZ * 16,     y,
							x + chunkX * 16, z + chunkZ * 16 + 1, y,
							x + chunkX * 16, z + chunkZ * 16 + 1, y + 1,
							x + chunkX * 16, z + chunkZ * 16,     y + 1
						);
					polys.push(
						vertices.length / 3 - 2, vertices.length / 3 - 3, vertices.length / 3 - 4,
						vertices.length / 3 - 1, vertices.length / 3 - 2, vertices.length / 3 - 4
					);
					normals.push(
						-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0
					);
					var uv, u, v;
					uv = getUV( blocks[x][y][z], faces.WEST );
					u = uv[0];
					v = uv[1];
					texcoords.push(
						u * 16,      v * 16 + 15,
						u * 16 + 15, v * 16 + 15,
						u * 16 + 15, v * 16,
						u * 16,      v * 16
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.WEST ) );
				}
				if ( !blocks[x][y][z - 1] || ( blocks[x][y][z - 1].id != blocks[x][y][z].id && blockTypes.notOpaque.indexOf( blocks[x][y][z - 1].id ) != -1 ) ) {
					if ( specialVerts( blocks[x][y][z].id, faces.SOUTH, x + chunkX * 16, y, z + chunkZ * 16 ) )
						vertices.push.apply( vertices, specialVerts( blocks[x][y][z].id, faces.SOUTH, x + chunkX * 16, y, z + chunkZ * 16 ) );
					else
						vertices.push(
							x + chunkX * 16,     z + chunkZ * 16, y,
							x + chunkX * 16 + 1, z + chunkZ * 16, y,
							x + chunkX * 16 + 1, z + chunkZ * 16, y + 1,
							x + chunkX * 16,     z + chunkZ * 16, y + 1
						);
					polys.push(
						vertices.length / 3 - 4, vertices.length / 3 - 3, vertices.length / 3 - 2,
						vertices.length / 3 - 4, vertices.length / 3 - 2, vertices.length / 3 - 1
					);
					normals.push(
						0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0, 0.0,  0.0,  1.0
					);
					var uv, u, v;
					uv = getUV( blocks[x][y][z], faces.SOUTH );
					u = uv[0];
					v = uv[1];
					texcoords.push(
						u * 16,      v * 16 + 15,
						u * 16 + 15, v * 16 + 15,
						u * 16 + 15, v * 16,
						u * 16,      v * 16
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.SOUTH ) );
				}
				if ( !blocks[x + 1] || !blocks[x + 1][y][z] || ( blocks[x + 1][y][z].id != blocks[x][y][z].id && blockTypes.notOpaque.indexOf( blocks[x + 1][y][z].id ) != -1 ) ) {
					if ( specialVerts( blocks[x][y][z].id, faces.EAST, x + chunkX * 16, y, z + chunkZ * 16 ) )
						vertices.push.apply( vertices, specialVerts( blocks[x][y][z].id, faces.SOUTH, x + chunkX * 16, y, z + chunkZ * 16 ) );
					else
						vertices.push(
							x + chunkX * 16 + 1, z + chunkZ * 16,     y,
							x + chunkX * 16 + 1, z + chunkZ * 16 + 1, y,
							x + chunkX * 16 + 1, z + chunkZ * 16 + 1, y + 1,
							x + chunkX * 16 + 1, z + chunkZ * 16,     y + 1
						);
					polys.push(
						vertices.length / 3 - 4, vertices.length / 3 - 3, vertices.length / 3 - 2,
						vertices.length / 3 - 4, vertices.length / 3 - 2, vertices.length / 3 - 1
					);
					normals.push(
						1.0,  0.0,  0.0, 1.0,  0.0,  0.0, 1.0,  0.0,  0.0, 1.0,  0.0,  0.0
					);
					var uv, u, v;
					uv = getUV( blocks[x][y][z], faces.EAST );
					u = uv[0];
					v = uv[1];
					texcoords.push(
						u * 16,      v * 16 + 15,
						u * 16 + 15, v * 16 + 15,
						u * 16 + 15, v * 16,
						u * 16,      v * 16
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.EAST ) );
				}
			}
		}
	}

	postMessage( { action: 'chunk', world: world, x: chunkX, z: chunkZ, vertices: vertices, polys: polys, normals: normals, texcoords: texcoords, lighting: lighting } );
}

/*function findContiguousAreas() {
	const min_size = 30; // 30 blocks
	const iter = 10;

	var b = new Uint8Array( rawChunk ); // Strips off the data bits, leaving only the block IDs behind.

	function contig( block ) {
		var t = b[block];

		var todo = [block];

		function _( x, y, z, a ) {
			a.push( ( x << 11 ) | ( z << 7 ) | y );
			for ( var i = -1; i < 2; i++ ) {
				for ( var j = -1; j < 2; j++ ) {
					for ( var k = -1; k < 2; k++ ) {
						if ( i == 0 && j == 0 && k == 0 )
							continue;
						if ( x + i > 15 || x + i < 0 || y + j > 127 || y + j < 0 || z + k > 15 || z + k < 0 )
							continue;
						var loc = ( ( x + i ) << 11 ) | ( ( z + k ) << 7 ) | ( y + j );
						if ( a.indexOf( loc ) == -1 && b[loc] == t ) {
							todo.push( loc );
						}
					}
				}
			}
		}

		var blocks = [];

		while ( todo.length ) {
			var loc = todo.shift();

			_( loc >> 11, ( loc >> 7 ) & 0xf, loc & 0x7f, blocks );
		}

		return blocks;
	}

	var areas = [];

	for ( var i = 0; i < iter; i++ ) {
		var block = ~~( Math.random() * b.length );
		if ( !b[block] || block & 0x7f < 64 )
			continue;

		var area = contig( block );
		if ( area.length >= min_size ) {
			areas.push( area );
			area.forEach( function( block ) {
				b[block] = 0;
			} );
		}
	}

	return areas.sort( function( a, b ) {
		return b.length - a.length;
	} );
}*/

const faces = {
	TOP: 0,
	BOTTOM: 1,
	NORTH: 2,
	SOUTH: 3,
	EAST: 4,
	WEST: 5
};

function getLighting( x, y, z, face ) {
	function l(x, y, z) {
		if ( x < 0 || x > 15 || z < 0 || z > 15 )
			y++;
		return blocks[Math.max( Math.min( x, 15 ), 0 )][Math.max( Math.min( y, 127 ), 0 )][Math.max( Math.min( z, 15 ), 0 )].light;
	}

	switch ( face ) {
		case faces.TOP:
			return [l( x - 1, y + 1, z - 1 ), 0, l( x + 1, y + 1, z - 1 ), 0, l( x + 1, y + 1, z + 1 ), 0, l( x - 1, y + 1, z + 1 ), 0];
		case faces.WEST:
			return [l( x - 1, y - 1, z - 1 ), 0, l( x - 1, y - 1, z + 1 ), 0, l( x - 1, y + 1, z + 1 ), 0, l( x - 1, y + 1, z - 1 ), 0];
		case faces.SOUTH:
			return [l( x - 1, y - 1, z - 1 ), 0, l( x + 1, y - 1, z - 1 ), 0, l( x + 1, y + 1, z - 1 ), 0, l( x - 1, y + 1, z - 1 ), 0];
		case faces.EAST:
			return [l( x + 1, y - 1, z - 1 ), 0, l( x + 1, y - 1, z + 1 ), 0, l( x + 1, y + 1, z + 1 ), 0, l( x + 1, y + 1, z - 1 ), 0];
	}
}

function specialVerts( id, face, x, y, z ) {
	switch ( id ) {
		case blockTypes.SNOW:
			switch ( face ) {
				case faces.BOTTOM:
					return;
				case faces.TOP:
					return [
						x,     z,     y + 0.25,
						x + 1, z,     y + 0.25,
						x + 1, z + 1, y + 0.25,
						x,     z + 1, y + 0.25
					];
				case faces.WEST:
					return [
						x, z,     y,
						x, z + 1, y,
						x, z + 1, y + 0.25,
						x, z,     y + 0.25
					];
				case faces.SOUTH:
					return [
						x,     z, y,
						x + 1, z, y,
						x + 1, z, y + 0.25,
						x,     z, y + 0.25
					];
				case faces.EAST:
					return [
						x + 1, z,     y,
						x + 1, z + 1, y,
						x + 1, z + 1, y + 0.25,
						x + 1, z,     y + 0.25
					];
				default:
					return;
			}
	}
}

function getUV( block, face ) {
	var id = block.id, data = block.data;

	switch ( id ) {
		case blockTypes.STONE:
			return [1, 0];
		case blockTypes.DIRT:
			return [2, 0];
		case blockTypes.GRASS:
			switch ( face ) {
				case faces.TOP:
					return [0, 0];
				case faces.BOTTOM:
					return [2, 0];
				default:
					return [6, 2];
			}
			break;
		case blockTypes.COBBLESTONE:
			return [0, 1];
		case blockTypes.SAND:
			return [2, 1];
		case blockTypes.SANDSTONE:
			switch ( face ) {
				case faces.TOP:
					return [0, 11];
				case faces.BOTTOM:
					return [0, 13];
				default:
					return [0, 12];
			}
		case blockTypes.SNOW:
		case blockTypes.SNOW_BLOCK:
			return [2, 4];
		case blockTypes.STATIONARY_LAVA:
		case blockTypes.LAVA:
			return [13, 14];
		case blockTypes.STATIONARY_WATER:
		case blockTypes.WATER:
			return [13, 12];
		case blockTypes.LEAVES:
			return [4, 3];
		case blockTypes.BEDROCK:
			return [1, 1];
		case blockTypes.ICE:
			return [3, 4];
		case blockTypes.GRAVEL:
			return [3, 1];
		case blockTypes.GOLD_ORE:
			return [0, 2];
		case blockTypes.IRON_ORE:
			return [1, 2];
		case blockTypes.COAL_ORE:
			return [2, 2];
		case blockTypes.REDSTONE_ORE:
		case blockTypes.GLOWING_REDSTONE_ORE:
			return [3, 3];
		case blockTypes.CACTUS:
			switch ( face ) {
				case faces.TOP:
					return [5, 4];
				case faces.BOTTOM:
					return [7, 4];
				default:
					return [6, 4];
			}
	}
	postMessage( { action: 'unknownBlockType', name: blockTypes.name( id ), id: id } );
	return [-1, -1];
}