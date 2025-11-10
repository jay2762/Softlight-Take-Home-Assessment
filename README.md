# AI Multi-Agent UI Capture System

An intelligent system where **Agent A** sends questions to **Agent B** about performing tasks in web applications. Agent B automatically navigates live web apps, captures screenshots of UI states (including non-URL states like modals and forms), and generates workflow documentation.

## Features

- 🤖 **AI-Powered Navigation**: Uses vision AI to understand UI states and determine next steps
- 📸 **Smart Screenshot Capture**: Captures screenshots at key UI states, including:
  - URL-based states (page navigations)
  - Non-URL states (modals, forms, overlays)
  - Success/confirmation states
- 🔄 **Generalizable**: Works across different web apps without hardcoded task knowledge
- 🎯 **Multi-App Support**: Pre-configured for Linear, Notion, Asana, and easily extensible

## Architecture

```
Agent A (Task Sender)
    ↓
Agent B (Task Executor)
    ├── Browser Automation (Playwright)
    ├── UI State Detector (Vision AI)
    └── Task Executor (Orchestrator)
```

### Components

1. **Agent B** (`src/agent-b.js`): Main handler that receives tasks and coordinates execution
2. **Browser Automation** (`src/browser-automation.js`): Handles navigation, interaction, and screenshot capture
3. **UI State Detector** (`src/ui-state-detector.js`): Uses Gemini Vision API to analyze UI states and guide actions
4. **Task Executor** (`src/task-executor.js`): Orchestrates workflow execution and captures screenshots at key states
5. **App Config** (`src/app-config.js`): Maps tasks to apps and provides app-specific configurations

## Setup

### Prerequisites

- Node.js 18+ 
- Gemini API key with access to vision models
- Chromium browser (installed automatically)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install-browsers
```

### Configuration

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```
GEMINI_API_KEY=your_api_key_here
HEADLESS=false  # Set to true for headless mode
```

## Usage

### Running a Single Task

```bash
npm start "How do I create a project in Linear?"
```

Or with explicit app:

```bash
npm start "How do I filter a database?" notion
```

### Running Tests

```bash
npm test
```

This will run 5 example tasks across Linear and Notion, capturing UI workflows for each.

### Programmatic Usage

```javascript
import { AgentB } from './src/agent-b.js';

const agent = new AgentB();
await agent.initialize();

const result = await agent.processTask(
  "How do I create a project in Linear?",
  "linear"
);

console.log(`Captured ${result.stepsCaptured} screenshots`);
console.log(`Workflow saved to: ${result.workflowDir}`);

await agent.close();
```

## How It Works

1. **Task Reception**: Agent B receives a task description from Agent A
2. **App Detection**: System determines which app to use based on task description
3. **Navigation**: Browser navigates to the app
4. **AI-Guided Execution**:
   - Takes screenshot of current state
   - AI analyzes screenshot to determine next action
   - Executes action (click, fill, etc.)
   - Detects UI state changes (URL changes, modals, etc.)
   - Captures screenshot if state is significant
   - Repeats until task appears complete
5. **Output**: All screenshots and metadata saved to `screenshots/workflow_<timestamp>/`

## Capturing Non-URL States

The system handles non-URL states through:

1. **Modal Detection**: Checks for dialog/modal elements using DOM queries
2. **UI State Monitoring**: Monitors DOM mutations and class changes
3. **Stability Detection**: Waits for UI to stabilize before capturing
4. **AI Analysis**: Uses vision AI to understand when significant UI states appear

Example workflow for "creating a project in Linear":
- ✅ Project list page (has URL) - captured
- ✅ "Create Project" button state - captured
- ✅ Create modal (no URL) - detected via modal detection
- ✅ Form fields (no URL) - captured after interaction
- ✅ Success state - detected via AI analysis

## Output Structure

```
screenshots/
  workflow_<timestamp>/
    step_001_initial_page.png
    step_002_modal_open.png
    step_003_form_fields.png
    step_004_task_complete.png
    metadata.json
    videos/
      video.webm
```

`metadata.json` contains:
- Step numbers and labels
- URLs for each step
- Timestamps
- Action descriptions
- Task context

## Testing

The test suite (`src/test.js`) includes 5 example tasks:

1. "How do I create a project in Linear?"
2. "How do I filter a database in Notion?"
3. "How do I create a task in Linear?"
4. "How do I change settings in Notion?"
5. "How do I view my projects in Linear?"

Each test:
- Navigates to the app
- Executes the task using AI guidance
- Captures 2-5 screenshots at key states
- Saves workflow to timestamped directory

## Extending to New Apps

Add app configuration in `src/app-config.js`:

```javascript
static APPS = {
  yourapp: {
    name: 'YourApp',
    url: 'https://yourapp.com',
    loginRequired: true,
    selectors: {
      // Optional: common selectors for your app
    }
  }
};
```

The system will automatically detect the app from task descriptions containing the app name.

## Limitations & Considerations

- **Authentication**: Apps requiring login need manual authentication on first run
- **Rate Limiting**: Gemini API calls are made per screenshot analysis - monitor usage
- **Dynamic Content**: Some apps with heavy JavaScript may require additional wait times
- **Selector Reliability**: AI-determined selectors may need refinement for complex UIs

## Future Enhancements

- [ ] Persistent browser sessions for logged-in apps
- [ ] Caching of UI state analysis
- [ ] Multi-step task validation
- [ ] Video generation from screenshots
- [ ] Natural language workflow summaries

## License

MIT

