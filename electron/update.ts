import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import type { UpdateInfo, ProgressInfo } from 'electron-updater'

const { autoUpdater } = electronUpdater

export type UpdateEvent =
  | { type: 'checking' }
  | { type: 'available'; info: UpdateInfo }
  | { type: 'not-available'; info: UpdateInfo }
  | { type: 'progress'; progress: ProgressInfo }
  | { type: 'downloaded'; info: UpdateInfo }
  | { type: 'error'; message: string }

let registered = false

function send(getWindow: () => BrowserWindow | null, payload: UpdateEvent) {
  getWindow()?.webContents.send('update:event', payload)
}

export function setupAutoUpdater(getWindow: () => BrowserWindow | null) {
  if (registered) return
  registered = true

  ipcMain.handle('update:get-version', () => app.getVersion())

  if (!app.isPackaged) {
    ipcMain.handle('update:check', async () => ({
      ok: false as const,
      error: '开发模式不检查更新',
    }))
    ipcMain.handle('update:download', async () => ({
      ok: false as const,
      error: '开发模式无法下载更新',
    }))
    ipcMain.handle('update:install', () => undefined)
    return
  }

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    send(getWindow, { type: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    send(getWindow, { type: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    send(getWindow, { type: 'not-available', info })
  })

  autoUpdater.on('download-progress', (progress) => {
    send(getWindow, { type: 'progress', progress })
  })

  autoUpdater.on('update-downloaded', (info) => {
    send(getWindow, { type: 'downloaded', info })
  })

  autoUpdater.on('error', (err) => {
    send(getWindow, {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  })

  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates()
      return {
        ok: true as const,
        updateInfo: result?.updateInfo ?? null,
      }
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : '检查更新失败',
      }
    }
  })

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { ok: true as const }
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : '下载更新失败',
      }
    }
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true)
  })

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // 错误已由 error 事件推送
    })
  }, 4000)
}
