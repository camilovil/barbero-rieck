'use client'

import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
    document.documentElement.classList.toggle('light', !isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', next)
    document.documentElement.classList.toggle('light', !next)
    // Swap background colors
    document.documentElement.style.setProperty(
      '--bg',
      next ? '#1a1a1a' : '#f5f0e8'
    )
    document.body.style.background = next ? '#1a1a1a' : '#f5f0e8'
    document.body.style.color = next ? '#f5f0e8' : '#1a1a1a'
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="w-9 h-9 rounded-full border border-[#3a3a3a] flex items-center justify-center transition-all hover:border-[#f5f0e8]/40 hover:scale-110"
      style={{
        background: dark ? '#f5f0e8' : '#1a1a1a',
        color: dark ? '#1a1a1a' : '#f5f0e8',
      }}
    >
      {dark ? (
        // Sol (pasar a claro)
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="4"/>
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        // Luna (pasar a oscuro)
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
        </svg>
      )}
    </button>
  )
}
