# 🤖 Jarvis Control Center

## Local AI Voice Assistant + Browser Automation

Jarvis Control Center is a **local-first AI voice assistant** built with Next.js, Ollama, Gemma 4 E2B, Convex, Web Speech API, and Playwright.

Jarvis can understand natural-language voice commands, generate AI responses locally, select tools when an action is required, and perform browser-based tasks.

The project is designed to evolve from a simple voice assistant into a **personal AI agent** capable of performing useful tasks on the user's computer and browser.

---

## ✨ Features

- 🤖 Local AI voice assistant
- 🧠 Ollama + Gemma 4 E2B
- 🎙️ Browser Speech Recognition
- 🔊 Browser Speech Synthesis
- 💬 Conversation history
- 🧠 Friday Brain reasoning layer
- 🛠️ AI tool selection
- 🌐 Website opening
- 🔎 Web search
- ▶️ YouTube search
- 🎵 YouTube song playback
- 🖥️ Playwright browser automation
- 📊 Live Jarvis dashboard
- 🟢 Listening state
- 🟡 Thinking state
- 🔵 Speaking state
- 🔴 Error handling
- 🔄 Automatic speech recognition restart
- 🔇 `no-speech` handling
- 🧠 Convex integration
- ⚡ Local AI processing
- 🔐 Local-first architecture
- 🛡️ No OpenAI API key required

---

# 🧠 Project Overview

Jarvis has two major modes.

## 1. Conversation Mode

Jarvis can answer normal questions using the local Ollama model.

Example:

```text
User:
Hello Jarvis

Jarvis:
Hello. How can I help you?
```

Another example:

```text
User:
Explain artificial intelligence

Jarvis:
Artificial intelligence is...
```

---

## 2. Action Mode

When the user asks Jarvis to perform an action, Jarvis can select an appropriate tool.

Example:

```text
User:
Open WhatsApp
```

Jarvis opens:

```text
https://www.whatsapp.com/
```

Another example:

```text
User:
Open YouTube and play Aaya Sher
```

Jarvis can:

1. Understand the command
2. Select `youtube_play`
3. Open YouTube
4. Search for the requested song
5. Find a matching video
6. Open the video
7. Start playback
8. Return the tool result
9. Speak the result to the user

---

# 🛠️ Technology Stack

| Technology | Purpose |
|---|---|
| Next.js 16 | Web application |
| React | UI |
| TypeScript | Type safety |
| Ollama | Local AI runtime |
| Gemma 4 E2B | Local LLM |
| Convex | Data and state synchronization |
| Web Speech API | Voice input |
| Speech Recognition API | Speech-to-text |
| Speech Synthesis API | Text-to-speech |
| Playwright | Browser automation |
| Tailwind CSS | UI styling |
| Node.js | Runtime |
| npm | Package management |

---

# 📁 Project Structure

```text
Jarvis/
│
├── convex/
│
├── src/
│   │
│   ├── app/
│   │   └── api/
│   │       └── ollama/
│   │           └── chat/
│   │               └── route.ts
│   │
│   ├── components/
│   │   └── JarvisApp.tsx
│   │
│   ├── hooks/
│   │   └── useOllamaSession.ts
│   │
│   └── lib/
│       ├── browser.ts
│       ├── fridayBrain.ts
│       ├── tools.ts
│       └── types.ts
│
├── public/
│
├── .env.local
├── package.json
├── next.config.ts
├── tsconfig.json
├── LICENSE
└── README.md
```

---

# ⚙️ Requirements

Before running Jarvis, install:

- Git
- Node.js 18+
- npm
- Ollama
- Google Chrome or Microsoft Edge

For browser automation:

- Playwright
- Chromium

For voice input:

- Chrome or Edge with Web Speech API support

---

# 🚀 Complete Installation

## Step 1 — Clone the Repository

Open PowerShell or Terminal.

```bash
git clone https://github.com/simhadris17012005/Jarvis.git
```

---

## Step 2 — Enter the Project

```bash
cd Jarvis
```

---

## Step 3 — Install Dependencies

```bash
npm install
```

Wait until the installation completes.

---

## Step 4 — Install Playwright Chromium

Jarvis uses Playwright for browser automation.

Run:

```bash
npx playwright install chromium
```

---

## Step 5 — Verify Node.js

```bash
node --version
```

Check npm:

```bash
npm --version
```

Node.js 18 or newer is recommended.

---

# 🧠 Ollama Setup

## Step 6 — Install Ollama

Install Ollama on your computer.

Verify:

```bash
ollama --version
```

---

## Step 7 — Download Gemma 4 E2B

Run:

```bash
ollama pull gemma4:e2b
```

Check installed models:

```bash
ollama list
```

Jarvis currently uses:

```text
gemma4:e2b
```

---

## Step 8 — Verify Ollama

The default Ollama server runs at:

```text
http://127.0.0.1:11434
```

The chat API is:

```text
http://127.0.0.1:11434/api/chat
```

Make sure Ollama is running before starting Jarvis.

---

# 🔐 Environment Variables

Create a file named:

```text
.env.local
```

inside the project root.

Example:

```env
OLLAMA_URL=http://127.0.0.1:11434/api/chat
OLLAMA_MODEL=gemma4:e2b
```

If your environment requires an Ollama API key, you may configure:

```env
OLLAMA_API_KEY=your_key_here
```

Do **not** commit `.env.local` to GitHub.

---

# 🧠 Friday Brain

Friday Brain is the reasoning layer of Jarvis.

Main file:

```text
src/lib/fridayBrain.ts
```

Friday Brain analyzes the user's request and decides whether it should:

```text
ANSWER
```

or:

```text
TOOL
```

---

## 💬 Normal Answer

For example:

```text
User:
Hello Jarvis
```

Friday Brain can return:

```json
{
  "type": "answer",
  "text": "Hello. How can I help you?"
}
```

---

## 🛠️ Tool Request

For example:

```text
User:
Play Aaya Sher on YouTube
```

Friday Brain should select:

```json
{
  "type": "tool",
  "name": "youtube_play",
  "args": {
    "query": "Aaya Sher"
  }
}
```

This allows Jarvis to perform an actual action instead of only generating text.

---

# 🔧 Current Tools

Jarvis currently supports tools such as:

```text
open_website
youtube_play
web_search
get_time
get_date
```

---

# 🌐 open_website

Used when the user explicitly asks Jarvis to open a website.

Example:

```text
Open WhatsApp
```

The tool can open:

```text
https://www.whatsapp.com/
```

Another example:

```text
Open YouTube
```

Jarvis can open:

```text
https://www.youtube.com/
```

---

# ▶️ youtube_play

Used when the user asks Jarvis to play a song or video on YouTube.

Example:

```text
Play Aaya Sher on YouTube
```

Expected flow:

```text
User Voice
    ↓
Speech Recognition
    ↓
Friday Brain
    ↓
youtube_play
    ↓
executeTool()
    ↓
youtubePlay()
    ↓
Playwright
    ↓
Chromium
    ↓
YouTube
    ↓
Search Song
    ↓
Select Video
    ↓
Open Video
    ↓
Playback
    ↓
Tool Result
    ↓
Jarvis Response
```

---

# 🎵 YouTube Voice Commands

Examples:

```text
Play Aaya Sher on YouTube
```

```text
Open YouTube and play Iris
```

```text
Play Good Feeling
```

```text
Open YouTube and play Highest in the Room
```

Jarvis converts the requested song into a YouTube search query.

---

# 🔎 web_search

Used when the user asks Jarvis to search for information.

Example:

```text
Search the web for artificial intelligence
```

The reasoning layer can select:

```text
web_search
```

and execute the corresponding search action.

---

# ⏰ get_time

Example:

```text
Jarvis, what time is it?
```

The tool:

```text
get_time
```

returns the current local time.

---

# 📅 get_date

Example:

```text
Jarvis, what is today's date?
```

The tool:

```text
get_date
```

returns the current date.

---

# 🖥️ Playwright Browser Automation

Jarvis uses Playwright for browser automation.

Main file:

```text
src/lib/browser.ts
```

Current browser functionality includes:

```text
openWebsite()
youtubePlay()
```

Playwright controls Chromium to perform browser actions.

Example:

```text
User
  ↓
Friday Brain
  ↓
youtube_play
  ↓
executeTool()
  ↓
youtubePlay()
  ↓
Playwright
  ↓
YouTube
  ↓
Search
  ↓
Video
  ↓
Playback
```

---

# 🧩 Tool System

Main file:

```text
src/lib/tools.ts
```

The tool system contains:

1. Tool definitions
2. Tool validation
3. Tool execution
4. Tool results

---

## Tool Definition

The AI needs to know which tools are available.

Example:

```text
youtube_play
```

can accept:

```text
query
```

as an argument.

---

## Tool Execution

`executeTool()` receives:

```text
tool name
+
tool arguments
```

and performs the requested action.

Example:

```text
youtube_play
```

calls:

```text
youtubePlay()
```

from:

```text
src/lib/browser.ts
```

---

# 🔄 Tool Execution Flow

```text
User
 ↓
Friday Brain
 ↓
Tool Selection
 ↓
executeTool()
 ↓
Actual Action
 ↓
Tool Result
 ↓
Jarvis Response
```

---

# 🎙️ Voice Recognition

The main voice-session logic is located in:

```text
src/hooks/useOllamaSession.ts
```

It handles:

- Starting speech recognition
- Stopping speech recognition
- Receiving speech
- Converting speech to text
- Sending requests to Jarvis
- Receiving AI responses
- Speaking responses
- Listening state
- Thinking state
- Speaking state
- Error handling
- Automatic recognition restart

---

# 🔇 Speech Recognition Error Handling

Browser speech recognition can report:

```text
no-speech
```

when no speech is detected.

This is treated as a normal browser condition.

Permission-related errors such as:

```text
not-allowed
service-not-allowed
```

are treated as actual microphone or recognition errors.

Make sure microphone permission is enabled.

---

# 🔊 Speech Synthesis

Jarvis uses the browser Speech Synthesis API to speak AI responses.

Pipeline:

```text
AI Response
    ↓
Clean Response
    ↓
SpeechSynthesisUtterance
    ↓
Browser Voice
    ↓
Jarvis Speaks
```

---

# 🧠 Complete Voice Pipeline

```text
Microphone
    ↓
Speech Recognition
    ↓
Speech-to-Text
    ↓
Jarvis Client
    ↓
Next.js API
    ↓
Friday Brain
    ↓
Ollama
    ↓
Gemma 4 E2B
    ↓
Answer OR Tool
    ↓
Tool Result
    ↓
Convex
    ↓
Speech Synthesis
    ↓
Jarvis Voice
```

---

# 🧠 Complete System Architecture

```text
                         USER
                           │
                           ▼
                    ┌─────────────┐
                    │ Microphone  │
                    └──────┬──────┘
                           │
                           ▼
                ┌────────────────────┐
                │ Speech Recognition │
                └──────────┬─────────┘
                           │
                           ▼
                    USER TEXT INPUT
                           │
                           ▼
                ┌────────────────────┐
                │   Jarvis Client    │
                │ useOllamaSession   │
                └──────────┬─────────┘
                           │
                           ▼
                ┌────────────────────┐
                │ Next.js API Route  │
                └──────────┬─────────┘
                           │
                           ▼
                ┌────────────────────┐
                │    Friday Brain    │
                │   Reason + Decide  │
                └──────────┬─────────┘
                           │
                 ┌─────────┴─────────┐
                 │                   │
                 ▼                   ▼
              ANSWER                TOOL
                 │                   │
                 │                   ▼
                 │             executeTool()
                 │                   │
                 │        ┌──────────┼──────────┐
                 │        │          │          │
                 │        ▼          ▼          ▼
                 │      Website   YouTube    Search
                 │        │          │          │
                 │        │       Playwright   │
                 │        │          │          │
                 └────────┴──────────┴──────────┘
                           │
                           ▼
                      TOOL RESULT
                           │
                           ▼
                    Jarvis Response
                           │
                           ▼
                   Speech Synthesis
                           │
                           ▼
                     JARVIS VOICE
```

---

# 🔌 API

Main endpoint:

```text
POST /api/ollama/chat
```

Main file:

```text
src/app/api/ollama/chat/route.ts
```

---

# 📡 API Request

Example:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello Jarvis"
    }
  ]
}
```

For an action:

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Play Aaya Sher on YouTube"
    }
  ]
}
```

---

# 📡 API Flow

```text
Browser
   ↓
POST /api/ollama/chat
   ↓
Friday Brain
   ↓
Ollama
   ↓
Gemma 4 E2B
   ↓
Answer / Tool
   ↓
Next.js Response
   ↓
Browser
```

---

# 🧪 Test the API

## Port 3000

Run PowerShell:

```powershell
$body = @{
    messages = @(
        @{
            role = "user"
            content = "Say hello as Jarvis."
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri "http://localhost:3000/api/ollama/chat" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

## Port 3001

```powershell
$body = @{
    messages = @(
        @{
            role = "user"
            content = "Say hello as Jarvis."
        }
    )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
    -Uri "http://localhost:3001/api/ollama/chat" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

---

# 🚀 Running the Project

Jarvis normally requires multiple services.

## Terminal 1 — Ollama

Make sure Ollama is installed and running.

Check:

```bash
ollama list
```

---

## Terminal 2 — Convex

Run:

```bash
npx convex dev
```

Keep this terminal running.

---

## Terminal 3 — Next.js

Run:

```bash
npm run dev
```

---

# 🌐 Open Jarvis

If using port 3000:

```text
http://localhost:3000
```

If using port 3001:

```text
http://localhost:3001
```

Allow microphone permission when requested.

---

# 🔀 Running on Another Port

For port 3001:

```bash
npm run dev -- -p 3001
```

For port 3002:

```bash
npm run dev -- -p 3002
```

---

# 🧪 Complete Example

Suppose the user says:

```text
Open YouTube and play Aaya Sher
```

The complete process is:

```text
1. Microphone receives voice

2. Browser Speech Recognition converts voice to text

3. Text becomes:

   Open YouTube and play Aaya Sher

4. useOllamaSession receives the text

5. Next.js API receives the request

6. Friday Brain analyzes the request

7. Friday Brain selects:

   youtube_play

8. Tool argument becomes:

   query = Aaya Sher

9. executeTool() runs

10. youtubePlay() runs

11. Playwright launches or uses Chromium

12. YouTube opens

13. YouTube search is performed

14. Matching video is selected

15. Video opens

16. Playback starts

17. Tool result is returned

18. Jarvis generates the response

19. Speech Synthesis speaks the response
```

---

# 🎯 Expected User Experience

The user should be able to say:

```text
Hello Jarvis
```

and receive a spoken response.

The user should be able to say:

```text
Open WhatsApp
```

and Jarvis should open WhatsApp.

The user should be able to say:

```text
Open YouTube
```

and Jarvis should open YouTube.

The user should be able to say:

```text
Play Aaya Sher on YouTube
```

and Jarvis should attempt to search and play the song using browser automation.

The user should be able to ask:

```text
What time is it?
```

and Jarvis should return the current time.

The user should be able to ask:

```text
What is today's date?
```

and Jarvis should return the current date.

---

# 🧠 Main Files

## `src/lib/fridayBrain.ts`

Responsible for:

- Friday system prompt
- AI reasoning
- Tool selection
- Decision parsing
- Answer/tool decision format

---

## `src/lib/tools.ts`

Responsible for:

- Tool definitions
- Tool validation
- Tool execution
- Tool results

Current tools:

```text
open_website
youtube_play
web_search
get_time
get_date
```

---

## `src/lib/browser.ts`

Responsible for:

- Playwright browser
- Website opening
- YouTube automation
- YouTube playback

Main functions:

```text
openWebsite()
youtubePlay()
```

---

## `src/app/api/ollama/chat/route.ts`

Responsible for:

- Receiving API requests
- Communicating with Ollama
- Calling Friday Brain
- Executing tools
- Returning results
- Handling errors
- Handling Ollama timeouts

---

## `src/hooks/useOllamaSession.ts`

Responsible for:

- Speech recognition
- Voice input
- Sending requests
- Receiving responses
- Speech synthesis
- Listening state
- Thinking state
- Speaking state
- Error handling
- Recognition restart

---

## `src/components/JarvisApp.tsx`

Responsible for the main Jarvis Control Center UI.

---

# 🧪 Production Build

Before pushing changes to GitHub, run:

```bash
npm run build
```

The build should complete without:

- TypeScript errors
- Syntax errors
- Next.js build errors
- Turbopack errors

If the build succeeds, the project is ready for deployment/testing.

---

# 🛠️ Troubleshooting

## Port Already in Use

If you see:

```text
EADDRINUSE: address already in use
```

Check the port.

For port 3001 on Windows PowerShell:

```powershell
Get-NetTCPConnection -LocalPort 3001
```

You can also use another port:

```bash
npm run dev -- -p 3002
```

---

# 🐌 Ollama Is Slow

The first Gemma request can be slow because the model may need to load into memory.

Performance depends on:

- CPU
- GPU
- RAM
- Model size
- System load
- Ollama configuration

Check installed models:

```bash
ollama list
```

---

# ❌ Ollama Is Not Responding

Check:

```bash
ollama list
```

Make sure Gemma is installed:

```bash
ollama pull gemma4:e2b
```

Verify the Ollama server:

```text
http://127.0.0.1:11434
```

---

# 🎙️ Microphone Is Not Working

Use:

- Google Chrome
- Microsoft Edge

Make sure microphone permission is enabled.

For local development:

```text
http://localhost:3000
```

or:

```text
http://localhost:3001
```

Also check:

- Windows microphone permissions
- Browser microphone permissions
- Correct microphone input device
- Another application is not exclusively using the microphone

---

# 🔇 `no-speech`

If the browser reports:

```text
no-speech
```

it normally means the browser did not detect speech.

This is not necessarily a Jarvis failure.

Try speaking clearly after Jarvis starts listening.

---

# ▶️ YouTube Opens But Does Not Play

If YouTube opens but playback does not happen, verify:

### 1. Playwright is installed

```bash
npm install
```

### 2. Chromium is installed

```bash
npx playwright install chromium
```

### 3. `youtube_play` exists in:

```text
src/lib/tools.ts
```

### 4. `executeTool()` handles:

```text
youtube_play
```

### 5. `youtubePlay()` exists in:

```text
src/lib/browser.ts
```

### 6. Friday Brain selects:

```text
youtube_play
```

instead of:

```text
open_website
```

### 7. YouTube search results are available

### 8. Run the build

```bash
npm run build
```

---

# 🧩 Unknown Tool Error

If Jarvis reports:

```text
Unknown tool: youtube_play
```

check:

```text
src/lib/tools.ts
```

Make sure:

```text
youtube_play
```

exists inside the tool definitions and inside `executeTool()`.

The spelling must exactly match:

```text
youtube_play
```

---

# 🧠 AI Selects the Wrong Tool

For:

```text
Open YouTube
```

the expected tool is:

```text
open_website
```

For:

```text
Play Aaya Sher on YouTube
```

the expected tool is:

```text
youtube_play
```

The reasoning layer should distinguish between opening a website and performing an action on that website.

---

# 🔐 Security and Privacy

Jarvis is designed around a local-first architecture.

The AI model runs through Ollama on the local machine.

No OpenAI API key is required for the current Ollama/Gemma implementation.

Never commit:

```text
.env
.env.local
API keys
passwords
private keys
node_modules/
credentials
tokens
```

to GitHub.

---

# 📦 GitHub Workflow

After making changes, check the project:

```bash
git status
```

Add changes:

```bash
git add .
```

Commit:

```bash
git commit -m "Update Jarvis assistant"
```

Push:

```bash
git push
```

---

# 🔄 Updating an Existing Clone

If the repository is already cloned:

```bash
git pull
```

Then install any new dependencies:

```bash
npm install
```

If Playwright was changed or newly installed:

```bash
npx playwright install chromium
```

Build the project:

```bash
npm run build
```

Then start development:

```bash
npm run dev
```

---

# 👤 Complete New User Setup

A completely new user can follow these commands:

```bash
git clone https://github.com/simhadris17012005/Jarvis.git
cd Jarvis
npm install
npx playwright install chromium
ollama pull gemma4:e2b
npm run dev
```

If Convex is required by the current configuration, open another terminal:

```bash
npx convex dev
```

Then open:

```text
http://localhost:3000
```

Allow microphone permission.

---

# 🧪 Development Checklist

Before pushing changes to GitHub:

```text
[ ] git pull
[ ] npm install
[ ] Ollama running
[ ] Gemma 4 E2B installed
[ ] Playwright installed
[ ] Chromium installed
[ ] Convex running
[ ] Next.js running
[ ] Microphone permission enabled
[ ] Voice input tested
[ ] Voice output tested
[ ] Normal AI response tested
[ ] Website opening tested
[ ] Web search tested
[ ] YouTube search tested
[ ] YouTube playback tested
[ ] npm run build passes
[ ] git status checked
[ ] No secrets committed
```

---

# 🗺️ Roadmap

## Voice

- [x] Speech recognition
- [x] Speech synthesis
- [x] Voice interaction
- [x] Automatic recognition restart
- [x] `no-speech` handling
- [ ] Wake-word detection
- [ ] Natural interruption / barge-in
- [ ] Better multilingual support
- [ ] Better voice quality

## AI

- [x] Ollama
- [x] Gemma 4 E2B
- [x] Friday Brain
- [x] Tool selection
- [x] Structured tool execution
- [ ] Better conversation memory
- [ ] Long-term memory
- [ ] Faster responses
- [ ] Better intent detection
- [ ] Multiple AI model support

## Browser Automation

- [x] Website opening
- [x] Web search
- [x] YouTube search
- [x] YouTube playback
- [x] Playwright integration
- [ ] YouTube pause
- [ ] YouTube resume
- [ ] YouTube next video
- [ ] YouTube volume control
- [ ] Spotify integration
- [ ] Browser tab management

## Email

- [ ] Gmail connection
- [ ] Read email
- [ ] Compose email
- [ ] Send email
- [ ] Email search
- [ ] Attachment handling

## Productivity

- [ ] Google Calendar
- [ ] Create calendar events
- [ ] Read calendar events
- [ ] Notion integration
- [ ] Tasks
- [ ] Notes
- [ ] Reminders

## Computer Automation

- [ ] Open applications
- [ ] Close applications
- [ ] System volume control
- [ ] Screenshot
- [ ] Clipboard operations
- [ ] System information
- [ ] File operations

---

# 🧱 Extending the Tool System

The tool architecture is designed to be extensible.

To add a new tool:

```text
1. Add tool definition
        ↓
2. Add executeTool() case
        ↓
3. Implement actual action
        ↓
4. Return structured result
        ↓
5. Update Friday Brain instructions
        ↓
6. Add validation
        ↓
7. Test the tool
        ↓
8. Run npm run build
```

Future tools may include:

```text
gmail_send
gmail_read
calendar_create
calendar_read
whatsapp_message
file_create
file_read
open_application
close_application
spotify_play
youtube_pause
youtube_next
system_volume
system_information
```

These should only be implemented with appropriate validation and user authorization.

---

# 🎯 Project Goal

The long-term goal of Jarvis Control Center is to create a personal AI agent that can:

```text
LISTEN
   ↓
UNDERSTAND
   ↓
REASON
   ↓
SELECT TOOL
   ↓
PERFORM ACTION
   ↓
VERIFY RESULT
   ↓
REPORT RESULT
```

For example:

```text
User:

Jarvis, open YouTube and play Aaya Sher.
```

Jarvis should understand:

```text
Intent:
Play a song
```

Select:

```text
youtube_play
```

Execute:

```text
YouTube search
```

Perform:

```text
Video playback
```

Verify:

```text
Playback action completed
```

Then report:

```text
Playing Aaya Sher on YouTube.
```

This architecture allows new capabilities to be added without rebuilding the entire assistant.

---

# 🚀 Future AI Agent Architecture

```text
                         ┌──────────────┐
                         │     USER     │
                         └──────┬───────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Voice / Text    │
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  Friday Brain   │
                       │ Reasoning Layer │
                       └────────┬────────┘
                                │
                 ┌──────────────┼──────────────┐
                 │              │              │
                 ▼              ▼              ▼
              Answer         Browser       Productivity
                               Tools           Tools
                 │              │              │
                 │              ▼              ▼
                 │          Playwright       Gmail
                 │          YouTube          Calendar
                 │          Search           Notion
                 │
                 └──────────────┬──────────────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Verification │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │   Response   │
                         └──────┬───────┘
                                │
                                ▼
                         ┌──────────────┐
                         │ Jarvis Voice │
                         └──────────────┘
```

---

# 🤝 Contributing

Contributions and improvements are welcome.

Before submitting changes:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the production build:

```bash
npm run build
```

Make sure there are no TypeScript, syntax, or build errors before committing.

---

# 📌 Quick Start

For experienced users:

```bash
git clone https://github.com/simhadris17012005/Jarvis.git
cd Jarvis
npm install
npx playwright install chromium
ollama pull gemma4:e2b
npx convex dev
```

Open another terminal:

```bash
cd Jarvis
npm run dev
```

Then open:

```text
http://localhost:3000
```

---

# 👨‍💻 Author

**Simhadri**

GitHub:

```text
https://github.com/simhadris17012005/Jarvis
```

---

# 📄 License

This project is licensed under the **MIT License**.

See:

```text
LICENSE
```

for details.

---

# ⭐ Jarvis Control Center

Built with:

```text
Next.js
+
React
+
TypeScript
+
Ollama
+
Gemma 4 E2B
+
Convex
+
Web Speech API
+
Playwright
+
Tool Calling
```

Jarvis is continuously evolving from a local voice assistant into a fully capable personal AI agent.
