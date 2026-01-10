import OpenAI from 'openai'

const PART_LABELS = {
  bezel: 'bezel',
  bezelInsert: 'bezel insert',
  case: 'case',
  dial: 'dial',
  strap: 'strap',
  hands: 'hands',
  chapterRing: 'chapter ring',
}

export async function generateWatchImage(partImages, colorCustomizations) {
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

  // Build color customization text
  const colorInstructions = Object.entries(colorCustomizations)
    .map(([partId, color]) => {
      const partName = PART_LABELS[partId]
      return `The ${partName} should be ${color}.`
    })
    .join(' ')

  // Build the simple prompt exactly as the user specified (matching ChatGPT web interface)
  let prompt = `Here is an image of a watch ${partList}. Please show me an image of what the watch constructed of these parts would look like. Please pay attention to the colors and shapes of the various parts.`
  
  if (colorInstructions) {
    prompt += ` ${colorInstructions}`
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

    // Fallback: Use GPT-4 Vision with the simple prompt and images
    // The images are passed directly to the vision model so it can see them
    // Ask GPT-4 Vision to describe what the assembled watch would look like
    // This mimics ChatGPT's behavior where it analyzes the images and generates a description
    const visionPrompt = `${prompt} Please provide a detailed description of what this assembled watch would look like, being very specific about the colors, shapes, textures, and designs you see in each part.`
    
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
        const visionPrompt = `${prompt} Please provide a detailed description of what this assembled watch would look like, being very specific about the colors, shapes, textures, and designs you see in each part.`
        
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

