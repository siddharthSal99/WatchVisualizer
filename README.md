# Watch Visualizer

A React web application that allows you to upload images of watch parts and generate a composite visualization using OpenAI's GPT-4 Vision and DALL-E 3.

## Features

- Upload images of watch parts (bezel, bezel insert, case, crown, dial, strap, hands, GMT hand, chapter ring)
- Optional parts - only upload the parts you have
- Color customization for any uploaded part
- Generate composite watch images using AI
- Download generated images

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure OpenAI API Key

Create a `.env` file in the root directory and add your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_api_key_here
```

**Important:** 
- Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
- **Verify your organization**: You must verify yourself as an organization or solo developer at [OpenAI Organization Settings](https://platform.openai.com/settings/organization/general) to access the image generation API
- **API Costs**: Image generation requires API credits and costs money. Each image generation will consume credits based on OpenAI's pricing
- Never commit your `.env` file to version control (it's already in `.gitignore`)
- For production, you should use a backend proxy instead of exposing your API key in the frontend

### 3. Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port shown in the terminal).

### 4. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

1. **Upload Watch Parts**: Click on any watch part section to upload an image. You don't need to upload all parts - only the ones you have.

2. **Customize Colors** (Optional): For any uploaded part, you can specify a custom color using natural language. Simply type a description like:
   - "red" for the seconds hand
   - "gold" for the bezel
   - "matte black" for the case
   - "blue with silver accents" for the dial
   - "rose gold" for the strap
   - Or any other color description you can think of!
   
   Leave the field empty to use the original colors from the uploaded images.

3. **Generate Image**: Click "Generate Watch Image" to create a composite visualization. The app will:
   - Analyze your uploaded images using GPT-4 Vision
   - Generate a new image using DALL-E 3 that combines all the parts
   - Apply any color customizations you specified

4. **Download**: Once generated, you can download the image using the "Download Image" button.

## API Requirements

- **OpenAI API Key**: Required for GPT-4 Vision and DALL-E 3
- **Organization Verification**: **IMPORTANT** - You must verify yourself as an organization or solo developer in the OpenAI Platform to get access to the image generation API. Visit [OpenAI Organization Settings](https://platform.openai.com/settings/organization/general) to complete verification.
- **Model Access**: You need access to:
  - `gpt-4-vision-preview` (or `gpt-4o` with vision capabilities)
  - `dall-e-3` (or `gpt-image-1.5` / `gpt-image-1` for image editing)
- **API Credits**: Image generation costs money. Make sure you have sufficient credits in your OpenAI account. Each image generation will consume API credits based on OpenAI's pricing.

## Security Note

⚠️ **Important**: This app currently uses the OpenAI API key directly in the browser. This is acceptable for development, but for production you should:

1. Create a backend API endpoint that proxies requests to OpenAI
2. Store the API key securely on the backend
3. Have your frontend call your backend endpoint instead of OpenAI directly

## Troubleshooting

- **"OpenAI API key is not configured"**: Make sure you've created a `.env` file with `VITE_OPENAI_API_KEY`
- **API errors**: Check that your API key is valid and you have credits/quota available
- **Image generation fails**: Ensure you have access to DALL-E 3 and sufficient API credits

## Next Steps
1. Add feature where you extract the part from an image of a full watch. like getting just the bezel insert from a watch.

2. ~~Add custom watch crown support~~ ✅ Done
