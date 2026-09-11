/** 虚拟身份信息生成（仅供本地测试，非真实个人信息） */

export type Gender = '男' | '女'

export interface FakePerson {
  name: string
  gender: Gender
  age: number
  birthday: string
  birthYearMonth: string
  idCard: string
  bankCard: string
  bankName: string
  mobile: string
  email: string
  address: string
}

export interface GenerateOptions {
  gender?: Gender | '随机'
  minAge?: number
  maxAge?: number
  count?: number
}

const SURNAMES = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
  '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许',
  '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏',
  '陶', '姜', '戚', '谢', '邹', '喻', '柏', '水', '窦', '章',
  '苏', '潘', '葛', '奚', '范', '彭', '郎', '鲁', '韦', '昌',
  '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳', '酆',
  '鲍', '史', '唐', '费', '廉', '岑', '薛', '雷', '贺', '倪',
  '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常', '乐',
  '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余', '元',
  '卜', '顾', '孟', '平', '黄', '和', '穆', '萧', '尹', '姚',
]

const MALE_GIVEN = [
  '伟', '强', '磊', '军', '勇', '涛', '明', '超', '杰', '浩',
  '鹏', '华', '飞', '刚', '平', '辉', '宇', '鑫', '凯', '俊',
  '波', '斌', '亮', '建', '文', '龙', '晨', '洋', '博', '轩',
  '子轩', '浩然', '宇航', '子墨', '浩宇', '明轩', '天佑', '俊杰',
  '志强', '建国', '国强', '文博', '嘉豪', '一鸣', '思远', '承泽',
]

const FEMALE_GIVEN = [
  '芳', '娜', '敏', '静', '丽', '艳', '娟', '霞', '秀英', '桂英',
  '婷', '雪', '倩', '慧', '琳', '颖', '欣', '洁', '梅', '莉',
  '红', '燕', '玲', '丹', '萍', '佳', '悦', '瑶', '雨', '涵',
  '诗涵', '雨桐', '欣怡', '梓萱', '梦琪', '雅婷', '若曦', '语嫣',
  '思琪', '可馨', '婉清', '清雅', '依诺', '慕晴', '晓彤', '佳怡',
]

/** 常用行政区划代码（前 6 位） */
const AREA_CODES: { code: string; address: string }[] = [
  { code: '110101', address: '北京市东城区' },
  { code: '110105', address: '北京市朝阳区' },
  { code: '110108', address: '北京市海淀区' },
  { code: '310101', address: '上海市黄浦区' },
  { code: '310115', address: '上海市浦东新区' },
  { code: '440103', address: '广州市荔湾区' },
  { code: '440106', address: '广州市天河区' },
  { code: '440305', address: '深圳市南山区' },
  { code: '440304', address: '深圳市福田区' },
  { code: '330102', address: '杭州市上城区' },
  { code: '330106', address: '杭州市西湖区' },
  { code: '320102', address: '南京市玄武区' },
  { code: '320104', address: '南京市秦淮区' },
  { code: '510104', address: '成都市锦江区' },
  { code: '510107', address: '成都市武侯区' },
  { code: '500103', address: '重庆市渝中区' },
  { code: '420102', address: '武汉市江岸区' },
  { code: '420111', address: '武汉市洪山区' },
  { code: '610102', address: '西安市新城区' },
  { code: '610113', address: '西安市雁塔区' },
  { code: '210102', address: '沈阳市和平区' },
  { code: '210203', address: '大连市西岗区' },
  { code: '370102', address: '济南市历下区' },
  { code: '370202', address: '青岛市市南区' },
  { code: '350102', address: '福州市鼓楼区' },
  { code: '350203', address: '厦门市思明区' },
  { code: '430102', address: '长沙市芙蓉区' },
  { code: '410102', address: '郑州市中原区' },
  { code: '340102', address: '合肥市瑶海区' },
  { code: '120101', address: '天津市和平区' },
]

const BANKS: { name: string; bin: string; length: number }[] = [
  { name: '中国工商银行', bin: '622202', length: 19 },
  { name: '中国建设银行', bin: '622700', length: 19 },
  { name: '中国农业银行', bin: '622848', length: 19 },
  { name: '中国银行', bin: '621661', length: 19 },
  { name: '交通银行', bin: '622260', length: 16 },
  { name: '招商银行', bin: '622588', length: 16 },
  { name: '中信银行', bin: '622690', length: 16 },
  { name: '浦发银行', bin: '622521', length: 16 },
  { name: '民生银行', bin: '622622', length: 16 },
  { name: '兴业银行', bin: '622909', length: 18 },
]

const MOBILE_PREFIXES = [
  '130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
  '150', '151', '152', '153', '155', '156', '157', '158', '159',
  '166', '170', '171', '172', '173', '175', '176', '177', '178',
  '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
  '191', '198', '199',
]

const STREETS = [
  '中山路', '解放路', '人民路', '建设路', '和平路', '文化路',
  '学府路', '科技园路', '滨河大道', '星光大道', '朝阳大街', '新华街',
]

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pick<T>(list: T[]): T {
  return list[randInt(0, list.length - 1)]
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, '0')
}

function randomDigits(len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) s += String(randInt(0, 9))
  return s
}

function idCardChecksum(body17: string): string {
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
  const codes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(body17[i]) * weights[i]
  return codes[sum % 11]
}

/** Luhn 校验位 */
function luhnCheckDigit(payload: string): string {
  let sum = 0
  let alt = true
  for (let i = payload.length - 1; i >= 0; i--) {
    let n = Number(payload[i])
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return String((10 - (sum % 10)) % 10)
}

function randomBirthday(minAge: number, maxAge: number): Date {
  const today = new Date()
  const maxBirth = new Date(today)
  maxBirth.setFullYear(today.getFullYear() - minAge)
  const minBirth = new Date(today)
  minBirth.setFullYear(today.getFullYear() - maxAge - 1)
  minBirth.setDate(minBirth.getDate() + 1)

  const t = randInt(minBirth.getTime(), maxBirth.getTime())
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`
}

function calcAge(birthday: Date): number {
  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const m = today.getMonth() - birthday.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) age -= 1
  return age
}

function generateName(gender: Gender): string {
  const given = gender === '男' ? pick(MALE_GIVEN) : pick(FEMALE_GIVEN)
  return pick(SURNAMES) + given
}

function generateIdCard(areaCode: string, birthday: Date, gender: Gender): string {
  const ymd =
    `${birthday.getFullYear()}${pad(birthday.getMonth() + 1, 2)}${pad(birthday.getDate(), 2)}`
  // 顺序码：奇数男、偶数女
  let seq = randInt(1, 999)
  if (gender === '男' && seq % 2 === 0) seq += 1
  if (gender === '女' && seq % 2 === 1) seq += 1
  if (seq > 999) seq -= 2
  const body17 = `${areaCode}${ymd}${pad(seq, 3)}`
  return body17 + idCardChecksum(body17)
}

function generateBankCard(): { bankCard: string; bankName: string } {
  const bank = pick(BANKS)
  const restLen = bank.length - bank.bin.length - 1
  const payload = bank.bin + randomDigits(restLen)
  return {
    bankName: bank.name,
    bankCard: payload + luhnCheckDigit(payload),
  }
}

function generateMobile(): string {
  return pick(MOBILE_PREFIXES) + randomDigits(8)
}

function generateEmail(name: string): string {
  const domains = ['example.com', 'mail.test', 'demo.local', 'sample.net']
  const ascii = `u${randomDigits(6)}`
  const local = `${ascii}.${name.length}${randInt(10, 99)}`
  return `${local}@${pick(domains)}`
}

function generateAddress(area: string): string {
  return `${area}${pick(STREETS)}${randInt(1, 288)}号${randInt(1, 30)}栋${randInt(101, 2808)}室`
}

export function generateFakePerson(options: GenerateOptions = {}): FakePerson {
  const minAge = Math.max(1, options.minAge ?? 18)
  const maxAge = Math.max(minAge, options.maxAge ?? 60)
  const gender: Gender =
    options.gender === '男' || options.gender === '女'
      ? options.gender
      : Math.random() < 0.5
        ? '男'
        : '女'

  const birthday = randomBirthday(minAge, maxAge)
  const area = pick(AREA_CODES)
  const name = generateName(gender)
  const bank = generateBankCard()

  return {
    name,
    gender,
    age: calcAge(birthday),
    birthday: formatDate(birthday),
    birthYearMonth: `${birthday.getFullYear()}-${pad(birthday.getMonth() + 1, 2)}`,
    idCard: generateIdCard(area.code, birthday, gender),
    bankCard: bank.bankCard,
    bankName: bank.bankName,
    mobile: generateMobile(),
    email: generateEmail(name),
    address: generateAddress(area.address),
  }
}

export function generateFakePeople(options: GenerateOptions = {}): FakePerson[] {
  const count = Math.min(100, Math.max(1, options.count ?? 1))
  return Array.from({ length: count }, () => generateFakePerson(options))
}

export const FIELD_LABELS: Record<keyof FakePerson, string> = {
  name: '姓名',
  gender: '性别',
  age: '年龄',
  birthday: '出生日期',
  birthYearMonth: '出生年月',
  idCard: '身份证号',
  bankCard: '银行卡号',
  bankName: '开户银行',
  mobile: '手机号',
  email: '邮箱',
  address: '地址',
}
