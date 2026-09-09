<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NSpace,
  NSpin,
  NText,
  useMessage,
} from 'naive-ui'

interface ApkCertInfo {
  subject: string
  issuer: string
  serialNumber: string
  validFrom: string
  validUntil: string
  signatureType: string
  md5: string
  sha1: string
  sha256: string
}

interface ApkSignatureInfo {
  type: string
  typeLabel: string
  certificates: ApkCertInfo[]
}

interface ApkParseResult {
  fileName: string
  filePath: string
  packageName: string
  appName: string
  versionName: string
  versionCode: number
  minSdkVersion: string
  targetSdkVersion: string
  signatures: ApkSignatureInfo[]
}

const message = useMessage()
const loading = ref(false)
const error = ref('')
const result = ref<ApkParseResult | null>(null)
const dragging = ref(false)

const basicFields = computed(() => {
  if (!result.value) return []
  const r = result.value
  return [
    { label: '应用名称', value: r.appName || '—' },
    { label: '包名', value: r.packageName },
    { label: '版本名', value: r.versionName || '—' },
    { label: '版本号', value: String(r.versionCode ?? '—') },
    { label: 'Min SDK', value: r.minSdkVersion || '—' },
    { label: 'Target SDK', value: r.targetSdkVersion || '—' },
    { label: '文件', value: r.fileName },
  ]
})

async function selectApk() {
  if (!window.apkApi) {
    message.error('当前环境不支持选择本地文件（需在 Electron 中运行）')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await window.apkApi.selectAndParse()
    if ('canceled' in res && res.canceled) return
    if ('error' in res && res.error) {
      error.value = res.error
      result.value = null
      return
    }
    if ('data' in res && res.data) {
      result.value = res.data
      message.success('解析完成')
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
    result.value = null
  } finally {
    loading.value = false
  }
}

async function parseDroppedPath(filePath: string) {
  if (!window.apkApi) {
    message.error('当前环境不支持解析本地 APK（需在 Electron 中运行）')
    return
  }
  loading.value = true
  error.value = ''
  try {
    const res = await window.apkApi.parsePath(filePath)
    if ('error' in res) {
      error.value = res.error
      result.value = null
      return
    }
    result.value = res.data
    message.success('解析完成')
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
    result.value = null
  } finally {
    loading.value = false
  }
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0] as (File & { path?: string }) | undefined
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.apk')) {
    message.warning('请拖入 .apk 文件')
    return
  }
  if (!file.path) {
    message.error('无法读取文件路径，请改用「选择 APK」')
    return
  }
  void parseDroppedPath(file.path)
}

async function copyText(text: string, label: string) {
  await navigator.clipboard.writeText(text)
  message.success(`已复制${label}`)
}

async function copyAll() {
  if (!result.value) return
  const lines = basicFields.value.map((f) => `${f.label}：${f.value}`)
  for (const sig of result.value.signatures) {
    lines.push('', `签名方案：${sig.typeLabel}`)
    sig.certificates.forEach((cert, i) => {
      lines.push(
        `证书 ${i + 1}`,
        `Subject：${cert.subject}`,
        `Issuer：${cert.issuer}`,
        `MD5：${cert.md5}`,
        `SHA1：${cert.sha1}`,
        `SHA256：${cert.sha256}`,
      )
    })
  }
  await navigator.clipboard.writeText(lines.join('\n'))
  message.success('已复制全部信息')
}
</script>

<template>
  <div class="tool-page">
    <NSpace style="margin-bottom: 16px">
      <NButton type="primary" :loading="loading" @click="selectApk">选择 APK</NButton>
      <NButton secondary :disabled="!result" @click="copyAll">复制全部</NButton>
    </NSpace>

    <div
      class="dropzone"
      :class="{ dragging, disabled: loading }"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop="onDrop"
    >
      <NText depth="3">将 .apk 拖到此处，或点击上方按钮选择文件</NText>
    </div>

    <NSpin :show="loading">
      <NAlert v-if="error" type="error" style="margin: 16px 0" :title="error" />

      <template v-if="result">
        <NCard title="基本信息" size="small" style="margin-top: 16px">
          <NDescriptions bordered :column="1" label-placement="left" size="small">
            <NDescriptionsItem v-for="item in basicFields" :key="item.label" :label="item.label">
              <div class="row">
                <span class="mono">{{ item.value }}</span>
                <NButton
                  v-if="item.value && item.value !== '—'"
                  text
                  type="primary"
                  size="tiny"
                  @click="copyText(item.value, item.label)"
                >
                  复制
                </NButton>
              </div>
            </NDescriptionsItem>
          </NDescriptions>
        </NCard>

        <NCard
          v-for="(sig, si) in result.signatures"
          :key="`${sig.type}-${si}`"
          size="small"
          style="margin-top: 16px"
          :title="`签名 · ${sig.typeLabel}`"
        >
          <div v-for="(cert, ci) in sig.certificates" :key="ci" class="cert">
            <NText v-if="sig.certificates.length > 1" strong>证书 {{ ci + 1 }}</NText>
            <NDescriptions bordered :column="1" label-placement="left" size="small">
              <NDescriptionsItem label="Subject">
                <div class="row">
                  <span class="mono">{{ cert.subject }}</span>
                  <NButton text type="primary" size="tiny" @click="copyText(cert.subject, 'Subject')">
                    复制
                  </NButton>
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="Issuer">
                <span class="mono">{{ cert.issuer }}</span>
              </NDescriptionsItem>
              <NDescriptionsItem label="有效期">
                {{ cert.validFrom }} 至 {{ cert.validUntil }}
              </NDescriptionsItem>
              <NDescriptionsItem label="算法">{{ cert.signatureType }}</NDescriptionsItem>
              <NDescriptionsItem label="MD5">
                <div class="row">
                  <span class="mono">{{ cert.md5 }}</span>
                  <NButton text type="primary" size="tiny" @click="copyText(cert.md5, 'MD5')">
                    复制
                  </NButton>
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="SHA1">
                <div class="row">
                  <span class="mono">{{ cert.sha1 }}</span>
                  <NButton text type="primary" size="tiny" @click="copyText(cert.sha1, 'SHA1')">
                    复制
                  </NButton>
                </div>
              </NDescriptionsItem>
              <NDescriptionsItem label="SHA256">
                <div class="row">
                  <span class="mono">{{ cert.sha256 }}</span>
                  <NButton text type="primary" size="tiny" @click="copyText(cert.sha256, 'SHA256')">
                    复制
                  </NButton>
                </div>
              </NDescriptionsItem>
            </NDescriptions>
          </div>
        </NCard>

        <NAlert
          v-if="result.signatures.length === 0"
          type="warning"
          style="margin-top: 16px"
          title="未解析到签名证书（可能未签名或签名格式不受支持）"
        />
      </template>
    </NSpin>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 860px;
}

.dropzone {
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 10px;
  padding: 28px 16px;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.dropzone.dragging {
  border-color: #2f6fed;
  background: rgba(47, 111, 237, 0.06);
}

.dropzone.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.mono {
  font-family: 'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace;
  font-size: 12px;
  word-break: break-all;
  line-height: 1.5;
}

.cert + .cert {
  margin-top: 16px;
}
</style>
