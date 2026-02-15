import OpenAI from 'openai'

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
}

export async function generateWatchImage(partImages, colorCustomizations, partDimensions = {}) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
  })

  // Build the list of uploaded parts
  const uploadedParts = Object.keys(partImages)
  const partList = uploadedParts.map(partId => PART_LABELS[partId]).join(', ')

  // Build dimension instructions text
  const DIMENSION_LABELS = {
    outerDiameter: 'outer diameter',
    lugWidth: 'lug width',
    strapWidth: 'strap width',
    diameter: 'diameter',
    length: 'length',
  }

  const dimensionInstructions = Object.entries(partDimensions)
    .filter(([partId]) => uploadedParts.includes(partId))
    .map(([partId, dims]) => {
      const partName = PART_LABELS[partId]
      const measurements = Object.entries(dims)
        .filter(([, val]) => val !== '' && val != null)
        .map(([dimKey, val]) => `${DIMENSION_LABELS[dimKey] || dimKey} of ${val} mm`)
        .join(' and ')
      if (!measurements) return null
      return `The ${partName} has a ${measurements}.`
    })
    .filter(Boolean)
    .join(' ')

  // Build color customization text
  const colorInstructions = Object.entries(colorCustomizations)
    .map(([partId, color]) => {
      const partName = PART_LABELS[partId]
      return `The ${partName} should be ${color}.`
    })
    .join(' ')

  // Build a detailed prompt that emphasizes faithful reproduction of shapes and details
  let prompt = `Here are images of individual watch parts: ${partList}. Generate a photorealistic image of the fully assembled wristwatch using exactly these parts. It is critical that you faithfully reproduce the exact shape, silhouette, proportions, colors, and fine details of every single part as shown in the reference images. Do not substitute generic or default shapes for any part.

Specific instructions:
- HANDS: Reproduce the exact hand style and silhouette from the image (e.g. cathedral, dauphine, snowflake, sword, pencil, skeleton, etc.). Match the hand width, length ratio, lume plots, and tip shape precisely. Do not use generic stick hands unless that is what is shown.
- DIAL: Reproduce all dial features exactly — hour indices/markers (applied, printed, or lumed), minute track, any text or logos, subdials, date windows, patterns, textures (sunburst, fumé, guilloche, etc.), and artwork. Match the layout and positioning faithfully.
- BEZEL INSERT: Reproduce all bezel insert markings, numerals, minute/hour scales, color gradients (e.g. Pepsi, Batman, Root Beer), the pip/lume dot at 12, and the exact font style of any numbers.
- CASE, CROWN, CHAPTER RING, STRAP/BRACELET, GMT HAND: Match the exact shape, finish (brushed, polished, matte), proportions, and design details from each reference image.`
  
  if (colorInstructions) {
    prompt += `\n\nColor/style overrides: ${colorInstructions}`
  }

  if (dimensionInstructions) {
    prompt += `\n\nProportional dimensions (use these to size the parts relative to each other): ${dimensionInstructions}`
  }

  // Helper function to convert data URL to File object
  const convertDataUrlToFile = async (dataUrl, filename) => {
    const response = await fetch(dataUrl)
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type })
  }

  // Convert images to format for the API (for fallback)
  const imageContents = uploadedParts.map((partId) => {
    const imageData = partImages[partId].dataUrl
    return {
      type: "image_url",
      image_url: {
        url: imageData
      }
    }
  })

  try {
    // Try using the images.edit API - this directly generates images from input images
    // This matches the Python example format
    try {
      // Convert all image data URLs to File objects
      const imageFiles = await Promise.all(
        uploadedParts.map(async (partId) => {
          const imageData = partImages[partId].dataUrl
          const filename = `${PART_LABELS[partId]}.png`
          return await convertDataUrlToFile(imageData, filename)
        })
      )

      // Call images.edit with the images and prompt
      // Try gpt-image-1.5 first (better quality and faster), fallback to gpt-image-1, then try without model
      let result
      try {
        result = await openai.images.edit({
          model: "gpt-image-1.5",
          image: imageFiles,
          prompt: prompt,
          input_fidelity: "high"
        })
      } catch (modelError) {
        // Fallback to gpt-image-1 if 1.5 is not available
        if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
          try {
            result = await openai.images.edit({
              model: "gpt-image-1",
              image: imageFiles,
              prompt: prompt,
              input_fidelity: "high"
            })
          } catch (model1Error) {
            // Final fallback: try without specifying a model (use API default)
            if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
              result = await openai.images.edit({
                image: imageFiles,
                prompt: prompt,
                input_fidelity: "high"
              })
            } else {
              throw model1Error
            }
          }
        } else {
          throw modelError
        }
      }

      // The result contains base64 JSON
      if (result.data && result.data[0] && result.data[0].b64_json) {
        // Convert base64 to data URL
        return `data:image/png;base64,${result.data[0].b64_json}`
      } else if (result.data && result.data[0] && result.data[0].url) {
        // Fallback to URL if provided
        return result.data[0].url
      } else {
        throw new Error('Unexpected response format from images.edit API')
      }
    } catch (imagesEditError) {
      console.log('Images.edit API not available or failed, falling back to chat completions + DALL-E:', imagesEditError)
      // Fall through to chat completions approach
    }

    // Fallback: Use GPT-4 Vision with the prompt and images
    // The images are passed directly to the vision model so it can see them
    // Ask GPT-4 Vision to describe what the assembled watch would look like
    const visionPrompt = `${prompt}

Additionally, please provide an extremely detailed description of what this assembled watch would look like. For each part, describe:
- The exact shape and silhouette (e.g. for hands: cathedral, snowflake, dauphine, sword, etc.)
- All markings, indices, numerals, text, logos, and their precise positioning
- Colors, gradients, and finishes (brushed, polished, matte, sunburst, fumé, etc.)
- Textures, patterns, and any artwork on the dial
- Proportions and how the parts relate to each other in size
Be as specific as possible so the description alone could recreate the watch faithfully.`
    
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            ...imageContents
          ]
        }
      ],
      max_tokens: 2000
    })

    // GPT-4 Vision has analyzed the actual images and described the assembled watch
    // Use its description directly as the DALL-E prompt - this keeps it faithful to what it saw
    const description = visionResponse.choices[0].message.content
    const dallePrompt = `A wristwatch: ${description}`
    
    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: dallePrompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    })

    return imageResponse.data[0].url
  } catch (error) {
    console.error('OpenAI API Error:', error)
    
    // Fallback to gpt-4-vision-preview if gpt-4o is not available
    if (error.message?.includes('gpt-4o') || error.code === 'model_not_found') {
      try {
        const visionPrompt = `${prompt}

Additionally, please provide an extremely detailed description of what this assembled watch would look like. For each part, describe:
- The exact shape and silhouette (e.g. for hands: cathedral, snowflake, dauphine, sword, etc.)
- All markings, indices, numerals, text, logos, and their precise positioning
- Colors, gradients, and finishes (brushed, polished, matte, sunburst, fumé, etc.)
- Textures, patterns, and any artwork on the dial
- Proportions and how the parts relate to each other in size
Be as specific as possible so the description alone could recreate the watch faithfully.`
        
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: visionPrompt },
                ...imageContents
              ]
            }
          ],
          max_tokens: 2000
        })

        const description = visionResponse.choices[0].message.content
        const dallePrompt = `A wristwatch: ${description}`
        
        const imageResponse = await openai.images.generate({
          model: "dall-e-3",
          prompt: dallePrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard"
        })

        return imageResponse.data[0].url
      } catch (fallbackError) {
        throw new Error(fallbackError.message || 'Failed to generate image')
      }
    }
    throw new Error(error.message || 'Failed to generate image')
  }
}

// Function to extract/isolate a specific watch part from a full watch image
export async function extractPartFromWatch(imageDataUrl, partId) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true
  })

  const partName = PART_LABELS[partId] || partId

  const prompt = `This image shows a complete wristwatch. Please extract and isolate ONLY the ${partName} from this watch. Show the isolated ${partName} by itself on a clean, plain white background. Remove all other parts of the watch — only the ${partName} should remain. Preserve the exact shape, colors, textures, markings, and all fine details of the ${partName} as they appear in the original image.`

  // Convert data URL to File object
  const response = await fetch(imageDataUrl)
  const blob = await response.blob()
  const imageFile = new File([blob], `watch_for_${partName}.png`, { type: blob.type })

  try {
    let result
    try {
      result = await openai.images.edit({
        model: "gpt-image-1.5",
        image: imageFile,
        prompt: prompt,
        input_fidelity: "high"
      })
    } catch (modelError) {
      if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
        try {
          result = await openai.images.edit({
            model: "gpt-image-1",
            image: imageFile,
            prompt: prompt,
            input_fidelity: "high"
          })
        } catch (model1Error) {
          if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
            result = await openai.images.edit({
              image: imageFile,
              prompt: prompt,
              input_fidelity: "high"
            })
          } else {
            throw model1Error
          }
        }
      } else {
        throw modelError
      }
    }

    if (result.data && result.data[0] && result.data[0].b64_json) {
      return `data:image/png;base64,${result.data[0].b64_json}`
    } else if (result.data && result.data[0] && result.data[0].url) {
      return result.data[0].url
    } else {
      throw new Error('Unexpected response format from images.edit API')
    }
  } catch (error) {
    console.error('Extract part error:', error)
    throw new Error(error.message || `Failed to extract ${partName} from watch image`)
  }
}

// Function to refine an existing generated image based on text feedback
export async function refineWatchImage(generatedImageUrl, refinementText) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPENAI_API_KEY in your .env file.')
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
  })

  // Helper function to convert data URL or URL to File object
  const convertImageToFile = async (imageUrl, filename) => {
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type })
  }

  try {
    // Convert the generated image to a File object
    const imageFile = await convertImageToFile(generatedImageUrl, 'generated_watch.png')

    // Build the refinement prompt
    const prompt = refinementText

    // Try using images.edit API to refine the image
    let result
    try {
      result = await openai.images.edit({
        model: "gpt-image-1.5",
        image: imageFile,
        prompt: prompt,
        input_fidelity: "high"
      })
    } catch (modelError) {
      // Fallback to gpt-image-1 if 1.5 is not available
      if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
        try {
          result = await openai.images.edit({
            model: "gpt-image-1",
            image: imageFile,
            prompt: prompt,
            input_fidelity: "high"
          })
        } catch (model1Error) {
          // Final fallback: try without specifying a model (use API default)
          if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
            result = await openai.images.edit({
              image: imageFile,
              prompt: prompt,
              input_fidelity: "high"
            })
          } else {
            throw model1Error
          }
        }
      } else {
        throw modelError
      }
    }

    // The result contains base64 JSON
    if (result.data && result.data[0] && result.data[0].b64_json) {
      // Convert base64 to data URL
      return `data:image/png;base64,${result.data[0].b64_json}`
    } else if (result.data && result.data[0] && result.data[0].url) {
      // Fallback to URL if provided
      return result.data[0].url
    } else {
      throw new Error('Unexpected response format from images.edit API')
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    throw new Error(error.message || 'Failed to refine image')
  }
}

