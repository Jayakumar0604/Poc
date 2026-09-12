import backgroundMusicUrl from '../assets/music/background-music.mp3'
import butterSoundUrl from '../assets/music/butter.wav'
import gameOverSoundUrl from '../assets/music/game-over.mp3'
import firstHitSoundUrl from '../assets/music/first-hit.mp3'
import jumpSoundUrl from '../assets/music/jump.mp3'
import milkSoundUrl from '../assets/music/milk.wav'
import mouseTrapSoundUrl from '../assets/music/mouse-trap.mp3'
import rocketTakeSoundUrl from '../assets/music/rocket-take.wav'

const SOUND_KEY = 'sound-enabled'
const SFX_POOL_SIZE = 6

const backgroundMusic = new Audio(backgroundMusicUrl)
backgroundMusic.loop = true
backgroundMusic.preload = 'auto'
backgroundMusic.volume = 0.32

function createSoundPool(url, volume, poolSize = 1) {
  return Array.from({ length: poolSize }, () => {
    const sound = new Audio(url)
    sound.preload = 'auto'
    sound.volume = volume
    return sound
  })
}

const soundPools = {
  butter: createSoundPool(butterSoundUrl, 0.55, SFX_POOL_SIZE),
  firstHit: createSoundPool(firstHitSoundUrl, 0.7),
  gameOver: createSoundPool(gameOverSoundUrl, 0.8),
  jump: createSoundPool(jumpSoundUrl, 0.55, SFX_POOL_SIZE),
  milk: createSoundPool(milkSoundUrl, 0.65),
  mouseTrap: createSoundPool(mouseTrapSoundUrl, 0.7),
  rocketTake: createSoundPool(rocketTakeSoundUrl, 0.7),
}

let unlocked = false
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(SOUND_KEY) === 'false'
const poolIndices = Object.fromEntries(Object.keys(soundPools).map((name) => [name, 0]))

export function readSoundPreference() {
  return !muted
}

export function startAudio() {
  unlocked = true
  if (muted) return

  const playback = backgroundMusic.play()
  if (playback?.catch) playback.catch(() => {})
}

export function stopBackgroundMusic() {
  backgroundMusic.pause()
}

export function setSoundMuted(nextMuted) {
  muted = nextMuted
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SOUND_KEY, String(!nextMuted))
  }

  if (nextMuted) {
    backgroundMusic.pause()
    Object.values(soundPools).flat().forEach((sound) => sound.pause())
    return
  }

  if (unlocked) startAudio()
}

function playPooledSound(name) {
  if (muted || !unlocked) return

  const pool = soundPools[name]
  const index = poolIndices[name]
  const sound = pool[index]
  poolIndices[name] = (index + 1) % pool.length
  sound.currentTime = 0
  const playback = sound.play()
  if (playback?.catch) playback.catch(() => {})
}

export function playJumpSound() {
  playPooledSound('jump')
}

export function playCheeseCollectSound() {
  playPooledSound('butter')
}

export function playRocketTakeSound() {
  playPooledSound('rocketTake')
}

export function playMilkSound() {
  playPooledSound('milk')
}

export function playMouseTrapSound() {
  playPooledSound('mouseTrap')
}

export function playFirstHitSound() {
  playPooledSound('firstHit')
}

export function playGameOverSound() {
  stopBackgroundMusic()
  playPooledSound('gameOver')
}
