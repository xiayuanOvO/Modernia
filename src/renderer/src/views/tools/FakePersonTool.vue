<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NInputNumber,
  NSelect,
  NSpace,
  NDataTable,
  NTabPane,
  NTabs,
  NText,
  useMessage,
  type DataTableColumns,
} from 'naive-ui'
import {
  FIELD_LABELS,
  generateFakePeople,
  generateFakePerson,
  type FakePerson,
  type Gender,
} from '../../utils/fakePerson'

const message = useMessage()

const gender = ref<Gender | '随机'>('随机')
const minAge = ref(18)
const maxAge = ref(45)
const count = ref(1)
const current = ref<FakePerson | null>(null)
const list = ref<FakePerson[]>([])

const genderOptions = [
  { label: '随机', value: '随机' },
  { label: '男', value: '男' },
  { label: '女', value: '女' },
]

const fieldEntries = computed(() => {
  if (!current.value) return []
  return (Object.keys(FIELD_LABELS) as (keyof FakePerson)[]).map((key) => ({
    key,
    label: FIELD_LABELS[key],
    value: String(current.value![key]),
  }))
})

const columns: DataTableColumns<FakePerson> = [
  { title: '姓名', key: 'name', width: 90 },
  { title: '性别', key: 'gender', width: 60 },
  { title: '年龄', key: 'age', width: 60 },
  { title: '出生日期', key: 'birthday', width: 120 },
  { title: '身份证号', key: 'idCard', width: 190, ellipsis: { tooltip: true } },
  { title: '银行卡号', key: 'bankCard', width: 190, ellipsis: { tooltip: true } },
  { title: '开户银行', key: 'bankName', width: 120 },
  { title: '手机号', key: 'mobile', width: 120 },
  { title: '地址', key: 'address', ellipsis: { tooltip: true } },
]

function options() {
  return {
    gender: gender.value,
    minAge: minAge.value,
    maxAge: maxAge.value,
    count: count.value,
  }
}

function generate() {
  if (minAge.value > maxAge.value) {
    message.warning('最小年龄不能大于最大年龄')
    return
  }
  if (count.value === 1) {
    current.value = generateFakePerson(options())
    list.value = [current.value]
  } else {
    list.value = generateFakePeople(options())
    current.value = list.value[0] ?? null
  }
  message.success(`已生成 ${list.value.length} 条`)
}

async function copyField(value: string, label: string) {
  await navigator.clipboard.writeText(value)
  message.success(`已复制${label}`)
}

async function copyAll() {
  if (!current.value) return
  const text = fieldEntries.value.map((f) => `${f.label}：${f.value}`).join('\n')
  await navigator.clipboard.writeText(text)
  message.success('已复制全部字段')
}

async function copyJson() {
  const data = list.value.length > 1 ? list.value : current.value
  if (!data) return
  await navigator.clipboard.writeText(JSON.stringify(data, null, 2))
  message.success('已复制 JSON')
}

onMounted(generate)
</script>

<template>
  <div class="tool-page">
    <NAlert type="warning" :bordered="false" style="margin-bottom: 16px">
      生成的是虚拟测试数据，身份证/银行卡仅保证格式与校验位合法，不可用于实名认证或真实业务。
    </NAlert>

    <NCard size="small" style="margin-bottom: 16px">
      <NSpace align="center" wrap>
        <div class="field">
          <NText depth="3" class="label">性别</NText>
          <NSelect v-model:value="gender" :options="genderOptions" style="width: 100px" />
        </div>
        <div class="field">
          <NText depth="3" class="label">年龄</NText>
          <NSpace :size="6" align="center">
            <NInputNumber v-model:value="minAge" :min="1" :max="100" style="width: 88px" />
            <span>–</span>
            <NInputNumber v-model:value="maxAge" :min="1" :max="100" style="width: 88px" />
          </NSpace>
        </div>
        <div class="field">
          <NText depth="3" class="label">数量</NText>
          <NInputNumber v-model:value="count" :min="1" :max="100" style="width: 88px" />
        </div>
        <NButton type="primary" @click="generate">重新生成</NButton>
        <NButton secondary :disabled="!current" @click="copyAll">复制当前</NButton>
        <NButton secondary :disabled="!list.length" @click="copyJson">复制 JSON</NButton>
      </NSpace>
    </NCard>

    <NTabs type="line" animated>
      <NTabPane name="detail" tab="详情">
        <NDescriptions
          v-if="current"
          bordered
          :column="1"
          label-placement="left"
          size="small"
          class="desc"
        >
          <NDescriptionsItem v-for="item in fieldEntries" :key="item.key" :label="item.label">
            <div class="row">
              <span class="mono">{{ item.value }}</span>
              <NButton text type="primary" size="tiny" @click="copyField(item.value, item.label)">
                复制
              </NButton>
            </div>
          </NDescriptionsItem>
        </NDescriptions>
      </NTabPane>

      <NTabPane name="table" tab="列表" :disabled="list.length === 0">
        <NDataTable
          :columns="columns"
          :data="list"
          :bordered="true"
          :single-line="false"
          size="small"
          :max-height="480"
        />
      </NTabPane>
    </NTabs>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 1100px;
}

.field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label {
  font-size: 13px;
  white-space: nowrap;
}

.desc {
  max-width: 720px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.mono {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 13px;
  word-break: break-all;
}
</style>
