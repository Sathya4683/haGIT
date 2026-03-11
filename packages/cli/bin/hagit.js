#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const StateManager = require('../lib/state');
const ApiClient = require('../lib/api');
const {
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
} = require('../commands');

program
    .name('hagit')
    .description('Git-style habit tracker')
    .version('1.0.0');

// hagit init
program
    .command('init')
    .description('Initialize haGIT in the current directory')
    .action(async () => {
        try {
            await initCommand();
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit login --token <TOKEN>
program
    .command('login')
    .description('Authenticate with haGIT server')
    .requiredOption('-t, --token <token>', 'Authentication token from web app')
    .action(async (options) => {
        try {
            await loginCommand(options.token);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit branch -m "habit name"
// hagit branch -d "habit name"
program
    .command('branch')
    .description('Create or delete a habit (branch)')
    .option('-m, --message <name>', 'Create a new habit')
    .option('-d, --delete <name>', 'Delete an existing habit')
    .action(async (options) => {
        try {
            if (options.message) {
                await branchCommand(options.message);
            } else if (options.delete) {
                await deleteHabitCommand(options.delete);
            } else {
                console.error(chalk.red('Error: You must provide either -m or -d'));
                process.exit(1);
            }
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit checkout <habit_name>
program
    .command('checkout <habit>')
    .description('Switch to a different habit')
    .action(async (habit) => {
        try {
            await checkoutCommand(habit);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit commit -m "message"
program
    .command('commit')
    .description('Record a habit action')
    .requiredOption('-m, --message <message>', 'Commit message')
    .action(async (options) => {
        try {
            await commitCommand(options.message);
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit log
program
    .command('log')
    .description('Show commit history (local + remote)')
    .option('-n, --number <count>', 'Number of commits to show', '10')
    .action(async (options) => {
        try {
            await logCommand(parseInt(options.number));
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit status
program
    .command('status')
    .description('Show current habit and unpushed commits')
    .action(async () => {
        try {
            await statusCommand();
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit reset
program
    .command('reset')
    .description('Clear all local unpushed commits')
    .action(async () => {
        try {
            await resetCommand();
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

// hagit push
program
    .command('push')
    .description('Sync local commits to server')
    .action(async () => {
        try {
            await pushCommand();
        } catch (error) {
            console.error(chalk.red(`Error: ${error.message}`));
            process.exit(1);
        }
    });

program.parse(process.argv);
