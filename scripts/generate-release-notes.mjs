#!/usr/bin/env node
/**
 * 根据 git commit 生成 Release 说明。
 *
 * 约定（仅收录此类 commit）：
 *   【新增】【Base64】支持图片转换
 *   【优化】【侧边栏】优化部分细节
 *   【修复】【收藏】置顶失效
 *
 * 输出：
 *   ### 新增功能：
 *   【Base64】支持图片转换
 *
 *   ### 体验优化：
 *   【侧边栏】优化部分细节
 *
 * 用法：node scripts/generate-release-notes.mjs [git-revision-range]
 * 默认范围：上一 tag .. HEAD
 */

import { execSync } from 'node:child_process'

/** commit 分类 → Release 标题（顺序即展示顺序） */
const CATEGORY_TITLES = {
  新增: '新增功能',
  修复: '问题修复',
  优化: '体验优化',
}

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim()
}

function defaultRange() {
  try {
    const prev = sh('git describe --tags --abbrev=0 HEAD^')
    return `${prev}..HEAD`
  } catch {
    return 'HEAD'
  }
}

function listCommits(range) {
  const format = '%s'
  const raw =
    range === 'HEAD'
      ? sh(`git log -1 --format=${format}`)
      : sh(`git log ${range} --no-merges --format=${format}`)
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 【分类】【模块】描述 */
function parseCommit(subject) {
  const m = subject.match(/^【([^】]+)】【([^】]+)】(.*)$/)
  if (!m) return null
  const category = m[1].trim()
  const module = m[2].trim()
  const desc = m[3].trim()
  if (!category || !module) return null
  const line = desc ? `【${module}】${desc}` : `【${module}】`
  return { category, line }
}

function titleFor(category) {
  return CATEGORY_TITLES[category] ?? category
}

function buildNotes(commits) {
  /** @type {Map<string, string[]>} */
  const groups = new Map()

  for (const subject of commits) {
    const parsed = parseCommit(subject)
    if (!parsed) continue
    const { category, line } = parsed
    if (!groups.has(category)) groups.set(category, [])
    const list = groups.get(category)
    if (!list.includes(line)) list.push(line)
  }

  if (groups.size === 0) return '无符合约定的变更说明'

  const known = Object.keys(CATEGORY_TITLES)
  const categories = [
    ...known.filter((c) => groups.has(c)),
    ...[...groups.keys()].filter((c) => !known.includes(c)).sort(),
  ]

  const parts = []
  for (const category of categories) {
    const lines = groups.get(category)
    if (!lines?.length) continue
    parts.push(`### ${titleFor(category)}：`)
    for (const line of lines) {
      parts.push(line)
    }
    parts.push('')
  }

  return parts.join('\n').trimEnd()
}

const range = process.argv[2] || defaultRange()
const commits = listCommits(range)
process.stdout.write(`${buildNotes(commits)}\n`)
