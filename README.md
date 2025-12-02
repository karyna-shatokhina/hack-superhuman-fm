# Superhuman FM - Slack App

A Slack bot built with [Bolt for JavaScript](https://slack.dev/bolt-js).

## Features

- **Home Tab** - Custom app home with welcome message
- **Settings Modal** - Configure channels to monitor
- **Channel Selection** - Multi-select with auto-preselection of `all-*` channels

## Prerequisites

- Node.js 18+
- A Slack workspace where you can install apps

## Setup

### 1. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name your app and select your workspace

### 2. Install dependencies

```bash
cd slack-app
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the `slack-app` directory:

```bash
cd slack-app
cp env.example .env
```

Edit `.env` and fill in your tokens:

```env
# Bot Token (starts with xoxb-)
# Found in: OAuth & Permissions → Bot User OAuth Token
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Signing Secret
# Found in: Basic Information → App Credentials → Signing Secret
SLACK_SIGNING_SECRET=your-signing-secret

# App Token for Socket Mode (starts with xapp-)
# Found in: Basic Information → App-Level Tokens
SLACK_APP_TOKEN=xapp-your-app-token

# Optional: Port number (default: 3000)
PORT=3000
```

### 8. Run the app

```bash
npm run dev
```

You should see:
```
⚡️ Slack TypeScript app is running!
🔌 Socket Mode: Connected and listening for events...
```

## Project Structure

```
slack-app/
├── src/
│   └── index.ts      # Main application entry point
├── .env              # Environment variables (create from env.example)
├── env.example       # Example environment file
├── package.json
└── tsconfig.json
```

## Development

```bash
# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## License

ISC

