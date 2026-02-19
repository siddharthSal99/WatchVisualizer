import { useState, useEffect, useRef } from 'react'
import './HamburgerMenu.css'

function HamburgerMenu({ apiKey, onApiKeyChange }) {
  const [isOpen, setIsOpen] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [localApiKey, setLocalApiKey] = useState(apiKey || '')
  const [keySaved, setKeySaved] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    setLocalApiKey(apiKey || '')
  }, [apiKey])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [])

  const handleSaveKey = () => {
    onApiKeyChange(localApiKey.trim())
    setKeySaved(true)
    setTimeout(() => setKeySaved(false), 2000)
  }

  const handleClearKey = () => {
    setLocalApiKey('')
    onApiKeyChange('')
    setKeySaved(false)
  }

  const hasEnvKey = !!import.meta.env.VITE_OPENAI_API_KEY

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button
        className={`hamburger-btn${isOpen ? ' open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {isOpen && <div className="menu-backdrop" onClick={() => setIsOpen(false)} />}

      <div className={`menu-panel${isOpen ? ' open' : ''}`}>
        <div className="menu-panel-header">
          <h2>Getting Started</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)} aria-label="Close menu">
            ×
          </button>
        </div>

        <div className="menu-panel-content">
          {/* API Key Section */}
          <section className="menu-section api-key-section">
            <h3>🔑 API Key</h3>
            <p className="section-desc">
              Enter your OpenAI API key to use the app. Your key is stored locally in your browser and never sent anywhere except OpenAI.
            </p>
            {hasEnvKey && !localApiKey && (
              <div className="env-key-badge">
                <span className="badge-dot active"></span>
                Using API key from .env file
              </div>
            )}
            <div className="api-key-input-group">
              <div className="api-key-input-wrapper">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="api-key-input"
                  value={localApiKey}
                  onChange={(e) => {
                    setLocalApiKey(e.target.value)
                    setKeySaved(false)
                  }}
                  placeholder={hasEnvKey ? 'Override .env key (optional)' : 'sk-...'}
                  spellCheck={false}
                  autoComplete="off"
                />
                <button
                  className="toggle-visibility-btn"
                  onClick={() => setShowApiKey(!showApiKey)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                  type="button"
                >
                  {showApiKey ? '🙈' : '👁️'}
                </button>
              </div>
              <div className="api-key-actions">
                <button className="save-key-btn" onClick={handleSaveKey} disabled={!localApiKey.trim()}>
                  {keySaved ? '✓ Saved' : 'Save Key'}
                </button>
                {localApiKey && (
                  <button className="clear-key-btn" onClick={handleClearKey}>
                    Clear
                  </button>
                )}
              </div>
            </div>
            {keySaved && (
              <div className="key-saved-msg">API key saved successfully!</div>
            )}
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-link"
            >
              Get an API key from OpenAI →
            </a>
          </section>

          {/* Setup Steps */}
          <section className="menu-section">
            <h3>📋 Setup Steps</h3>
            <ol className="setup-steps">
              <li>
                <strong>Get an API Key</strong>
                <p>
                  Sign up or log in at{' '}
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                    OpenAI Platform
                  </a>{' '}
                  and create an API key.
                </p>
              </li>
              <li>
                <strong>Verify Your Organization</strong>
                <p>
                  You must verify yourself as an organization or solo developer at{' '}
                  <a href="https://platform.openai.com/settings/organization/general" target="_blank" rel="noopener noreferrer">
                    OpenAI Organization Settings
                  </a>{' '}
                  to access the image generation API.
                </p>
              </li>
              <li>
                <strong>Enter Your API Key</strong>
                <p>
                  Paste your API key in the field above, or add it to a <code>.env</code> file as{' '}
                  <code>VITE_OPENAI_API_KEY=your_key</code>.
                </p>
              </li>
              <li>
                <strong>Ensure Sufficient Credits</strong>
                <p>
                  Image generation requires API credits. Make sure you have sufficient credits in your{' '}
                  <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer">
                    OpenAI billing account
                  </a>.
                </p>
              </li>
            </ol>
          </section>

          {/* Usage Guide */}
          <section className="menu-section">
            <h3>🎯 How to Use</h3>
            <ol className="usage-steps">
              <li>
                <strong>Upload Watch Parts</strong> — Click, paste, or drag & drop images for any watch part. You don't need all parts, just the ones you have.
              </li>
              <li>
                <strong>Customize Colors</strong> (Optional) — Specify custom colors using natural language, e.g. "rose gold", "matte black", "blue with silver accents".
              </li>
              <li>
                <strong>Generate Image</strong> — Click "Generate Watch Image" to create a composite visualization using AI.
              </li>
              <li>
                <strong>Refine & Download</strong> — Refine the result with text feedback and download the final image.
              </li>
            </ol>
          </section>

          {/* Important Links */}
          <section className="menu-section">
            <h3>🔗 Important Links</h3>
            <ul className="links-list">
              <li>
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">
                  🔑 OpenAI API Keys
                </a>
              </li>
              <li>
                <a href="https://platform.openai.com/settings/organization/general" target="_blank" rel="noopener noreferrer">
                  🏢 Organization Verification
                </a>
              </li>
              <li>
                <a href="https://platform.openai.com/account/billing" target="_blank" rel="noopener noreferrer">
                  💳 Billing & Credits
                </a>
              </li>
              <li>
                <a href="https://platform.openai.com/docs/guides/images" target="_blank" rel="noopener noreferrer">
                  📖 Image Generation Docs
                </a>
              </li>
              <li>
                <a href="https://openai.com/pricing" target="_blank" rel="noopener noreferrer">
                  💰 OpenAI Pricing
                </a>
              </li>
            </ul>
          </section>

          {/* API Requirements */}
          <section className="menu-section">
            <h3>⚙️ API Requirements</h3>
            <ul className="requirements-list">
              <li><strong>GPT-4o</strong> with vision capabilities</li>
              <li><strong>gpt-image-1.5</strong> / <strong>gpt-image-1</strong> for image editing</li>
              <li><strong>DALL-E 3</strong> as fallback for image generation</li>
            </ul>
          </section>

          {/* Security Note */}
          <section className="menu-section security-note">
            <h3>⚠️ Security Note</h3>
            <p>
              This app uses your API key directly in the browser. This is acceptable for personal/development use, but for production you should use a backend proxy to keep your key secure.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}

export default HamburgerMenu

