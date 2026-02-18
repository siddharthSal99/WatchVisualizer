import { useState, useEffect } from 'react'
import './Gallery.css'
import { getAllGenerations, deleteGeneration, clearAllGenerations } from '../services/galleryDB'

const PART_LABELS = {
  bezel: 'Bezel',
  bezelInsert: 'Bezel Insert',
  case: 'Case',
  crown: 'Crown',
  dial: 'Dial',
  strap: 'Strap',
  hands: 'Hands',
  gmtHand: 'GMT Hand',
  chapterRing: 'Chapter Ring',
  movement: 'Movement',
}

function Gallery({ refreshTrigger }) {
  const [generations, setGenerations] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadGenerations = async () => {
    try {
      const data = await getAllGenerations()
      setGenerations(data)
    } catch (err) {
      console.error('Failed to load gallery:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadGenerations()
  }, [refreshTrigger])

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    if (!confirm('Delete this generation?')) return
    try {
      await deleteGeneration(id)
      setGenerations(prev => prev.filter(g => g.id !== id))
      if (selectedImage?.id === id) {
        setSelectedImage(null)
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all saved generations? This cannot be undone.')) return
    try {
      await clearAllGenerations()
      setGenerations([])
      setSelectedImage(null)
    } catch (err) {
      console.error('Failed to clear gallery:', err)
    }
  }

  const handleDownload = async (imageUrl, e) => {
    e.stopPropagation()
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'watch-visualization.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      window.open(imageUrl, '_blank')
    }
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (isLoading) {
    return (
      <div className="gallery">
        <p className="gallery-loading">Loading gallery...</p>
      </div>
    )
  }

  if (generations.length === 0) {
    return (
      <div className="gallery">
        <div className="gallery-empty">
          <span className="gallery-empty-icon">🖼️</span>
          <p>No saved generations yet.</p>
          <p className="gallery-empty-hint">Generated watch images will appear here automatically.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gallery">
      <div className="gallery-header">
        <span className="gallery-count">{generations.length} saved generation{generations.length !== 1 ? 's' : ''}</span>
        <button className="gallery-clear-btn" onClick={handleClearAll}>
          Clear All
        </button>
      </div>

      <div className="gallery-grid">
        {generations.map((gen) => (
          <div
            key={gen.id}
            className="gallery-card"
            onClick={() => setSelectedImage(gen)}
          >
            <div className="gallery-card-image">
              <img src={gen.imageDataUrl} alt="Generated watch" loading="lazy" />
            </div>
            <div className="gallery-card-info">
              <span className="gallery-card-date">{formatDate(gen.timestamp)}</span>
              <span className="gallery-card-parts">
                {gen.partsUsed.map(p => PART_LABELS[p] || p).join(', ')}
              </span>
            </div>
            <div className="gallery-card-actions">
              <button
                className="gallery-card-download"
                onClick={(e) => handleDownload(gen.imageDataUrl, e)}
                title="Download"
              >
                ⬇
              </button>
              <button
                className="gallery-card-delete"
                onClick={(e) => handleDelete(gen.id, e)}
                title="Delete"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div className="gallery-lightbox" onClick={() => setSelectedImage(null)}>
          <div className="gallery-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="gallery-lightbox-close" onClick={() => setSelectedImage(null)}>
              ×
            </button>
            <img src={selectedImage.imageDataUrl} alt="Generated watch" />
            <div className="gallery-lightbox-info">
              <p className="gallery-lightbox-date">{formatDate(selectedImage.timestamp)}</p>
              <p className="gallery-lightbox-parts">
                Parts: {selectedImage.partsUsed.map(p => PART_LABELS[p] || p).join(', ')}
              </p>
              {Object.keys(selectedImage.colorCustomizations || {}).length > 0 && (
                <p className="gallery-lightbox-colors">
                  Colors: {Object.entries(selectedImage.colorCustomizations)
                    .map(([partId, color]) => `${PART_LABELS[partId] || partId}: ${color}`)
                    .join(', ')}
                </p>
              )}
              <button
                className="gallery-lightbox-download"
                onClick={(e) => handleDownload(selectedImage.imageDataUrl, e)}
              >
                Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Gallery

