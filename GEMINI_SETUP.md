# 🤖 Gemini API Setup for AI Insights

## Quick Setup (2 minutes)

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the API key (starts with `AIza...`)

### Step 2: Add API Key to Environment

Create a `.env` file in your project root (if it doesn't exist):

```env
VITE_GEMINI_API_KEY=your_api_key_here
```

**Replace `your_api_key_here` with your actual API key.**

### Step 3: Restart Dev Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Test It!

1. Open the app
2. Go to **AI Insights** page
3. Add some transactions (if you haven't already)
4. You should see AI-powered insights!

---

## Features Enabled

Once configured, you'll get:

✅ **Smart Financial Insights** - AI analyzes your spending patterns using Gemini 1.5 Flash  
✅ **Budget Recommendations** - Personalized budget suggestions  
✅ **Spending Trend Analysis** - Identifies increases/decreases  
✅ **Budget Alerts** - Warns about overspending  
✅ **Actionable Advice** - Practical tips to save money  

**Model Used:** `gemini-1.5-flash` (fast, free-tier friendly)

---

## Cost Information

**Gemini API Pricing:**
- **Free tier**: 15 requests per minute (generous for personal use)
- **Model**: gemini-1.5-flash (fast and efficient)
- **Paid tier**: Very affordable if you need more
- Typical usage: ~5-10 API calls per day per user

**The free tier is more than enough for personal finance tracking!**

---

## Troubleshooting

### "API key not configured" warning

- Make sure `.env` file exists in project root
- Check that variable name is exactly: `VITE_GEMINI_API_KEY`
- Restart dev server after adding `.env` file
- Verify API key starts with `AIza...`

### "Model not found" (404 error)

This usually means:
1. **API key doesn't have access** - Some API keys are limited to certain models
2. **Wrong model name** - We're using `gemini-2.5-pro` which should work with most keys
3. **API access not enabled** - Check Google Cloud Console to ensure Generative AI API is enabled

**Solutions:**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Check if your API key has access to `gemini-2.5-pro` model
3. Try creating a new API key
4. Ensure "Generative Language API" is enabled in Google Cloud Console
5. The app will automatically use fallback insights if Gemini fails

### No insights showing

- Make sure you have at least 5-10 transactions
- Check browser console for errors
- Verify API key is valid in Google AI Studio

### Rate limit errors

- Free tier: 60 requests/minute
- If you hit limits, wait 1 minute and try again
- Consider upgrading to paid tier if needed

---

## Security Notes

- ✅ API key is only used client-side for your data
- ✅ Never commit `.env` file to git (already in `.gitignore`)
- ✅ API key is safe in `.env` - not exposed in bundle
- ✅ Each user's data is analyzed separately

---

## Alternative: Use Fallback Insights

If you don't want to use Gemini API, the app will automatically use rule-based insights (simple pattern matching). These work fine but are less sophisticated than AI insights.

---

**That's it! Enjoy your AI-powered financial insights! 🚀**

