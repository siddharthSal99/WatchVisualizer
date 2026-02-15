import { useRef } from 'react'
import './WatchPartUpload.css'

function WatchPartUpload({ partId, partLabel, image, onImageChange, onExtractPart, isExtracting, dimensionFields, dimensions, onDimensionChange }) {
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
            <button className="remove-btn" onClick={handleRemove} disabled={isExtracting}>
              ×
            </button>
            {isExtracting && (
              <div className="extract-overlay">
                <div className="extract-spinner"></div>
                <span>Extracting {partLabel}...</span>
              </div>
            )}
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
      {image && !isExtracting && (
        <button
          className="extract-btn"
          onClick={onExtractPart}
          title={`Extract the ${partLabel.toLowerCase()} from a full watch image`}
        >
          ✂️ Extract from Watch
        </button>
      )}
      {image && dimensionFields && dimensionFields.length > 0 && (
        <div className="dimension-fields">
          {dimensionFields.map(field => (
            <div key={field.key} className="dimension-input-row">
              <label className="dimension-label">{field.label}</label>
              <div className="dimension-input-wrapper">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  className="dimension-input"
                  value={dimensions[field.key] ?? ''}
                  onChange={(e) => onDimensionChange(field.key, e.target.value)}
                  placeholder="—"
                />
                <span className="dimension-unit">{field.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WatchPartUpload
