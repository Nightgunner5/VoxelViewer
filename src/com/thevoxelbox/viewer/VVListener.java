package com.thevoxelbox.viewer;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.zip.GZIPOutputStream;

import org.bukkit.Chunk;
import org.bukkit.ChunkSnapshot;
import org.bukkit.World;
import org.bukkit.event.world.ChunkLoadEvent;
import org.bukkit.event.world.ChunkUnloadEvent;
import org.bukkit.event.world.WorldListener;

public class VVListener extends WorldListener {
	final protected VoxelViewer plugin;
	protected ArrayList<ChunkSnapshot> queue = new ArrayList<ChunkSnapshot>();
	protected ArrayList<Chunk> chunks = new ArrayList<Chunk>();
	protected int noSleepChunks = 0;
	private final ThreadGroup threads = new ThreadGroup("VoxelViewer");

	public VVListener(VoxelViewer plugin) {
		this.plugin = plugin;
	}

	@Override
	public void onChunkLoad(ChunkLoadEvent event) {
		chunks.add(event.getChunk());
		synchronized (threads) {
			threads.notify();
		}
	}

	@Override
	public void onChunkUnload(ChunkUnloadEvent event) {
		if (chunks.remove(event.getChunk())) {
			queue.add(event.getChunk().getChunkSnapshot());
			synchronized (threads) {
				threads.notify();
			}
		}
	}

	public void clearQueue() {
		queue.clear();
		synchronized (threads) {
			threads.notifyAll();
		}
	}

	public void startThreads() {
		new Thread(threads, new VVThread()).start();
		new Thread(threads, new VVThread()).start();
		new Thread(threads, new VVThread()).start();
		new Thread(threads, new VVThread()).start();
		new Thread(threads, new VVTimer()).start();
	}

	private class VVThread implements Runnable {
		/*private final int[] cube = new int[] {
				// Front
				0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1,
				// Back
				0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0,
				// Top
				0, 1, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0,
				// Bottom
				0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1,
				// Right
				1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1,
				// Left
				0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0 };
		private final int[] cubet = new int[] {
				// Front
				0, 1, 1, 1, 1, 0, 0, 0,
				// Back
				0, 0, 1, 0, 1, 1, 0, 1,
				// Top
				0, 0, 1, 0, 1, 1, 0, 1,
				// Bottom
				0, 0, 1, 0, 1, 1, 0, 1,
				// Right
				0, 0, 1, 0, 1, 1, 0, 1,
				// Left
				0, 0, 1, 0, 1, 1, 0, 1 };
		private final int[] cuben = new int[] {
				// Front
				0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
				// Back
				0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
				// Top
				0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
				// Bottom
				0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
				// Right
				1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
				// Left
				-1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0 };*/

		@Override
		public void run() {
			while (plugin.isEnabled()) {
				try {
					if (noSleepChunks > 0) {
						noSleepChunks--;
					} else {
						Thread.sleep(100); // This line of code is surprisingly effective at keeping creepers away from the server closet.
					}
					synchronized (threads) {
						if (queue.isEmpty()) {
							threads.wait();
						}
					}
				} catch (InterruptedException ex) {
				}

				ChunkSnapshot chunk = null;
				synchronized (queue) {
					if (queue.isEmpty()) {
						continue;
					}

					chunk = queue.get(0);
					if (chunk == null) {
						continue;
					}
					queue.remove(chunk);
				}

				/*ArrayList<Integer> vertices = new ArrayList<Integer>();
				ArrayList<Float> texloc = new ArrayList<Float>();
				ArrayList<Integer> normals = new ArrayList<Integer>();
				for (int x = 0; x < 16; x++) {
					for (int y = 0; y < 128; y++) {
						for (int z = 0; z < 16; z++) {
							int blockType = chunk.getBlockTypeId(x, y, z);
							if (blockType == 0) {
								// Nobody cares about air
								continue;
							}
							for (int i = 0; i < cube.length; i += 3) {
								vertices.add(cube[i] + x + chunk.getX() * 16);
								vertices.add(cube[i + 1] + z + chunk.getZ()
										* 16);
								vertices.add(cube[i + 2] + y);
							}
							int top = -1, sides = -1, bottom = -1;
							switch (Material.getMaterial(blockType)) {
							case STONE:
								top = 1;
								break;
							case GRASS:
								top = 0;
								sides = 38;
								bottom = 2;
								break;
							case DIRT:
								top = 2;
								break;
							case COBBLESTONE:
								top = 16;
								break;
							case MOSSY_COBBLESTONE:
								top = 28;
								break;
							case OBSIDIAN:
								top = 29;
								break;
							case BEDROCK:
								top = 17;
								break;
							case SAND:
								top = 18;
								break;
							case SANDSTONE:
								top = 176;
								sides = 192;
								bottom = 208;
								break;
							case LOG:
								int logType = chunk.getBlockData(x, y, z);
								top = 21;
								sides = logType == 1 ? 116
										: (logType == 2 ? 117 : 20);
								break;
							case LEAVES:
								top = 132;
								break;
							case GOLD_ORE:
								top = 32;
								break;
							case IRON_ORE:
								top = 33;
								break;
							case COAL_ORE:
								top = 34;
								break;
							case LAPIS_ORE:
								top = 160;
								break;
							case LAPIS_BLOCK:
								top = 154;
								break;
							case GRAVEL:
								top = 19;
								break;
							case STATIONARY_WATER:
							case WATER:
								top = 229;
								break;
							case STATIONARY_LAVA:
							case LAVA:
								top = 237;
								break;
							case DIAMOND_ORE:
								top = 26;
								break;
							case REDSTONE_ORE:
							case GLOWING_REDSTONE_ORE:
								top = 27;
								break;
							case CLAY:
								top = 72;
								break;
							case SNOW:
								top = 66;
								break;
							case ICE:
								top = 67;
								break;
							case RED_MUSHROOM:
							case BROWN_MUSHROOM:
							case RED_ROSE:
							case YELLOW_FLOWER:
							case LONG_GRASS:
							case SUGAR_CANE_BLOCK:
								// TODO
								break;
							default:
								plugin.getServer()
										.getLogger()
										.warning(
												"[VoxelViewer] Unhandled block material: "
														+ Material.getMaterial(
																blockType)
																.toString()
														+ " (" + blockType
														+ ")");
							}
							if (sides == -1) {
								sides = top;
							}
							if (bottom == -1) {
								bottom = top;
							}
							for (int i = 0; i < 16; i += 2) {
								texloc.add((sides % 16 + cubet[i]) / 16.0f);
								texloc.add((sides / 16 + cubet[i]) / 16.0f);
							}
							for (int i = 16; i < 24; i += 2) {
								texloc.add((top % 16 + cubet[i]) / 16.0f);
								texloc.add((top / 16 + cubet[i]) / 16.0f);
							}
							for (int i = 24; i < 32; i += 2) {
								texloc.add((bottom % 16 + cubet[i]) / 16.0f);
								texloc.add((bottom / 16 + cubet[i]) / 16.0f);
							}
							for (int i = 32; i < 48; i += 2) {
								texloc.add((sides % 16 + cubet[i]) / 16.0f);
								texloc.add((sides / 16 + cubet[i]) / 16.0f);
							}

							for (int n : cuben) {
								normals.add(n);
							}
						}
					}
				}*/

				try {
					File dir = new File(plugin.getConfiguration().getString(
							"chunk_location_" + chunk.getWorldName(),
							new File(plugin.getDataFolder(), chunk
									.getWorldName()).getAbsolutePath()));
					if (!dir.exists()) {
						dir.mkdirs();
					}
					File file = new File(dir, "chunk." + chunk.getX() + "."
							+ chunk.getZ() + ".json.gz");
					if (file.lastModified() > System.currentTimeMillis() - 30000) { // Don't process chunks more than once every five minutes
						continue;
					}
					int[] output = new int[16 * 16 * 128];
					for (int x = 0; x < 16; x++) {
						for (int y = 0; y < 128; y++) {
							for (int z = 0; z < 16; z++) {
								// 4(emittedlight) + 4(skylight) + 4(data) + 8(type) = 20/32 bits
								output[(x * 16 + z) * 128 + y] = (chunk
										.getBlockEmittedLight(x, y, z) << 16)
										+ (chunk.getBlockSkyLight(x, y, z) << 12)
										+ (chunk.getBlockData(x, y, z) << 8)
										+ chunk.getBlockTypeId(x, y, z);
							}
						}
					}
					GZIPOutputStream out = new GZIPOutputStream(
							new FileOutputStream(file));
					out.write(Arrays.toString(output).replace(" ", "")
							.getBytes());
					/*out.write("{\"vertices\":".getBytes());
					out.write(vertices.toString().replace(" ", "").getBytes());
					out.write(",\"texloc\":".getBytes());
					out.write(texloc.toString().replace(" ", "").getBytes());
					out.write(",\"normals\":".getBytes());
					out.write(normals.toString().replace(" ", "").getBytes());
					out.write("}".getBytes());*/
					out.close();
				} catch (IOException ex) {
					ex.printStackTrace();
				}
			}
		}
	}

	private class VVTimer implements Runnable {
		@Override
		public void run() {
			while (plugin.isEnabled()) {
				try {
					Thread.sleep(300000);
				} catch (InterruptedException ex) {
				}
				for (Chunk chunk : chunks) {
					if (chunk != null) {
						queue.add(chunk.getChunkSnapshot());
						synchronized (threads) {
							threads.notify();
						}
					}
				}
			}
		}
	}

	public synchronized int processAllChunks(World world) {
		File worldDir = new File(new File(plugin.getDataFolder()
				.getParentFile().getParentFile(), world.getName()), "region");
		File[] regions = worldDir.listFiles();
		if (regions == null)
			return 0;
		int chunks = 0;
		for (File region : regions) {
			String[] coord = region.getName().split("\\.");
			if (coord.length == 4 && coord[0].equals("r")
					&& coord[3].equals("mcr")) {
				int regionX = Integer.parseInt(coord[1]) * 32;
				int regionZ = Integer.parseInt(coord[2]) * 32;
				for (int x = 0; x < 32; x++) {
					for (int z = 0; z < 32; z++) {
						if (world.loadChunk(x + regionX, z + regionZ, false)) {
							queue.add(world
									.getChunkAt(x + regionX, z + regionZ)
									.getChunkSnapshot());
							this.chunks.remove(world.getChunkAt(x + regionX, z
									+ regionZ));
							world.unloadChunkRequest(x + regionX, z + regionZ);
							chunks++;
						}
					}
				}
			}
		}
		if (chunks > 0) {
			noSleepChunks += chunks;
			synchronized (threads) {
				threads.notifyAll();
			}
		}
		return chunks;
	}
}
