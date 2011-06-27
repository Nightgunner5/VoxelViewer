package com.thevoxelbox.viewer;

import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;

public class VVLen implements CommandExecutor {
	private final VoxelViewer plugin;

	public VVLen(VoxelViewer plugin) {
		this.plugin = plugin;
	}

	@Override
	public boolean onCommand(CommandSender sender, Command command,
			String label, String[] args) {
		if (!sender.isOp())
			return true;
		sender.sendMessage("The queue length is "
				+ plugin.listener.queue.size() + ".");
		return true;
	}

}
