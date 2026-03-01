import React, { forwardRef } from 'react'

const ContentPlayer = forwardRef(function ContentPlayer(
  { videoUrl, hidden, onTimeUpdate, onDurationLoaded, onEnded, onBuffering, onPlay, onPause },
  ref
) {
  return (
    <video
      ref={ref}
      src={videoUrl}
      style={{
        width: '100%', height: '100%',
        display: hidden ? 'none' : 'block',
        objectFit: 'contain', background: '#000',
      }}
      onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
      onLoadedMetadata={(e) => onDurationLoaded(e.target.duration)}
      onEnded={onEnded}
      onWaiting={onBuffering}
      onPlay={onPlay}
      onPause={onPause}
      playsInline
      preload="metadata"
    />
  )
})

export default ContentPlayer
