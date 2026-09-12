import backgroundMusicUrl from '../assets/music/background-music.mp3'
import jumpSoundUrl from '../assets/music/jump.mp3'

const SOUND_KEY = 'sound-enabled'
const JUMP_POOL_SIZE = 6

const backgroundMusic = new Audio(backgroundMusicUrl)
backgroundMusic.loop = true
backgroundMusic.preload = 'auto'
backgroundMusic.volume = 0.32

const jumpSounds = Array.from({ length: JUMP_POOL_SIZE }, () => {
  const sound = new Audio(jumpSoundUrl)
  sound.preload = 'auto'
  sound.volume = 0.55
  return sound
})

let unlocked = false
let jumpIndex = 0
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(SOUND_KEY) === 'false'

export function readSoundPreference() {
  return !muted
}

export function startAudio() {
  unlocked = true
  if (muted) return

  const playback = backgroundMusic.play()
  if (playback?.catch) playback.catch(() => {})
}

export function setSoundMuted(nextMuted) {
  muted = nextMuted
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SOUND_KEY, String(!nextMuted))
  }

  if (nextMuted) {
    backgroundMusic.pause()
    jumpSounds.forEach((sound) => sound.pause())
    return
  }

  if (unlocked) startAudio()
}

export function playJumpSound() {
  if (muted || !unlocked) return

  const sound = jumpSounds[jumpIndex]
  jumpIndex = (jumpIndex + 1) % jumpSounds.length
  sound.currentTime = 0
  const playback = sound.play()
  if (playback?.catch) playback.catch(() => {})
}
