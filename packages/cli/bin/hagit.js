#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');
const StateManager = require('../lib/state');
const Telemetry = require('../lib/telemetry');
const {
    initCommand,
    loginCommand,
    branchCommand,
    listBranchesCommand,
    checkoutCommand,
    commitCommand,
    logCommand,
    statusCommand,
    resetCommand,
    pushCommand,
    deleteHabitCommand,
    coachCommand
} = require('../commands');

program
    .name('hagit')
    .description('Git-style habit tracker')
    .version(pkg.version);

// Runs a command, prints failures in red, and records anonymous timing/outcome telemetry.
function tracked(name, fn) {
    return async (...args) => {
        const started = Date.now();
        try {
            await fn(...args);
            await Telemetry.record({ type: 'command', name, durationMs: Date.now() - started, ok: process.exitCode !== 1 });
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            await Telemetry.record({
                type: 'command', name, durationMs: Date.now() - started, ok: false,
                code: error.code || 'error', message: error.message
            });
            process.exitCode = 1;
        }
    };
}

// hagit init
program
    .command('init')
    .description('Initialize haGIT in the current directory')
    .action(tracked('init', async () => {
        await initCommand();
    }));

// hagit login --token <TOKEN>
program
    .command('login')
    .description('Authenticate with haGIT server')
    .requiredOption('-t, --token <token>', 'Authentication token from web app')
    .action(tracked('login', async (options) => {
        await loginCommand(options.token);
    }));

// hagit branch              — list habits (current marked)
// hagit branch -m <name>    — create a habit
// hagit branch -d <name>    — delete a habit
program
    .command('branch')
    .description('List, create, or delete habits (branches)')
    .option('-m, --message <name>', 'Create a new habit')
    .option('-d, --delete <name>', 'Delete an existing habit')
    .action(tracked('branch', async (options) => {
        if (options.message) {
            await branchCommand(options.message);
        } else if (options.delete) {
            await deleteHabitCommand(options.delete);
        } else {
            await listBranchesCommand();
        }
    }));

// hagit checkout <habit_name>
program
    .command('checkout <habit>')
    .description('Switch to a different habit')
    .action(tracked('checkout', async (habit) => {
        await checkoutCommand(habit);
    }));

// hagit commit -m "message"
program
    .command('commit')
    .description('Record a habit action')
    .requiredOption('-m, --message <message>', 'Commit message')
    .action(tracked('commit', async (options) => {
        await commitCommand(options.message);
    }));

// hagit log
program
    .command('log')
    .description('Show commit history (local + remote)')
    .option('-n, --number <count>', 'Number of commits to show', '10')
    .action(tracked('log', async (options) => {
        const count = Number.parseInt(options.number, 10);
        await logCommand(Number.isFinite(count) && count > 0 ? count : 10);
    }));

// hagit status
program
    .command('status')
    .description('Show current habit and unpushed commits')
    .action(tracked('status', async () => {
        await statusCommand();
    }));

// hagit reset
program
    .command('reset')
    .description('Clear all local unpushed commits')
    .action(tracked('reset', async () => {
        await resetCommand();
    }));

// hagit push
program
    .command('push')
    .description('Sync local commits to server')
    .action(tracked('push', async () => {
        await pushCommand();
    }));

// hagit coach               — weekly review of your habits
// hagit coach "<question>"  — ask the coach about your habits
program
    .command('coach [question...]')
    .description('Get an AI review of your habits, or ask a question')
    .option('-v, --verbose', 'Show which tools the coach used')
    .action(tracked('coach', async (question, options) => {
        await coachCommand(question.join(' ').trim(), options);
    }));

// hagit telemetry [on|off]
program
    .command('telemetry [state]')
    .description('Show or change anonymous usage telemetry (on|off)')
    .action((state) => {
        if (state && state !== 'on' && state !== 'off') {
            console.error(chalk.red('Usage: hagit telemetry [on|off]'));
            process.exitCode = 1;
            return;
        }
        if (state) {
            if (!StateManager.isInitialized()) {
                console.error(chalk.red('haGIT not initialized. Run: hagit init'));
                process.exitCode = 1;
                return;
            }
            Telemetry.setEnabled(state === 'on');
        }
        console.log(`Telemetry is ${Telemetry.enabled() ? chalk.green('on') : chalk.yellow('off')}.`);
        console.log(chalk.gray('Only command names, durations and error messages are sent, never habit data.'));
    });

program.parse(process.argv);
