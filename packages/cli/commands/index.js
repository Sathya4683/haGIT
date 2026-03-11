const chalk = require('chalk');
const ora = require('ora');
const StateManager = require('../lib/state');
const ApiClient = require('../lib/api');

// hagit init
async function initCommand() {
    const spinner = ora('Initializing haGIT...').start();

    if (StateManager.isInitialized()) {
        spinner.fail('haGIT is already initialized');
        return;
    }

    StateManager.init();
    spinner.succeed('haGIT initialized successfully!');
    console.log(chalk.cyan('\nNext steps:'));
    console.log('  1. Login to the web app and get your token');
    console.log('  2. Run: hagit login --token <YOUR_TOKEN>');
}

// hagit login --token <TOKEN>
async function loginCommand(token) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    const spinner = ora('Verifying token...').start();

    try {
        const result = await ApiClient.verifyToken(token);

        StateManager.updateConfig({
            token: token,
            userId: result.userId
        });

        spinner.succeed(`Logged in as user ID: ${result.userId}`);
        console.log(chalk.green('✓ Authentication successful!'));
    } catch (error) {
        spinner.fail('Authentication failed');
        throw error;
    }
}

// hagit branch -m "habit name"
async function branchCommand(habitName) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    if (!StateManager.isAuthenticated()) {
        throw new Error('Not authenticated. Run: hagit login --token <TOKEN>');
    }

    const spinner = ora(`Creating habit: ${habitName}...`).start();

    try {
        const habit = await ApiClient.createHabit(habitName);
        StateManager.writeHEAD(habitName);

        spinner.succeed(`Created and switched to habit: ${chalk.bold(habitName)}`);
        console.log(chalk.gray(`Habit ID: ${habit.id}`));
    } catch (error) {
        spinner.fail('Failed to create habit');
        throw error;
    }
}

// hagit branch -d "habit name"
async function deleteHabitCommand(habitName) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    if (!StateManager.isAuthenticated()) {
        throw new Error('Not authenticated. Run: hagit login --token <TOKEN>');
    }

    const spinner = ora(`Deleting habit: ${habitName}...`).start();

    try {
        await ApiClient.deleteHabit(habitName);

        const currentHabit = StateManager.readHEAD();

        // If deleting the current habit, clear HEAD
        if (currentHabit === habitName) {
            StateManager.writeHEAD('');
        }

        spinner.succeed(`Deleted habit: ${chalk.bold(habitName)}`);
    } catch (error) {
        spinner.fail('Failed to delete habit');
        throw error;
    }
}

// hagit checkout <habit_name>
async function checkoutCommand(habitName) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    if (!StateManager.isAuthenticated()) {
        throw new Error('Not authenticated. Run: hagit login --token <TOKEN>');
    }

    const spinner = ora(`Switching to habit: ${habitName}...`).start();

    try {
        // Verify habit exists
        const habits = await ApiClient.getHabits();
        const habit = habits.find(h => h.name === habitName);

        if (!habit) {
            spinner.fail(`Habit '${habitName}' not found`);
            console.log(chalk.yellow('\nAvailable habits:'));
            habits.forEach(h => console.log(`  - ${h.name}`));
            return;
        }

        StateManager.writeHEAD(habitName);
        spinner.succeed(`Switched to habit: ${chalk.bold(habitName)}`);
    } catch (error) {
        spinner.fail('Failed to checkout habit');
        throw error;
    }
}

// hagit commit -m "message"
async function commitCommand(message) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    const currentHabit = StateManager.readHEAD();
    if (!currentHabit) {
        throw new Error('No habit checked out. Run: hagit checkout <habit> or hagit branch -m <name>');
    }

    const commit = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        habitName: currentHabit,
        message: message,
        timestamp: new Date().toISOString(),
        synced: false
    };

    StateManager.addCommit(commit);

    console.log(chalk.green('✓ Commit created'));
    console.log(chalk.gray(`[${currentHabit}] ${message}`));
    console.log(chalk.yellow('\nRun `hagit push` to sync with server'));
}

// hagit log
async function logCommand(limit) {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    const currentHabit = StateManager.readHEAD();
    if (!currentHabit) {
        throw new Error('No habit checked out');
    }

    console.log(chalk.bold(`\nCommit history for: ${currentHabit}\n`));

    // Get local commits
    const localCommits = StateManager.getCommitsForCurrentHabit();

    // Get remote commits if authenticated
    let remoteCommits = [];
    if (StateManager.isAuthenticated()) {
        try {
            remoteCommits = await ApiClient.getCommits(currentHabit, limit);
        } catch (error) {
            console.log(chalk.yellow('Warning: Could not fetch remote commits'));
        }
    }

    // Merge and deduplicate
    const allCommits = [...localCommits, ...remoteCommits];
    const uniqueCommits = Array.from(
        new Map(allCommits.map(c => [c.timestamp, c])).values()
    ).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const commitsToShow = uniqueCommits.slice(0, limit);

    if (commitsToShow.length === 0) {
        console.log(chalk.gray('No commits yet. Use `hagit commit -m "message"` to create one.'));
        return;
    }

    commitsToShow.forEach((commit, index) => {
        const isLocal = commit.synced === false;
        const date = new Date(commit.timestamp);
        const dateStr = date.toLocaleString();

        console.log(chalk.yellow(`commit ${commit.id}${isLocal ? ' (local)' : ''}`));
        console.log(chalk.gray(`Date:   ${dateStr}`));
        console.log(`\n    ${commit.message}\n`);
    });

    if (uniqueCommits.length > limit) {
        console.log(chalk.gray(`... and ${uniqueCommits.length - limit} more commits`));
    }
}

// hagit status
async function statusCommand() {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    const currentHabit = StateManager.readHEAD();
    const unpushedCommits = StateManager.getUnpushedCommits();

    console.log(chalk.bold('\n=== haGIT Status ===\n'));

    if (currentHabit) {
        console.log(chalk.cyan(`Current habit: ${chalk.bold(currentHabit)}`));
    } else {
        console.log(chalk.yellow('No habit checked out'));
    }

    console.log(`\nUnpushed commits: ${chalk.bold(unpushedCommits.length)}`);

    if (unpushedCommits.length > 0) {
        console.log(chalk.gray('\nLocal commits:'));
        unpushedCommits.forEach(commit => {
            const date = new Date(commit.timestamp).toLocaleString();
            console.log(`  ${chalk.yellow('●')} [${commit.habitName}] ${commit.message}`);
            console.log(`    ${chalk.gray(date)}`);
        });
        console.log(chalk.yellow('\nRun `hagit push` to sync with server'));
    } else {
        console.log(chalk.green('  All commits are synced!'));
    }
}

// hagit reset
async function resetCommand() {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    const unpushedCommits = StateManager.getUnpushedCommits();

    if (unpushedCommits.length === 0) {
        console.log(chalk.yellow('No local commits to reset'));
        return;
    }

    StateManager.clearCommits();
    console.log(chalk.green(`✓ Cleared ${unpushedCommits.length} local commit(s)`));
}

// hagit push
async function pushCommand() {
    if (!StateManager.isInitialized()) {
        throw new Error('haGIT not initialized. Run: hagit init');
    }

    if (!StateManager.isAuthenticated()) {
        throw new Error('Not authenticated. Run: hagit login --token <TOKEN>');
    }

    const unpushedCommits = StateManager.getUnpushedCommits();

    if (unpushedCommits.length === 0) {
        console.log(chalk.yellow('No commits to push'));
        return;
    }

    const spinner = ora(`Pushing ${unpushedCommits.length} commit(s)...`).start();

    try {
        // Transform commits for API
        const commitsToSync = unpushedCommits.map(c => ({
            habitName: c.habitName,
            message: c.message,
            timestamp: c.timestamp
        }));

        const result = await ApiClient.pushCommits(commitsToSync);

        StateManager.clearCommits();
        spinner.succeed(`Successfully pushed ${result.count} commit(s)`);
        console.log(chalk.green('✓ All commits synced!'));
    } catch (error) {
        spinner.fail('Failed to push commits');
        throw error;
    }
}

module.exports = {
    initCommand,
    loginCommand,
    branchCommand,
    checkoutCommand,
    commitCommand,
    logCommand,
    statusCommand,
    resetCommand,
    pushCommand,
    deleteHabitCommand
};
