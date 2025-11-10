import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { BrowserAutomation } from './browser-automation.js';
import { UIStateDetector } from './ui-state-detector.js';
import { TaskExecutor } from './task-executor.js';
import { AppConfig } from './app-config.js';

dotenv.config();

export class AgentB {
  constructor() {
    this.browser = null;
    this.detector = null;
    this.executor = null;
  }

  async initialize() {
    console.log('\u{1F916} Initializing Agent B...\n');
    this.browser = new BrowserAutomation({ headless: process.env.HEADLESS === 'true' });
    await this.browser.initialize();
    if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY environment variable is required');
    this.detector = new UIStateDetector(process.env.GEMINI_API_KEY);
    this.executor = new TaskExecutor(this.browser, this.detector);
    console.log('\u{2705} Agent B initialized successfully\n');
  }

  async processTask(taskDescription, appName = null) {
    if (!this.executor) await this.initialize();
    const appConfig = AppConfig.getAppForTask(taskDescription, appName);
    if (!appConfig) throw new Error(`Could not determine app for task: ${taskDescription}`);
    console.log(`\n\u{1F4CB} Task Request: ${taskDescription}`);
    console.log(`\u{1F3AF} App: ${appConfig.name}\n`);
    const result = await this.executor.executeTask(taskDescription, appConfig);
    const summary = {
      task: taskDescription,
      app: appConfig.name,
      success: result.success,
      stepsCaptured: result.steps.length,
      workflowDir: result.workflowDir,
      screenshots: result.steps.map(s => ({ step: s.step, label: s.label, url: s.url, timestamp: s.timestamp }))
    };
    console.log('\n\u{1F4CA} Task Summary:');
    console.log(JSON.stringify(summary, null, 2));
    return summary;
  }

  async close() { if (this.browser) await this.browser.close(); }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const agent = new AgentB();
  const task = process.argv[2];
  const appName = process.argv[3] || null;
  if (!task) {
    console.error('Usage: node src/agent-b.js "<task description>" [app-name]');
    console.error('Example: node src/agent-b.js "How do I create a project in Linear?"');
    process.exit(1);
  }
  (async () => {
    try {
      await agent.initialize();
      await agent.processTask(task, appName);
      await agent.close();
    } catch (error) {
      console.error('Error:', error.message);
      await agent.close();
      process.exit(1);
    }
  })();
}

