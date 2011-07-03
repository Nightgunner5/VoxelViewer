package com.thevoxelbox.viewer;

import org.bukkit.World;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class VVRebuild implements CommandExecutor {
	private final VoxelViewer plugin;

	public VVRebuild(VoxelViewer plugin) {
		this.plugin = plugin;
	}

	@Override
	public boolean onCommand(final CommandSender sender, Command command,
			String label, final String[] args) {
		if (!sender.isOp())
			return true;

		(new Thread() {
			@Override
			public void run() {
				boolean fast = true;
				if (args.length > 0 && args[0].equals("slow")) {
					fast = false;
				}

				int chunks = 0;
				if (sender instanceof Player) {
					chunks = plugin.listener.processAllChunks(
							((Player) sender).getWorld(), fast);
				} else {
					for (World world : plugin.getServer().getWorlds()) {
						chunks += plugin.listener.processAllChunks(world, fast);
						sender.sendMessage("Enqueued all chunks in world "
								+ world.getName() + ".");
					}
				}

				sender.sendMessage("Enqueued " + chunks
						+ " chunks for processing. The queue length is now "
						+ plugin.listener.queue.size() + ".");
			}
		}).start();

		return true;
	}
}
