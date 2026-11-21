# StudentHub

A responsive student productivity dashboard built with vanilla HTML, CSS and JavaScript.

## Features

- Local demo registration and login screens
- Add, complete, delete, search and filter tasks
- Task due dates, categories and priority labels
- Dashboard stats and task completion progress
- Focus timer with user-configurable focus and break durations
- Focus session and minute tracking
- Light/dark theme
- Per-browser local data persistence with `localStorage`

## Run locally

1. Extract the project folder.
2. Open the folder in VS Code.
3. Open `index.html` using the Live Server extension, or run a local static server.
4. Register a demo account and explore the dashboard.

The Web Crypto password hashing used by the demo requires a secure context (normally `localhost` or HTTPS).

## Deploy

This is a static front-end project. You can deploy the folder to Vercel, Netlify or GitHub Pages. For Vercel, import the GitHub repository and use the default static-site settings; no build command is required.

## Important security limitation

**The login/register feature is a front-end demonstration, not production authentication.** User records and app data are stored in the visitor's browser using `localStorage`. There is no server-side identity verification, password reset, cross-device account sync, authorization boundary or database. A visitor can inspect or modify their own browser storage. Do not use real or reused passwords, and do not use this demo to protect private information.

For a real public application, replace this demo auth with a trusted authentication provider or a backend (for example, a server-side API with properly hashed passwords, secure sessions, rate limiting, validation and database storage). Never store secrets or credentials in frontend code.

## Project structure

```text
studenthub-pro/
├── index.html   # Page structure and screens
├── style.css    # Layout, responsive styling and themes
├── app.js       # App logic, local demo auth, tasks and timer
└── README.md    # Setup, deployment and security notes
```
