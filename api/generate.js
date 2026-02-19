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

const DIMENSION_LABELS = {
  outerDiameter: 'outer diameter',
  lugWidth: 'lug width',
  strapWidth: 'strap width',
  diameter: 'diameter',
  hourHandLength: 'hour hand length',
  minuteHandLength: 'minute hand length',
  secondHandLength: 'second hand length',
};

function dataUrlToBuffer(dataUrl) {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) throw new Error('Invalid data URL');
  return { buffer: Buffer.from(matches[2], 'base64'), mimeType: matches[1] };
}

function buildPrompt(uploadedParts, colorCustomizations, partDimensions, isSkeletonDial) {
  const partList = uploadedParts.map(id => PART_LABELS[id]).join(', ');

  const dimensionInstructions = Object.entries(partDimensions)
    .filter(([partId]) => uploadedParts.includes(partId))
    .map(([partId, dims]) => {
      const partName = PART_LABELS[partId];
      const measurements = Object.entries(dims)
        .filter(([, val]) => val !== '' && val != null)
        .map(([dimKey, val]) => `${DIMENSION_LABELS[dimKey] || dimKey} of ${val} mm`)
        .join(' and ');
      if (!measurements) return null;
      return `The ${partName} has a ${measurements}.`;
    })
    .filter(Boolean)
    .join(' ');

  const colorInstructions = Object.entries(colorCustomizations)
    .map(([partId, color]) => {
      const partName = PART_LABELS[partId];
      return `The ${partName} should be ${color}.`;
    })
    .join(' ');

  let prompt = `Here are images of individual watch parts: ${partList}. Generate a photorealistic image of the fully assembled wristwatch using exactly these parts. It is critical that you faithfully reproduce the exact shape, silhouette, proportions, colors, and fine details of every single part as shown in the reference images. Do not substitute generic or default shapes for any part.

WATCH ANATOMY — how the parts are layered and positioned (from bottom to top):
1. STRAP/BRACELET: Attaches to the lugs of the case and extends above and below it on the wrist.
2. CASE: The main housing of the watch. It has a circular (or shaped) opening in the center where the dial sits recessed inside.
3. MOVEMENT: Sits underneath the dial, hidden inside the case. It is only visible if the dial is a skeleton/open-heart type with transparent or cut-out sections.
4. DIAL: Sits inside the case, recessed within the case opening. It is the face of the watch displaying indices, markers, and text.
5. CHAPTER RING: A thin ring that circumscribes (surrounds) the dial. It sits inside the case, between the outer edge of the dial and the inner wall of the case opening. It often has minute markings or indices printed on it.
6. HANDS: Mounted on top of the dial, at the center, pointing outward to indicate time. They overlap the dial and chapter ring.
7. CROWN: A small knob on the side of the case (typically at 3 o'clock) used to set the time.
8. BEZEL: A ring that sits on top of the case, surrounding the case opening. It frames the dial/chapter ring from above. Only its outer edge may be visible if a bezel insert is present.
9. BEZEL INSERT: Sits on top of the bezel. When present, the bezel insert is the outermost visible ring around the dial — you see the full bezel insert and only the outer rim/edge of the bezel beneath it.

Specific instructions:
- HANDS: Reproduce the exact hand style and silhouette from the image (e.g. cathedral, dauphine, snowflake, sword, pencil, skeleton, etc.). Match the hand width, length ratio, lume plots, and tip shape precisely. Do not use generic stick hands unless that is what is shown.
- DIAL: Reproduce all dial features exactly — hour indices/markers (applied, printed, or lumed), minute track, any text or logos, subdials, date windows, patterns, textures (sunburst, fumé, guilloche, etc.), and artwork. Match the layout and positioning faithfully.
- BEZEL INSERT: Reproduce all bezel insert markings, numerals, minute/hour scales, color gradients (e.g. Pepsi, Batman, Root Beer), the pip/lume dot at 12, and the exact font style of any numbers. Remember: the bezel insert sits on top of the bezel, so it is the dominant visible ring framing the dial.
- CHAPTER RING: This ring fills the gap between the dial edge and the case wall. Reproduce its markings, tick marks, and finish exactly. It should appear at the same depth as the dial, inside the case.
- CASE: Match the exact shape, finish (brushed, polished, matte), lug style, and proportions. The dial, chapter ring, and movement sit inside the case; the bezel sits on top of it.
- CROWN, STRAP/BRACELET, GMT HAND: Match the exact shape, finish, proportions, and design details from each reference image.`;

  if (isSkeletonDial) {
    prompt += `\n\n- SKELETON / OPEN HEART DIAL: This is a skeleton or open heart dial. The dial has hollow, cut-out, or transparent sections that reveal the watch movement beneath. Identify all areas of the dial that are open, skeletonized, or translucent and render the mechanical movement visible through those openings.`;
    if (uploadedParts.includes('movement')) {
      prompt += ` A reference image of the movement is provided — faithfully reproduce its bridges, gears, mainspring barrel, balance wheel, and finishing (e.g. Geneva stripes, perlage, blued screws) as seen through the dial openings. The movement should sit naturally behind the dial, with correct depth and layering.`;
    } else {
      prompt += ` No specific movement image was provided, so render a realistic high-quality automatic mechanical movement visible through the dial openings, with detailed bridges, gears, and finishing.`;
    }
  }

  if (colorInstructions) {
    prompt += `\n\nColor/style overrides: ${colorInstructions}`;
  }
  if (dimensionInstructions) {
    prompt += `\n\nProportional dimensions (use these to size the parts relative to each other): ${dimensionInstructions}`;
  }

  return prompt;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required. Enter your OpenAI API key via the menu.' });
  }

  try {
    const { partImages, colorCustomizations = {}, partDimensions = {}, isSkeletonDial = false } = req.body;

    if (!partImages || Object.keys(partImages).length === 0) {
      return res.status(400).json({ error: 'No part images provided.' });
    }

    const openai = new OpenAI({ apiKey });

    const uploadedParts = Object.keys(partImages).filter(partId => {
      if (partId === 'movement' && !isSkeletonDial) return false;
      return true;
    });

    const prompt = buildPrompt(uploadedParts, colorCustomizations, partDimensions, isSkeletonDial);

    // Convert base64 data URLs to uploadable files
    const imageFiles = await Promise.all(
      uploadedParts.map(async (partId) => {
        const { buffer } = dataUrlToBuffer(partImages[partId]);
        return await toFile(buffer, `${PART_LABELS[partId].replace(/\s/g, '_')}.png`, { type: 'image/png' });
      })
    );

    // --- Primary path: images.edit with model fallbacks ---
    try {
      let result;
      try {
        result = await openai.images.edit({
          model: 'gpt-image-1.5',
          image: imageFiles,
          prompt,
          input_fidelity: 'high',
        });
      } catch (modelError) {
        if (modelError.message?.includes('model') || modelError.code === 'model_not_found') {
          try {
            result = await openai.images.edit({
              model: 'gpt-image-1',
              image: imageFiles,
              prompt,
              input_fidelity: 'high',
            });
          } catch (model1Error) {
            if (model1Error.message?.includes('model') || model1Error.code === 'model_not_found') {
              result = await openai.images.edit({
                image: imageFiles,
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
    } catch (editError) {
      console.log('images.edit failed, falling back to chat + DALL-E:', editError.message);
    }

    // --- Fallback: GPT-4 Vision + DALL-E 3 ---
    const imageContents = uploadedParts.map((partId) => ({
      type: 'image_url',
      image_url: { url: partImages[partId] },
    }));

    const visionPrompt = `${prompt}

Additionally, please provide an extremely detailed description of what this assembled watch would look like. For each part, describe:
- The exact shape and silhouette (e.g. for hands: cathedral, snowflake, dauphine, sword, etc.)
- All markings, indices, numerals, text, logos, and their precise positioning
- Colors, gradients, and finishes (brushed, polished, matte, sunburst, fumé, etc.)
- Textures, patterns, and any artwork on the dial
- Proportions and how the parts relate to each other in size
Be as specific as possible so the description alone could recreate the watch faithfully.`;

    let visionResponse;
    try {
      visionResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: [{ type: 'text', text: visionPrompt }, ...imageContents] }],
        max_tokens: 2000,
      });
    } catch (gpt4oError) {
      if (gpt4oError.message?.includes('gpt-4o') || gpt4oError.code === 'model_not_found') {
        visionResponse = await openai.chat.completions.create({
          model: 'gpt-4-vision-preview',
          messages: [{ role: 'user', content: [{ type: 'text', text: visionPrompt }, ...imageContents] }],
          max_tokens: 2000,
        });
      } else {
        throw gpt4oError;
      }
    }

    const description = visionResponse.choices[0].message.content;
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: `A wristwatch: ${description}`,
      n: 1,
      size: '1024x1024',
      quality: 'standard',
    });

    return res.status(200).json({ image: imageResponse.data[0].url });
  } catch (error) {
    console.error('Generate error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate image' });
  }
}

