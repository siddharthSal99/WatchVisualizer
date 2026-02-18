import OpenAI, { toFile } from 'openai';

export const config = {
  maxDuration: 60,
};

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
    const { imageDataUrl, partId } = req.body;

    if (!imageDataUrl || !partId) {
      return res.status(400).json({ error: 'imageDataUrl and partId are required.' });
    }

    const openai = new OpenAI({ apiKey });
    const partName = PART_LABELS[partId] || partId;

    const prompt = `This image shows a complete wristwatch. Please extract and isolate ONLY the ${partName} from this watch. Show the isolated ${partName} by itself on a clean, plain white background. Remove all other parts of the watch — only the ${partName} should remain. Preserve the exact shape, colors, textures, markings, and all fine details of the ${partName} as they appear in the original image.`;

    const { buffer } = dataUrlToBuffer(imageDataUrl);
    const imageFile = await toFile(buffer, `watch_for_${partName.replace(/\s/g, '_')}.png`, { type: 'image/png' });

    let result;
    try {
      result = await openai.images.edit({
        model: 'gpt-image-1.5',
        image: imageFile,
        prompt,
        input_fidelity: 'high',
      });
    } catch (modelError) {
      if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
        try {
          result = await openai.images.edit({
            model: 'gpt-image-1',
            image: imageFile,
            prompt,
            input_fidelity: 'high',
          });
        } catch (model1Error) {
          if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
            result = await openai.images.edit({
              image: imageFile,
              prompt,
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
    console.error('Extract error:', error);
    return res.status(500).json({ error: error.message || 'Failed to extract part' });
  }
}

