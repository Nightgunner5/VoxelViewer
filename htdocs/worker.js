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
}

onerror = function( event ) {
	postMessage( { action: 'error', event: event } );
}

const t = 15 / 256;

var blocks;
function getChunk( world, chunkX, chunkZ ) {
	try {
		var http = new XMLHttpRequest();
		http.open( 'GET', world + '/chunk.' + chunkX + '.' + chunkZ + '.json.gz', false );
		http.send( null );
		var rawChunk = JSON.parse( http.responseText );
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
					light += blocks[x][y][z].emittedlight / ( Math.sqrt( ( _x - x ) * ( _x - x ), ( _y - y ) * ( _y - y ), ( _z - z ) * ( _z - z ) ) + 1 );
				}
			}
		}
	}

	for ( var x = 0; x < 16; x++ ) {
		for ( var y = 0; y < 127; y++ ) {
			for ( var z = 0; z < 16; z++ ) {
				blocks[x][y][z].light = Math.min( blocks[x][y][z].skylight + emitted( x, y, z ), 15 );
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

				if ( !blocks[x][y + 1] || !blocks[x][y + 1][z] || blockTypes.notOpaque.indexOf( blocks[x][y + 1][z].id ) != -1 ) {
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
						u / 16,     v / 16,
						u / 16 + t, v / 16,
						u / 16 + t, v / 16 + t,
						u / 16,     v / 16 + t
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.TOP ) );
				}
				if ( !blocks[x - 1] || !blocks[x - 1][y][z] || blockTypes.notOpaque.indexOf( blocks[x - 1][y][z].id ) != -1 ) {
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
						u / 16,     v / 16 + t,
						u / 16 + t, v / 16 + t,
						u / 16 + t, v / 16,
						u / 16,     v / 16
					);
					lighting.push.apply( lighting, getLighting( x, y, z, faces.WEST ) );
				}
			}
		}
	}

	postMessage( { action: 'chunk', world: world, x: chunkX, z: chunkZ, vertices: vertices, polys: polys, normals: normals, texcoords: texcoords, lighting: lighting } );
}

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
		return blocks[Math.max( Math.min( x, 15 ), 0 )][Math.max( Math.min( y, 127 ), 0 )][Math.max( Math.min( z, 15 ), 0 )].light / 15;
	}

	switch ( face ) {
		case faces.TOP:
			return [l( x - 1, y + 1, z - 1 ), l( x + 1, y + 1, z - 1 ), l( x + 1, y + 1, z + 1 ), l( x - 1, y + 1, z + 1 )];
		case faces.WEST:
			return [l( x - 1, y - 1, z - 1 ), l( x - 1, y - 1, z + 1 ), l( x - 1, y + 1, z + 1 ), l( x - 1, y + 1, z - 1 )];
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
	}
	postMessage( blockTypes.name( id ) );
	return [-1, -1];
}