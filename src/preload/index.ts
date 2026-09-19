import { ipcRenderer, contextBridge, webUtils } from 'electron'

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
  pathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },
})

contextBridge.exposeInMainWorld('speedTestApi', {
  listSources: () => ipcRenderer.invoke('speedtest:sources'),
  run: (sourceId: string) => ipcRenderer.invoke('speedtest:run', sourceId),
  abort: () => {
    ipcRenderer.send('speedtest:abort')
  },
  onProgress: (listener: (progress: unknown) => void) => {
    const handler = (_event: unknown, progress: unknown) => {
      listener(progress)
    }
    ipcRenderer.on('speedtest:progress', handler)
    return () => {
      ipcRenderer.off('speedtest:progress', handler)
    }
  },
})

contextBridge.exposeInMainWorld('hardwarePriceApi', {
  fetch: () => ipcRenderer.invoke('hardware:fetch'),
})

contextBridge.exposeInMainWorld('fileHashApi', {
  selectAndHash: () => ipcRenderer.invoke('filehash:select'),
  hashPath: (filePath: string) => ipcRenderer.invoke('filehash:path', filePath),
  pathForFile: (file: File) => {
    try {
      return webUtils.getPathForFile(file)
    } catch {
      return ''
    }
  },
  onProgress: (listener: (progress: number) => void) => {
    const handler = (_event: unknown, progress: unknown) => {
      if (typeof progress === 'number') listener(progress)
    }
    ipcRenderer.on('filehash:progress', handler)
    return () => {
      ipcRenderer.off('filehash:progress', handler)
    }
  },
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
