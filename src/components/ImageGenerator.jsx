import { useState } from 'react'
import './ImageGenerator.css'
import { generateWatchImage } from '../services/openaiService'
import ImageRefinement from './ImageRefinement'

const PART_LABELS = {
  bezel: 'bezel',
  bezelInsert: 'bezel insert',
  case: 'case',
  dial: 'dial',
  strap: 'strap',
  hands: 'hands',
  chapterRing: 'chapter ring',
}

function ImageGenerator({ partImages, colorCustomizations, generatedImage, isGenerating, onGenerate, onGeneratingStart, onGeneratingStop }) {
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    const uploadedParts = Object.keys(partImages)
    
    if (uploadedParts.length === 0) {
      setError('Please upload at least one watch part image.')
      return
    }

    setError(null)
    onGeneratingStart()

    try {
      const image = await generateWatchImage(partImages, colorCustomizations)
      onGenerate(image)
    } catch (err) {
      setError(err.message || 'Failed to generate image. Please check your API key and try again.')
      if (onGeneratingStop) {
        onGeneratingStop()
      }
    }
  }

  const handleDownload = async () => {
    if (generatedImage) {
      try {
        // Fetch the image from the URL (DALL-E returns external URLs)
        const response = await fetch(generatedImage)
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
        console.error('Download failed:', err)
        // Fallback: open in new tab
        window.open(generatedImage, '_blank')
      }
    }
  }

  const uploadedParts = Object.keys(partImages)
  const hasParts = uploadedParts.length > 0

  return (
    <div className="image-generator">
      <div className="generator-controls">
        <button
          className="generate-btn"
          onClick={handleGenerate}
          disabled={!hasParts || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate Watch Image'}
        </button>
        {generatedImage && (
          <button className="download-btn" onClick={handleDownload}>
            Download Image
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {isGenerating && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating your watch visualization...</p>
        </div>
      )}

      {generatedImage && !isGenerating && (
        <>
          <div className="generated-image-container">
            <h3>Generated Watch</h3>
            <img src={generatedImage} alt="Generated watch" className="generated-image" />
          </div>
          <ImageRefinement
            generatedImage={generatedImage}
            onRefined={(refinedImage) => {
              onGenerate(refinedImage)
            }}
          />
        </>
      )}

      {!hasParts && (
        <p className="hint-message">Upload watch parts above to generate a visualization.</p>
      )}
    </div>
  )
}

export default ImageGenerator

