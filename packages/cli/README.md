# haGIT CLI

haGIT CLI is a Git-inspired habit tracking tool designed for developers who prefer structured workflows.

Instead of traditional habit trackers with checkboxes and streak counters, haGIT models habits using familiar version control concepts such as **branches, commits, logs, and pushes**. This allows habit actions to be recorded in a structured workflow similar to Git.

The CLI records habit actions locally and synchronizes them with the haGIT server.

---

# Installation

Install the CLI globally using npm.

```
npm install -g hagit-cli
```

Verify installation:

```
hagit --version
```

Once installed, the `hagit` command will be available globally.

---

# Quick Start

Initialize haGIT in a directory where you want to track habits.

```
hagit init
```

Authenticate the CLI using your token.

```
hagit login -t <token>
```

Create your first habit:

```
hagit branch -m exercise
```

Switch to the habit:

```
hagit checkout exercise
```

Record a habit action:

```
hagit commit -m "morning run"
```

Push commits to the server:

```
hagit push
```

---

# Commands

| Command                      | Description                  | Example                           |
| ---------------------------- | ---------------------------- | --------------------------------- |
| `hagit init`                 | Initialize haGIT workspace   | `hagit init`                      |
| `hagit login -t <token>`     | Authenticate CLI with server | `hagit login -t TOKEN`            |
| `hagit branch -m <habit>`    | Create a new habit           | `hagit branch -m exercise`        |
| `hagit branch -d <habit>`    | Delete a habit               | `hagit branch -d exercise`        |
| `hagit checkout <habit>`     | Switch to a habit            | `hagit checkout reading`          |
| `hagit commit -m <message>`  | Record a habit action        | `hagit commit -m "read 20 pages"` |
| `hagit commit -d <commitId>` | Delete a commit              | `hagit commit -d 123`             |
| `hagit log`                  | Show commit history          | `hagit log`                       |
| `hagit status`               | Show workspace state         | `hagit status`                    |
| `hagit reset`                | Clear local commits          | `hagit reset`                     |
| `hagit push`                 | Sync commits with server     | `hagit push`                      |

---

# Example Workflow

A typical habit tracking workflow using the CLI:

```
hagit init
hagit login -t <token>

hagit branch -m exercise
hagit checkout exercise

hagit commit -m "morning run"
hagit commit -m "evening stretch"

hagit push
```

This workflow:

1. Initializes a habit workspace
2. Authenticates the CLI
3. Creates a habit
4. Records habit actions as commits
5. Synchronizes commits with the server

---

# Local Storage

haGIT stores local configuration and commits in the user's home directory:

```
~/.hagit
```

This directory contains:

```
config.json
HEAD
commits.json
```

| File           | Purpose                                 |
| -------------- | --------------------------------------- |
| `config.json`  | Stores authentication token and API URL |
| `HEAD`         | Current active habit                    |
| `commits.json` | Local commit history                    |

Commits are stored locally until they are pushed to the server.

---

# Synchronization

Running:

```
hagit push
```

sends local commits to the haGIT server.

Once pushed, commits become available in the haGIT dashboard and extension.

---

# Related Components

haGIT CLI is part of a larger ecosystem.

| Component        | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| Web Dashboard    | Visualize habits, heatmaps, and statistics                |
| Chrome Extension | Quickly create commits and manage habits from the browser |

---

# License

MIT License
