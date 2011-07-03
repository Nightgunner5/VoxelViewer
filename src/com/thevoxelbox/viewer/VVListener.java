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
	protected final VoxelViewer plugin;
	protected ArrayList<ChunkSnapshot> queue = new ArrayList<ChunkSnapshot>();
	protected ArrayList<Chunk> chunks = new ArrayList<Chunk>();
	protected ArrayList<Long> chunkTimestamps = new ArrayList<Long>();
	protected int noSleepChunks = 0;
	private final ThreadGroup threads = new ThreadGroup("VoxelViewer");

	public VVListener(VoxelViewer plugin) {
		this.plugin = plugin;
	}

	@Override
	public void onChunkLoad(ChunkLoadEvent event) {
		synchronized (chunks) {
			chunks.add(event.getChunk());
			chunkTimestamps.add(event.isNewChunk() ? 0 : System
					.currentTimeMillis());
		}
	}

	@Override
	public void onChunkUnload(ChunkUnloadEvent event) {
		synchronized (chunks) {
			int index = chunks.indexOf(event.getChunk());
			if (index == -1)
				return;
			if (chunkTimestamps.get(index).longValue() >= System
					.currentTimeMillis() - 60000) {
				chunkTimestamps.remove(index);
				chunks.remove(index);
				return;
			}
			chunkTimestamps.remove(index);
			chunks.remove(index);
			synchronized (queue) {
				queue.add(event.getChunk().getChunkSnapshot());
			}
			synchronized (threads) {
				threads.notify();
			}
		}
	}

	public void clearQueue() {
		synchronized (queue) {
			queue.clear();
		}
		synchronized (chunks) {
			chunks.clear();
			chunkTimestamps.clear();
		}
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
		private final int SLEEP_TIME = Math.min(
				Math.max(10000 / plugin.getServer().getMaxPlayers(), 10), 4000);

		@Override
		public void run() {
			while (plugin.isEnabled()) {
				try {
					if (noSleepChunks > 0) {
						noSleepChunks--;
					} else {
						// Assuming 20 players are on a server and are walking without turning at
						// normal speed in separate parts of a completely flat world with a view
						// radius of 9, about 119 chunks will be loaded and unloaded every second.
						//
						// However, there is a time requirement for the queue, and only chunks that
						// have been in memory for at least 60 seconds or that have just been generated
						// are processed. With 20 players, an average of 6 chunks per second at maximum
						// are processed. The next line of code assumes servers with higher player limits
						// will have higher amounts of players and more server power.
						//
						// I will now accept the award for the longest comment about one simple, self-
						// explanatory function call in the history of the Voxel Box.
						//
						// The previous sentence was, of course, speculation. None of the source code
						// for VoxelPlugins other than this one has been released.
						Thread.sleep(SLEEP_TIME);
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
				synchronized (chunks) {
					for (Chunk chunk : chunks) {
						// Chunks must be in memory for at least 5 minutes to be added to the queue before being unloaded.
						if (chunk != null
								&& chunkTimestamps.get(chunks.indexOf(chunk)) < System
										.currentTimeMillis() - 300000) {
							synchronized (queue) {
								queue.add(chunk.getChunkSnapshot());
							}
							synchronized (threads) {
								threads.notify();
							}
						}
					}
				}
			}
		}
	}

	public synchronized int processAllChunks(World world, boolean fast) {
		File worldDir = new File(new File(plugin.getDataFolder()
				.getParentFile().getParentFile(), world.getName()), "region");
		File[] regions = worldDir.listFiles();
		if (regions == null)
			return 0;
		int chunks = 0;
		synchronized (this.chunks) {
			synchronized (queue) {
				for (File region : regions) {
					String[] coord = region.getName().split("\\.");
					if (coord.length == 4 && coord[0].equals("r")
							&& coord[3].equals("mcr")) {
						int regionX = Integer.parseInt(coord[1]) * 32;
						int regionZ = Integer.parseInt(coord[2]) * 32;
						for (int x = 0; x < 32; x++) {
							for (int z = 0; z < 32; z++) {
								if (world.loadChunk(x + regionX, z + regionZ,
										false)) {
									queue.add(world.getChunkAt(x + regionX,
											z + regionZ).getChunkSnapshot());
									world.unloadChunkRequest(x + regionX, z
											+ regionZ);
									chunks++;
								}
							}
						}
					}
				}
			}
		}
		if (chunks > 0) {
			if (fast) {
				noSleepChunks += chunks;
			}
			synchronized (threads) {
				threads.notifyAll();
			}
		}
		return chunks;
	}
}
