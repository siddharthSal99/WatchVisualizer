import './ColorCustomization.css'

const PART_LABELS = {
  bezel: 'Bezel',
  bezelInsert: 'Bezel Insert',
  case: 'Case',
  dial: 'Dial',
  strap: 'Strap',
  hands: 'Hands',
  chapterRing: 'Chapter Ring',
}

function ColorCustomization({ parts, uploadedParts, colorCustomizations, onColorChange }) {
  return (
    <div className="color-customization">
      <p className="customization-hint">
        Customize colors for uploaded parts using natural language. For example: "red", "gold", "blue with silver accents", "matte black", "rose gold", etc. Leave empty to use the original image colors.
      </p>
      <div className="color-grid">
        {parts
          .filter(part => uploadedParts.includes(part.id))
          .map(part => (
            <div key={part.id} className="color-item">
              <label className="color-label">{PART_LABELS[part.id]}</label>
              <div className="color-input-wrapper">
                <textarea
                  value={colorCustomizations[part.id] || ''}
                  onChange={(e) => onColorChange(part.id, e.target.value.trim() || null)}
                  placeholder="e.g., red, gold, matte black, blue with silver accents..."
                  className="color-text-input"
                  rows="2"
                />
                {colorCustomizations[part.id] && (
                  <button
                    className="clear-color-btn"
                    onClick={() => onColorChange(part.id, null)}
                    title="Clear color customization"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>
      {uploadedParts.length === 0 && (
        <p className="no-parts-message">Upload at least one part to customize colors.</p>
      )}
    </div>
  )
}

export default ColorCustomization

