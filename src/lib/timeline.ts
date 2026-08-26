import { clamp } from './math.ts'

export type SceneId = 'threshold' | 'descent' | 'unbound' | 'arrival'

export interface Scene {
  id: SceneId
  index: string
  label: string
  start: number
  end: number
  poster: string
}

export const FRAME_RATE = 24
export const SCENE_DURATION = 10
export const SAFE_SCENE_DURATION = SCENE_DURATION - 1 / FRAME_RATE
export const MASTER_DURATION = SCENE_DURATION * 4
export const SAFE_MASTER_DURATION = MASTER_DURATION - 1 / FRAME_RATE
export const MASTER_VIDEO = {
  desktop: 'media/veil-master-desktop.51bbf95a.mp4',
  mobile: 'media/veil-master-mobile.fbd2e906.mp4',
} as const
const SEAMS = [0.248, 0.49, 0.756] as const

export const scenes: readonly Scene[] = [
  {
    id: 'threshold', index: '01', label: 'Threshold', start: 0, end: SEAMS[0],
    poster: 'media/poster-start.46142d5f.webp',
  },
  {
    id: 'descent', index: '02', label: 'Descent', start: SEAMS[0], end: SEAMS[1],
    poster: 'media/poster-depth.6147eb7b.webp',
  },
  {
    id: 'unbound', index: '03', label: 'Unbound', start: SEAMS[1], end: SEAMS[2],
    poster: 'media/poster-break.9f522860.webp',
  },
  {
    id: 'arrival', index: '04', label: 'Arrival', start: SEAMS[2], end: 1,
    poster: 'media/poster-arrival.a6c102f3.webp',
  },
] as const

export const sceneLocalProgress = (scene: Scene, progress: number) =>
  clamp((progress - scene.start) / (scene.end - scene.start))

export const sceneTime = (scene: Scene, progress: number) =>
  sceneLocalProgress(scene, progress) * SAFE_SCENE_DURATION

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

export const masterTime = (progress: number) => {
  const sceneIndex = dominantSceneIndex(progress)
  return Math.min(
    sceneIndex * SCENE_DURATION + sceneTime(scenes[sceneIndex], progress),
    SAFE_MASTER_DURATION,
  )
}
