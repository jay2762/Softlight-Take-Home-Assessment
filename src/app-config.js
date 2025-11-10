//Maps tasks to apps and provides app-specific configurations

export class AppConfig {
  static APPS = {
    linear: {
      name: 'Linear', url: 'https://linear.app', loginRequired: true,
      selectors: { 
        createButton: '[data-testid*="create"], button:has-text("Create")', 
        projectButton: 'button:has-text("Project"), a:has-text("Project")', 
        modal: '[role="dialog"]', 
        formInput: 'input[type="text"], textarea' 
      }
    },
    notion: {
      name: 'Notion', url: 'https://www.notion.so', loginRequired: true,
      selectors: { 
        filterButton: 'button:has-text("Filter"), [aria-label*="Filter"]', 
        databaseView: '.notion-collection-view', 
        modal: '[role="dialog"]', 
        formInput: 'input, textarea' 
      }
    },
    asana: {
      name: 'Asana', url: 'https://app.asana.com', loginRequired: true,
      selectors: { 
        createButton: 'button:has-text("Create"), [aria-label*="Create"]', 
        modal: '[role="dialog"]', 
        formInput: 'input, textarea' 
      }
    },
    github: {
      name: 'GitHub', url: 'https://github.com', loginRequired: false,
      selectors: { 
        createButton: 'button:has-text("New"), [aria-label*="Create new"]', 
        repoButton: 'a:has-text("Repository"), button:has-text("Repository")', 
        modal: '[role="dialog"]', 
        formInput: 'input[name="repository[name]"], textarea[name="repository[description]"]' 
      }
    },
    trello: {
      name: 'Trello', url: 'https://trello.com', loginRequired: true,
      selectors: { 
        createButton: 'button:has-text("Create"), [data-testid*="create"]', 
        boardButton: 'button:has-text("Board"), a:has-text("Board")', 
        modal: '[role="dialog"]', 
        formInput: 'input[type="text"], textarea' 
      }
    },
    wikipedia: {
      name: 'Wikipedia', url: 'https://en.wikipedia.org', loginRequired: false,
      selectors: { 
        searchButton: 'button:has-text("Search"), [type="submit"]', 
        searchInput: 'input[name="search"], #searchInput', 
        modal: '[role="dialog"]', 
        formInput: 'input, textarea' 
      }
    },
    reddit: {
      name: 'Reddit', url: 'https://www.reddit.com', loginRequired: false,
      selectors: { 
        searchButton: 'button:has-text("Search"), [type="submit"]', 
        searchInput: 'input[name="q"], #header-search-bar', 
        postButton: 'button:has-text("Post"), a:has-text("Create post")', 
        modal: '[role="dialog"]', 
        formInput: 'input, textarea' 
      }
    }
  };

   //Determine which app to use based on task description

  static getAppForTask(taskDescription, explicitAppName = null) {
    const lowerTask = taskDescription.toLowerCase();
    if (explicitAppName) {
      const appKey = explicitAppName.toLowerCase();
      if (this.APPS[appKey]) return this.APPS[appKey];
    }
    if (lowerTask.includes('linear')) return this.APPS.linear;
    if (lowerTask.includes('notion')) return this.APPS.notion;
    if (lowerTask.includes('asana')) return this.APPS.asana;
    if (lowerTask.includes('github')) return this.APPS.github;
    if (lowerTask.includes('trello')) return this.APPS.trello;
    if (lowerTask.includes('wikipedia')) return this.APPS.wikipedia;
    if (lowerTask.includes('reddit')) return this.APPS.reddit;
    return this.APPS.wikipedia;
  }


  //Get app configuration by name

  static getApp(appName) { return this.APPS[appName.toLowerCase()]; }

  //Get all available apps

  static getAllApps() { return Object.values(this.APPS); }
}
