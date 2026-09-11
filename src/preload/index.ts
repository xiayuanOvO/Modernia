import { ipcRenderer, contextBridge } from 'electron'

contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

contextBridge.exposeInMainWorld('apkApi', {
  selectAndParse: () => ipcRenderer.invoke('apk:select'),
  parsePath: (filePath: string) => ipcRenderer.invoke('apk:parse', filePath),
})

contextBridge.exposeInMainWorld('updateApi', {
  getVersion: () => ipcRenderer.invoke('update:get-version') as Promise<string>,
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  onEvent: (listener: (event: unknown) => void) => {
    const handler = (_event: unknown, payload: unknown) => {
      listener(payload)
    }
    ipcRenderer.on('update:event', handler)
    return () => {
      ipcRenderer.off('update:event', handler)
    }
  },
})
