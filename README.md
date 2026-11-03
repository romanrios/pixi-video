# Pixi Video

Pixi Video is a web-based creative coding playground and MP4 recorder built with PixiJS v8 and Next.js. It allows developers and generative artists to write JavaScript visual effects, preview them live, and export them as deterministic MP4 videos without frame drops.

## Features

- Live Code Editor: Write and test PixiJS v8 code directly in the browser with syntax highlighting and keyboard shortcuts (Ctrl+Enter to run).
- Deterministic MP4 Export: Render animations frame-by-frame using WebCodecs and MP4 multiplexing, guaranteeing zero frame drops and smooth playback regardless of system performance.
- Flexible Resolutions: Choose from common aspect ratios (1:1 square, 16:9 landscape, 9:16 portrait) or define custom pixel dimensions.
- Customizable Export Settings: Configure video duration, frame rates (24, 30, 60 FPS), and encoder bitrates.
- Preset Library: Browse and load built-in generative presets (Flow Field, Sacred Geometry, 3D Synthwave Tunnel, Harmonic Waves).
- User Accounts & Community Presets: Sign in with Google to publish, edit, and manage your own custom animation presets stored in a cloud database.

## Tech Stack

- Frontend: Next.js (App Router), React, PixiJS v8, CodeMirror
- Video Encoding: WebCodecs API, Mediabunny, mp4-muxer
- Authentication: Google Identity Services (GIS), JWT session cookies
- Database: Turso (libSQL / SQLite)

## Prerequisites

- Node.js 18.17 or higher
- A browser supporting the WebCodecs API (e.g., Google Chrome, Microsoft Edge, Brave, Opera)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/pixi-video.git
cd pixi-video
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
# Google OAuth Configuration
AUTH_GOOGLE_ID=your-google-client-id.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=your-google-client-secret

# Turso Database Configuration
TURSO_DATABASE_URL=libsql://your-database-name.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token

# Admin Settings (comma-separated email addresses)
ADMIN_EMAILS=admin@example.com

# Session Secret (optional, used for signing JWT cookies)
JWT_SECRET=your-random-session-secret-key
```

Note: If you run the project locally without configuring Turso or Google OAuth, the editor and video recorder will still function with local presets.

### 4. Run the development server

```bash
npm run dev
```

The application will start at `http://localhost:5173`.

### 5. Build for production

```bash
npm run build
npm run start
```

## How Deterministic Recording Works

Traditional screen recording tools capture the screen in real time, which often leads to stuttering or dropped frames when the GPU is under heavy load.

Pixi Video solves this by detaching animation progress from wall-clock time:
1. The canvas dimensions are set to the target export resolution.
2. The PixiJS ticker is advanced manually step-by-step for each frame (e.g., exactly 1/60th of a second).
3. The rendered canvas buffer is captured as a VideoFrame.
4. Frames are fed into a hardware-accelerated video encoder (H.264 / AVC) and muxed directly into an MP4 container in memory.
5. The resulting MP4 file is downloaded once all frames have been rendered.

## License

This project is licensed under the ISC License.

