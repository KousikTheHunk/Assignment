import React, { useState, useRef, useCallback } from 'react'
import './PlayerControls.css'

function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function PlayerControls({
  isPlaying, currentTime, duration, volume, muted,
  onPlay, onPause, onSeek, onVolumeChange, onToggleMute, onFullscreen,
  chunks, adBreaks, completedAdBreaks,
}) {
  const [hovering, setHovering] = useState(false)
  const [scrubbing, setScrubbing] = useState(false)
  const [hoverTime, setHoverTime] = useState(null)
  const progressRef = useRef(null)

  const getTime = useCallback((e) => {
    const rect = progressRef.current.getBoundingClientRect()
    return (Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width) * duration
  }, [duration])

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div
      className={`controls ${hovering ? 'visible' : ''}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setScrubbing(false); setHoverTime(null) }}
    >
      <div className="progress-area">
        <div
          ref={progressRef}
          className="progress-track"
          onClick={(e) => onSeek(getTime(e))}
          onMouseMove={(e) => { setHoverTime(getTime(e)); if (scrubbing) onSeek(getTime(e)) }}
          onMouseLeave={() => setHoverTime(null)}
          onMouseDown={() => setScrubbing(true)}
          onMouseUp={() => setScrubbing(false)}
        >
          <div className="progress-bg" />
          <div className="progress-fill" style={{ width: `${pct}%` }} />
          <div className="progress-thumb" style={{ left: `${pct}%` }} />

          {adBreaks.map((ab) => {
            const chunk = chunks.find(c => c.id === ab.afterChunkId)
            if (!chunk || !duration) return null
            const mp = (chunk.end / duration) * 100
            return (
              <div
                key={ab.afterChunkId}
                className={`ad-marker ${completedAdBreaks.includes(ab.afterChunkId) ? 'done' : ''}`}
                style={{ left: `${mp}%` }}
                title={`Ad break: ${ab.ads.length} ad${ab.ads.length !== 1 ? 's' : ''}`}
              />
            )
          })}

          {hoverTime !== null && (
            <div className="hover-tooltip" style={{ left: `${(hoverTime / duration) * 100}%` }}>
              {fmt(hoverTime)}
            </div>
          )}
        </div>
      </div>

      <div className="controls-row">
        <div className="controls-left">
          <button className="ctrl-btn play-btn" onClick={isPlaying ? onPause : onPlay}>
            {isPlaying ? (
              <svg viewBox="0 0 16 16" fill="none">
                <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor" />
                <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 16 16" fill="none"><path d="M3 2l11 6-11 6V2z" fill="currentColor" /></svg>
            )}
          </button>

          <div className="volume-group">
            <button className="ctrl-btn" onClick={onToggleMute}>
              {muted || volume === 0 ? (
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3 6H1v4h2l4 3V3L3 6z" fill="currentColor"/>
                  <path d="M13 5l-4 4M9 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : volume < 0.5 ? (
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3 6H1v4h2l4 3V3L3 6z" fill="currentColor"/>
                  <path d="M10 6a2 2 0 0 1 0 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" fill="none">
                  <path d="M3 6H1v4h2l4 3V3L3 6z" fill="currentColor"/>
                  <path d="M10 4a4 4 0 0 1 0 8M12 2a7 7 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              )}
            </button>
            <input
              type="range" className="volume-slider"
              min={0} max={1} step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="time-display">
            <span className="time-current">{fmt(currentTime)}</span>
            <span className="time-sep">/</span>
            <span className="time-total">{fmt(duration)}</span>
          </div>
        </div>

        <div className="controls-right">
          <button className="ctrl-btn" onClick={onFullscreen}>
            <svg viewBox="0 0 16 16" fill="none">
              <path d="M1 1h5M1 1v5M15 1h-5M15 1v5M1 15h5M1 15v-5M15 15h-5M15 15v-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
