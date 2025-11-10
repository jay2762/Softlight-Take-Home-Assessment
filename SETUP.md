# Quick Setup Guide

## Step 1: Install Dependencies

```bash
npm install
npm run install-browsers
```

## Step 2: Configure Environment

Create a `.env` file in the root directory:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
HEADLESS=false
BROWSER_TIMEOUT=30000
SCREENSHOT_DIR=./screenshots
```

**Important**: You need a Gemini API key with access to vision models.

## Step 3: Test the System

### Option 1: Run a single task

```bash
npm start "How do I create a project in Linear?"
```

### Option 2: Run the test suite

```bash
npm test
```

This will run 5 example tasks and capture workflows for each.

## Step 4: View Results

After running a task, screenshots will be saved to:

```
screenshots/workflow_<timestamp>/
```

Each workflow includes:

- Screenshot images (PNG format)
- `metadata.json` with step information
- Video recording (if enabled)

## Troubleshooting

### "Gemini API key required"

- Make sure your `.env` file exists and contains `GEMINI_API_KEY=...`
- Check that the API key is valid and has access to vision models

### "Browser not installed"

- Run `npm run install-browsers` to install Chromium

### "Login required"

- Some apps require manual login on first run
- The browser will open in non-headless mode so you can log in
- Future runs can use headless mode if you save the session

### Slow performance

- The system uses AI vision models which can be slow
- Consider reducing the number of test tasks
- Set `HEADLESS=true` to speed up (but you won't see what's happening)

## Next Steps

- Customize apps in `src/app-config.js`
- Add more test tasks in `src/test.js`
- Integrate with your Agent A system
