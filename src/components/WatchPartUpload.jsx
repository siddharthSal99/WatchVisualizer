import { useRef } from 'react'
import './WatchPartUpload.css'

function WatchPartUpload({ partId, partLabel, image, onImageChange }) {
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      onImageChange(file)
    }
  }

  const handleRemove = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onImageChange(null)
  }

  return (
    <div className="watch-part-upload">
      <label className="part-label">{partLabel}</label>
      <div className="upload-area">
        {image ? (
          <div className="image-preview">
            <img src={image.dataUrl} alt={partLabel} />
            <button className="remove-btn" onClick={handleRemove}>
              ×
            </button>
          </div>
        ) : (
          <div className="upload-placeholder">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="file-input"
              id={`upload-${partId}`}
            />
            <label htmlFor={`upload-${partId}`} className="upload-label">
              <span className="upload-icon">📷</span>
              <span>Click to upload</span>
            </label>
          </div>
        )}
      </div>
    </div>
  )
}

export default WatchPartUpload

