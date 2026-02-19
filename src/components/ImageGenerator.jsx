import { useState, useEffect } from 'react'
import './ImageGenerator.css'
import { generateWatchImage } from '../services/openaiService'
import ImageRefinement from './ImageRefinement'

const PART_LABELS = {
  bezel: 'bezel',
  bezelInsert: 'bezel insert',
  case: 'case',
  crown: 'crown',
  dial: 'dial',
  strap: 'strap',
  hands: 'hands',
  gmtHand: 'GMT hand',
  chapterRing: 'chapter ring',
  movement: 'movement',
}

// Cost estimation based on OpenAI pricing (approximate)
// Primary: gpt-image-1.5 images.edit ~ $0.02-$0.05 base + input tokens
// Fallback: GPT-4o vision ($0.005) + DALL-E 3 ($0.04) ~ $0.045
function estimateCost(numParts) {
  // Base cost for generation (gpt-image-1.5 output)
  const baseCost = 0.02
  // Additional cost per input image (token-based, ~$0.003-0.008 per image)
  const perImageCost = 0.005
  const low = baseCost + numParts * perImageCost * 0.6
  const high = baseCost + numParts * perImageCost * 1.8
  return {
    low: Math.max(0.01, low).toFixed(2),
    high: Math.max(0.03, high).toFixed(2),
  }
}

// Loading step messages that rotate during generation
const LOADING_STEPS = [
  { message: 'Uploading part images...', duration: 3000 },
  { message: 'Analyzing watch parts...', duration: 5000 },
  { message: 'Compositing watch design...', duration: 8000 },
  { message: 'Generating photorealistic image...', duration: 15000 },
  { message: 'Applying finishing touches...', duration: 10000 },
  { message: 'Almost there...', duration: 60000 },
]

function ImageGenerator({ partImages, colorCustomizations, partDimensions, isSkeletonDial, generatedImage, isGenerating, onGenerate, onGeneratingStart, onGeneratingStop, requireApiKey }) {
  const [error, setError] = useState(null)
  const [loadingStep, setLoadingStep] = useState(0)

  // Cycle through loading steps while generating
  useEffect(() => {
    if (!isGenerating) {
      setLoadingStep(0)
      return
    }

    let stepIndex = 0
    setLoadingStep(0)

    const advance = () => {
      stepIndex++
      if (stepIndex < LOADING_STEPS.length) {
        setLoadingStep(stepIndex)
        timer = setTimeout(advance, LOADING_STEPS[stepIndex].duration)
      }
    }

    let timer = setTimeout(advance, LOADING_STEPS[0].duration)
    return () => clearTimeout(timer)
  }, [isGenerating])

  const doGenerate = async () => {
    setError(null)
    onGeneratingStart()

    try {
      const image = await generateWatchImage(partImages, colorCustomizations, partDimensions, isSkeletonDial)
      onGenerate(image)
    } catch (err) {
      setError(err.message || 'Failed to generate image. Please check your API key and try again.')
      if (onGeneratingStop) {
        onGeneratingStop()
      }
    }
  }

  const handleGenerate = () => {
    const uploadedParts = Object.keys(partImages)
    
    if (uploadedParts.length === 0) {
      setError('Please upload at least one watch part image.')
      return
    }

    if (requireApiKey) {
      requireApiKey(doGenerate)
    } else {
      doGenerate()
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
  const cost = hasParts ? estimateCost(uploadedParts.length) : null

  return (
    <div className="image-generator">
      <div className="generator-controls">
        <div className="generate-btn-group">
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={!hasParts || isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Watch Image'}
          </button>
          {cost && !isGenerating && (
            <span className="cost-estimate" title="Approximate OpenAI API cost per generation">
              Est. ~${cost.low} – ${cost.high}
            </span>
          )}
        </div>
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
          <p className="loading-step-message">
            {LOADING_STEPS[loadingStep]?.message || 'Generating your watch visualization...'}
          </p>
          <div className="loading-progress">
            {LOADING_STEPS.map((_, i) => (
              <span
                key={i}
                className={`loading-dot${i <= loadingStep ? ' active' : ''}`}
              />
            ))}
          </div>
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
            requireApiKey={requireApiKey}
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
