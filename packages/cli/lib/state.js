const fs = require('fs');
const path = require('path');
const os = require('os');

const DEFAULT_API_URL = 'https://hagithub.vercel.app';

class StateManager {
    constructor() {
        this.hagitDir = path.join(os.homedir(), '.hagit');
        this.configPath = path.join(this.hagitDir, 'config.json');
        this.headPath = path.join(this.hagitDir, 'HEAD');
        this.commitsPath = path.join(this.hagitDir, 'commits.json');
        this.coachLastPath = path.join(this.hagitDir, 'coach-last.json');
    }

    // Write to a temp file and rename, so a crash mid-write never leaves a truncated file.
    writeFileAtomic(filePath, contents) {
        const tmp = `${filePath}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, contents);
        fs.renameSync(tmp, filePath);
    }

    readJson(filePath, fallback) {
        if (!fs.existsSync(filePath)) {
            return fallback;
        }
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch {
            throw new Error(`${filePath} is corrupted. Fix or delete it, then run: hagit init`);
        }
    }

    // Initialize ~/.hagit directory structure
    init() {
        if (!fs.existsSync(this.hagitDir)) {
            fs.mkdirSync(this.hagitDir, { recursive: true });
        }

        if (!fs.existsSync(this.configPath)) {
            this.writeConfig({ token: null, userId: null, apiUrl: DEFAULT_API_URL });
        }

        if (!fs.existsSync(this.headPath)) {
            this.writeFileAtomic(this.headPath, '');
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
        return this.readJson(this.configPath, { token: null, userId: null, apiUrl: '' });
    }

    writeConfig(config) {
        this.writeFileAtomic(this.configPath, JSON.stringify(config, null, 2));
    }

    updateConfig(updates) {
        const config = this.readConfig();
        this.writeConfig({ ...config, ...updates });
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
        this.writeFileAtomic(this.headPath, habitName);
    }

    // Commits operations
    readCommits() {
        const commits = this.readJson(this.commitsPath, []);
        return Array.isArray(commits) ? commits : [];
    }

    writeCommits(commits) {
        this.writeFileAtomic(this.commitsPath, JSON.stringify(commits, null, 2));
    }

    addCommit(commit) {
        const commits = this.readCommits();
        commits.push(commit);
        this.writeCommits(commits);
    }

    clearCommits() {
        this.writeCommits([]);
    }

    // Remove only the given commits, keeping any recorded while a push was in flight.
    removeCommits(ids) {
        const pushed = new Set(ids);
        this.writeCommits(this.readCommits().filter(c => !pushed.has(c.id)));
    }

    // Drop unpushed commits of a deleted habit so the next push doesn't recreate it.
    removeCommitsForHabit(habitName) {
        const remaining = this.readCommits().filter(c => c.habitName !== habitName);
        this.writeCommits(remaining);
    }

    // Get commits for current HEAD
    getCommitsForCurrentHabit() {
        const currentHabit = this.readHEAD();
        if (!currentHabit) {
            return [];
        }
        return this.readCommits().filter(c => c.habitName === currentHabit);
    }

    // Get all unpushed commits
    getUnpushedCommits() {
        return this.readCommits();
    }

    // Last coach review — sent with the next review so the coach can follow up
    readLastReview() {
        if (!fs.existsSync(this.coachLastPath)) {
            return null;
        }
        try {
            return JSON.parse(fs.readFileSync(this.coachLastPath, 'utf8'));
        } catch {
            return null; // a corrupt cache just means no follow-up this time
        }
    }

    writeLastReview(review) {
        this.writeFileAtomic(this.coachLastPath, JSON.stringify(review, null, 2));
    }

    // Authentication helpers
    isAuthenticated() {
        const config = this.readConfig();
        return Boolean(config.token && config.userId);
    }

    getAuthToken() {
        return this.readConfig().token;
    }

    getUserId() {
        return this.readConfig().userId;
    }

    getApiUrl() {
        return process.env.HAGIT_API_URL || this.readConfig().apiUrl || DEFAULT_API_URL;
    }
}

module.exports = new StateManager();
