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
    description: '编码与解码 Base64 字符串',
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
    key: 'hash',
    label: '哈希计算',
    description: '计算文本的 SHA-256 / SHA-1 / MD5',
    path: '/tools/hash',
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
]

export function getToolByKey(key: string) {
  return tools.find((t) => t.key === key)
}
