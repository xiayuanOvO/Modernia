import {
  CodeSlashOutline,
  GitCompareOutline,
  KeyOutline,
  TimeOutline,
  FingerPrintOutline,
  PersonOutline,
  PhonePortraitOutline,
  CashOutline,
  ImageOutline,
  SpeedometerOutline,
  HardwareChipOutline,
  DesktopOutline,
  QrCodeOutline,
} from '@vicons/ionicons5'
import type { Component } from 'vue'

export const toolIconMap: Record<string, Component> = {
  json: CodeSlashOutline,
  diff: GitCompareOutline,
  base64: KeyOutline,
  timestamp: TimeOutline,
  hash: FingerPrintOutline,
  'fake-person': PersonOutline,
  image: ImageOutline,
  apk: PhonePortraitOutline,
  currency: CashOutline,
  speedtest: SpeedometerOutline,
  'hardware-price': HardwareChipOutline,
  'pc-build': DesktopOutline,
  barcode: QrCodeOutline,
}
