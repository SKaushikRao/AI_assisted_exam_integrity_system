# Transformers.js Setup - 100% Offline AI

## 🎯 Why Transformers.js?

- ✅ **100% Free** - No API costs ever
- ✅ **Offline** - Works without internet
- ✅ **Private** - Data never leaves the browser
- ✅ **No API Keys** - Zero setup required
- ✅ **Fast** - Runs locally via WebAssembly

## 🚀 What's Happening

The app now uses **BLIP (Bootstrapping Language-Image Pre-training)** model:
- **Model Size**: ~30MB (downloaded once, cached forever)
- **Purpose**: Image captioning (describes what's happening)
- **Analysis**: Keywords detection for suspicious activity

## 📋 First Time Setup

### **Model Download (One-time only)**
1. **First AI trigger** → Downloads 30MB BLIP model
2. **Console shows**: `"Loading BLIP model (first time only, ~30MB download)..."`
3. **After download**: `"BLIP model loaded successfully!"`
4. **Future uses**: Instant (model cached in browser)

## 🧠 How It Works

### **Step 1: Image Description**
BLIP analyzes the webcam frame and generates a description:
```
"a person sitting at a desk looking at a laptop computer"
"a person with a phone in their hand looking away from the screen"
"two people sitting at a table with books and papers"
```

### **Step 2: Suspicion Analysis**
The app checks the description for suspicious keywords:
- **Multiple people**: `multiple people`, `two people`, `group`
- **Phones**: `phone`, `cell phone`, `mobile`, `smartphone`
- **Cheating materials**: `book`, `paper`, `notes`, `cheat sheet`
- **Distraction**: `looking away`, `distracted`, `side`
- **Talking**: `talking`, `speaking`, `mouth open`

### **Step 3: Result**
- **SAFE**: No suspicious keywords found
- **SUSPICIOUS**: Keywords detected or multiple faces event

## 🎯 Benefits

### **vs Gemini/Hugging Face:**
| Feature | Transformers.js | Gemini/HF |
|---------|------------------|-----------|
| Cost | FREE | $$/limits |
| Privacy | 100% | Data sent externally |
| Offline | ✅ | ❌ |
| Setup | None | API keys required |
| Speed | Local network | Internet latency |
| Reliability | No rate limits | API limits |

### **Perfect For:**
- **Exam environments** with restricted internet
- **Privacy-conscious** institutions
- **Cost-sensitive** deployments
- **Offline capability** requirements

## 🔍 Testing

1. **Trigger high-severity event** (show multiple faces)
2. **Console shows**:
   ```
   "Analyzing high-severity event with Transformers.js: MULTIPLE_FACES_DETECTED"
   "Loading BLIP model (first time only, ~30MB download)..."
   "Generating image description..."
   "BLIP description: a person sitting at a desk with a laptop"
   ```

3. **UI shows**: Model: `"BLIP (Offline)"`

## 📦 Technical Details

- **Library**: `@xenova/transformers`
- **Model**: `Xenova/blip-image-captioning-base`
- **Runtime**: WebAssembly + WebGPU
- **Cache**: Browser storage (persistent)
- **Size**: 30MB (one-time download)

Your ProctorAI is now **100% offline and free**! 🎉
