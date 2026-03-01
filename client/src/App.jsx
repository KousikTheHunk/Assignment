import React, { useState } from 'react'
import UploadScreen from './components/UploadScreen.jsx'
import VideoPlayer from './components/VideoPlayer.jsx'
import './App.css'

export default function App() {
  const [videoConfig, setVideoConfig] = useState(null)

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-v">Vi</span>
          <span className="logo-lambda">Deo</span>
          <span className="logo-rest">Player</span>
        </div>
        <div className="header-tag">
          <span className="tag-dot" />
          VIDEO AD PLAYER
        </div>
      </header>

      <main className="app-main">
        {!videoConfig ? (
          <UploadScreen onVideoReady={setVideoConfig} />
        ) : (
          <VideoPlayer config={videoConfig} onReset={() => setVideoConfig(null)} />
        )}
      </main>
    </div>
  )
}
