import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layout/AppLayout.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        {
          path: '',
          name: 'home',
          component: () => import('../views/HomeView.vue'),
          meta: { title: '概览' },
        },
        {
          path: 'tools/json',
          name: 'json',
          component: () => import('../views/tools/JsonTool.vue'),
          meta: { title: 'JSON 工具' },
        },
        {
          path: 'tools/diff',
          name: 'diff',
          component: () => import('../views/tools/DiffTool.vue'),
          meta: { title: '文本对比' },
        },
        {
          path: 'tools/base64',
          name: 'base64',
          component: () => import('../views/tools/Base64Tool.vue'),
          meta: { title: 'Base64' },
        },
        {
          path: 'tools/timestamp',
          name: 'timestamp',
          component: () => import('../views/tools/TimestampTool.vue'),
          meta: { title: '时间戳' },
        },
        {
          path: 'tools/hash',
          name: 'hash',
          component: () => import('../views/tools/HashTool.vue'),
          meta: { title: '哈希计算' },
        },
        {
          path: 'tools/fake-person',
          name: 'fake-person',
          component: () => import('../views/tools/FakePersonTool.vue'),
          meta: { title: '虚拟信息' },
        },
        {
          path: 'tools/apk',
          name: 'apk',
          component: () => import('../views/tools/ApkTool.vue'),
          meta: { title: 'APK 信息' },
        },
        {
          path: 'tools/currency',
          name: 'currency',
          component: () => import('../views/tools/CurrencyTool.vue'),
          meta: { title: '汇率换算' },
        },
        {
          path: 'tools/image',
          name: 'image',
          component: () => import('../views/tools/ImageTool.vue'),
          meta: { title: '图片压缩' },
        },
      ],
    },
  ],
})

export default router
