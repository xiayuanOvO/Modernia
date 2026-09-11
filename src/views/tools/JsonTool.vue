<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type Ref,
} from 'vue'
import { NSpace, NButton, useMessage } from 'naive-ui'
import { EditorView } from '@codemirror/view'
import { Compartment, EditorState, Prec } from '@codemirror/state'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { linter, lintKeymap } from '@codemirror/lint'
import { tags as t } from '@lezer/highlight'
import {
  foldAll,
  unfoldAll,
  foldGutter,
  foldKeymap,
  indentOnInput,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  HighlightStyle,
} from '@codemirror/language'
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  keymap,
} from '@codemirror/view'
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands'
import {
  closeBrackets,
  autocompletion,
  closeBracketsKeymap,
  completionKeymap,
} from '@codemirror/autocomplete'
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  search,
  highlightSelectionMatches,
  selectNextOccurrence,
  gotoLine,
} from '@codemirror/search'
import {
  createDebouncedStringSaver,
  loadPersistedString,
} from '../../utils/persist'

/** 实心三角折叠标记 */
function createFoldMarker(open: boolean) {
  const el = document.createElement('span')
  el.className = `cm-fold-marker ${open ? 'is-open' : 'is-closed'}`
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = open
    ? '<svg width="12" height="12" viewBox="0 0 12 12" focusable="false"><path fill="currentColor" d="M2.2 4.1h7.6L6 8.9z"/></svg>'
    : '<svg width="12" height="12" viewBox="0 0 12 12" focusable="false"><path fill="currentColor" d="M4.1 2.2v7.6L8.9 6z"/></svg>'
  return el
}

const message = useMessage()
const isDark = inject<Ref<boolean>>('isDark', ref(false))
const containerRef = ref<HTMLDivElement | null>(null)
const searchInputRef = ref<HTMLInputElement | null>(null)
const viewRef = shallowRef<EditorView | null>(null)
const themeCompartment = new Compartment()

const editorChrome = {
  '&': {
    height: '100%',
    fontSize: '13px',
  },
  '.cm-scroller': {
    fontFamily: "'IBM Plex Mono', 'SF Mono', Menlo, Consolas, monospace",
    lineHeight: '1.55',
  },
  '.cm-content': {
    padding: '12px 0',
  },
  '.cm-foldGutter': {
    width: '16px',
  },
  '.cm-fold-marker': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  '.cm-gutterElement': {
    userSelect: 'none',
    WebkitUserSelect: 'none',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-panels': {
    display: 'none',
  },
} as const

const darkHighlightStyle = HighlightStyle.define([
  { tag: t.propertyName, color: '#7dd3fc' },
  { tag: t.string, color: '#86efac' },
  { tag: t.number, color: '#fbbf24' },
  { tag: t.bool, color: '#c4b5fd' },
  { tag: t.null, color: '#c4b5fd' },
  { tag: t.keyword, color: '#c4b5fd' },
  { tag: t.punctuation, color: '#9ca3af' },
  { tag: t.bracket, color: '#d1d5db' },
  { tag: t.invalid, color: '#f87171' },
])

function editorThemeExtensions(dark: boolean) {
  if (dark) {
    return [
      EditorView.theme(
        {
          ...editorChrome,
          '&': {
            ...editorChrome['&'],
            color: '#e5e7eb',
            backgroundColor: '#14161a',
          },
          '.cm-gutters': {
            backgroundColor: '#12141a',
            border: 'none',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            color: '#6b7280',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          },
          '.cm-activeLineGutter': {
            backgroundColor: 'transparent',
            color: '#9ca3af',
          },
          '.cm-activeLine': {
            backgroundColor: 'rgba(47,111,237,0.14)',
          },
          '.cm-fold-marker': {
            ...editorChrome['.cm-fold-marker'],
            color: '#9ca3af',
          },
          '.cm-fold-marker:hover': {
            color: '#e5e7eb',
          },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'rgba(47,111,237,0.35) !important',
          },
          '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: '#e5e7eb',
          },
          '.cm-searchMatch': {
            backgroundColor: 'rgba(47,111,237,0.28)',
          },
          '.cm-searchMatch-selected': {
            backgroundColor: 'rgba(47,111,237,0.48)',
          },
        },
        { dark: true },
      ),
      syntaxHighlighting(darkHighlightStyle, { fallback: true }),
    ]
  }

  return [
    EditorView.theme({
      ...editorChrome,
      '&': {
        ...editorChrome['&'],
        color: '#1f2937',
        backgroundColor: '#fff',
      },
      '.cm-gutters': {
        backgroundColor: '#fafafa',
        border: 'none',
        borderRight: '1px solid rgba(0,0,0,0.06)',
        color: '#9ca3af',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'transparent',
        color: '#6b7280',
      },
      '.cm-activeLine': {
        backgroundColor: 'rgba(47,111,237,0.06)',
      },
      '.cm-fold-marker': {
        ...editorChrome['.cm-fold-marker'],
        color: '#6b7280',
      },
      '.cm-fold-marker:hover': {
        color: '#374151',
      },
      '.cm-searchMatch': {
        backgroundColor: 'rgba(47,111,237,0.18)',
      },
      '.cm-searchMatch-selected': {
        backgroundColor: 'rgba(47,111,237,0.38)',
      },
    }),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
  ]
}

const searchOpen = ref(false)
const searchText = ref('')
const matchCase = ref(false)
const wholeWord = ref(false)
const useRegexp = ref(false)
const matchTotal = ref(0)
const matchIndex = ref(0)

const matchLabel = computed(() => {
  if (!searchText.value) return ''
  if (matchTotal.value === 0) return '无结果'
  return `${matchIndex.value}/${matchTotal.value}`
})

const defaultJson = `{
  "hello": "world",
  "list": [1, 2, 3],
  "nested": {
    "ok": true,
    "name": "tools"
  }
}`

const initialText = loadPersistedString('tool.json.content', defaultJson)
const persistJson = createDebouncedStringSaver('tool.json.content')

function getText(): string {
  return viewRef.value?.state.doc.toString() ?? ''
}

function setText(value: string) {
  const view = viewRef.value
  if (!view) return
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: value },
  })
}

function formatJson() {
  try {
    setText(JSON.stringify(JSON.parse(getText()), null, 2))
    message.success('已格式化')
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'JSON 无效')
  }
}

function minifyJson() {
  try {
    setText(JSON.stringify(JSON.parse(getText())))
    message.success('已压缩')
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'JSON 无效')
  }
}

async function copyResult() {
  try {
    JSON.parse(getText())
    await navigator.clipboard.writeText(getText())
    message.success('已复制')
  } catch (e) {
    message.error(e instanceof Error ? e.message : 'JSON 无效，无法复制')
  }
}

function collapseAll() {
  const view = viewRef.value
  if (view) foldAll(view)
}

function expandAll() {
  const view = viewRef.value
  if (view) unfoldAll(view)
}

function buildQuery() {
  return new SearchQuery({
    search: searchText.value,
    caseSensitive: matchCase.value,
    wholeWord: wholeWord.value,
    regexp: useRegexp.value,
  })
}

function countMatches(view: EditorView, query: SearchQuery) {
  if (!query.search || !query.valid) {
    matchTotal.value = 0
    matchIndex.value = 0
    return
  }
  let total = 0
  let current = 0
  const cursor = query.getCursor(view.state)
  const head = view.state.selection.main.head
  for (let item = cursor.next(); !item.done; item = cursor.next()) {
    total += 1
    if (item.value.from <= head && item.value.to >= head) {
      current = total
    } else if (item.value.to <= head) {
      current = total
    }
  }
  matchTotal.value = total
  matchIndex.value = total === 0 ? 0 : Math.min(Math.max(current, 1), total)
}

function applySearchQuery(jumpToFirst = false) {
  const view = viewRef.value
  if (!view) return
  const query = buildQuery()
  view.dispatch({ effects: setSearchQuery.of(query) })
  if (jumpToFirst && query.search && query.valid) {
    findNext(view)
  }
  countMatches(view, query)
}

async function openSearch() {
  searchOpen.value = true
  const view = viewRef.value
  if (view) {
    const selected = view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to,
    )
    if (selected && !selected.includes('\n')) {
      searchText.value = selected
    }
  }
  await nextTick()
  searchInputRef.value?.focus()
  searchInputRef.value?.select()
  applySearchQuery(true)
}

function closeSearch() {
  searchOpen.value = false
  const view = viewRef.value
  if (!view) return
  view.dispatch({
    effects: setSearchQuery.of(new SearchQuery({ search: '' })),
  })
  matchTotal.value = 0
  matchIndex.value = 0
  view.focus()
}

function goNext() {
  const view = viewRef.value
  if (!view) return
  findNext(view)
  countMatches(view, buildQuery())
}

function goPrev() {
  const view = viewRef.value
  if (!view) return
  findPrevious(view)
  countMatches(view, buildQuery())
}

function onSearchKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    closeSearch()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) goPrev()
    else goNext()
  }
}

watch([searchText, matchCase, wholeWord, useRegexp], () => {
  if (!searchOpen.value) return
  applySearchQuery(true)
})

watch(isDark, (dark) => {
  const view = viewRef.value
  if (!view) return
  view.dispatch({
    effects: themeCompartment.reconfigure(editorThemeExtensions(dark)),
  })
})

onMounted(() => {
  if (!containerRef.value) return

  viewRef.value = new EditorView({
    parent: containerRef.value,
    state: EditorState.create({
      doc: initialText,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter({ markerDOM: createFoldMarker }),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        themeCompartment.of(editorThemeExtensions(isDark.value)),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        // 初始化搜索状态，但不使用默认面板
        search({
          top: true,
          createPanel: () => ({
            dom: document.createElement('div'),
            top: true,
            mount() {},
          }),
        }),
        Prec.highest(
          keymap.of([
            {
              key: 'Mod-f',
              run: () => {
                void openSearch()
                return true
              },
              preventDefault: true,
            },
            {
              key: 'F3',
              run: (view) => {
                if (!searchOpen.value) void openSearch()
                else {
                  findNext(view)
                  countMatches(view, buildQuery())
                }
                return true
              },
              shift: (view) => {
                if (!searchOpen.value) void openSearch()
                else {
                  findPrevious(view)
                  countMatches(view, buildQuery())
                }
                return true
              },
              preventDefault: true,
            },
            {
              key: 'Mod-g',
              run: (view) => {
                if (!searchOpen.value) void openSearch()
                else {
                  findNext(view)
                  countMatches(view, buildQuery())
                }
                return true
              },
              shift: (view) => {
                if (!searchOpen.value) void openSearch()
                else {
                  findPrevious(view)
                  countMatches(view, buildQuery())
                }
                return true
              },
              preventDefault: true,
            },
            {
              key: 'Escape',
              run: () => {
                if (searchOpen.value) {
                  closeSearch()
                  return true
                }
                return false
              },
            },
            { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
            { key: 'Mod-Alt-g', run: gotoLine },
          ]),
        ),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        json(),
        linter(jsonParseLinter()),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            persistJson.save(update.state.doc.toString())
          }
          if (!searchOpen.value) return
          if (update.docChanged || update.selectionSet) {
            countMatches(update.view, buildQuery())
          }
        }),
      ],
    }),
  })
})

onBeforeUnmount(() => {
  if (viewRef.value) {
    persistJson.flush(viewRef.value.state.doc.toString())
    viewRef.value.destroy()
  }
  viewRef.value = null
})
</script>

<template>
  <div class="tool-page" :class="{ 'is-dark': isDark }">
    <NSpace class="toolbar" style="margin-bottom: 12px" wrap>
      <NButton type="primary" @click="formatJson">格式化</NButton>
      <NButton @click="minifyJson">压缩</NButton>
      <NButton secondary @click="copyResult">复制</NButton>
      <NButton quaternary @click="collapseAll">全部折叠</NButton>
      <NButton quaternary @click="expandAll">全部展开</NButton>
    </NSpace>

    <div class="editor-shell">
      <div ref="containerRef" class="editor-host" />

      <div v-if="searchOpen" class="search-float" @mousedown.stop>
        <div class="search-field">
          <input
            ref="searchInputRef"
            v-model="searchText"
            class="search-input"
            type="text"
            placeholder="查找"
            @keydown="onSearchKeydown"
          />
          <div class="search-toggles">
            <button
              type="button"
              class="toggle"
              :class="{ on: matchCase }"
              title="区分大小写"
              @click="matchCase = !matchCase"
            >
              Aa
            </button>
            <button
              type="button"
              class="toggle"
              :class="{ on: wholeWord }"
              title="全词匹配"
              @click="wholeWord = !wholeWord"
            >
              ab
            </button>
            <button
              type="button"
              class="toggle"
              :class="{ on: useRegexp }"
              title="正则表达式"
              @click="useRegexp = !useRegexp"
            >
              .*
            </button>
          </div>
        </div>

        <span class="search-count">{{ matchLabel }}</span>

        <div class="search-actions">
          <button type="button" class="icon-btn" title="上一个" @click="goPrev">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M8 4.2 3.6 8.6l.9.9L8 6.4l3.5 3.1.9-.9z" />
            </svg>
          </button>
          <button type="button" class="icon-btn" title="下一个" @click="goNext">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path fill="currentColor" d="M8 11.8 12.4 7.4l-.9-.9L8 9.6 4.5 6.5l-.9.9z" />
            </svg>
          </button>
          <button type="button" class="icon-btn" title="关闭" @click="closeSearch">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path
                fill="currentColor"
                d="m8 7.1 3.2-3.2.9.9L8.9 8l3.2 3.2-.9.9L8 8.9l-3.2 3.2-.9-.9L7.1 8 3.9 4.8l.9-.9z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-page {
  max-width: 1100px;
  height: calc(100vh - 120px);
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.toolbar {
  user-select: none;
  -webkit-user-select: none;
}

.editor-shell {
  position: relative;
  flex: 1;
  min-height: 0;
}

.editor-host {
  height: 100%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.tool-page.is-dark .editor-host {
  background: #14161a;
  border-color: rgba(255, 255, 255, 0.08);
}

.editor-host :deep(.cm-editor) {
  height: 100%;
}

.search-float {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  user-select: none;
  -webkit-user-select: none;
}

.tool-page.is-dark .search-float {
  background: #1a1c22;
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

.search-field {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 220px;
  height: 28px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: #fff;
  color: #1f2937;
  padding: 0 86px 0 10px;
  outline: none;
  font-size: 13px;
  font-family: inherit;
}

.tool-page.is-dark .search-input {
  background: #14161a;
  border-color: rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
}

.search-input:focus {
  border-color: #2f6fed;
  box-shadow: 0 0 0 2px rgba(47, 111, 237, 0.18);
}

.search-input::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

.tool-page.is-dark .search-input::placeholder {
  color: rgba(255, 255, 255, 0.35);
}

.search-toggles {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 2px;
}

.toggle {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.45);
  width: 24px;
  height: 22px;
  border-radius: 6px;
  font-size: 11px;
  font-family: 'IBM Plex Mono', Menlo, Consolas, monospace;
  cursor: pointer;
  padding: 0;
}

.tool-page.is-dark .toggle {
  color: rgba(255, 255, 255, 0.45);
}

.toggle.on {
  color: #2f6fed;
  background: rgba(47, 111, 237, 0.12);
}

.tool-page.is-dark .toggle.on {
  background: rgba(47, 111, 237, 0.22);
}

.toggle:hover {
  background: rgba(0, 0, 0, 0.05);
}

.tool-page.is-dark .toggle:hover {
  background: rgba(255, 255, 255, 0.08);
}

.search-count {
  min-width: 52px;
  color: rgba(0, 0, 0, 0.5);
  font-size: 12px;
  white-space: nowrap;
}

.tool-page.is-dark .search-count {
  color: rgba(255, 255, 255, 0.5);
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: rgba(0, 0, 0, 0.55);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: grid;
  place-items: center;
  cursor: pointer;
  padding: 0;
}

.tool-page.is-dark .icon-btn {
  color: rgba(255, 255, 255, 0.55);
}

.icon-btn:hover {
  background: rgba(47, 111, 237, 0.1);
  color: #2f6fed;
}

.tool-page.is-dark .icon-btn:hover {
  background: rgba(47, 111, 237, 0.2);
}
</style>
