// electron/preload.cjs
import {contextBridge, ipcRenderer} from "electron";



// Example: Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
	// Add any IPC methods you need here
});