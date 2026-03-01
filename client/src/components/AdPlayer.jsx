import React, { useState, useEffect, useRef, useCallback } from 'react'
import './AdPlayer.css'

export default function AdPlayer({ ad, adIndex, totalAds, onAdComplete, volume, muted }) {
  const videoRef = useRef(null)
  const [elapsed, setElapsed] = useState(0)
  const [adDuration, setAdDuration] = useState(ad.duration || 15)
  const [canSkip, setCanSkip] = useState(false)
  const [skipping, setSkipping] = useState(false)
  const [showCta, setShowCta] = useState(false)

  useEffect(() => {
    setElapsed(0); setCanSkip(false); setSkipping(false); setShowCta(false)
    if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play().catch(() => {}) }
  }, [ad.id, adIndex])

  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.muted = muted }
  }, [volume, muted])

  const handleTimeUpdate = useCallback((e) => {
    const t = e.target.currentTime
    setElapsed(t)
    if (t >= ad.skippableAfter) setCanSkip(true)
    if (t >= adDuration - 4) setShowCta(true)
  }, [ad.skippableAfter, adDuration])

  const handleSkip = () => {
    if (!canSkip) return
    setSkipping(true)
    setTimeout(() => onAdComplete(), 300)
  }

  const skipCountdown = Math.max(0, Math.ceil(ad.skippableAfter - elapsed))
  const adProgress = Math.min(100, (elapsed / adDuration) * 100)

  return (
    <div className={`ad-player ${skipping ? 'skipping' : ''}`}>
      <video
        ref={videoRef}
        src={ad.url}
        className="ad-video"
        onTimeUpdate={handleTimeUpdate}
        onEnded={onAdComplete}
        onLoadedMetadata={(e) => { const d = e.target.duration; if (isFinite(d) && d > 0) setAdDuration(d) }}
        autoPlay
        playsInline
        muted={muted}
      />

      <div className="ad-top-bar">
        <div className="ad-label-badge">AD</div>
        <div className="ad-counter">{adIndex + 1} / {totalAds}</div>
        <div className="ad-title-text">{ad.title}</div>
      </div>

      <div className="ad-progress-track">
        <div className="ad-progress-fill" style={{ width: `${adProgress}%` }} />
      </div>

      {showCta && (
        <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer" className="ad-cta-btn" onClick={(e) => e.stopPropagation()}>
          {ad.ctaText} →
        </a>
      )}

      <div className="ad-bottom-bar">
        <div className="ad-advertiser">
          <span className="ad-by">via</span>
          <span className="ad-name">{ad.advertiser}</span>
        </div>
        <div className="ad-skip-area">
          {canSkip ? (
            <button className="skip-btn enabled" onClick={handleSkip}>
              <span>Skip Ad</span>
              <svg viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 5-10 5V3z" fill="currentColor" />
                <path d="M13 3v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          ) : (
            <div className="skip-btn disabled"><span>Skip in {skipCountdown}s</span></div>
          )}
        </div>
      </div>
    </div>
  )
}
