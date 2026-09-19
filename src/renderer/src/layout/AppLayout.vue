<script setup lang="ts">
import { computed, h, onMounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NConfigProvider,
  NLayout,
  NLayoutSider,
  NLayoutHeader,
  NLayoutContent,
  NMenu,
  NButton,
  NIcon,
  NText,
  NSpace,
  type MenuOption,
  darkTheme,
  type GlobalThemeOverrides,
} from 'naive-ui'
import {
  HomeOutline,
  CodeSlashOutline,
  GitCompareOutline,
  KeyOutline,
  TimeOutline,
  FingerPrintOutline,
  DocumentOutline,
  PersonOutline,
  PhonePortraitOutline,
  CashOutline,
  ImageOutline,
  CropOutline,
  SpeedometerOutline,
  HardwareChipOutline,
  DesktopOutline,
  QrCodeOutline,
  MenuOutline,
  SunnyOutline,
  MoonOutline,
  RefreshOutline,
} from '@vicons/ionicons5'
import { usePersistedRef } from '../utils/persist'
import { useFavorites } from '../composables/useFavorites'
import { toolIconMap } from '../config/toolIcons'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const isDark = usePersistedRef('ui.isDark', false)
const appVersion = ref('')
const checkingUpdate = ref(false)
const { favorites, favoriteTools } = useFavorites()

provide('isDark', isDark)

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as object) })
}

const homeMenuOption: MenuOption = {
  label: '概览',
  key: 'home',
  icon: renderIcon(HomeOutline),
}

const expandedMenuOptions: MenuOption[] = [
  {
    type: 'group',
    label: '文本处理',
    key: 'text',
    children: [
      {
        label: 'JSON 工具',
        key: 'json',
        icon: renderIcon(CodeSlashOutline),
      },
      {
        label: '文本对比',
        key: 'diff',
        icon: renderIcon(GitCompareOutline),
      },
    ],
  },
  {
    type: 'group',
    label: '编码转换',
    key: 'encode',
    children: [
      {
        label: 'Base64',
        key: 'base64',
        icon: renderIcon(KeyOutline),
      },
      {
        label: '时间戳',
        key: 'timestamp',
        icon: renderIcon(TimeOutline),
      },
      {
        label: '码生成解码',
        key: 'barcode',
        icon: renderIcon(QrCodeOutline),
      },
    ],
  },
  {
    type: 'group',
    label: '安全校验',
    key: 'security',
    children: [
      {
        label: '哈希计算',
        key: 'hash',
        icon: renderIcon(FingerPrintOutline),
      },
      {
        label: '文件哈希',
        key: 'file-hash',
        icon: renderIcon(DocumentOutline),
      },
    ],
  },
  {
    type: 'group',
    label: '数据生成',
    key: 'generate',
    children: [
      {
        label: '虚拟信息',
        key: 'fake-person',
        icon: renderIcon(PersonOutline),
      },
    ],
  },
  {
    type: 'group',
    label: '媒体处理',
    key: 'media',
    children: [
      {
        label: '图片压缩',
        key: 'image',
        icon: renderIcon(ImageOutline),
      },
      {
        label: '收款码裁剪',
        key: 'pay-qr-crop',
        icon: renderIcon(CropOutline),
      },
    ],
  },
  {
    type: 'group',
    label: 'Android',
    key: 'android',
    children: [
      {
        label: 'APK 信息',
        key: 'apk',
        icon: renderIcon(PhonePortraitOutline),
      },
    ],
  },
  {
    type: 'group',
    label: '生活实用',
    key: 'life',
    children: [
      {
        label: '汇率换算',
        key: 'currency',
        icon: renderIcon(CashOutline),
      },
      {
        label: '网络测速',
        key: 'speedtest',
        icon: renderIcon(SpeedometerOutline),
      },
      {
        label: '硬件报价',
        key: 'hardware-price',
        icon: renderIcon(HardwareChipOutline),
      },
      {
        label: '装机比价',
        key: 'pc-build',
        icon: renderIcon(DesktopOutline),
      },
    ],
  },
]

const homeMenuOptions = computed<MenuOption[]>(() => [homeMenuOption])

function buildFavoriteMenuItems(): MenuOption[] {
  const items: MenuOption[] = []
  for (const tool of favoriteTools.value) {
    const icon = toolIconMap[tool.key]
    if (!icon) continue
    items.push({
      label: tool.label,
      key: tool.key,
      icon: renderIcon(icon),
    })
  }
  return items
}

function filterGroupsByFavorites(groups: MenuOption[], favKeys: Set<string>): MenuOption[] {
  const next: MenuOption[] = []
  for (const option of groups) {
    if (option.type !== 'group' || !option.children) {
      next.push(option)
      continue
    }
    const children = option.children.filter((child) => !favKeys.has(String(child.key)))
    if (children.length === 0) continue
    next.push({ ...option, children })
  }
  return next
}

/** 收藏靠前；收起时去掉分组，只保留带图标的菜单项 */
const toolMenuOptions = computed<MenuOption[]>(() => {
  const favKeys = new Set(favorites.value)
  const favItems = buildFavoriteMenuItems()
  const restGroups = filterGroupsByFavorites(expandedMenuOptions, favKeys)

  if (!collapsed.value) {
    const favGroup: MenuOption[] =
      favItems.length > 0
        ? [
            {
              type: 'group',
              label: '收藏',
              key: 'favorites',
              children: favItems,
            },
          ]
        : []
    return [...favGroup, ...restGroups]
  }

  const flat: MenuOption[] = [...favItems]
  for (const option of restGroups) {
    if (option.type === 'group' && option.children) {
      flat.push(...option.children)
    } else {
      flat.push(option)
    }
  }
  return flat
})

const activeKey = computed(() => (route.name as string) || 'home')
const homeActiveKey = computed(() => (activeKey.value === 'home' ? 'home' : null))
const toolActiveKey = computed(() =>
  activeKey.value === 'home' ? null : activeKey.value,
)
const pageTitle = computed(() => (route.meta.title as string) || 'Modernia')

function handleMenuUpdate(key: string) {
  if (key === 'home') {
    router.push('/')
    return
  }
  router.push(`/tools/${key}`)
}

async function checkForUpdates() {
  if (!window.updateApi || checkingUpdate.value) return
  checkingUpdate.value = true
  try {
    await window.updateApi.check()
  } finally {
    checkingUpdate.value = false
  }
}

onMounted(async () => {
  if (!window.updateApi) return
  try {
    appVersion.value = await window.updateApi.getVersion()
  } catch {
    appVersion.value = ''
  }
})

const themeOverrides = computed<GlobalThemeOverrides>(() => ({
  common: {
    primaryColor: '#2F6FED',
    primaryColorHover: '#4B82F0',
    primaryColorPressed: '#1F54C7',
    borderRadius: '8px',
    fontFamily:
      '"IBM Plex Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    fontFamilyMono:
      '"IBM Plex Mono", "SF Mono", Menlo, Consolas, monospace',
  },
  Layout: {
    siderColor: isDark.value ? '#14161a' : '#f7f8fa',
  },
}))
</script>

<template>
  <NConfigProvider
    :theme="isDark ? darkTheme : null"
    :theme-overrides="themeOverrides"
  >
    <NLayout has-sider class="app-shell">
      <NLayoutSider
        bordered
        collapse-mode="width"
        :collapsed-width="64"
        :width="220"
        :collapsed="collapsed"
        :show-trigger="false"
        :native-scrollbar="false"
        content-style="height: 100%; overflow: hidden; display: flex; flex-direction: column;"
        class="app-sider"
        :class="{ collapsed }"
      >
        <div class="sider-body">
          <div class="sider-pin">
            <div class="brand" :class="{ collapsed }">
              <div class="brand-mark">
                <img src="/logo.png" alt="Modernia" />
              </div>
              <div v-if="!collapsed" class="brand-text">
                <div class="brand-name">Modernia</div>
              </div>
            </div>

            <NMenu
              class="home-menu"
              :collapsed="collapsed"
              :collapsed-width="64"
              :collapsed-icon-size="20"
              :options="homeMenuOptions"
              :value="homeActiveKey"
              @update:value="handleMenuUpdate"
            />
          </div>

          <div
            class="sider-scroll"
            :class="{ 'is-dark': isDark, collapsed }"
          >
            <NMenu
              :collapsed="collapsed"
              :collapsed-width="64"
              :collapsed-icon-size="20"
              :options="toolMenuOptions"
              :value="toolActiveKey"
              @update:value="handleMenuUpdate"
            />
          </div>
        </div>
      </NLayoutSider>

      <NLayout class="app-main">
        <NLayoutHeader bordered class="app-header">
          <NSpace align="center" justify="space-between" style="width: 100%">
            <NSpace align="center" :size="12">
              <NButton quaternary circle @click="collapsed = !collapsed">
                <template #icon>
                  <NIcon :component="MenuOutline" />
                </template>
              </NButton>
              <NText strong style="font-size: 16px">{{ pageTitle }}</NText>
            </NSpace>

            <NSpace align="center" :size="8">
              <NText v-if="appVersion" depth="3" style="font-size: 12px">
                v{{ appVersion }}
              </NText>
              <NButton
                quaternary
                circle
                title="检查更新"
                :loading="checkingUpdate"
                @click="checkForUpdates"
              >
                <template #icon>
                  <NIcon :component="RefreshOutline" />
                </template>
              </NButton>
              <NButton quaternary circle @click="isDark = !isDark">
                <template #icon>
                  <NIcon :component="isDark ? SunnyOutline : MoonOutline" />
                </template>
              </NButton>
            </NSpace>
          </NSpace>
        </NLayoutHeader>

        <NLayoutContent
          content-style="padding: 20px 24px; height: 100%"
          :native-scrollbar="false"
          class="app-content"
        >
          <router-view />
        </NLayoutContent>
      </NLayout>
    </NLayout>
  </NConfigProvider>
</template>

<style scoped>
.app-shell {
  height: 100vh;
  height: 100dvh;
}

.app-sider {
  user-select: none;
}

.app-sider :deep(.n-layout-sider-scroll-container),
.app-sider :deep(.n-scrollbar),
.app-sider :deep(.n-scrollbar-container),
.app-sider :deep(.n-scrollbar-content) {
  height: 100%;
  overflow: hidden !important;
}

.sider-body {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sider-pin {
  flex-shrink: 0;
}

.sider-scroll {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  background: inherit;
  scrollbar-width: thin;
  scrollbar-color: rgba(15, 23, 42, 0.18) transparent;
}

.sider-scroll.is-dark {
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}

.sider-scroll::-webkit-scrollbar {
  width: 4px;
}

.sider-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sider-scroll::-webkit-scrollbar-thumb {
  background: rgba(15, 23, 42, 0.16);
  border-radius: 999px;
}

.sider-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(15, 23, 42, 0.28);
}

.sider-scroll.is-dark::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
}

.sider-scroll.is-dark::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.26);
}

/* 收起：隐藏滚动条，避免占宽导致选中背景变窄 */
.sider-scroll.collapsed {
  scrollbar-width: none;
}

.sider-scroll.collapsed::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.home-menu {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--n-border-color);
}

/* 收起态兜底：即使仍有分组标题也不占位、不换行 */
.app-sider :deep(.n-menu--collapsed .n-menu-item-group-title) {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.brand.collapsed {
  justify-content: center;
  padding: 0;
}

.brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.brand-mark img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.brand-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.2;
}

.app-header {
  height: 56px;
  padding: 0 12px 0 8px;
  display: flex;
  align-items: center;
}

.app-content {
  background: transparent;
}
</style>
