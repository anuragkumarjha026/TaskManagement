# Task Management System

A React-based frontend project for organizing daily work, scheduling reminders, tracking progress and building productive habits.

## Features

- 3D animated welcome screen and bouncing title
- Local account registration, login and demo account
- Motivational quotes after login
- Create, read, update and delete tasks
- Task priorities, due dates, search, filters and progress tracking
- Scheduled work alarms, sound controls and five-minute snooze
- Accountability quotes for unfinished tasks
- Responsive layout for desktop and mobile

## Technologies

React 18, JSX, JavaScript, HTML5, CSS3, Vite, LocalStorage and Web Audio API. The project uses React components, props, useState and useEffect.

## Run locally

Install Node.js 22 LTS (or a compatible newer version). Open this folder in VS Code and run:

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (usually http://localhost:5173/).

## Project structure

```text
.
├── src/
│   ├── main.jsx       # Application state, login, tasks and alarm logic
│   ├── screens.jsx    # Welcome, authentication, quotes and dashboard UI
│   ├── shared.jsx     # Quotes, task rows, icons and helper functions
│   └── styles.css     # Styling, responsive layouts and animations
├── index.html         # Entry point
├── package.json       # Dependencies and npm scripts
├── netlify.toml       # Netlify build settings
├── .gitignore
└── README.md
```

## Build and deploy

```bash
npm run build
npm run preview
```

The build generates the `dist/` directory. For Netlify, connect this GitHub repository and use `npm run build` as the build command and `dist` as the publish directory. These settings are also included in `netlify.toml`.

## Limitations

This is a frontend-only academic prototype. Accounts and tasks are stored in LocalStorage, separately for each browser and site origin. Use a test password; local authentication is not production security. There is no backend database or cloud synchronization. The app must remain open and signed in for reminders, and audible alerts depend on browser audio permission. Do not use it for critical reminders.

## Future scope

Secure backend authentication, database integration, cloud synchronization, push notifications and team collaboration.
