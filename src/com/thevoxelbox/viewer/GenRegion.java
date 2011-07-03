package com.thevoxelbox.viewer;

import java.lang.reflect.Method;

import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class GenRegion implements CommandExecutor {
	private final VoxelViewer plugin;

	public GenRegion(VoxelViewer plugin) {
		this.plugin = plugin;
	}

	@Override
	public boolean onCommand(final CommandSender sender, Command command,
			String label, final String[] args) {
		if (!sender.isOp())
			return false;

		final World world;
		int _x, _z;
		if (args.length == 2) {
			if (sender instanceof Player) {
				Player player = (Player) sender;
				world = player.getWorld();
			} else
				return false;
		} else if (args.length == 3) {
			world = plugin.getServer().getWorld(args[2]);
		} else
			return false;

		if (world == null)
			return false;

		try {
			_x = Integer.parseInt(args[0]);
			_z = Integer.parseInt(args[1]);
		} catch (NumberFormatException ex) {
			return false;
		}
		_x *= 32;
		_z *= 32;

		final int x = _x;
		final int z = _z;

		(new Thread() {
			@Override
			public void run() {
				int chunks = 0;
				for (int i = 0; i < 32; i++) {
					for (int j = 0; j < 32; j++) {
						if (!world.isChunkLoaded(x + i, z + j)) {
							if (world.loadChunk(x + i, z + j, false)) {
								world.unloadChunk(x + i, z + j);
								continue;
							}
							world.loadChunk(x + i, z + j);
							try {
								Method doLighting = world.getClass()
										.getDeclaredMethod("doLighting");
								while ((Boolean) doLighting.invoke(world)) {
									;
								}
							} catch (Exception ex) {
								// That was cheating. We got caught.
							}
							world.unloadChunk(x + i, z + j);
							chunks++;
						}
					}
				}

				sender.sendMessage("Generated " + chunks + " chunks.");
			}
		}).start();

		return true;
	}
}
