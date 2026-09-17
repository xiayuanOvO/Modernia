import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
import { join } from 'node:path'
import { parseApkFile } from './apkInfo'
import { fetchAllHardwarePrices } from './hardwarePrice'
import { runSpeedTest, listSpeedSources } from './speedTest'
import { setupAutoUpdater } from './update'
import logoPath from '../../resources/logo.png?asset'
import logoDockPath from '../../resources/logo-dock.png?asset'

let win: BrowserWindow | null
/** macOS：Cmd+Q 真正退出时才销毁窗口，点关闭只隐藏 */
let isQuitting = false
const speedAbortBySender = new Map<number, AbortController>()

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

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
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

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function parseApkOrError(filePath: string) {
  try {
    return { data: parseApkFile(filePath) }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '解析 APK 失败' }
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
    return { canceled: false as const, ...parseApkOrError(result.filePaths[0]) }
  })

  ipcMain.handle('apk:parse', async (_event, filePath: string) => {
    if (!filePath || typeof filePath !== 'string') {
      return { error: '无效的文件路径' }
    }
    if (!filePath.toLowerCase().endsWith('.apk')) {
      return { error: '请选择 .apk 文件' }
    }
    return parseApkOrError(filePath)
  })

  ipcMain.handle('speedtest:sources', () => listSpeedSources())

  ipcMain.handle('speedtest:run', async (event, sourceId: string) => {
    const senderId = event.sender.id
    speedAbortBySender.get(senderId)?.abort()
    const controller = new AbortController()
    speedAbortBySender.set(senderId, controller)
    try {
      return await runSpeedTest(
        typeof sourceId === 'string' && sourceId ? sourceId : 'aliyun',
        (progress) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('speedtest:progress', progress)
          }
        },
        controller.signal,
      )
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        return { aborted: true as const }
      }
      return {
        error: e instanceof Error ? e.message : '测速失败',
      }
    } finally {
      if (speedAbortBySender.get(senderId) === controller) {
        speedAbortBySender.delete(senderId)
      }
    }
  })

  ipcMain.on('speedtest:abort', (event) => {
    const controller = speedAbortBySender.get(event.sender.id)
    controller?.abort()
    speedAbortBySender.delete(event.sender.id)
  })

  ipcMain.handle('hardware:fetch', async () => {
    try {
      return await fetchAllHardwarePrices()
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : '获取硬件报价失败',
      }
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
  createWindow()
})

app.whenReady().then(() => {
  registerIpc()
  if (process.platform === 'darwin') {
    // dock.setIcon 不会套系统圆角遮罩，需使用自带透明圆角的图
    app.dock?.setIcon(logoDockPath)
  }
  // Windows：去掉默认菜单栏（文件 / 编辑 / 查看…）
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null)
  }
  createWindow()
  setupAutoUpdater(() => win)
})
