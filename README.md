# No es tan fácil - Cooperative Narrative Voting Game

A multiplayer cooperative narrative game designed for ~50 simultaneous players. Players make collective decisions through voting to shape the story outcome, discover clues to solve mysteries, and create checkpoints to save progress.

## Project Overview

**No es tan fácil** is an interactive storytelling experience where:
- Players join a session using a session code
- The game admin controls story progression
- Players vote on narrative choices
- Discovered clues unlock different story paths
- Three distinct endings based on collected evidence

## Features

- **Real-time Multiplayer**: Supabase Realtime for instant synchronization across 50+ players
- **Narrative Branching**: 15+ interconnected story scenes with dynamic progression
- **Voting System**: Majority-vote decision making (>50% threshold)
- **Clue Discovery**: 25 pistas (clues) across 5 categories with combination logic
- **Checkpoint System**: Save and restore game states
- **Admin Panel**: Real-time control and monitoring of game sessions
- **Anonymous Authentication**: Players join without accounts
- **TypeScript**: Full type safety throughout the application

## Technology Stack

### Frontend
- React 18
- React Router DOM v6
- TypeScript
- Zustand (State Management)
- Vite (Build Tool)
- CSS3

### Backend
- Supabase (PostgreSQL + Realtime WebSocket)
- Row Level Security (RLS)

## Project Structure

```
src/
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   ├── JoinPage.tsx    # Session join
│   ├── LobbyPage.tsx   # Pre-game lobby
│   ├── GamePage.tsx    # Main gameplay
│   ├── AdminPage.tsx   # Admin login
│   └── AdminGamePage.tsx # Admin control panel
├── components/         # Reusable UI components
│   ├── SceneView.tsx
│   ├── VotingPanel.tsx
│   ├── VoteProgressPanel.tsx
│   ├── VoteResultsPanel.tsx
│   ├── AdminVoteControl.tsx
│   └── ClueBoardPanel.tsx
├── store/              # Zustand state management
│   └── gameStore.ts
├── lib/                # Services and utilities
│   ├── supabase.ts     # Supabase client
│   └── gameService.ts  # Game business logic
├── hooks/              # Custom React hooks
│   └── useVoteMonitor.ts
├── data/               # Game data
│   ├── storyData.ts    # Story scenes and narratives
│   └── cluesData.ts    # Clues and discovery logic
└── types/              # TypeScript type definitions
    └── game.ts
```

## Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/franciscombp/tanfacil.git
cd tanfacil
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_TOKEN=your_admin_secret_token
```

Get these values from your Supabase project settings.

### 4. Database Setup
Run the SQL migrations in your Supabase project.

## Development

### Start Development Server
```bash
npm run dev
```
The app will open at `http://localhost:5173`

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages via GitHub Actions.

**Live URL**: `https://franciscombp.github.io/tanfacil/`

#### Prerequisites:
1. Repository secrets must be set in GitHub:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_TOKEN`

#### Automatic Deployment:
Push to the `main` branch to trigger automatic deployment via GitHub Actions.

#### Manual Deployment:
```bash
npm run deploy
```

## Story & Clues

### Story Scenes (15+)
The game includes multiple interconnected scenes spanning investigation, voting decisions, and three distinct endings:
- **Repair Ending**: Fix the clock to restore functionality
- **Conserve Ending**: Preserve the clock as historical memory
- **Modern Ending**: Embrace Teams solution and move forward

### Clues (25 total)
Organized in 5 categories:
- **Clock**: Physical clock properties and problems
- **Wall**: Building structure and history
- **History**: Past events and origins
- **Present**: Current situation and context
- **Noise**: Emotional and irrelevant clues

## Performance

Build size:
- **Total**: ~420 KB
- **Gzipped**: ~121 KB
- **Modules**: 111

## Tech Details

- React 18 with TypeScript
- Vite for fast builds
- Zustand for state management
- Supabase for real-time sync
- PostgreSQL with RLS for security
