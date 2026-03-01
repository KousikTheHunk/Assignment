import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'
import './UploadScreen.css'

export default function UploadScreen({ onVideoReady }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  const getVideoDuration = (file) =>
    new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration || 120) }
      video.onerror = () => resolve(120)
      video.src = URL.createObjectURL(file)
    })

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, WebM, MOV, etc.)')
      return
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be under 500MB')
      return
    }

    setError('')
    setUploading(true)
    setProgress(0)

    const duration = await getVideoDuration(file)
    const formData = new FormData()
    formData.append('video', file)
    formData.append('duration', duration.toString())

    try {
      const res = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / e.total)),
      })
      if (res.data.success) onVideoReady(res.data.config)
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.')
      setUploading(false)
    }
  }, [onVideoReady])

  const onDrop = (e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }
  const onDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)

  return (
    <div className="upload-screen">
      <div className="upload-hero">
        <h1 className="upload-title">
          <span className="title-line1">UPLOAD</span>
          <span className="title-line2">YOUR VIDEO</span>
        </h1>
        <p className="upload-subtitle">
          Experience your content with YouTube-style ad breaks — chunks, countdowns, and skip buttons included.
        </p>
      </div>

      <div
        className={`drop-zone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!uploading ? (
          <div className="drop-content">
            <div className="drop-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <rect x="4" y="4" width="40" height="40" rx="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 3" />
                <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 36H34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
              </svg>
            </div>
            <div className="drop-text">
              <span className="drop-main">Drop video here or click to browse</span>
              <span className="drop-sub">MP4, WebM, MOV, AVI — up to 500MB</span>
            </div>
          </div>
        ) : (
          <div className="upload-progress-content">
            <div className="progress-label">
              <span className="font-mono">UPLOADING</span>
              <span className="font-mono progress-pct">{progress}%</span>
            </div>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <div className="progress-hint">
              {progress < 100 ? 'Transferring file to server...' : 'Processing video configuration...'}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="upload-error">
          <svg viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#ff4747" strokeWidth="1.5"/>
            <path d="M8 5v3M8 10.5v.5" stroke="#ff4747" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}

      <div className="upload-features">
        {[
          { icon: '⟳', title: 'Chunked Playback', desc: 'Video split into 4 equal segments' },
          { icon: '▶', title: 'Ad Breaks', desc: '1–2 skippable ads between chunks' },
          { icon: '◎', title: 'Progress Markers', desc: 'Ad positions shown on timeline' },
        ].map((f) => (
          <div className="feature-item" key={f.title}>
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-text">
              <strong>{f.title}</strong>
              <span>{f.desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
