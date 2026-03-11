# haGIT

haGIT is a Git-inspired habit tracking system designed for people who prefer a **developer-style workflow for building consistent habits**.

Instead of traditional habit apps with checkboxes and streak counters, haGIT models habits using familiar version control concepts such as **branches, commits, logs, and pushes**. This allows habits to be recorded, reviewed, and synchronized in a structured way.

The system consists of two components:

1. **haGIT CLI** – a local command-line interface for recording and managing habit activity.
2. **haGIT Web Dashboard** – a web application that visualizes activity using contribution graphs, commit history, and habit summaries.

The CLI records actions locally and synchronizes them with the server, enabling users to track progress across both the terminal and the web interface.

---

# Concept

haGIT maps common Git concepts to habit tracking:

| Git Concept | haGIT Equivalent           |
| ----------- | -------------------------- |
| Repository  | Local habit workspace      |
| Branch      | Individual habit           |
| Commit      | Recorded habit action      |
| Log         | Habit activity history     |
| Push        | Sync commits to the server |

This structure allows habits to be tracked with a workflow that is predictable and easy to understand for users familiar with Git.

---

# Installation

Install the CLI globally (https://www.npmjs.com/package/hagit-cli):

```
npm install -g hagit
```

Verify installation:

```
hagit --version
```

---

# Getting Started

Navigate to the directory where you want to track habits and initialize haGIT:

```
hagit init
```

This creates a local configuration directory that stores habits, commits, and workspace metadata.

Next, authenticate with the haGIT server:

```
hagit login -t <your-token>
```

The token is generated from the web dashboard and allows the CLI to sync activity to your account.

---

# Core Workflow

A typical workflow using haGIT looks like this:

1. Initialize a habit workspace
2. Create a habit
3. Record actions as commits
4. Review history locally
5. Push commits to the server
6. View analytics on the dashboard

Example:

```
hagit init
hagit branch exercise
hagit checkout exercise
hagit commit -m "morning run"
hagit push
```

---

# Commands

## init

Initialize haGIT in the current directory.

```
hagit init
```

Creates the local configuration used to track habits and commits.

---

## login

Authenticate with the haGIT server.

```
hagit login -t <token>
```

The token can be copied from the Settings section of the web dashboard.

Authentication allows the CLI to sync commits to your account.

---

## branch

Create a new habit.

```
hagit branch <habit-name>
```

Example:

```
hagit branch reading
```

Each habit behaves like a branch in Git.

---

## checkout

Switch to a different habit.

```
hagit checkout <habit>
```

Example:

```
hagit checkout exercise
```

All subsequent commits will be recorded under the selected habit.

---

## commit

Record a habit action.

```
hagit commit -m "message"
```

Example:

```
hagit commit -m "30 minute workout"
```

Each commit represents a completed action related to the current habit.

---

## log

View commit history.

```
hagit log
```

This displays both local and synchronized commits.

---

## status

Display current workspace state.

```
hagit status
```

Shows:

* current habit
* number of local commits
* whether commits have been pushed

---

## reset

Clear local unpushed commits.

```
hagit reset
```

Useful for discarding mistakes before syncing with the server.

---

## push

Sync local commits to the server.

```
hagit push
```

Once pushed, commits become visible in the web dashboard and contribution graph.

---

# Web Dashboard

The haGIT web dashboard provides a visual overview of habit activity.

Features include:

* contribution heatmap showing daily activity
* commit history with timestamps
* habit-level statistics
* habit management
* account settings and token management

Commits pushed from the CLI are automatically reflected in the dashboard.

---

# Habit Tracking Model

Each habit acts as a dedicated branch.

Example structure:

```
exercise
reading
meditation
coding
```

Commits are recorded under the active habit:

```
exercise
  ├─ morning run
  ├─ gym session
  └─ stretching routine
```

This allows habits to maintain their own independent history while still contributing to overall activity metrics.

---

# Synchronization

Commits are first stored locally when created.

Running:

```
hagit push
```

sends those commits to the server.

This design ensures that habit actions can still be recorded even when offline.

---

# Best Practices

Use short and descriptive commit messages.

Examples:

```
hagit commit -m "read 20 pages"
hagit commit -m "completed workout session"
hagit commit -m "studied algorithms for 1 hour"
```

Commit messages should represent the specific action performed.

---

# Technology Stack

haGIT is built using a modern full-stack JavaScript architecture designed for scalability and maintainability.

| Layer              | Technology           | Purpose                                               |
| ------------------ | -------------------- | ----------------------------------------------------- |
| Frontend Framework | Next.js (App Router) | Web dashboard and API routes                          |
| Language           | TypeScript           | Type safety across frontend and backend               |
| Styling            | TailwindCSS          | Utility-first styling system                          |
| UI Components      | shadcn/ui            | Accessible component primitives                       |
| State Management   | Zustand              | Lightweight global state management                   |
| Data Fetching      | TanStack Query       | API caching, background fetching, and synchronization |
| Forms              | React Hook Form      | Form handling and validation                          |
| ORM                | Prisma               | Database modeling and queries                         |
| Database           | PostgreSQL (Neon)    | Serverless managed Postgres database                  |
| Authentication     | JWT                  | Token-based authentication for CLI and dashboard      |
| Runtime            | Node.js              | Backend execution for API routes                      |

The backend API is implemented directly within the Next.js application using **Route Handlers**, replacing the previous Express server.

---

# Configuration

haGIT stores configuration data inside a local workspace directory created during initialization.

This directory contains:

* habit metadata
* commit history
* authentication configuration

Users generally do not need to modify these files manually.

---

# Philosophy

haGIT is designed around a simple idea:

**Consistency can be built using structured workflows.**

By treating habits as branches and actions as commits, the process of maintaining habits becomes structured, traceable, and reviewable.

The CLI provides a fast and minimal interface for recording actions, while the dashboard provides visualization and analytics.

Together they create a system that integrates well into a developer’s daily workflow.

---

# License

MIT License
