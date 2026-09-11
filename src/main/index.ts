import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { join } from 'node:path'
import { parseApkFile } from './apkInfo'
import { setupAutoUpdater } from './update'
import logoPath from '../../resources/logo.png?asset'
import logoDockPath from '../../resources/logo-dock.png?asset'

let win: BrowserWindow | null
/** macOS：Cmd+Q 真正退出时才销毁窗口，点关闭只隐藏 */
let isQuitting = false

function createWindow(): void {
  if (win) {
    win.show()
    win.focus()
    return
  }

  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 880,
    minHeight: 560,
    title: 'Modernia',
    show: false,
    backgroundColor: '#f7f8fa',
    icon: logoPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  win.once('ready-to-show', () => {
    win?.show()
  })

  // macOS：关窗隐藏到 Dock，保留页面状态，避免再次打开白屏重载
  win.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault()
      win?.hide()
    }
  })

  win.on('closed', () => {
    win = null
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpc(): void {
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

app.on('before-quit', () => {
  isQuitting = true
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (win) {
    win.show()
    win.focus()
    return
  }
  createWindow()
})

app.whenReady().then(() => {
  registerIpc()
  if (process.platform === 'darwin') {
    // dock.setIcon 不会套系统圆角遮罩，需使用自带透明圆角的图
    app.dock?.setIcon(logoDockPath)
  }
  createWindow()
  setupAutoUpdater(() => win)
})
