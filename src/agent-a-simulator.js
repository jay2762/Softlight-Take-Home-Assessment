import { fileURLToPath } from 'url';
import { AgentB } from './agent-b.js';
import dotenv from 'dotenv';
dotenv.config();

export class AgentASimulator {
  constructor() {
    this.agentB = new AgentB();
  }
  async sendTask(taskDescription, appName = null) {
    console.log(`\n📨 Agent A: Sending task to Agent B`);
    console.log(`   Task: "${taskDescription}"\n`);
    try {
      if (!this.agentB.executor) await this.agentB.initialize();
      const result = await this.agentB.processTask(taskDescription, appName);
      console.log(`\n📬 Agent A: Received response from Agent B`);
      console.log(`   Status: ${result.success ? '✅ Success' : '⚠️  Partial'}`);
      console.log(`   Screenshots captured: ${result.stepsCaptured}`);
      console.log(`   Workflow directory: ${result.workflowDir}\n`);
      return result;
    } catch (error) {
      console.error(`\n❌ Agent A: Error processing task`);
      console.error(`   Error: ${error.message}\n`);
      throw error;
    }
  }
  async close() { await this.agentB.close(); }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  const agentA = new AgentASimulator();
  const tasks = [
    "How do I create a project in Linear?",
    "How do I filter a database in Notion?"
  ];
  (async () => {
    try {
      for (const task of tasks) {
        await agentA.sendTask(task);
        if (tasks.indexOf(task) < tasks.length - 1) {
          console.log('⏳ Waiting 3 seconds before next task...\n');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      await agentA.close();
    }
  })();
}


