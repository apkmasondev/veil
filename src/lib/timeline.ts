import { clamp } from './math.ts'

export type SceneId = 'threshold' | 'descent' | 'unbound' | 'arrival'

export interface Scene {
  id: SceneId
  index: string
  label: string
  start: number
  end: number
  desktop: string
  mobile: string
  poster: string
}

export const FRAME_RATE = 24
export const SAFE_DURATION = 10 - 1 / FRAME_RATE
const SEAMS = [0.248, 0.49, 0.756] as const

export const scenes: readonly Scene[] = [
  {
    id: 'threshold', index: '01', label: 'Threshold', start: 0, end: SEAMS[0],
    desktop: 'media/veil-01-desktop.20f9a578.mp4', mobile: 'media/veil-01-mobile.6464021e.mp4',
    poster: 'media/poster-start.46142d5f.webp',
  },
  {
    id: 'descent', index: '02', label: 'Descent', start: SEAMS[0], end: SEAMS[1],
    desktop: 'media/veil-02-desktop.02670b5d.mp4', mobile: 'media/veil-02-mobile.c764c0fd.mp4',
    poster: 'media/poster-depth.6147eb7b.webp',
  },
  {
    id: 'unbound', index: '03', label: 'Unbound', start: SEAMS[1], end: SEAMS[2],
    desktop: 'media/veil-03-desktop.6205aed4.mp4', mobile: 'media/veil-03-mobile.b173f1c7.mp4',
    poster: 'media/poster-break.9f522860.webp',
  },
  {
    id: 'arrival', index: '04', label: 'Arrival', start: SEAMS[2], end: 1,
    desktop: 'media/veil-04-desktop.cbf8801b.mp4', mobile: 'media/veil-04-mobile.8791474e.mp4',
    poster: 'media/poster-arrival.a6c102f3.webp',
  },
] as const

export const sceneLocalProgress = (scene: Scene, progress: number) =>
  clamp((progress - scene.start) / (scene.end - scene.start))

export const sceneTime = (scene: Scene, progress: number) =>
  sceneLocalProgress(scene, progress) * SAFE_DURATION

export const sceneOpacity = (scene: Scene, sceneIndex: number, progress: number) => {
  if (progress < scene.start) return 0
  if (sceneIndex === scenes.length - 1) return 1
  return progress < scene.end ? 1 : 0
}

export const dominantSceneIndex = (progress: number) => {
  let bestIndex = 0
  let bestOpacity = -1
  scenes.forEach((scene, index) => {
    const opacity = sceneOpacity(scene, index, progress)
    if (opacity > bestOpacity) {
      bestOpacity = opacity
      bestIndex = index
    }
  })
  return bestIndex
}
