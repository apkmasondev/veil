import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clamp, lerp, smoothstep } from './lib/math'
import { resolveReturnTarget } from './lib/navigation'
import {
  dominantSceneIndex,
  FRAME_RATE,
  sceneLocalProgress,
  sceneOpacity,
  scenes,
  sceneTime,
} from './lib/timeline'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path}`

const getInitialProfile = () => ({
  mobile: window.matchMedia(
    '(max-width: 760px), (max-width: 1024px) and (max-height: 600px)',
  ).matches,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
})

function PortalGlyph() {
  return (
    <svg viewBox="0 0 80 80" aria-hidden="true" className="portal-glyph">
      <path className="portal-glyph__orbit portal-glyph__orbit--outer" d="M40 5C58 8 72 22 74 40C70 59 59 70 40 75C21 72 9 59 6 40C10 21 22 9 40 5Z" />
      <path className="portal-glyph__orbit portal-glyph__orbit--inner" d="M40 17C51 19 61 28 63 40C60 52 52 60 40 63C28 60 20 52 17 40C20 28 29 20 40 17Z" />
      <path className="portal-glyph__axis" d="M40 2V78M2 40H78" />
      <circle cx="40" cy="40" r="2.5" className="portal-glyph__core" />
    </svg>
  )
}

function DepthTraceGlyph() {
  return (
    <svg viewBox="0 0 52 120" aria-hidden="true" className="depth-glyph">
      <path className="depth-glyph__ghost" d="M26 3C9 18 42 27 24 42C8 55 41 65 25 80C11 93 34 104 26 117" />
      <path className="depth-glyph__path" d="M26 3C9 18 42 27 24 42C8 55 41 65 25 80C11 93 34 104 26 117" />
      <path className="depth-glyph__axis" d="M7 3H45M7 117H45" />
      <circle className="depth-glyph__seed" cx="26" cy="3" r="2.4" />
    </svg>
  )
}

function StoryLayer({ id, bind }: { id: string; bind: (node: HTMLDivElement | null) => void }) {
  if (id === 'threshold') {
    return (
      <div ref={bind} className="story story--threshold" aria-hidden="true">
        <p className="story__eyebrow">The edge</p>
        <h1 className="story__title">does not<br /><i>end here</i></h1>
      </div>
    )
  }
  if (id === 'descent') {
    return (
      <div ref={bind} className="story story--descent" aria-hidden="true">
        <p className="story__eyebrow">Below the known</p>
        <h2 className="story__title">Depth learns<br /><i>your shape</i></h2>
      </div>
    )
  }
  if (id === 'unbound') {
    return (
      <div ref={bind} className="story story--unbound" aria-hidden="true">
        <h2 className="story__title story__title--split">
          <span className="story__word story__word--form">Form</span>
          <span className="story__word story__word--gives">gives way</span>
        </h2>
      </div>
    )
  }
  return (
    <div ref={bind} className="story story--arrival" aria-hidden="true">
      <p className="story__eyebrow">The far side</p>
      <h2 className="story__title">remembers<br /><i>you</i></h2>
    </div>
  )
}

export function App() {
  const profile = useMemo(() => getInitialProfile(), [])
  const initialProgress = useMemo(() => {
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    return clamp(window.scrollY / max)
  }, [])
  const criticalScene = useMemo(() => dominantSceneIndex(initialProgress), [initialProgress])
  const [ready, setReady] = useState(profile.reducedMotion)
  const [useStills, setUseStills] = useState(profile.reducedMotion)
  const [loadFailed, setLoadFailed] = useState(false)
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([])
  const mediaRefs = useRef<(HTMLElement | null)[]>([])
  const frameCanvasRef = useRef<HTMLCanvasElement>(null)
  const frameContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const desiredSceneRef = useRef(criticalScene)
  const desiredTimesRef = useRef(scenes.map((scene) => sceneTime(scene, initialProgress)))
  const paintedFrameRef = useRef({ scene: -1, time: -1 })
  const storyRefs = useRef<(HTMLDivElement | null)[]>([])
  const loaded = useRef(new Set<number>())
  const failedVideos = useRef(new Set<number>())
  const loadedRequested = useRef(new Set<number>())
  const chapterIndexRef = useRef<HTMLSpanElement>(null)
  const chapterLabelRef = useRef<HTMLSpanElement>(null)
  const finalRef = useRef<HTMLDivElement>(null)
  const introCueRef = useRef<HTMLDivElement>(null)
  const traceRef = useRef<HTMLDivElement>(null)
  const traceValueRef = useRef<HTMLSpanElement>(null)
  const finalActionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const returnTarget = useMemo(
    () => resolveReturnTarget(
      import.meta.env.VITE_PORTFOLIO_URL,
      document.referrer,
      window.location.href,
    ),
    [],
  )

  const paintVideoFrame = useCallback((index: number, video: HTMLVideoElement) => {
    const canvas = frameCanvasRef.current
    if (
      useStills ||
      !canvas ||
      index !== desiredSceneRef.current ||
      video.seeking ||
      video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
      video.videoWidth === 0 ||
      video.videoHeight === 0
    ) return false

    const desired = desiredTimesRef.current[index]
    const tolerance = profile.mobile ? 0.17 : 0.13
    if (Math.abs(video.currentTime - desired) > tolerance) return false

    const painted = paintedFrameRef.current
    if (painted.scene === index && Math.abs(painted.time - video.currentTime) < 1 / (FRAME_RATE * 2)) {
      return true
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      frameContextRef.current = null
    }
    const context = frameContextRef.current ?? canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
    })
    if (!context) return false
    frameContextRef.current = context
    context.drawImage(video, 0, 0, canvas.width, canvas.height)
    canvas.dataset.scene = scenes[index].id
    canvas.dataset.time = video.currentTime.toFixed(3)
    canvas.hidden = false
    paintedFrameRef.current = { scene: index, time: video.currentTime }
    return true
  }, [profile.mobile, useStills])

  const markLoaded = useCallback((index: number) => {
    failedVideos.current.delete(index)
    loaded.current.add(index)
    if (index === criticalScene) setReady(true)
  }, [criticalScene])

  const retry = useCallback(() => {
    setLoadFailed(false)
    failedVideos.current.delete(criticalScene)
    const video = videoRefs.current[criticalScene]
    if (video) {
      video.hidden = false
      video.preload = 'auto'
      video.load()
    }
  }, [criticalScene])

  const continueWithStills = useCallback(() => {
    if (frameCanvasRef.current) frameCanvasRef.current.hidden = true
    setUseStills(true)
    setLoadFailed(false)
    setReady(true)
  }, [])

  useEffect(() => {
    if (useStills) return
    const timeout = window.setTimeout(() => {
      if (!loaded.current.has(criticalScene)) setLoadFailed(true)
    }, 12000)
    return () => window.clearTimeout(timeout)
  }, [criticalScene, useStills])

  useEffect(() => {
    const root = document.documentElement
    let maxScroll = Math.max(1, root.scrollHeight - window.innerHeight)
    let target = clamp(window.scrollY / maxScroll)
    let current = target
    let last = performance.now()
    let lastScene = -1
    let previousTarget = target
    let smoothedVelocity = 0
    let lastDepthPercent = -1
    let finalInteractive = false
    let raf = 0
    let resizeRaf = 0
    const lastSeekAt = [0, 0, 0, 0]

    const ensureLoaded = (index: number) => {
      if (useStills || loadedRequested.current.has(index)) return
      const video = videoRefs.current[index]
      if (!video) return
      loadedRequested.current.add(index)
      video.preload = 'auto'
      video.load()
    }

    ensureLoaded(criticalScene)
    if (criticalScene > 0) ensureLoaded(criticalScene - 1)
    if (criticalScene < scenes.length - 1) ensureLoaded(criticalScene + 1)

    const onResize = () => {
      const preserved = clamp(window.scrollY / maxScroll)
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        maxScroll = Math.max(1, root.scrollHeight - window.innerHeight)
        window.scrollTo({ top: preserved * maxScroll, behavior: 'instant' })
      })
    }

    const render = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000))
      last = now
      target = clamp(window.scrollY / maxScroll)

      const rawVelocity = (target - previousTarget) / dt
      previousTarget = target
      smoothedVelocity = lerp(smoothedVelocity, rawVelocity, 1 - Math.exp(-dt / 0.12))

      if (profile.reducedMotion) {
        current = target
      } else {
        const tau = profile.mobile ? 0.18 : 0.148
        const intended = current + (target - current) * (1 - Math.exp(-dt / tau))
        const maxStep = dt * (profile.mobile ? 0.72 : 0.95)
        current += clamp(intended - current, -maxStep, maxStep)
      }
      current = clamp(current)

      root.style.setProperty('--progress', current.toFixed(5))
      root.style.setProperty('--velocity', Math.min(1, Math.abs(smoothedVelocity) * 0.18).toFixed(4))
      root.style.setProperty('--trace', (1 - current).toFixed(5))
      root.style.setProperty('--rupture', smoothstep(0.54, 0.69, current).toFixed(5))

      const activeScene = dominantSceneIndex(current)
      desiredSceneRef.current = activeScene
      mediaRefs.current.forEach((media, index) => {
        if (media) media.style.opacity = index === activeScene ? '1' : '0'
      })
      scenes.forEach((scene, index) => {
        const opacity = sceneOpacity(scene, index, current)
        const local = sceneLocalProgress(scene, current)

        const story = storyRefs.current[index]
        if (story) {
          const enter = index === 0 ? 1 : smoothstep(0.1, 0.24, local)
          const exit = index === scenes.length - 1
            ? 1 - smoothstep(0.78, 0.92, local)
            : 1 - smoothstep(0.67, 0.84, local)
          story.style.opacity = (enter * exit).toFixed(4)
          story.style.setProperty('--local', local.toFixed(4))
          story.style.setProperty('--impulse', Math.min(1, Math.abs(smoothedVelocity) * 0.12).toFixed(4))
        }

        // Keep both sides of an opaque seam frame-ready. This prevents a stale
        // decoded frame from flashing when a fast reverse scroll crosses a cut.
        const seamPreroll = profile.mobile ? 0.022 : 0.016
        const nearScene = current >= scene.start - seamPreroll && current <= scene.end + seamPreroll
        if (!useStills && (opacity > 0.001 || nearScene)) {
          ensureLoaded(index)
          const video = videoRefs.current[index]
          if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
            const desired = Math.round(sceneTime(scene, current) * FRAME_RATE) / FRAME_RATE
            desiredTimesRef.current[index] = desired
            const minInterval = profile.mobile ? 42 : 30
            const drift = Math.abs(video.currentTime - desired)
            if (index === activeScene) paintVideoFrame(index, video)
            if (
              drift >= 1 / FRAME_RATE &&
              now - lastSeekAt[index] >= minInterval &&
              (!video.seeking || drift > 0.22)
            ) {
              lastSeekAt[index] = now
              video.currentTime = desired
            }
          }
        }
      })

      if (failedVideos.current.has(activeScene) && frameCanvasRef.current) {
        frameCanvasRef.current.hidden = true
      }

      if (activeScene !== lastScene) {
        lastScene = activeScene
        root.dataset.scene = scenes[activeScene].id
        if (chapterIndexRef.current) chapterIndexRef.current.textContent = scenes[activeScene].index
        if (chapterLabelRef.current) chapterLabelRef.current.textContent = scenes[activeScene].label
      }

      // Warm the next decoder while the current chapter still owns the frame.
      // This is deliberately one scene ahead to avoid downloading all films at once.
      ensureLoaded(activeScene)
      if (activeScene < scenes.length - 1) ensureLoaded(activeScene + 1)

      const depthPercent = Math.round(current * 100)
      if (depthPercent !== lastDepthPercent) {
        lastDepthPercent = depthPercent
        if (traceValueRef.current) traceValueRef.current.textContent = depthPercent.toString().padStart(2, '0')
        if (traceRef.current) traceRef.current.setAttribute('aria-valuenow', String(depthPercent))
      }

      const finalOpacity = smoothstep(0.965, 0.995, current)
      if (finalRef.current) finalRef.current.style.opacity = finalOpacity.toFixed(4)
      const shouldEnableFinal = finalOpacity >= 0.55
      if (shouldEnableFinal !== finalInteractive) {
        finalInteractive = shouldEnableFinal
        finalRef.current?.classList.toggle('final-state--interactive', shouldEnableFinal)
        finalRef.current?.setAttribute('aria-hidden', String(!shouldEnableFinal))
        if (shouldEnableFinal) finalRef.current?.removeAttribute('inert')
        else finalRef.current?.setAttribute('inert', '')
        finalActionRefs.current.forEach((button) => { if (button) button.tabIndex = shouldEnableFinal ? 0 : -1 })
      }
      if (introCueRef.current) introCueRef.current.style.opacity = (1 - smoothstep(0.03, 0.13, current)).toFixed(4)
      raf = requestAnimationFrame(render)
    }

    window.addEventListener('resize', onResize, { passive: true })
    raf = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(resizeRaf)
      window.removeEventListener('resize', onResize)
    }
  }, [criticalScene, paintVideoFrame, profile.mobile, profile.reducedMotion, useStills])

  const restartJourney = () => {
    window.scrollTo({ top: 0, behavior: profile.reducedMotion ? 'instant' : 'smooth' })
  }

  const returnFromJourney = () => {
    if (returnTarget) window.location.assign(returnTarget)
  }

  return (
    <>
      <main className="journey" aria-label="VEIL — an interactive cinematic journey">
        <div className="stage">
          <div className="stage__fallback" />
          <div className="media-stack" aria-hidden="true">
            {scenes.map((scene, index) => (
              <div
                className={`media-layer media-layer--${scene.id}`}
                key={scene.id}
                ref={(node) => { mediaRefs.current[index] = node }}
              >
                <img className="media-layer__poster" src={assetUrl(scene.poster)} alt="" draggable="false" />
                {!useStills && (
                  <video
                    ref={(node) => { videoRefs.current[index] = node }}
                    className="media-layer__video"
                    src={assetUrl(profile.mobile ? scene.mobile : scene.desktop)}
                    muted
                    playsInline
                    preload={index === criticalScene ? 'auto' : index === criticalScene + 1 ? 'metadata' : 'none'}
                    tabIndex={-1}
                    onLoadedData={(event) => {
                      event.currentTarget.hidden = false
                      markLoaded(index)
                      paintVideoFrame(index, event.currentTarget)
                    }}
                    onSeeked={(event) => paintVideoFrame(index, event.currentTarget)}
                    onError={(event) => {
                      failedVideos.current.add(index)
                      event.currentTarget.hidden = true
                      if (index === desiredSceneRef.current && frameCanvasRef.current) {
                        frameCanvasRef.current.hidden = true
                      }
                      if (index === criticalScene) setLoadFailed(true)
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <canvas
            className="frame-canvas"
            ref={frameCanvasRef}
            aria-hidden="true"
            hidden
          />

          <div className="image-treatment" aria-hidden="true">
            <div className="image-treatment__vignette" />
            <div className="image-treatment__breath" />
            <div className="image-treatment__grain" />
          </div>

          <div className="stories">
            {scenes.map((scene, index) => (
              <StoryLayer
                id={scene.id}
                key={scene.id}
                bind={(node) => { storyRefs.current[index] = node }}
              />
            ))}
          </div>

          <div className="project-mark" aria-hidden="true">
            <span className="project-mark__name">VEIL</span>
            <span className="project-mark__rule" />
            <span className="project-mark__chapter"><b ref={chapterIndexRef}>01</b> / 04</span>
            <span className="project-mark__label" ref={chapterLabelRef}>Threshold</span>
          </div>

          {returnTarget && (
            <button className="return-control" type="button" onClick={returnFromJourney} aria-label="Return from the journey">
              <span className="return-control__arrow" aria-hidden="true">←</span>
              <span className="return-control__text">Return</span>
            </button>
          )}

          <div
            className="journey-trace"
            ref={traceRef}
            role="progressbar"
            aria-label="Journey depth"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={0}
          >
            <DepthTraceGlyph />
            <span className="journey-trace__readout" aria-hidden="true">
              <span className="journey-trace__label">Depth</span>
              <span className="journey-trace__value" ref={traceValueRef}>00</span>
            </span>
          </div>

          <div className="motion-cue" ref={introCueRef} role="note" aria-label="Scroll or swipe down to descend">
            <span className="motion-cue__signal" aria-hidden="true"><i /></span>
            <span className="motion-cue__copy motion-cue__copy--desktop">Scroll <i>to descend</i></span>
            <span className="motion-cue__copy motion-cue__copy--mobile">Swipe <i>to descend</i></span>
          </div>

          <div className="final-state" ref={finalRef} aria-hidden="true" inert>
            <div className="final-state__signature">
              <span className="final-state__title">VEIL</span>
              <span className="final-state__line" />
              <p>What felt like falling<br />was a way through.</p>
            </div>
            <div className="final-state__actions">
              {returnTarget && (
                <button ref={(node) => { finalActionRefs.current[0] = node }} type="button" tabIndex={-1} onClick={returnFromJourney}>
                  <span aria-hidden="true">←</span> Return
                </button>
              )}
              <button ref={(node) => { finalActionRefs.current[1] = node }} type="button" tabIndex={-1} onClick={restartJourney}>
                Replay <span aria-hidden="true">↺</span>
              </button>
            </div>
          </div>

          <div className={`loader ${ready ? 'loader--ready' : ''}`} role="status" aria-live="polite">
            <div className="loader__seed" aria-hidden="true"><PortalGlyph /></div>
            <p>{loadFailed ? 'The passage did not open.' : 'Calibrating the passage'}</p>
            {loadFailed && (
              <div className="loader__actions">
                <button type="button" onClick={retry}>Try again <span aria-hidden="true">↗</span></button>
                <button type="button" onClick={continueWithStills}>Continue with stills <span aria-hidden="true">→</span></button>
              </div>
            )}
            <span className="sr-only">{ready ? 'Experience ready' : 'Loading cinematic experience'}</span>
          </div>
        </div>
        <div className="scroll-space" aria-hidden="true" />
        <section className="sr-only" aria-label="Journey transcript">
          <h1>VEIL</h1>
          <p>The edge does not end here.</p>
          <p>Depth learns your shape.</p>
          <p>Form gives way.</p>
          <p>The far side remembers you. What felt like falling was a way through.</p>
        </section>
      </main>
    </>
  )
}
