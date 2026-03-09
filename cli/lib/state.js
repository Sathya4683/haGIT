const fs = require('fs');
const path = require('path');
const os = require('os');

class StateManager {
  constructor() {
    this.hagitDir = path.join(os.homedir(), '.hagit');
    this.configPath = path.join(this.hagitDir, 'config.json');
    this.headPath = path.join(this.hagitDir, 'HEAD');
    this.commitsPath = path.join(this.hagitDir, 'commits.json');
  }

  // Initialize ~/.hagit directory structure
  init() {
    if (!fs.existsSync(this.hagitDir)) {
      fs.mkdirSync(this.hagitDir, { recursive: true });
    }

    if (!fs.existsSync(this.configPath)) {
      this.writeConfig({ token: null, userId: null, apiUrl: 'http://localhost:3001' });
    }

    if (!fs.existsSync(this.headPath)) {
      fs.writeFileSync(this.headPath, '');
    }

    if (!fs.existsSync(this.commitsPath)) {
      this.writeCommits([]);
    }

    return true;
  }

  // Check if haGIT is initialized
  isInitialized() {
    return fs.existsSync(this.hagitDir) && 
           fs.existsSync(this.configPath) && 
           fs.existsSync(this.headPath) && 
           fs.existsSync(this.commitsPath);
  }

  // Config operations
  readConfig() {
    if (!fs.existsSync(this.configPath)) {
      return { token: null, userId: null, apiUrl: 'http://localhost:3001' };
    }
    const data = fs.readFileSync(this.configPath, 'utf8');
    return JSON.parse(data);
  }

  writeConfig(config) {
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  updateConfig(updates) {
    const config = this.readConfig();
    const newConfig = { ...config, ...updates };
    this.writeConfig(newConfig);
  }

  // HEAD operations (current habit)
  readHEAD() {
    if (!fs.existsSync(this.headPath)) {
      return null;
    }
    const head = fs.readFileSync(this.headPath, 'utf8').trim();
    return head || null;
  }

  writeHEAD(habitName) {
    fs.writeFileSync(this.headPath, habitName);
  }

  // Commits operations
  readCommits() {
    if (!fs.existsSync(this.commitsPath)) {
      return [];
    }
    const data = fs.readFileSync(this.commitsPath, 'utf8');
    return JSON.parse(data);
  }

  writeCommits(commits) {
    fs.writeFileSync(this.commitsPath, JSON.stringify(commits, null, 2));
  }

  addCommit(commit) {
    const commits = this.readCommits();
    commits.push(commit);
    this.writeCommits(commits);
  }

  clearCommits() {
    this.writeCommits([]);
  }

  // Get commits for current HEAD
  getCommitsForCurrentHabit() {
    const currentHabit = this.readHEAD();
    if (!currentHabit) {
      return [];
    }
    const commits = this.readCommits();
    return commits.filter(c => c.habitName === currentHabit);
  }

  // Get all unpushed commits
  getUnpushedCommits() {
    return this.readCommits();
  }

  // Authentication helpers
  isAuthenticated() {
    const config = this.readConfig();
    return config.token && config.userId;
  }

  getAuthToken() {
    const config = this.readConfig();
    return config.token;
  }

  getUserId() {
    const config = this.readConfig();
    return config.userId;
  }

  getApiUrl() {
    const config = this.readConfig();
    return config.apiUrl || 'http://localhost:3001';
  }
}

module.exports = new StateManager();
