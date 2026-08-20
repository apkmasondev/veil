import test from 'node:test'
import assert from 'node:assert/strict'
import {
  dominantSceneIndex,
  SAFE_DURATION,
  sceneOpacity,
  scenes,
  sceneTime,
} from '../src/lib/timeline.ts'

test('timeline covers the whole journey without a visible gap', () => {
  for (let step = 0; step <= 1000; step += 1) {
    const progress = step / 1000
    const strongest = Math.max(...scenes.map((scene, index) => sceneOpacity(scene, index, progress)))
    assert.equal(strongest, 1, `no layer fully covered the stage at ${progress}`)
  }
})

test('each seam is an opaque cut with exactly one visible media layer', () => {
  for (let step = 0; step <= 10000; step += 1) {
    const progress = step / 10000
    const visible = scenes.filter((scene, index) => sceneOpacity(scene, index, progress) > 0)
    assert.equal(visible.length, 1, `unexpected overlap at ${progress}`)
  }
})

test('adjacent scenes share an exact boundary without a timeline gap', () => {
  for (let index = 1; index < scenes.length; index += 1) {
    assert.equal(scenes[index - 1].end, scenes[index].start)
  }
})

test('video time is clamped to the final safe frame in both directions', () => {
  assert.equal(sceneTime(scenes[0], -1), 0)
  assert.equal(sceneTime(scenes.at(-1), 2), SAFE_DURATION)
})

test('dominant scene resolves the opening, breakthrough and arrival', () => {
  assert.equal(dominantSceneIndex(0), 0)
  assert.equal(dominantSceneIndex(0.62), 2)
  assert.equal(dominantSceneIndex(1), 3)
})

test('desktop and mobile assets are distinct and production-addressable', () => {
  for (const scene of scenes) {
    assert.notEqual(scene.desktop, scene.mobile)
    assert.match(scene.desktop, /^media\/.+-desktop\.[a-f0-9]{8}\.mp4$/)
    assert.match(scene.mobile, /^media\/.+-mobile\.[a-f0-9]{8}\.mp4$/)
    assert.match(scene.poster, /^media\/poster-.+\.[a-f0-9]{8}\.webp$/)
  }
})
