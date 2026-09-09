<script setup lang="ts">
import { computed, h, ref } from 'vue'
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
  KeyOutline,
  TimeOutline,
  FingerPrintOutline,
  PersonOutline,
  PhonePortraitOutline,
  MenuOutline,
  SunnyOutline,
  MoonOutline,
} from '@vicons/ionicons5'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const isDark = ref(false)

function renderIcon(icon: unknown) {
  return () => h(NIcon, null, { default: () => h(icon as object) })
}

const expandedMenuOptions: MenuOption[] = [
  {
    label: '概览',
    key: 'home',
    icon: renderIcon(HomeOutline),
  },
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
]

/** 收起时去掉分组，只保留带图标的菜单项，避免分组标题挤成竖排 */
const menuOptions = computed<MenuOption[]>(() => {
  if (!collapsed.value) return expandedMenuOptions

  const flat: MenuOption[] = []
  for (const option of expandedMenuOptions) {
    if (option.type === 'group' && option.children) {
      flat.push(...option.children)
    } else {
      flat.push(option)
    }
  }
  return flat
})

const activeKey = computed(() => (route.name as string) || 'home')
const pageTitle = computed(() => (route.meta.title as string) || 'Modernia')

function handleMenuUpdate(key: string) {
  if (key === 'home') {
    router.push('/')
    return
  }
  router.push(`/tools/${key}`)
}

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
        show-trigger
        @collapse="collapsed = true"
        @expand="collapsed = false"
        :native-scrollbar="false"
        class="app-sider"
      >
        <div class="brand" :class="{ collapsed }">
          <div class="brand-mark">
            <img src="/logo.png" alt="Modernia" />
          </div>
          <div v-if="!collapsed" class="brand-text">
            <div class="brand-name">Modernia</div>
          </div>
        </div>

        <NMenu
          :collapsed="collapsed"
          :collapsed-width="64"
          :collapsed-icon-size="20"
          :options="menuOptions"
          :value="activeKey"
          @update:value="handleMenuUpdate"
        />
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

            <NButton quaternary circle @click="isDark = !isDark">
              <template #icon>
                <NIcon :component="isDark ? SunnyOutline : MoonOutline" />
              </template>
            </NButton>
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
