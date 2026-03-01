import React, { useReducer, useRef, useEffect, useCallback } from 'react'
import ContentPlayer from './ContentPlayer.jsx'
import AdPlayer from './AdPlayer.jsx'
import PlayerControls from './PlayerControls.jsx'
import ChunkIndicator from './ChunkIndicator.jsx'
import './VideoPlayer.css'

const S = { IDLE: 'IDLE', PLAYING: 'PLAYING', PAUSED: 'PAUSED', AD_BREAK: 'AD_BREAK', ENDED: 'ENDED' }

const init = {
  status: S.IDLE,
  currentChunkIndex: 0,
  currentTime: 0,
  duration: 0,
  volume: 1,
  muted: false,
  adBreak: null,
  completedChunks: [],
  completedAdBreaks: [],
}

function reducer(state, action) {
  switch (action.type) {
    case 'PLAY':    return { ...state, status: S.PLAYING }
    case 'PAUSE':   return { ...state, status: S.PAUSED }
    case 'TIME':    return { ...state, currentTime: action.t }
    case 'DUR':     return { ...state, duration: action.d }
    case 'VOL':     return { ...state, volume: action.v, muted: action.v === 0 }
    case 'MUTE':    return { ...state, muted: !state.muted }
    case 'SEEK':    return { ...state, currentTime: action.t }
    case 'ENDED':   return { ...state, status: S.ENDED }

    case 'START_AD':
      return { ...state, status: S.AD_BREAK, adBreak: { ads: action.ads, adIndex: 0, afterChunkId: action.id } }

    case 'NEXT_AD': {
      // guard: make sure adBreak exists
      if (!state.adBreak) return state
      const next = state.adBreak.adIndex + 1
      if (next >= state.adBreak.ads.length) {
        return {
          ...state,
          status: S.PAUSED,
          completedAdBreaks: [...state.completedAdBreaks, state.adBreak.afterChunkId],
          adBreak: null,
          currentChunkIndex: state.currentChunkIndex + 1,
        }
      }
      return { ...state, adBreak: { ...state.adBreak, adIndex: next } }
    }

    case 'CHUNK_DONE':
      return { ...state, completedChunks: [...state.completedChunks, action.id] }

    case 'ADVANCE_CHUNK':
      return { ...state, currentChunkIndex: state.currentChunkIndex + 1 }

    default: return state
  }
}

export default function VideoPlayer({ config, onReset }) {
  const [state, dispatch] = useReducer(reducer, init)
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const firedRef = useRef(new Set())
  const prevAdBreakRef = useRef(null) // track previous adBreak to detect transitions

  const { chunks = [], adBreaks = [], videoUrl, originalName, duration: cfgDur } = config || {}

  // --- Transition-based resume: only resume when adBreak just finished ---
  useEffect(() => {
    const prev = prevAdBreakRef.current
    const curr = state.adBreak

    // detect transition: was in adBreak (prev truthy) and now not in adBreak (curr falsy)
    if (prev && !curr) {
      try {
        // next chunk index should already have been incremented by reducer (NEXT_AD)
        const nextIndex = state.currentChunkIndex
        const nextChunk = (chunks && chunks[nextIndex]) ? chunks[nextIndex] : null
        const seekTo = nextChunk ? nextChunk.start : 0

        if (videoRef.current) {
          // ensure content is paused, seek to next chunk start, then resume
          videoRef.current.pause()
          const safeSeek = Math.max(0, Math.min(seekTo, videoRef.current.duration || seekTo))
          videoRef.current.currentTime = safeSeek

          // tiny delay to give browser time to apply currentTime change
          setTimeout(() => {
            videoRef.current.play().catch(() => {})
            dispatch({ type: 'PLAY' })
          }, 50)
        } else {
          // fallback if no ref
          dispatch({ type: 'PLAY' })
        }
      } catch (err) {
        console.warn('resume-after-ad error', err)
      }
    }

    prevAdBreakRef.current = curr
    // we only care about transitions of adBreak
  }, [state.adBreak, state.currentChunkIndex, chunks])

  // --- Timeupdate handler (safe, only when playing content) ---
  const handleTimeUpdate = useCallback((time) => {
    // always update time
    dispatch({ type: 'TIME', t: time })

    // only do chunk-end detection when content is actively playing
    if (state.status !== S.PLAYING) return

    const chunk = chunks[state.currentChunkIndex]
    if (!chunk) return

    // avoid double firing for the same chunk
    if (firedRef.current.has(chunk.id)) return

    // if we're near the end of the chunk, trigger ad or advance
    if (time >= chunk.end - 0.3) {
      // mark fired immediately to avoid reentrancy
      firedRef.current.add(chunk.id)

      // mark chunk done
      dispatch({ type: 'CHUNK_DONE', id: chunk.id })

      const ab = adBreaks.find(b => b.afterChunkId === chunk.id)

      if (ab && !state.completedAdBreaks.includes(chunk.id)) {
        // defensive pause before starting ads
        try { videoRef.current?.pause() } catch (err) {}
        dispatch({ type: 'START_AD', ads: ab.ads, id: chunk.id })
      } else {
        // no ad: advance chunk directly
        dispatch({ type: 'ADVANCE_CHUNK', id: chunk.id })
      }
    }
  }, [chunks, adBreaks, state.status, state.currentChunkIndex, state.completedAdBreaks])

  // --- Player control handlers ---
  const handlePlay  = useCallback(() => { videoRef.current?.play().catch(() => {}); dispatch({ type: 'PLAY' }) }, [])
  const handlePause = useCallback(() => { videoRef.current?.pause(); dispatch({ type: 'PAUSE' }) }, [])

  const handleSeek = useCallback((t) => {
    // disallow seeking during ads
    if (state.status === S.AD_BREAK) return
    if (videoRef.current) videoRef.current.currentTime = t
    dispatch({ type: 'SEEK', t })
  }, [state.status])

  const handleVolume = useCallback((v) => {
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0 }
    dispatch({ type: 'VOL', v })
  }, [])

  const handleMute = useCallback(() => {
    if (videoRef.current) videoRef.current.muted = !state.muted
    dispatch({ type: 'MUTE' })
  }, [state.muted])

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen()
    else document.exitFullscreen()
  }, [])

  const handleRewatch = () => {
    firedRef.current.clear()
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}) }
    dispatch({ type: 'PLAY' })
    // reset chunk index and completed arrays for rewatch
    // dispatch additional actions if you want to fully reset completed lists (optional)
  }

  const isAd = state.status === S.AD_BREAK
  const currentAd = isAd && state.adBreak?.ads[state.adBreak.adIndex]

  return (
    <div className="vp-wrapper">
      <div className="vp-meta">
        <div className="vp-title">{originalName}</div>
        <button className="vp-reset-btn" onClick={onReset}>
          <svg viewBox="0 0 16 16" fill="none">
            <path d="M2 8a6 6 0 1 1 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M2 4v4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Upload New Video
        </button>
      </div>

      <div className="vp-container" ref={containerRef}>
        <ContentPlayer
          ref={videoRef}
          videoUrl={`http://localhost:5000${videoUrl}`}
          hidden={isAd}
          onTimeUpdate={handleTimeUpdate}
          onDurationLoaded={(d) => dispatch({ type: 'DUR', d })}
          onEnded={() => dispatch({ type: 'ENDED' })}
          onBuffering={() => {}}
          onPlay={() => dispatch({ type: 'PLAY' })}
          onPause={() => state.status !== S.AD_BREAK && dispatch({ type: 'PAUSE' })}
        />

        {isAd && currentAd && (
          <AdPlayer
            ad={currentAd}
            adIndex={state.adBreak.adIndex}
            totalAds={state.adBreak.ads.length}
            onAdComplete={() => dispatch({ type: 'NEXT_AD' })}
            volume={state.volume}
            muted={state.muted}
          />
        )}

        {state.status === S.ENDED && (
          <div className="vp-ended-overlay">
            <div className="ended-content">
              <div className="ended-icon">✓</div>
              <div className="ended-title">Video Complete</div>
              <button className="ended-btn" onClick={handleRewatch}>Watch Again</button>
            </div>
          </div>
        )}

        {!isAd && (
          <PlayerControls
            isPlaying={state.status === S.PLAYING}
            currentTime={state.currentTime}
            duration={state.duration || cfgDur}
            volume={state.volume}
            muted={state.muted}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onVolumeChange={handleVolume}
            onToggleMute={handleMute}
            onFullscreen={handleFullscreen}
            chunks={chunks}
            adBreaks={adBreaks}
            completedAdBreaks={state.completedAdBreaks}
          />
        )}
      </div>

      <ChunkIndicator
        chunks={chunks}
        currentChunkIndex={state.currentChunkIndex}
        completedChunks={state.completedChunks}
        adBreaks={adBreaks}
        completedAdBreaks={state.completedAdBreaks}
        isAdBreak={isAd}
        adBreakInfo={state.adBreak}
      />
    </div>
  )
}