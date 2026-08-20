import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { URL } from 'node:url'
import { resolveReturnTarget } from '../src/lib/navigation.ts'
import { scenes } from '../src/lib/timeline.ts'

const projectFile = (path) => new URL(`../${path}`, import.meta.url)

test('every public media asset exists and matches its cache fingerprint', async () => {
  const assets = scenes.flatMap(({ desktop, mobile, poster }) => [desktop, mobile, poster])
  assets.push('og.b6787d5b.jpg')

  for (const asset of assets) {
    const fingerprint = asset.match(/\.([a-f0-9]{8})\.[^.]+$/)?.[1]
    assert.ok(fingerprint, `${asset} has no cache fingerprint`)
    const content = await readFile(projectFile(`public/${asset}`))
    const actual = createHash('sha256').update(content).digest('hex').slice(0, 8)
    assert.equal(actual, fingerprint, `${asset} fingerprint is stale`)
  }
})

test('deployment is pinned to Node 24 and current Pages actions', async () => {
  const [workflow, nvmrc] = await Promise.all([
    readFile(projectFile('.github/workflows/deploy.yml'), 'utf8'),
    readFile(projectFile('.nvmrc'), 'utf8'),
  ])

  assert.equal(nvmrc.trim(), '24')
  assert.match(workflow, /node-version: 24/)
  assert.match(workflow, /actions\/checkout@v6/)
  assert.match(workflow, /actions\/configure-pages@v6/)
  assert.match(workflow, /actions\/upload-pages-artifact@v4/)
  assert.match(workflow, /actions\/deploy-pages@v5/)
  assert.match(workflow, /VITE_SITE_URL: \$\{\{ steps\.pages\.outputs\.base_url \}\}/)
})

test('share metadata uses the deployment URL and an absolute social image', async () => {
  const html = await readFile(projectFile('index.html'), 'utf8')
  assert.match(html, /rel="canonical" href="__SITE_URL__"/)
  assert.match(html, /property="og:url" content="__SITE_URL__"/)
  assert.match(html, /property="og:image" content="__SITE_URL__og\.[a-f0-9]{8}\.jpg"/)
  assert.match(html, /property="og:image:alt"/)
})

test('return navigation accepts safe targets and rejects ambiguous ones', () => {
  const current = 'https://example.com/veil/'
  assert.equal(resolveReturnTarget('../', '', current), 'https://example.com/')
  assert.equal(resolveReturnTarget('javascript:alert(1)', 'https://example.com/work/', current), 'https://example.com/work/')
  assert.equal(resolveReturnTarget(current, current, current), null)
  assert.equal(resolveReturnTarget('', '', current), null)
})
