import { useState } from 'react'
import './ImageRefinement.css'
import { refineWatchImage } from '../services/openaiService'

function ImageRefinement({ generatedImage, onRefined }) {
  const [refinementText, setRefinementText] = useState('')
  const [isRefining, setIsRefining] = useState(false)
  const [error, setError] = useState(null)

  const handleRefine = async () => {
    if (!refinementText.trim()) {
      setError('Please enter feedback about what to change.')
      return
    }

    setError(null)
    setIsRefining(true)

    try {
      const refinedImage = await refineWatchImage(generatedImage, refinementText)
      onRefined(refinedImage)
      setRefinementText('') // Clear the input after successful refinement
    } catch (err) {
      setError(err.message || 'Failed to refine image. Please try again.')
    } finally {
      setIsRefining(false)
    }
  }

  return (
    <div className="image-refinement">
      <h3>Refine Image</h3>
      <p className="refinement-hint">
        Provide feedback to adjust the generated image. For example: "Move the crown to the 3 o'clock position" or "The hands should be pointing to 10:10"
      </p>
      <div className="refinement-input-wrapper">
        <textarea
          value={refinementText}
          onChange={(e) => setRefinementText(e.target.value)}
          placeholder="e.g., Move the crown to the correct position, adjust the hands to 10:10, fix the bezel alignment..."
          className="refinement-textarea"
          rows="3"
          disabled={isRefining}
        />
        <button
          className="refine-btn"
          onClick={handleRefine}
          disabled={!refinementText.trim() || isRefining}
        >
          {isRefining ? 'Refining...' : 'Apply Changes'}
        </button>
      </div>
      {isRefining && (
        <div className="refinement-loading">
          <div className="spinner-small"></div>
          <p>Applying your changes...</p>
        </div>
      )}
      {error && (
        <div className="refinement-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default ImageRefinement

