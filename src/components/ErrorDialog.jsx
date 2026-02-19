import { useEffect, useRef } from 'react'
import './ErrorDialog.css'

function ErrorDialog({ isOpen, title, message, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="error-dialog-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="error-dialog-modal">
        <button className="error-dialog-close" onClick={onClose} aria-label="Close">×</button>

        <div className="error-dialog-icon">⚠️</div>
        <h2 className="error-dialog-title">{title}</h2>
        <p className="error-dialog-message">{message}</p>

        <div className="error-dialog-actions">
          <button className="error-dialog-ok-btn" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default ErrorDialog

