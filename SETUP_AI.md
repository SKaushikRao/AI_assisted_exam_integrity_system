# AI Service Setup for ProctorAI

## Problem: Puter.js API Limits Reached

You've encountered the "Your account has not enough funding to complete this request" error from Puter.js. This happens when you hit the free tier limits.

## Solution: Use Google Gemini API (Free Tier)

We've added automatic fallback to Google Gemini API which has a generous free tier.

### Quick Setup (2 minutes):

1. **Get Gemini API Key:**
   - Go to: https://aistudio.google.com/app/apikey
   - Sign in with your Google account
   - Click "Create API Key"
   - Copy the generated key

2. **Add API Key to Project:**
   - Open the `.env` file in your project root
   - Replace `your_gemini_api_key_here` with your actual API key:
   ```
   VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here
   ```

3. **Restart the Development Server:**
   ```bash
   npm run dev
   ```

## How It Works

- **Primary:** Tries Puter.js first (if available)
- **Fallback:** Automatically switches to Gemini when Puter hits limits
- **Seamless:** No code changes needed, just add the API key

## Gemini Free Tier Limits

- **15 requests per minute** (plenty for exam proctoring)
- **1,500 requests per day**
- **Free forever** for personal use

## Alternative: Create New Puter Account

If you prefer to keep using Puter.js:

1. Go to https://puter.com
2. Create a new account with different email
3. The app will automatically use the new account's fresh limits

## Testing

After setting up the API key:
1. Enable camera access in the app
2. The AI analysis should work without funding errors
3. Check browser console for "Puter.js failed, trying Gemini" messages

The app will now handle API limits gracefully and switch between services automatically!
