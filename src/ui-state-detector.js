import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs-extra';

export class UIStateDetector {
  constructor(apiKey) {
    if (!apiKey) throw new Error('Gemini API key is required');
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-flash-latest" });
  }

  async analyzeScreenshot(imagePath, context = '') {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const response = await this.model.generateContent([
        `You are a UI state analyzer. Analyze screenshots of web applications to understand:
1. What UI elements are visible (buttons, forms, modals, etc.)
2. What state the application is in (loading, form, list, success, etc.)
3. What actions are available to the user
4. Whether this is a significant state that should be captured

Return a JSON object with your analysis.

Analyze this screenshot${context ? ` in the context of: ${context}` : ''}. 
Describe the UI state, visible elements, and what actions appear to be available.`,
        { inlineData: { data: base64Image, mimeType: "image/png" } }
      ]);
      return response.response.text();
    } catch (error) {
      if (error.status === 429) {
        console.error('Gemini API quota exceeded. Please check your billing/plan.');
        console.error('The system captured screenshots but cannot analyze them without API access.');
      } else {
        console.error('Error analyzing screenshot:', error.message);
      }
      return null;
    }
  }

  async shouldCaptureState(imagePath, previousState = null) {
    const analysis = await this.analyzeScreenshot(imagePath);
    if (!analysis) return true;
    try {
      const response = await this.model.generateContent(
        `You are a UI workflow analyzer. Determine if a UI state is significant enough to capture in a workflow tutorial.
Significant states include:
- Initial page loads
- Modal/dialog appearances
- Form states
- Success/confirmation messages
- Navigation between major sections
- Filter/search results

Return only "YES" or "NO".

Based on this analysis: "${analysis}", should this UI state be captured? Previous state: ${previousState || 'none'}`
      );
      const decision = response.response.text().trim().toUpperCase();
      return decision.includes('YES');
    } catch (error) {
      console.error('Error determining capture decision:', error.message);
      return true;
    }
  }

  async getNextSteps(imagePath, taskDescription) {
    try {
      const imageBuffer = await fs.readFile(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const response = await this.model.generateContent([
        `You are a web automation assistant. Analyze screenshots and provide the next steps to complete a task.
For "creating a project" tasks, you MUST capture these specific states:
1. Project list page (initial state)
2. "Create Project" button or equivalent
3. Create/new project modal or dialog
4. Form fields being filled
5. Success confirmation or project created state

IMPORTANT: Continue until you see a project actually created or clear success message. Don't stop at login pages.

Task: ${taskDescription}

What is the next step to complete this task? Return your response as a JSON object with these fields:
- nextAction: (string) The action to take (click, fill, wait, navigate)
- selector: (string, optional) CSS selector for the element
- text: (string, optional) Text to click or type
- description: (string) Description of what this step does
- url: (string, optional) URL to navigate to
- waitTime: (number, optional) Time to wait in milliseconds

Example response:
{"nextAction": "click", "text": "Create Project", "description": "Click the Create Project button"}`,
        { inlineData: { data: base64Image, mimeType: "image/png" } }
      ]);
      const content = response.response.text();
      console.log('Raw API response:', content);
      
      // Try to extract JSON from the response
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Try to find JSON object in the text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      try {
        return JSON.parse(cleanContent);
      } catch (parseError) {
        console.log('Failed to parse JSON, attempting to extract from text...');
        
        // Fallback: try to extract action from plain text
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('create project') || lowerContent.includes('new project')) {
          return {
            nextAction: 'click',
            text: 'Create Project',
            description: 'Click the Create Project button'
          };
        }
        
        // Look for login/sign in
        if (lowerContent.includes('login') || lowerContent.includes('sign in')) {
          return {
            nextAction: 'click',
            text: 'Sign in',
            description: 'Click sign in button'
          };
        }
        
        // Default fallback
        return {
          nextAction: 'wait',
          waitTime: 2000,
          description: 'Wait for page to load'
        };
      }
    } catch (error) {
      if (error.status === 429) {
        console.error('Gemini API quota exceeded. Cannot determine next steps.');
        console.error('Please check your Gemini billing/plan to continue.');
      } else {
        console.error('Error getting next steps:', error.message);
      }
      return null;
    }
  }
}

