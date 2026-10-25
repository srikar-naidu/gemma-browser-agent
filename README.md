# 🤖 Jarvis Control Center

Jarvis is a local-first voice assistant that combines Ollama, Gemma 4 E2B, browser speech APIs, Playwright, and a Next.js dashboard. It can answer questions, choose tools, and automate browser tasks such as opening websites, searching the web, and playing YouTube videos.

## Launch video

<video controls preload="metadata" poster="https://raw.githubusercontent.com/srikar-naidu/gemma-browser-agent/main/brag-output-2026-10-25-214319/brag.jpg" width="100%" src="https://raw.githubusercontent.com/srikar-naidu/gemma-browser-agent/main/brag-output-2026-10-25-214319/brag.mp4">
  Your browser does not support the video tag.
</video>

[▶ Open or download the launch video](https://github.com/srikar-naidu/gemma-browser-agent/raw/refs/heads/main/brag-output-2026-10-25-214319/brag.mp4)

The demo shows Jarvis turning “open YouTube and play 11K by Seedhemaut” into a browser action.

To create a new launch video with Brag:

```text
/brag --tone "premium futuristic local AI voice assistant launch"
```

## What it does

- Listens through the browser microphone and speaks responses aloud.
- Runs chat locally through Ollama using `gemma4:e2b`.
- Uses a reasoning layer (“Friday Brain”) to decide whether a request needs an answer or a tool.
- Automates browser actions with Playwright.
- Stores application data and authentication state with Convex.
- Provides a live dashboard for listening, thinking, speaking, and error states.

## What is Convex?

Convex is a backend platform for TypeScript applications. In this project it is not an AI model or a random project name: it provides the database, authentication, realtime data synchronization, and server-side functions used by Jarvis.

The Convex code lives in [`convex/`](convex/). The local Ollama chat route lives in [`src/app/api/ollama/chat/route.ts`](src/app/api/ollama/chat/route.ts), so Convex and Ollama have separate responsibilities:

| Part | Responsibility |
|---|---|
| Next.js | Web app and API routes |
| Ollama + Gemma 4 E2B | Local language model |
| Convex | Database, auth, and synced backend state |
| Web Speech API | Speech-to-text and text-to-speech |
| Playwright | Browser automation |

## Requirements

- Node.js 18 or newer
- npm
- Ollama
- Chrome or Edge
- Playwright Chromium
- A Convex deployment for the backend features

## Setup

### 1. Install the project

```bash
git clone https://github.com/simhadris17012005/Jarvis.git
cd Jarvis
npm install
npx playwright install chromium
```

### 2. Install and prepare Ollama

Install Ollama, then download the model:

```bash
ollama pull gemma4:e2b
ollama list
```

Ollama should be available at `http://127.0.0.1:11434`.

### 3. Configure environment variables

Create `.env.local` in the project root:

```env
OLLAMA_URL=http://127.0.0.1:11434/api/chat
OLLAMA_MODEL=gemma4:e2b
```

For optional ElevenLabs speech, add both values below. Leave them blank for fully local text-only mode:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id
```

Optional:

```env
OLLAMA_API_KEY=your_key_here
```

Never commit `.env.local`.

### 4. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For Convex-backed features, run Convex in a second terminal:

```bash
npx convex dev
```

The Convex CLI creates or selects a Convex deployment and supplies the deployment URL. The app reads that URL through `NEXT_PUBLIC_CONVEX_URL`; authentication also uses `CONVEX_SITE_URL`. Keep those values in the local environment used by the Next.js app.

Convex stores the app's database records—profiles, messages, memory, todos, connections, dashboard state, and voice state—in the selected Convex deployment. `npx convex dev` normally uses a development deployment; production uses a separate deployment. Files such as profile avatars are stored in Convex file storage. The Gemma model itself is not stored in Convex: Ollama keeps it locally on the machine running Ollama.

## Available commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js development mode |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npx convex dev` | Start the Convex development backend |
| `npx playwright install chromium` | Install the browser used by automation |

## How a request flows

```text
Voice input
    ↓
Browser speech recognition
    ↓
Friday Brain
    ├── normal answer → Ollama → spoken response
    └── tool request  → Playwright/tool layer → spoken result
```

## Main files

```text
src/app/api/ollama/chat/route.ts  Ollama chat endpoint
src/hooks/useOllamaSession.ts     Voice/chat session handling
src/lib/fridayBrain.ts             Answer-vs-tool decisions
src/lib/tools.ts                   Tool definitions and execution
src/lib/browser.ts                 Playwright browser actions
src/components/JarvisApp.tsx       Main dashboard
convex/                            Auth, database, and backend functions
```

## Troubleshooting

### Ollama is not responding

Make sure Ollama is running and verify the model name:

```bash
ollama list
ollama run gemma4:e2b
```

If you use a different Ollama URL or model, update `.env.local`.

### Browser automation fails

```bash
npx playwright install chromium
```

Use Chrome or Edge for microphone access, and grant the site permission to use the microphone.

### The first response is slow

Ollama may need to load Gemma into memory on the first request. Later requests are usually faster while the model remains loaded.

## Privacy

The default chat model runs locally through Ollama, so no OpenAI API key is required for the Ollama path. Browser automation can still interact with external websites, so review tool behavior before using it with sensitive accounts.

## Roadmap

- More browser and productivity tools
- Better confirmation for destructive actions
- More robust conversation memory
- Additional local model support


