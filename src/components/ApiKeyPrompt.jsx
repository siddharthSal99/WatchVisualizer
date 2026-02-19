import { useState, useEffect, useRef } from 'react'
import './ApiKeyPrompt.css'

function ApiKeyPrompt({ isOpen, onClose, onSaveKey }) {
  const [localKey, setLocalKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const inputRef = useRef(null)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setLocalKey('')
      setShowKey(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleSave = () => {
    if (localKey.trim()) {
      onSaveKey(localKey.trim())
    }
  }

  return (
    <div
      className="api-key-prompt-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="api-key-prompt-modal">
        <button className="api-key-prompt-close" onClick={onClose} aria-label="Close">×</button>

        <div className="api-key-prompt-icon">⚠️</div>
        <h2 className="api-key-prompt-title">API Key Required</h2>
        <p className="api-key-prompt-desc">
          An OpenAI API key is needed to use AI features. Enter your key below to continue. It is stored locally in your browser and only sent to OpenAI.
        </p>

        <div className="api-key-prompt-input-wrapper">
          <input
            ref={inputRef}
            type={showKey ? 'text' : 'password'}
            className="api-key-prompt-input"
            value={localKey}
            onChange={(e) => setLocalKey(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && localKey.trim()) handleSave() }}
            placeholder="sk-..."
            spellCheck={false}
            autoComplete="off"
          />
          <button
            className="api-key-prompt-toggle"
            onClick={() => setShowKey(!showKey)}
            type="button"
            aria-label={showKey ? 'Hide' : 'Show'}
          >
            {showKey ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="api-key-prompt-actions">
          <button
            className="api-key-prompt-save-btn"
            onClick={handleSave}
            disabled={!localKey.trim()}
          >
            Save Key & Continue
          </button>
          <button className="api-key-prompt-cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="api-key-prompt-link"
        >
          Get an API key from OpenAI →
        </a>
      </div>
    </div>
  )
}

export default ApiKeyPrompt

