package com.thevoxelbox.viewer;

import org.bukkit.event.Event;
import org.bukkit.plugin.PluginManager;
import org.bukkit.plugin.java.JavaPlugin;

public class VoxelViewer extends JavaPlugin {
	protected final VVListener listener = new VVListener(this);
	protected final VVRebuild vvcache = new VVRebuild(this);
	protected final VVLen vvlen = new VVLen(this);

	@Override
	public void onDisable() {
		listener.clearQueue();
	}

	@Override
	public void onEnable() {
		PluginManager pm = getServer().getPluginManager();
		pm.registerEvent(Event.Type.CHUNK_LOAD, listener,
				Event.Priority.Monitor, this);
		pm.registerEvent(Event.Type.CHUNK_UNLOAD, listener,
				Event.Priority.Monitor, this);
		listener.startThreads();

		getCommand("vvcache").setExecutor(vvcache);
		getCommand("vvlen").setExecutor(vvlen);
	}
}
