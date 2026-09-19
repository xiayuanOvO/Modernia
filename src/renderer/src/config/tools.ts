export interface ToolItem {
  key: string
  label: string
  description: string
  path: string
  group: string
}

export const tools: ToolItem[] = [
  {
    key: 'json',
    label: 'JSON 工具',
    description: '格式化、折叠与编辑 JSON',
    path: '/tools/json',
    group: '文本处理',
  },
  {
    key: 'diff',
    label: '文本对比',
    description: '对比两段文本的行 / 词 / 字符差异',
    path: '/tools/diff',
    group: '文本处理',
  },
  {
    key: 'base64',
    label: 'Base64',
    description: '文本 / 图片与 Base64 互转',
    path: '/tools/base64',
    group: '编码转换',
  },
  {
    key: 'timestamp',
    label: '时间戳',
    description: 'Unix 时间戳与日期互转',
    path: '/tools/timestamp',
    group: '编码转换',
  },
  {
    key: 'barcode',
    label: '码生成解码',
    description: '二维码 / 条形码生成与图片解码',
    path: '/tools/barcode',
    group: '编码转换',
  },
  {
    key: 'hash',
    label: '哈希计算',
    description: '计算文本的 SHA-256 / SHA-1 / MD5',
    path: '/tools/hash',
    group: '安全校验',
  },
  {
    key: 'file-hash',
    label: '文件哈希',
    description: '计算本地文件的 MD5 / SHA-1 / SHA-256 / SHA-512',
    path: '/tools/file-hash',
    group: '安全校验',
  },
  {
    key: 'fake-person',
    label: '虚拟信息',
    description: '生成姓名、身份证、银行卡等测试数据',
    path: '/tools/fake-person',
    group: '数据生成',
  },
  {
    key: 'image',
    label: '图片压缩',
    description: '压缩并转换 WebP / PNG / JPEG',
    path: '/tools/image',
    group: '媒体处理',
  },
  {
    key: 'pay-qr-crop',
    label: '收款码裁剪',
    description: '从微信 / 支付宝截图裁出收款二维码',
    path: '/tools/pay-qr-crop',
    group: '媒体处理',
  },
  {
    key: 'apk',
    label: 'APK 信息',
    description: '读取 APK 包名、版本与签名证书指纹',
    path: '/tools/apk',
    group: 'Android',
  },
  {
    key: 'currency',
    label: '汇率换算',
    description: '常用货币实时汇率换算',
    path: '/tools/currency',
    group: '生活实用',
  },
  {
    key: 'speedtest',
    label: '网络测速',
    description: '延迟、下载与上传带宽测试',
    path: '/tools/speedtest',
    group: '生活实用',
  },
  {
    key: 'hardware-price',
    label: '硬件报价',
    description: 'CPU / 显卡 / 主板商城价与近期对比',
    path: '/tools/hardware-price',
    group: '生活实用',
  },
  {
    key: 'pc-build',
    label: '装机比价',
    description: '多方案合计，支持 CPU+主板套装与备用替换',
    path: '/tools/pc-build',
    group: '生活实用',
  },
]

export function getToolByKey(key: string) {
  return tools.find((t) => t.key === key)
}
