import { useState } from 'react'
import CheeseChaseLogo3D from './CheeseChaseLogo3D'

const DIFFICULTIES = {
  Easy: { baseSpeed: 3, maxSpeed: 12 },
  Medium: { baseSpeed: 6, maxSpeed: 18 },
  Hard: { baseSpeed: 9, maxSpeed: 26 },
}

function SunIcon({ active }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#24130a]' : 'text-[#a38e7f]'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4.5" fill="currentColor" />
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="12" y1="19.5" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="19.5" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.07" y2="19.07" />
      <line x1="4.93" y1="19.07" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.07" y2="4.93" />
    </svg>
  )
}

function MoonIcon({ active }) {
  return (
    <svg
      className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#24130a]' : 'text-[#a38e7f]'}`}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-[#1f1207]" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="7 4 20 12 7 20" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 4h-2V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v1H5a3 3 0 0 0-3 3v2a4 4 0 0 0 4 4h.35A6 6 0 0 0 11 16.92V19H8a1 1 0 0 0 0 2h8a1 1 0 0 0 0-2h-3v-2.08A6 6 0 0 0 17.65 13H18a4 4 0 0 0 4-4V7a3 3 0 0 0-3-3zM4 9V7a1 1 0 0 1 1-1h2v4.83A4 4 0 0 1 4 9zm16 0a4 4 0 0 1-3 1.83V6h2a1 1 0 0 1 1 1z" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 text-white" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.61l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.5.5 0 0 0-.6.22L2.68 8.49a.5.5 0 0 0 .12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58a.5.5 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.49.41h3.84c.24 0 .44-.17.49-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.5.5 0 0 0-.12-.61l-2.01-1.58zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
    </svg>
  )
}

/**
 * MainMenu Component
 * Exactly reproduces the reference image layout, colors, 3D buttons, slider, and typography.
 *
 * @param {Object} props
 * @param {string} props.theme - 'day' | 'night'
 * @param {(theme: string) => void} props.onTheme
 * @param {boolean} props.showFps
 * @param {() => void} props.onToggleFps
 * @param {(settings: { baseSpeed: number, maxSpeed: number, difficulty: string }) => void} props.onStart
 * @param {() => void} props.onHighScore
 * @param {() => void} props.onExit
 */
export default function MainMenu({ theme, showFps, onTheme, onToggleFps, onStart, onHighScore, onExit }) {
  const [difficulty, setDifficulty] = useState('Easy')
  const [speed, setSpeed] = useState(DIFFICULTIES.Easy.baseSpeed)
  const profile = DIFFICULTIES[difficulty]

  const handleDifficulty = (name) => {
    setDifficulty(name)
    setSpeed(DIFFICULTIES[name].baseSpeed)
  }

  // Calculate percentage of slider track fill (1 to 10)
  const sliderFillPercent = ((speed - 1) / 9) * 100

  return (
    <div className="font-cartoon flex flex-col items-center select-none w-full max-w-[340px] sm:max-w-[355px]">
      {/* 3D Cheese Chase Logo with radiant Cheese Wedge in Three.js WebGL */}
      <div className="relative -mb-6 z-10 select-none w-[320px] sm:w-[345px] h-[180px] sm:h-[195px] drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
        <CheeseChaseLogo3D />
      </div>

      {/* Main Menu Dark Brown Card */}
      <div className="w-full rounded-[30px] sm:rounded-[34px] bg-[#3e261d] p-5 sm:p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.18),0_20px_45px_rgba(0,0,0,0.65)] border border-[#523326]/60">
        {/* Subtitle */}
        <p className="text-center text-[12px] sm:text-[12.5px] font-semibold text-[#cbb39e] mb-3.5 tracking-wide">
          Dodge the blocks and stay on the road.
        </p>

        {/* Theme Selector */}
        <div className="mb-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#a88a75] mb-1.5">
            Theme
          </span>
          <div className="grid grid-cols-2 gap-2">
            {/* Day Button */}
            <button
              type="button"
              onClick={() => onTheme('day')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl font-bold text-[12.5px] tracking-wide transition-all ${
                theme === 'day' ? 'btn-3d-yellow' : 'btn-3d-dark'
              }`}
            >
              <SunIcon active={theme === 'day'} />
              <span>Day</span>
            </button>

            {/* Night Button */}
            <button
              type="button"
              onClick={() => onTheme('night')}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-xl font-bold text-[12.5px] tracking-wide transition-all ${
                theme === 'night' ? 'btn-3d-yellow' : 'btn-3d-dark'
              }`}
            >
              <MoonIcon active={theme === 'night'} />
              <span>Night</span>
            </button>
          </div>
        </div>

        {/* Display Settings */}
        <div className="mb-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#a88a75] mb-1.5">
            Display
          </span>
          <button
            type="button"
            onClick={onToggleFps}
            aria-pressed={showFps}
            className={`w-full flex items-center justify-between py-1.5 px-3 rounded-xl font-bold text-[12.5px] tracking-wide transition-all ${
              showFps ? 'btn-3d-green' : 'btn-3d-dark'
            }`}
          >
            <span>FPS Counter</span>
            <span className="text-[10px] uppercase tracking-wider">{showFps ? 'On' : 'Off'}</span>
          </button>
        </div>

        {/* Difficulty Selector */}
        <div className="mb-3.5">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#a88a75] mb-1.5">
            Difficulty
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {['Easy', 'Medium', 'Hard'].map((name) => {
              const isSelected = difficulty === name
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleDifficulty(name)}
                  className={`py-1.5 px-1 rounded-xl font-bold text-[12px] tracking-wide transition-all ${
                    isSelected ? 'btn-3d-green' : 'btn-3d-dark'
                  }`}
                >
                  {name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Starting Speed Slider */}
        <div className="mb-3">
          <div className="text-[12px] font-semibold text-[#cbb39e] mb-1">
            Starting speed: <span className="text-white font-bold">{speed}</span>
          </div>

          <div className="relative py-0.5">
            <input
              type="range"
              min="1"
              max="10"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="cheese-slider"
              style={{
                background: `linear-gradient(to right, #ffb433 0%, #ffb433 ${sliderFillPercent}%, #28160f ${sliderFillPercent}%, #28160f 100%)`,
                borderRadius: '9999px',
              }}
            />
          </div>

          <div className="flex justify-between text-[10px] font-bold text-[#9e8370] px-0.5 mt-0.5">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        {/* Helper Note */}
        <p className="text-center text-[10.5px] font-medium text-[#ba9f8b] mb-3">
          Max speed: {profile.maxSpeed} · A/D or ←/→ to move
        </p>

        {/* Action Buttons Stack */}
        <div className="space-y-2">
          {/* Start Game */}
          <button
            type="button"
            onClick={() => onStart({ baseSpeed: speed, maxSpeed: profile.maxSpeed, difficulty })}
            className="w-full btn-3d-yellow btn-pulse-play py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-black text-[14.5px] tracking-wide"
          >
            <PlayIcon />
            <span>Start Game</span>
          </button>

          {/* High Score */}
          <button
            type="button"
            onClick={onHighScore}
            className="w-full btn-3d-brown py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[13.5px] tracking-wide"
          >
            <TrophyIcon />
            <span>High Score</span>
          </button>

          {/* Exit Game */}
          <button
            type="button"
            onClick={onExit}
            className="w-full btn-3d-brown py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-[13.5px] tracking-wide"
          >
            <GearIcon />
            <span>Exit Game</span>
          </button>
        </div>
      </div>
    </div>
  )
}
