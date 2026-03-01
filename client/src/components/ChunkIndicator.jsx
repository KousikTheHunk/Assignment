import React from 'react'
import './ChunkIndicator.css'

function fmt(s) {
  if (!isFinite(s) || s < 0) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function ChunkIndicator({
  chunks, currentChunkIndex, completedChunks, adBreaks,
  completedAdBreaks, isAdBreak, adBreakInfo,
}) {
  return (
    <div className="chunk-indicator">
      <div className="ci-header">
        <span className="ci-label">PLAYBACK SEGMENTS</span>
        {isAdBreak && adBreakInfo && (
          <span className="ci-ad-notice">AD BREAK — {adBreakInfo.adIndex + 1}/{adBreakInfo.ads.length}</span>
        )}
      </div>

      <div className="ci-segments">
        {chunks.map((chunk, i) => {
          const isDone = completedChunks.includes(chunk.id)
          const isCurrent = i === currentChunkIndex && !isAdBreak
          const hasAdBreak = adBreaks.some(ab => ab.afterChunkId === chunk.id)
          const adDone = completedAdBreaks.includes(chunk.id)
          const adActive = isAdBreak && adBreakInfo?.afterChunkId === chunk.id

          return (
            <React.Fragment key={chunk.id}>
              <div className={`ci-segment ${isDone ? 'done' : ''} ${isCurrent ? 'active' : ''}`}>
                <div className="ci-seg-top">
                  <span className="ci-seg-num">CH{chunk.id}</span>
                  {isDone && <span className="ci-check">✓</span>}
                  {isCurrent && <span className="ci-playing-dot" />}
                </div>
                <div className="ci-seg-time">{fmt(chunk.start)} – {fmt(chunk.end)}</div>
                <div className="ci-seg-bar">
                  <div className={`ci-seg-fill ${isDone ? 'full' : isCurrent ? 'active' : ''}`} />
                </div>
              </div>

              {hasAdBreak && (
                <div className={`ci-ad-break ${adDone ? 'done' : ''} ${adActive ? 'active' : ''}`}>
                  <div className="ci-ad-icon">▶▶</div>
                  <div className="ci-ad-info">
                    {adActive ? <span className="ci-ad-live">PLAYING</span>
                      : adDone ? <span className="ci-ad-done">SEEN</span>
                      : <span className="ci-ad-upcoming">ADS</span>}
                  </div>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
