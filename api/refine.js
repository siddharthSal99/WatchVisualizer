import OpenAI, { toFile } from 'openai';

export const config = {
  maxDuration: 60,
};

function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid data URL');
  return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required.' });
  }

  try {
    const { imageDataUrl, refinementText } = req.body;

    if (!imageDataUrl || !refinementText) {
      return res.status(400).json({ error: 'imageDataUrl and refinementText are required.' });
    }

    const openai = new OpenAI({ apiKey });

    // Convert the image (data URL or fetched URL) to a file
    let imageFile;
    if (imageDataUrl.startsWith('data:')) {
      const { buffer } = dataUrlToBuffer(imageDataUrl);
      imageFile = await toFile(buffer, 'generated_watch.png', { type: 'image/png' });
    } else {
      // It's an external URL — fetch it server-side
      const imgResp = await fetch(imageDataUrl);
      const imgBuffer = Buffer.from(await imgResp.arrayBuffer());
      imageFile = await toFile(imgBuffer, 'generated_watch.png', { type: 'image/png' });
    }

    let result;
    try {
      result = await openai.images.edit({
        model: 'gpt-image-1.5',
        image: imageFile,
        prompt: refinementText,
        input_fidelity: 'high',
      });
    } catch (modelError) {
      if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
        try {
          result = await openai.images.edit({
            model: 'gpt-image-1',
            image: imageFile,
            prompt: refinementText,
            input_fidelity: 'high',
          });
        } catch (model1Error) {
          if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
            result = await openai.images.edit({
              image: imageFile,
              prompt: refinementText,
              input_fidelity: 'high',
            });
          } else {
            throw model1Error;
          }
        }
      } else {
        throw modelError;
      }
    }

    if (result.data?.[0]?.b64_json) {
      return res.status(200).json({ image: `data:image/png;base64,${result.data[0].b64_json}` });
    } else if (result.data?.[0]?.url) {
      return res.status(200).json({ image: result.data[0].url });
    }
    throw new Error('Unexpected response format from images.edit');
  } catch (error) {
    console.error('Refine error:', error);
    return res.status(500).json({ error: error.message || 'Failed to refine image' });
  }
}

