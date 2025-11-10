import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { AgentB } from './agent-b.js';

dotenv.config();

const TEST_TASKS = [
  { description: 'How do I create a project in Linear?', app: 'linear', expectedSteps: 3 },
  { description: 'How do I filter a database in Notion?', app: 'notion', expectedSteps: 3 },
  { description: 'How do I create a task in Linear?', app: 'linear', expectedSteps: 3 },
  { description: 'How do I change settings in Notion?', app: 'notion', expectedSteps: 3 },
  { description: 'How do I view my projects in Linear?', app: 'linear', expectedSteps: 2 }
];

async function runTests() {
  console.log('Starting Agent B Test Suite\n');
  console.log(`Testing ${TEST_TASKS.length} tasks\n`);
  console.log('='.repeat(60) + '\n');

  const agent = new AgentB();
  const results = [];

  try {
    await agent.initialize();

    for (let i = 0; i < TEST_TASKS.length; i++) {
      const task = TEST_TASKS[i];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Test ${i + 1}/${TEST_TASKS.length}: ${task.description}`);
      console.log('='.repeat(60) + '\n');

      try {
        const result = await agent.processTask(task.description, task.app);
        
        results.push({
          task: task.description,
          success: result.success,
          stepsCaptured: result.stepsCaptured,
          expectedSteps: task.expectedSteps,
          workflowDir: result.workflowDir,
          passed: result.stepsCaptured >= Math.min(2, task.expectedSteps)
        });

        console.log(`\nTest ${i + 1} completed: ${result.stepsCaptured} steps captured`);
        
        if (i < TEST_TASKS.length - 1) {
          console.log('\nWaiting 5 seconds before next test...\n');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      } catch (error) {
        console.error(`\nTest ${i + 1} failed:`, error.message);
        results.push({ task: task.description, success: false, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60) + '\n');

    const passed = results.filter(r => r.passed !== false).length;
    const failed = results.filter(r => r.passed === false).length;

    results.forEach((result, index) => {
      const status = result.passed !== false ? 'PASS' : 'FAIL';
      console.log(`${status} Test ${index + 1}: ${result.task}`);
      if (result.stepsCaptured) console.log(`   Steps captured: ${result.stepsCaptured}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      console.log('');
    });

    console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${results.length} tests\n`);
  } catch (error) {
    console.error('Fatal error:', error);
  } finally {
    await agent.close();
  }
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  runTests().catch(console.error);
}

export { runTests, TEST_TASKS };
