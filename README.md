# Home Management App

A full-stack home management application optimized for Raspberry Pi with touchscreen, featuring Google Calendar integration.

## Features

- **Google Calendar Integration**: Display, create, edit, and delete calendar events
- **External Calendar Support**: Pull in iCal calendars (school calendars, etc.)
- **Touch-Optimized UI**: Large touch targets and gestures for touchscreen use
- **Offline Support**: Local event caching for fast loading and offline access
- **Household Items** (Coming soon): Track books, movies, and other household items

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite with better-sqlite3
- **Calendar UI**: FullCalendar
- **State Management**: Zustand
- **Deployment**: Raspberry Pi with PM2 + Nginx

## Project Structure

```
HomeManagement/
├── packages/
│   ├── frontend/         # React + Vite app
│   ├── backend/          # Express server
│   └── shared/           # Shared TypeScript types
├── scripts/              # Deployment scripts
└── deploy/               # PM2, Nginx configs
```

## Getting Started

### Prerequisites

- Node.js 18+ LTS
- npm or yarn
- Google Cloud Project with Calendar API enabled

### Installation

1. Clone the repository:
```bash
git clone <repo-url>
cd HomeManagement
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your Google OAuth credentials
```

4. Initialize the database:
```bash
npm run db:migrate:latest
```

5. Start development servers:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3000`.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials (Web application)
5. Set authorized redirect URI: `http://localhost:3000/api/auth/google/callback` (for development)
6. Copy Client ID and Client Secret to `.env` file

## Development

- `npm run dev` - Start both frontend and backend in development mode
- `npm run dev:backend` - Start only backend server
- `npm run dev:frontend` - Start only frontend dev server
- `npm run build` - Build both frontend and backend for production
- `npm run db:migrate:latest` - Run database migrations

## Deployment to Raspberry Pi

See [Raspberry Pi Setup Guide](./RASPBERRY_PI_SETUP.md) for detailed instructions including:
- Initial Pi setup
- Installing Node.js and dependencies
- Running the app with PM2
- Touchscreen kiosk mode setup
- Store button integration (Dillons/Walmart)

## License

MIT
