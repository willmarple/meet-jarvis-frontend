# WebRTC Converse Frontend

React/TypeScript frontend for the AI Meeting Platform with WebRTC video conferencing and AI assistant integration.

## Features

- React 18 with TypeScript and Vite
- WebRTC video conferencing with Socket.io signaling
- Clerk.dev authentication (optional for guests)
- ElevenLabs AI voice assistant integration
- Real-time knowledge management with RAG search
- Tailwind CSS styling
- Optimized for Bolt.new deployment

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and backend URL
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

## Environment Variables

Required:
- `VITE_BACKEND_URL` - Backend API URL (e.g., https://your-backend.com)
- `VITE_BACKEND_WS_URL` - Backend WebSocket URL (e.g., wss://your-backend.com)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- `VITE_ELEVENLABS_API_KEY` - ElevenLabs API key
- `VITE_ELEVENLABS_AGENT_ID` - ElevenLabs agent ID

For Bolt.new deployment:
- `VITE_WEBCONTAINER_MODE=true` - Enables WebContainer compatibility

## Development

Local development with separate backend:
```bash
# In backend repo
npm run dev

# In frontend repo  
npm run dev
```

## Deployment

### Bolt.new Deployment
1. Set `VITE_WEBCONTAINER_MODE=true`
2. Update `VITE_BACKEND_URL` to your deployed backend
3. Deploy frontend to Bolt.new

### Production Deployment
- Vercel (recommended)
- Netlify
- Any static hosting service

## Architecture

- **Components**: React components for UI
- **Hooks**: Custom hooks for WebRTC, Supabase, AI features
- **Services**: API clients and business logic
- **Types**: Shared TypeScript types with backend

## Features

- ✅ HD video conferencing
- ✅ Real-time chat and screen sharing
- ✅ AI voice assistant with meeting context
- ✅ Knowledge base with semantic search
- ✅ Anonymous guest access
- ✅ Multi-user collaboration
- ✅ Mobile responsive design