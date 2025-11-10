import path from 'path';

export class TaskExecutor {
  constructor(browserAutomation, uiStateDetector) {
    this.browser = browserAutomation;
    this.detector = uiStateDetector;
    this.steps = [];
    this.currentState = null;
  }

  async executeTask(taskDescription, appConfig) {
    console.log(`\n Executing task: ${taskDescription}`);
    console.log(` Target app: ${appConfig.name} (${appConfig.url})\n`);
    this.steps = [];
    try {
      await this.browser.navigate(appConfig.url);
      await this.browser.waitForUIStable();
      const initialScreenshot = await this.browser.captureScreenshot('initial_page', { task: taskDescription, step: 'initial' });
      this.steps.push(initialScreenshot);
      this.currentState = initialScreenshot;
      let maxSteps = 20, stepCount = 0, taskCompleted = false;
      let authStepCount = 0;
      const maxAuthSteps = 8; // Limit authentication attempts
      
      while (!taskCompleted && stepCount < maxSteps) {
        stepCount++;
        console.log(`\n Step ${stepCount}: Analyzing current state...`);
        const nextStep = await this.detector.getNextSteps(this.currentState.filepath, taskDescription);
        if (!nextStep || !nextStep.nextAction) {
          console.log(' Could not determine next step. Task may be complete or failed.');
          break;
        }
        console.log(` Action: ${nextStep.description || nextStep.nextAction}`);
        const actionResult = await this.executeAction(nextStep, appConfig);
        if (actionResult.error) {
          console.log(` Error: ${actionResult.error}`);
          await this.browser.waitForTimeout(1000);
        }
        await this.browser.waitForUIStable();
        const hasModal = await this.browser.hasModalVisible();
        const currentURL = await this.browser.getCurrentURL();
        const shouldCapture = await this.shouldCaptureNewState(hasModal, currentURL, this.currentState);
        if (shouldCapture) {
          const label = this.generateStepLabel(nextStep, hasModal, currentURL);
          const newScreenshot = await this.browser.captureScreenshot(label, { task: taskDescription, step: stepCount, action: nextStep.nextAction, description: nextStep.description });
          this.steps.push(newScreenshot);
          this.currentState = newScreenshot;
          console.log(` Captured: ${label}`);
        }
        taskCompleted = await this.checkTaskCompletion(taskDescription);
        
        // Check if we're stuck in authentication
        const isAuthStep = await this.isAuthenticationStep();
        if (isAuthStep) {
          authStepCount++;
          if (authStepCount >= maxAuthSteps) {
            console.log('\n ⚠️  Authentication appears to be blocking progress. Task requires manual login.');
            console.log(' Please log in to Linear manually and retry the task.');
            return { success: false, steps: this.steps, workflowDir: this.browser.getWorkflowDir(), error: 'Authentication required - please log in manually' };
          }
        } else {
          authStepCount = 0; // Reset counter if we make progress past auth
        }
        
        if (taskCompleted) {
          console.log('\n Task appears to be complete!');
          await this.browser.waitForTimeout(1000);
          const finalScreenshot = await this.browser.captureScreenshot('task_complete', { task: taskDescription, step: 'complete' });
          this.steps.push(finalScreenshot);
          break;
        }
        await this.browser.waitForTimeout(500);
      }
      if (stepCount >= maxSteps) console.log('\n Reached maximum step limit. Task may not be complete.');
      return { success: taskCompleted, steps: this.steps, workflowDir: this.browser.getWorkflowDir() };
    } catch (error) {
      console.error('\n Error executing task:', error.message);
      throw error;
    }
  }

  async executeAction(nextStep, appConfig) {
    try {
      switch (nextStep.nextAction.toLowerCase()) {
        case 'click':
          if (nextStep.selector) {
            try {
              await this.browser.click(nextStep.selector);
              return { success: true };
            } catch (error) {
              if (nextStep.text) {
                console.log(` Selector failed, trying text-based click: ${nextStep.text}`);
                await this.browser.clickByText(nextStep.text);
                return { success: true };
              }
              throw error;
            }
          }
          if (nextStep.text) {
            await this.browser.clickByText(nextStep.text);
            return { success: true };
          }
          return { error: 'No selector or text provided for click action' };
        case 'fill':
        case 'type':
          if (nextStep.selector && nextStep.text) {
            await this.browser.fill(nextStep.selector, nextStep.text);
            return { success: true };
          }
          return { error: 'Selector and text required for fill action' };
        case 'wait':
          const waitTime = nextStep.waitTime || 1000;
          await this.browser.waitForTimeout(waitTime);
          return { success: true };
        case 'navigate':
          if (nextStep.url) {
            await this.browser.navigate(nextStep.url);
            return { success: true };
          }
          return { error: 'URL required for navigate action' };
        case 'goto':
          if (nextStep.url) {
            await this.browser.navigate(nextStep.url);
            return { success: true };
          }
          return { error: 'URL required for goto action' };
        default:
          if (nextStep.selector) {
            await this.browser.click(nextStep.selector);
            return { success: true };
          }
          return { error: `Unknown action: ${nextStep.nextAction}` };
      }
    } catch (error) {
      return { error: error.message };
    }
  }

  async shouldCaptureNewState(hasModal, currentURL, previousState) {
    if (currentURL !== previousState.url) return true;
    if (hasModal !== previousState.metadata?.hasModal) return true;
    const timeDiff = Date.now() - new Date(previousState.timestamp).getTime();
    if (timeDiff > 3000) return true;
    if (timeDiff > 1500) return true;
    return false;
  }

  generateStepLabel(nextStep, hasModal, currentURL) {
    if (hasModal) {
      if (nextStep.description && nextStep.description.toLowerCase().includes('create')) return 'create_project_modal';
      return 'modal_open';
    }
    if (nextStep.description) {
      const desc = nextStep.description.toLowerCase();
      if (desc.includes('create project') || desc.includes('new project')) return 'create_project_button';
      if (desc.includes('form') || desc.includes('fill')) return 'filling_form_fields';
      if (desc.includes('submit') || desc.includes('save') || desc.includes('create')) return 'submitting_project';
      return desc.replace(/[^a-z0-9]+/g, '_').substring(0, 30);
    }
    return `step_${nextStep.nextAction}`;
  }

  async checkTaskCompletion(taskDescription) {
    try {
      const analysis = await this.detector.analyzeScreenshot(this.currentState.filepath, `Task: "${taskDescription}". Analyze if this task is actually complete. Look for:
1. Success states (project created, task saved, etc.) - MUST see actual project/task creation confirmation
2. Error states (login required, access denied, etc.) 
3. Authentication pages (login, sign in, Google OAuth, etc.) - these are NOT task completion
4. Intermediate states (login pages, forms, modals)

IMPORTANT: Login/authentication pages are NOT task completion. Only return "COMPLETE" when you see:
- A project actually created with name/description visible
- Success message saying "Project created" or similar
- The actual task result, not just authentication

Respond with ONLY: "COMPLETE" if task is actually done, "CONTINUE" if more steps needed, or "FAILED" if there's an error.`);
      const cleanAnalysis = analysis.replace(/```json\n?|\n?```/g, '').trim().toLowerCase();
      
      // Check for actual completion indicators
      const completionKeywords = ['project created', 'task created', 'successfully created', 'project saved', 'task saved'];
      if (completionKeywords.some(keyword => cleanAnalysis.includes(keyword))) return true;
      
      // Check for authentication/login states - these are NOT completion
      const authKeywords = ['login', 'sign in', 'signin', 'google', 'oauth', 'authentication', 'email', 'password'];
      if (authKeywords.some(keyword => cleanAnalysis.includes(keyword))) {
        console.log(' Authentication required - task not complete');
        return false;
      }
      
      // Check for explicit failure
      const failureKeywords = ['access denied', 'error', 'failed'];
      if (failureKeywords.some(keyword => cleanAnalysis.includes(keyword))) {
        console.log(' Task cannot continue due to authentication/error');
        return true;
      }
      
      // Check for explicit continue signals
      const continueKeywords = ['continue', 'form', 'modal', 'button', 'create', 'new'];
      if (continueKeywords.some(keyword => cleanAnalysis.includes(keyword))) return false;
      
      // Default to continue if unsure
      return false;
    } catch (error) {
      console.log(' Could not determine task completion, continuing...');
      return false;
    }
  }

  async isAuthenticationStep() {
    try {
      const currentURL = await this.browser.getCurrentURL();
      const authDomains = ['accounts.google.com', 'login', 'signin', 'auth', 'oauth'];
      return authDomains.some(domain => currentURL.includes(domain));
    } catch (error) {
      return false;
    }
  }
}
