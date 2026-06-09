import { useState, useEffect, useRef } from 'react'

const INTERVALS = [
  { label: '10 min', value: 10 },
  { label: '20 min', value: 20 },
  { label: '30 min', value: 30 },
]

export default function EyeCare() {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem('eyecare_enabled') !== 'false'
  })
  const [interval, setIntervalMin] = useState(() => {
    return parseInt(localStorage.getItem('eyecare_interval') || '20')
  })
  const [showAlert, setShowAlert] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [snoozed, setSnoozed] = useState(false)
  const [snoozeEnd, setSnoozeEnd] = useState(null)
  const [breaksTaken, setBreaksTaken] = useState(0)
  const [timeActive, setTimeActive] = useState(0) // seconds
  const [blinkCount, setBlinkCount] = useState(0)
  const [blinkPhase, setBlinkPhase] = useState(false) // for blink exercise

  const lastActivity = useRef(Date.now())
  const activeTimer = useRef(null)
  const alertTimer = useRef(null)
  const blinkTimer = useRef(null)

  // Track user activity
  useEffect(() => {
    const resetActivity = () => {
      lastActivity.current = Date.now()
    }
    window.addEventListener('mousemove', resetActivity)
    window.addEventListener('keydown', resetActivity)
    window.addEventListener('click', resetActivity)
    window.addEventListener('scroll', resetActivity)
    return () => {
      window.removeEventListener('mousemove', resetActivity)
      window.removeEventListener('keydown', resetActivity)
      window.removeEventListener('click', resetActivity)
      window.removeEventListener('scroll', resetActivity)
    }
  }, [])

  // Active time counter
  useEffect(() => {
    if (!enabled) return
    activeTimer.current = setInterval(() => {
      const idleTime = (Date.now() - lastActivity.current) / 1000
      if (idleTime < 30) {
        setTimeActive(prev => prev + 1)
      }
    }, 1000)
    return () => clearInterval(activeTimer.current)
  }, [enabled])

  // Alert trigger
  useEffect(() => {
    if (!enabled) return
    const intervalSeconds = interval * 60
    if (timeActive > 0 && timeActive % intervalSeconds === 0 && !showAlert) {
      if (snoozed && snoozeEnd && Date.now() < snoozeEnd) return
      setShowAlert(true)
      setBlinkCount(0)
      setBlinkPhase(false)
    }
  }, [timeActive, interval, enabled, snoozed, snoozeEnd])

  // Blink exercise animation
  useEffect(() => {
    if (!showAlert) return
    blinkTimer.current = setInterval(() => {
      setBlinkPhase(prev => !prev)
    }, 1500)
    return () => clearInterval(blinkTimer.current)
  }, [showAlert])

  const handleDone = () => {
    setShowAlert(false)
    setBreaksTaken(prev => prev + 1)
    setBlinkCount(0)
    setSnoozed(false)
    setSnoozeEnd(null)
  }

  const handleSnooze = (minutes) => {
    setShowAlert(false)
    setSnoozed(true)
    setSnoozeEnd(Date.now() + minutes * 60 * 1000)
    setTimeActive(prev => prev - (interval * 60) + 60)
  }

  const handleBlink = () => {
    setBlinkCount(prev => {
      const next = prev + 1
      if (next >= 10) {
        setTimeout(() => handleDone(), 500)
      }
      return next
    })
  }

  const toggleEnabled = () => {
    const newVal = !enabled
    setEnabled(newVal)
    localStorage.setItem('eyecare_enabled', newVal.toString())
    if (!newVal) setShowAlert(false)
  }

  const changeInterval = (val) => {
    setIntervalMin(val)
    localStorage.setItem('eyecare_interval', val.toString())
    setTimeActive(0)
  }

  const minutesActive = Math.floor(timeActive / 60)
  const secondsUntilBreak = (interval * 60) - (timeActive % (interval * 60))
  const minutesUntilBreak = Math.floor(secondsUntilBreak / 60)

  return (
    <>
      {/* Alert Modal */}
      {showAlert && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-violet-500/50 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">

            {/* Eye animation */}
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="w-24 h-24 rounded-full bg-white border-4 border-gray-200 flex items-center justify-center overflow-hidden">
                <div
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center transition-all duration-300"
                  style={{ transform: blinkPhase ? 'scaleY(0.1)' : 'scaleY(1)' }}
                >
                  <div className="w-4 h-4 rounded-full bg-black"></div>
                </div>
              </div>
              {/* Eyelid animation */}
              <div
                className="absolute top-0 left-0 w-full bg-gray-700 rounded-full transition-all duration-300 origin-top"
                style={{
                  height: blinkPhase ? '50%' : '0%',
                  borderRadius: '50% 50% 0 0'
                }}
              ></div>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Time to blink! 👁️</h2>
            <p className="text-gray-400 text-sm mb-2">
              You've been coding for <span className="text-violet-400 font-semibold">{minutesActive} minutes</span> straight.
            </p>
            <p className="text-gray-300 text-sm mb-6">
              Follow the 20-20-20 rule — blink slowly 10 times and look away from the screen.
            </p>

            {/* Blink counter */}
            <div className="mb-6">
              <p className="text-xs text-gray-500 mb-3">Tap the eye each time you blink:</p>
              <div className="flex justify-center gap-2 flex-wrap mb-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${
                      i < blinkCount
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-600 text-gray-600'
                    }`}
                  >
                    {i < blinkCount ? '✓' : i + 1}
                  </div>
                ))}
              </div>
              <button
                onClick={handleBlink}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                👁️ Blink! ({blinkCount}/10)
              </button>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleDone}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition text-sm"
              >
                ✅ Done — eyes feel better!
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleSnooze(5)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-xl transition text-xs"
                >
                  Snooze 5 min
                </button>
                <button
                  onClick={() => handleSnooze(15)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-xl transition text-xs"
                >
                  Snooze 15 min
                </button>
                <button
                  onClick={() => handleSnooze(30)}
                  className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-xl transition text-xs"
                >
                  Snooze 30 min
                </button>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-4">
              Based on the 20-20-20 rule recommended by ophthalmologists
            </p>
          </div>
        </div>
      )}

      {/* Bottom right widget */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-4 w-56 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">👁️ Eye Care Settings</h3>

            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">Enable reminders</span>
              <button
                onClick={toggleEnabled}
                className={`w-10 h-5 rounded-full transition-all ${enabled ? 'bg-violet-600' : 'bg-gray-700'} relative`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${enabled ? 'left-5' : 'left-0.5'}`}></div>
              </button>
            </div>

            <p className="text-xs text-gray-500 mb-2">Remind every:</p>
            <div className="flex gap-1 mb-3">
              {INTERVALS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => changeInterval(opt.value)}
                  className={`flex-1 text-xs py-1.5 rounded-lg transition ${
                    interval === opt.value
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="bg-gray-800 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">Breaks taken today</p>
              <p className="text-2xl font-bold text-violet-400">{breaksTaken}</p>
            </div>

            {enabled && (
              <p className="text-xs text-gray-600 text-center mt-2">
                Next break in ~{minutesUntilBreak} min
              </p>
            )}
          </div>
        )}

        {/* Eye care button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-lg transition text-xs font-medium ${
            enabled
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
          }`}
          title="Eye Care Reminder"
        >
          <span className="text-sm">👁️</span>
          {enabled && (
            <span className="hidden sm:block">
              {snoozed ? 'Snoozed' : `${minutesActive}m`}
            </span>
          )}
          {breaksTaken > 0 && (
            <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">
              {breaksTaken}
            </span>
          )}
        </button>
      </div>
    </>
  )
}