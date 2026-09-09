import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parseApkFile } from './apkInfo'
import { setupAutoUpdater } from './update'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    title: 'Modernia',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

function registerIpc() {
  ipcMain.handle('apk:select', async () => {
    const result = await dialog.showOpenDialog(win!, {
      title: '选择 APK 文件',
      properties: ['openFile'],
      filters: [{ name: 'Android APK', extensions: ['apk'] }],
    })
    if (result.canceled || !result.filePaths[0]) {
      return { canceled: true as const }
    }
    try {
      const data = parseApkFile(result.filePaths[0])
      return { canceled: false as const, data }
    } catch (e) {
      return {
        canceled: false as const,
        error: e instanceof Error ? e.message : '解析 APK 失败',
      }
    }
  })

  ipcMain.handle('apk:parse', async (_event, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
      return { error: '无效的文件路径' }
    }
    if (!filePath.toLowerCase().endsWith('.apk')) {
      return { error: '请选择 .apk 文件' }
    }
    try {
      const data = parseApkFile(filePath)
      return { data }
    } catch (e) {
      return { error: e instanceof Error ? e.message : '解析 APK 失败' }
    }
  })
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpc()
  if (process.platform === 'darwin') {
    // dock.setIcon 不会套系统圆角遮罩，需使用自带透明圆角的图
    app.dock?.setIcon(path.join(process.env.VITE_PUBLIC!, 'logo-dock.png'))
  }
  createWindow()
  setupAutoUpdater(() => win)
})
