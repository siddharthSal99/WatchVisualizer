import { useState } from 'react'
import './App.css'
import WatchPartUpload from './components/WatchPartUpload'
import ColorCustomization from './components/ColorCustomization'
import ImageGenerator from './components/ImageGenerator'
import { extractPartFromWatch } from './services/openaiService'

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
    { key: 'length', label: 'Length', unit: 'mm' },
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

  const handleImageUpload = (partId, file) => {
    if (file) {
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

  const handleExtractPart = async (partId) => {
    const image = partImages[partId]
    if (!image) return

    setExtractingParts(prev => ({ ...prev, [partId]: true }))

    try {
      const extractedDataUrl = await extractPartFromWatch(image.dataUrl, partId)
      // Replace the uploaded image with the extracted part image
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>Watch Visualizer</h1>
        <p>Upload watch parts and generate a composite image</p>
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
            onGenerate={(image) => {
              setGeneratedImage(image)
              setIsGenerating(false)
            }}
            onGeneratingStart={() => setIsGenerating(true)}
            onGeneratingStop={() => setIsGenerating(false)}
          />
        </div>
      </div>
    </div>
  )
}

export default App

