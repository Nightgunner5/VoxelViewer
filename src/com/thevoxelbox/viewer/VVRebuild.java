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
	public boolean onCommand(CommandSender sender, Command command,
			String label, String[] args) {
		if (!sender.isOp())
			return true;

		int chunks = 0;
		if (sender instanceof Player) {
			chunks = plugin.listener.processAllChunks(((Player) sender)
					.getWorld());
		} else {
			for (World world : plugin.getServer().getWorlds()) {
				chunks += plugin.listener.processAllChunks(world);
			}
		}

		sender.sendMessage("Enqueued " + chunks
				+ " chunks for processing. The queue length is now "
				+ plugin.listener.queue.size() + ".");

		return true;
	}
}
