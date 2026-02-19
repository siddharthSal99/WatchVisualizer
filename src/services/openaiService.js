// Resolve the API key: runtime key from localStorage takes priority, then .env
function getApiKey() {
  const runtimeKey = localStorage.getItem('openai_api_key')
  if (runtimeKey) return runtimeKey
  return import.meta.env.VITE_OPENAI_API_KEY || ''
}

// Check whether the user has an API key configured
export function hasApiKey() {
  return !!getApiKey()
}

// Resize an image data URL to a max dimension to keep payloads small
function resizeImage(dataUrl, maxDimension = 1024) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl)
        return
      }
      const ratio = Math.min(maxDimension / width, maxDimension / height)
      width = Math.round(width * ratio)
      height = Math.round(height * ratio)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(dataUrl) // fallback to original on error
    img.src = dataUrl
  })
}

// Helper: call an API endpoint and return the parsed JSON
async function callApi(endpoint, body) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please enter your API key via the menu (\u2630) or set VITE_OPENAI_API_KEY in your .env file.')
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || `API request failed (${response.status})`)
  }

  return data
}

export async function generateWatchImage(partImages, colorCustomizations, partDimensions = {}, isSkeletonDial = false) {
  // Convert {partId: {file, dataUrl}} → {partId: dataUrl} and resize
  const imageDataUrls = {}
  await Promise.all(
    Object.entries(partImages).map(async ([partId, img]) => {
      imageDataUrls[partId] = await resizeImage(img.dataUrl)
    })
  )

  const data = await callApi('/api/generate', {
    partImages: imageDataUrls,
    colorCustomizations,
    partDimensions,
    isSkeletonDial,
  })

  return data.image
}

export async function extractPartFromWatch(imageDataUrl, partId) {
  const resized = await resizeImage(imageDataUrl)

  const data = await callApi('/api/extract', {
    imageDataUrl: resized,
    partId,
  })

  return data.image
}

export async function refineWatchImage(generatedImageUrl, refinementText) {
  // If it's a data URL, resize; if it's an external URL, send as-is
  let imageDataUrl = generatedImageUrl
  if (generatedImageUrl.startsWith('data:')) {
    imageDataUrl = await resizeImage(generatedImageUrl)
  }

  const data = await callApi('/api/refine', {
    imageDataUrl,
    refinementText,
  })

  return data.image
}
