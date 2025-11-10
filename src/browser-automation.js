import { chromium } from 'playwright';
import fs from 'fs-extra';
import path from 'path';

export class BrowserAutomation {
  constructor(options = {}) {
    this.options = {
      headless: options.headless ?? process.env.HEADLESS === 'true',
      timeout: parseInt(process.env.BROWSER_TIMEOUT) || 30000,
      screenshotDir: options.screenshotDir || process.env.SCREENSHOT_DIR || './screenshots',
      ...options
    };
    this.browser = null;
    this.context = null;
    this.page = null;
    this.screenshotCounter = 0;
    this.workflowId = null;
  }

  async initialize() {
    this.browser = await chromium.launch({ headless: this.options.headless, slowMo: this.options.headless ? 0 : 100 });
    this.context = await this.browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: path.join(this.options.screenshotDir, 'videos'), size: { width: 1920, height: 1080 } } });
    this.page = await this.context.newPage();
    await fs.ensureDir(this.options.screenshotDir);
    this.workflowId = `workflow_${Date.now()}`;
    this.workflowDir = path.join(this.options.screenshotDir, this.workflowId);
    await fs.ensureDir(this.workflowDir);
    return this;
  }

  async navigate(url) {
    if (!this.page) throw new Error('Browser not initialized. Call initialize() first.');
    await this.page.goto(url, { waitUntil: 'load', timeout: this.options.timeout });
    await this.page.waitForTimeout(2000);
  }

  async captureScreenshot(label, metadata = {}) {
    if (!this.page) throw new Error('Browser not initialized.');
    this.screenshotCounter++;
    const filename = `step_${String(this.screenshotCounter).padStart(3, '0')}_${label.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    const filepath = path.join(this.workflowDir, filename);
    await this.page.screenshot({ path: filepath, fullPage: true });
    const screenshotInfo = { step: this.screenshotCounter, label, filepath, url: this.page.url(), timestamp: new Date().toISOString(), metadata };
    const metadataPath = path.join(this.workflowDir, 'metadata.json');
    let metadataFile = [];
    if (await fs.pathExists(metadataPath)) metadataFile = await fs.readJson(metadataPath);
    metadataFile.push(screenshotInfo);
    await fs.writeJson(metadataPath, metadataFile, { spaces: 2 });
    return screenshotInfo;
  }

  async click(selector, options = {}) {
    const validSelector = this.fixSelector(selector);
    await this.page.waitForSelector(validSelector, { timeout: this.options.timeout });
    await this.page.click(validSelector, options);
    await this.page.waitForTimeout(500);
  }

  fixSelector(selector) {
    if (selector.includes(':contains(')) {
      const match = selector.match(/:contains\(["']([^"']+)["']\)/);
      if (match) {
        const text = match[1];
        const baseSelector = selector.split(':contains(')[0].trim() || '*';
        return `${baseSelector}:has-text("${text}")`;
      }
    }
    return selector;
  }

  async clickByText(text, options = {}) {
    await this.page.click(`:has-text("${text}")`, options);
    await this.page.waitForTimeout(500);
  }

  async fill(selector, text, options = {}) {
    await this.page.waitForSelector(selector, { timeout: this.options.timeout });
    await this.page.fill(selector, text, options);
    await this.page.waitForTimeout(300);
  }

  async waitForSelector(selector, options = {}) {
    await this.page.waitForSelector(selector, { timeout: options.timeout || this.options.timeout, ...options });
  }

  async waitForURL(pattern, options = {}) {
    await this.page.waitForURL(pattern, { timeout: options.timeout || this.options.timeout, ...options });
  }

  async waitForTimeout(ms) { await this.page.waitForTimeout(ms); }

  async getCurrentURL() { return this.page.url(); }

  async getPageTitle() { return await this.page.title(); }

  async evaluate(script, ...args) { return await this.page.evaluate(script, ...args); }

  async detectUIStateChange(timeout = 5000) {
    return await this.page.evaluate((timeout) => {
      return new Promise((resolve) => {
        const observer = new MutationObserver(() => { resolve(true); });
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'aria-hidden'] });
        setTimeout(() => { observer.disconnect(); resolve(false); }, timeout);
      });
    }, timeout);
  }

  async hasModalVisible() {
    return await this.page.evaluate(() => {
      const modalSelectors = [
        '[role="dialog"]', '.modal', '[class*="Modal"]', '[class*="modal"]', '[class*="Overlay"]', '[class*="overlay"]', '[class*="Popup"]', '[class*="popup"]', '[class*="Drawer"]', '[class*="drawer"]', '[class*="Sheet"]', '[class*="sheet"]', '[data-state="open"]', '[aria-modal="true"]', '[class*="DialogContent"]', '[class*="Panel"]'
      ];
      for (const selector of modalSelectors) {
        const modals = document.querySelectorAll(selector);
        for (const modal of modals) {
          const style = window.getComputedStyle(modal);
          const rect = modal.getBoundingClientRect();
          if (style.display !== 'none' && style.visibility !== 'hidden' && (style.opacity === '' || parseFloat(style.opacity) > 0.1) && rect.width > 50 && rect.height > 50) {
            return true;
          }
        }
      }
      const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="Backdrop"], [class*="overlay"], [class*="Overlay"]');
      for (const backdrop of backdrops) {
        const style = window.getComputedStyle(backdrop);
        if (style.display !== 'none' && style.visibility !== 'hidden') return true;
      }
      return false;
    });
  }

  async waitForUIStable(maxWait = 2000) {
    let stable = false, checks = 0, maxChecks = maxWait / 100;
    while (!stable && checks < maxChecks) {
      const wasStable = await this.page.evaluate(() => {
        const loaders = document.querySelectorAll('[class*="loading"], [class*="Loading"], [class*="spinner"], [class*="Spinner"]');
        for (const loader of loaders) { if (window.getComputedStyle(loader).display !== 'none') return false; }
        return true;
      });
      if (wasStable) { await this.page.waitForTimeout(300); stable = true; } else { await this.page.waitForTimeout(100); checks++; }
    }
  }

  async close() {
    if (this.context) await this.context.close();
    if (this.browser) await this.browser.close();
  }

  getWorkflowDir() { return this.workflowDir; }
}
