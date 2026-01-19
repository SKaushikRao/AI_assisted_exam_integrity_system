# Hugging Face API Setup for ProctorAI

## 🎯 Why Hugging Face?

- **Event-Triggered Only**: AI only runs when MediaPipe detects high-severity events
- **Extremely Efficient**: ~10-20 API calls per exam vs 600+ (every 6 seconds)
- **Open Source**: Uses Moondream2 - a lightweight vision model
- **Generous Free Tier**: 30,000 requests/month free
- **Privacy-Focused**: Your images aren't stored long-term

## ⚡ New Architecture

**Before**: AI analysis every 6 seconds = 600 calls/hour
**After**: AI only on high-severity events = ~10-20 calls/exam

### High-Severity Events That Trigger AI:
- ✅ Multiple faces detected
- ✅ Face missing for >5 seconds  
- ✅ Hand near face (potential cheating)
- ✅ Extended looking away

## 🚀 Quick Setup (2 minutes)

### 1. Get Hugging Face API Key
- Go to: https://huggingface.co/settings/tokens
- Sign in or create account (free)
- Click "New token"
- Name it: `proctorai`
- Role: `read`
- Copy the token (starts with `hf_`)

### 2. Add API Key to .env
```bash
# Replace this line:
VITE_HUGGINGFACE_API_KEY=your_huggingface_api_key_here

# With your actual token:
VITE_HUGGINGFACE_API_KEY=hf_your_actual_token_here
```

### 3. Restart Development Server
```bash
npm run dev
```

## 🧠 How It Works

1. **MediaPipe monitors continuously** (no API calls)
2. **High-severity event detected** → triggers AI analysis
3. **Moondream2 analyzes the frame** → confirms if suspicious
4. **Heavy penalty applied** only if AI confirms cheating

## 📊 API Usage Comparison

| Method | Calls/Hour | Free Tier Duration |
|--------|------------|-------------------|
| Old (6-sec interval) | 600 | ~2.5 days |
| New (Event-triggered) | 10-20 | ~50+ days |

## 🔧 Technical Details

**Model**: Moondream2 (1.8B parameters)
**Response Time**: ~1-2 seconds
**Cost**: Free for 30,000 requests/month
**Accuracy**: Excellent for exam proctoring scenarios

## 🎉 Benefits

- ✅ **API limits last the entire exam period**
- ✅ **Faster response time** (no unnecessary calls)
- ✅ **Better privacy** (fewer images sent to external service)
- ✅ **More accurate** (AI focuses on actual suspicious events)
- ✅ **Cost effective** (well within free tier limits)

## 🧪 Testing

After setup:
1. Enable camera access
2. Try triggering high-severity events:
   - Show multiple faces to camera
   - Hide face for 5+ seconds
   - Look away for extended periods
3. Check console for "Triggering AI analysis" messages
4. Verify AI model shows "moondream2" in the UI

Your ProctorAI is now ultra-efficient and will run for days without hitting API limits! 🚀
