import { useState, useCallback, useRef } from 'react'
import './App.css'
import WatchPartUpload from './components/WatchPartUpload'
import ColorCustomization from './components/ColorCustomization'
import ImageGenerator from './components/ImageGenerator'
import HamburgerMenu from './components/HamburgerMenu'
import Gallery from './components/Gallery'
import ApiKeyPrompt from './components/ApiKeyPrompt'
import ErrorDialog from './components/ErrorDialog'
import { extractPartFromWatch, hasApiKey } from './services/openaiService'

const MAX_IMAGE_SIZE_MB = 20
const MAX_IMAGE_SIZE_BYTES = MAX_IMAGE_SIZE_MB * 1024 * 1024
import { saveGeneration } from './services/galleryDB'

const WATCH_PARTS = [
  { id: 'bezel', label: 'Bezel' },
  { id: 'bezelInsert', label: 'Bezel Insert' },
  { id: 'case', label: 'Case' },
  { id: 'crown', label: 'Crown' },
  { id: 'dial', label: 'Dial' },
  { id: 'strap', label: 'Strap' },
  { id: 'hands', label: 'Hands' },
  { id: 'gmtHand', label: 'GMT Hand' },
  { id: 'chapterRing', label: 'Chapter Ring' },
  { id: 'movement', label: 'Movement' },
]

const PART_DIMENSIONS = {
  case: [
    { key: 'outerDiameter', label: 'Outer Diameter', unit: 'mm' },
    { key: 'lugWidth', label: 'Lug Width', unit: 'mm' },
  ],
  strap: [
    { key: 'strapWidth', label: 'Strap Width', unit: 'mm' },
  ],
  dial: [
    { key: 'diameter', label: 'Diameter', unit: 'mm' },
  ],
  hands: [
    { key: 'hourHandLength', label: 'Hour Hand Length', unit: 'mm' },
    { key: 'minuteHandLength', label: 'Minute Hand Length', unit: 'mm' },
    { key: 'secondHandLength', label: 'Second Hand Length', unit: 'mm' },
  ],
}

function App() {
  const [partImages, setPartImages] = useState({})
  const [colorCustomizations, setColorCustomizations] = useState({})
  const [generatedImage, setGeneratedImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [extractingParts, setExtractingParts] = useState({})
  const [partDimensions, setPartDimensions] = useState({})
  const [isSkeletonDial, setIsSkeletonDial] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '')
  const [galleryRefresh, setGalleryRefresh] = useState(0)
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false)
  const [errorDialog, setErrorDialog] = useState({ open: false, title: '', message: '' })
  const pendingActionRef = useRef(null)

  const handleApiKeyChange = (key) => {
    setApiKey(key)
    if (key) {
      localStorage.setItem('openai_api_key', key)
    } else {
      localStorage.removeItem('openai_api_key')
    }
  }

  // Gate an AI operation: if no key, show prompt; otherwise run immediately.
  const requireApiKey = useCallback((action) => {
    if (hasApiKey()) {
      action()
    } else {
      pendingActionRef.current = action
      setShowApiKeyPrompt(true)
    }
  }, [])

  const handleApiKeyPromptSave = (key) => {
    handleApiKeyChange(key)
    setShowApiKeyPrompt(false)
    const action = pendingActionRef.current
    pendingActionRef.current = null
    if (action) action()
  }

  const handleApiKeyPromptClose = () => {
    setShowApiKeyPrompt(false)
    pendingActionRef.current = null
  }

  const handleImageUpload = (partId, file) => {
    if (file) {
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
        setErrorDialog({
          open: true,
          title: 'Image Too Large',
          message: `The selected image is ${sizeMB} MB, which exceeds the maximum allowed size of ${MAX_IMAGE_SIZE_MB} MB. Please choose a smaller image or reduce its size before uploading.`,
        })
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        setPartImages(prev => ({
          ...prev,
          [partId]: {
            file: file,
            dataUrl: e.target.result
          }
        }))
      }
      reader.readAsDataURL(file)
    } else {
      setPartImages(prev => {
        const newImages = { ...prev }
        delete newImages[partId]
        return newImages
      })
      // Clear dimensions when the image is removed
      setPartDimensions(prev => {
        const newDims = { ...prev }
        delete newDims[partId]
        return newDims
      })
    }
  }

  const handleDimensionChange = (partId, dimensionKey, value) => {
    setPartDimensions(prev => {
      const partDims = { ...(prev[partId] || {}) }
      if (value === '' || value == null) {
        delete partDims[dimensionKey]
      } else {
        partDims[dimensionKey] = value
      }
      // If no dimensions left for this part, remove the entry
      if (Object.keys(partDims).length === 0) {
        const newDims = { ...prev }
        delete newDims[partId]
        return newDims
      }
      return { ...prev, [partId]: partDims }
    })
  }

  const doExtractPart = async (partId) => {
    const image = partImages[partId]
    if (!image) return

    setExtractingParts(prev => ({ ...prev, [partId]: true }))

    try {
      const extractedDataUrl = await extractPartFromWatch(image.dataUrl, partId)
      setPartImages(prev => ({
        ...prev,
        [partId]: {
          file: prev[partId].file,
          dataUrl: extractedDataUrl
        }
      }))
    } catch (err) {
      alert(`Failed to extract part: ${err.message}`)
    } finally {
      setExtractingParts(prev => {
        const updated = { ...prev }
        delete updated[partId]
        return updated
      })
    }
  }

  const handleExtractPart = (partId) => {
    requireApiKey(() => doExtractPart(partId))
  }

  const handleColorChange = (partId, color) => {
    if (color) {
      setColorCustomizations(prev => ({
        ...prev,
        [partId]: color
      }))
    } else {
      setColorCustomizations(prev => {
        const newCustomizations = { ...prev }
        delete newCustomizations[partId]
        return newCustomizations
      })
    }
  }

  // Save generated image to gallery and refresh it
  const handleGenerate = useCallback(async (image) => {
    setGeneratedImage(image)
    setIsGenerating(false)

    // Auto-save to gallery
    try {
      await saveGeneration({
        imageDataUrl: image,
        partsUsed: Object.keys(partImages),
        colorCustomizations,
      })
      setGalleryRefresh(prev => prev + 1)
    } catch (err) {
      console.error('Failed to save to gallery:', err)
    }
  }, [partImages, colorCustomizations])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-spacer"></div>
          <div className="header-title-group">
            <h1>Watch Visualizer</h1>
            <p>Upload watch parts and generate a composite image</p>
          </div>
          <div className="header-menu">
            <HamburgerMenu apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
          </div>
        </div>
      </header>

      <div className="app-content">
        <div className="upload-section">
          <h2>Upload Watch Parts</h2>
          <div className="parts-grid">
            {WATCH_PARTS.map(part => (
              <WatchPartUpload
                key={part.id}
                partId={part.id}
                partLabel={part.label}
                image={partImages[part.id]}
                onImageChange={(file) => handleImageUpload(part.id, file)}
                onExtractPart={() => handleExtractPart(part.id)}
                isExtracting={!!extractingParts[part.id]}
                dimensionFields={PART_DIMENSIONS[part.id] || []}
                dimensions={partDimensions[part.id] || {}}
                onDimensionChange={(dimKey, value) => handleDimensionChange(part.id, dimKey, value)}
                {...(part.id === 'dial' ? {
                  checkboxLabel: 'Skeleton / Open Heart',
                  checkboxValue: isSkeletonDial,
                  onCheckboxChange: setIsSkeletonDial,
                } : {})}
              />
            ))}
          </div>
        </div>

        <div className="customization-section">
          <h2>Color Customizations</h2>
          <ColorCustomization
            parts={WATCH_PARTS}
            uploadedParts={Object.keys(partImages)}
            colorCustomizations={colorCustomizations}
            onColorChange={handleColorChange}
          />
        </div>

        <div className="generator-section">
          <ImageGenerator
            partImages={partImages}
            colorCustomizations={colorCustomizations}
            partDimensions={partDimensions}
            isSkeletonDial={isSkeletonDial}
            generatedImage={generatedImage}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onGeneratingStart={() => setIsGenerating(true)}
            onGeneratingStop={() => setIsGenerating(false)}
            requireApiKey={requireApiKey}
          />
        </div>

        <div className="gallery-section">
          <h2>Generation History</h2>
          <Gallery refreshTrigger={galleryRefresh} />
        </div>
      </div>

      <ApiKeyPrompt
        isOpen={showApiKeyPrompt}
        onClose={handleApiKeyPromptClose}
        onSaveKey={handleApiKeyPromptSave}
      />

      <ErrorDialog
        isOpen={errorDialog.open}
        title={errorDialog.title}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ open: false, title: '', message: '' })}
      />
    </div>
  )
}

export default App
