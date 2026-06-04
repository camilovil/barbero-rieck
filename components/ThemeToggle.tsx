'use client'

import { useEffect, useState } from 'react'

const DARK = {
  '--bg':          '#1a1a1a',
  '--bg-2':        '#1e1e1e',
  '--bg-card':     '#222222',
  '--bg-hover':    '#272727',
  '--bg-active':   '#2e2e2e',
  '--border':      '#2e2e2e',
  '--border-2':    '#3a3a3a',
  '--text':        '#f5f0e8',
  '--text-muted':  'rgba(245,240,232,0.5)',
  '--text-faint':  'rgba(245,240,232,0.3)',
  '--text-xfaint': 'rgba(245,240,232,0.15)',
}

const LIGHT = {
  '--bg':          '#f0ebe1',
  '--bg-2':        '#e8e3d9',
  '--bg-card':     '#ddd8ce',
  '--bg-hover':    '#d4cfc5',
  '--bg-active':   '#cac5bb',
  '--border':      '#bfbab0',
  '--border-2':    '#b0aba1',
  '--text':        '#1a1a1a',
  '--text-muted':  'rgba(26,26,26,0.6)',
  '--text-faint':  'rgba(26,26,26,0.4)',
  '--text-xfaint': 'rgba(26,26,26,0.2)',
}

function applyTheme(isDark: boolean) {
  const root = document.documentElement
  const vars = isDark ? DARK : LIGHT
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const isDark = saved ? saved === 'dark' : true
    setDark(isDark)
    applyTheme(isDark)
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    applyTheme(next)
  }

  return (
    <button
      onClick={toggle}
      aria-label="Cambiar tema"
      className="w-9 h-9 rounded-full border flex items-center justify-center transition-all hover:scale-110"
      style={{
        background: dark ? '#f5f0e8' : '#1a1a1a',
        color:      dark ? '#1a1a1a' : '#f5f0e8',
        borderColor: dark ? '#3a3a3a' : '#b0aba1',
      }}
    >
      {dark ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="4"/>
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/>
        </svg>
      )}
    </button>
  )
}
