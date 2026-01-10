import { useState } from 'react'
import './App.css'
import WatchPartUpload from './components/WatchPartUpload'
import ColorCustomization from './components/ColorCustomization'
import ImageGenerator from './components/ImageGenerator'

const WATCH_PARTS = [
  { id: 'bezel', label: 'Bezel' },
  { id: 'bezelInsert', label: 'Bezel Insert' },
  { id: 'case', label: 'Case' },
  { id: 'dial', label: 'Dial' },
  { id: 'strap', label: 'Strap' },
  { id: 'hands', label: 'Hands' },
  { id: 'chapterRing', label: 'Chapter Ring' },
]

function App() {
  const [partImages, setPartImages] = useState({})
  const [colorCustomizations, setColorCustomizations] = useState({})
  const [generatedImage, setGeneratedImage] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)

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

