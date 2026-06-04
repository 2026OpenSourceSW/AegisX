# AegisX Frontend

The AegisX frontend is inherited from the upstream PentAGI React application. It is built with React, TypeScript, and GraphQL, and it provides the web UI for flow management, agent interaction, settings, reports, and project-specific AegisX workflows.

Some source identifiers, API types, and package paths still use upstream PentAGI names. Keep those names unless the implementation changes them too.

## Features

-   Real-time chat interface with AI agents
-   Multiple AI agent support and management
-   Real-time terminal output monitoring
-   Task and subtask tracking system
-   Integrated search capabilities
-   Vector store for knowledge base management
-   Screenshot capture and management
-   Dark/light theme support
-   Responsive design for mobile, tablet, and desktop
-   Authentication system with multiple providers
-   Real-time updates via GraphQL subscriptions
-   High-performance React components

## Tech Stack

-   **Framework**: React 18 with TypeScript
-   **Build Tool**: Vite
-   **Styling**: Tailwind CSS
-   **UI Components**:
    -   shadcn/ui
    -   Radix UI primitives
    -   Lucide icons
-   **State Management**:
    -   React Context
    -   Custom Hooks
-   **API Integration**:
    -   GraphQL
    -   Apollo Client
    -   WebSocket subscriptions
-   **Type Safety**: TypeScript
-   **Authentication**: Multiple provider support
-   **Code Quality**:
    -   ESLint
    -   Prettier
    -   TypeScript strict mode

## Project Structure

src/
├── components/ # Shared UI components
│ ├── ui/ # Base UI components
│ └── icons/ # SVG icons and logo
├── features/ # Feature-based modules
│ ├── chat/ # Chat related components
│ ├── authentication/ # Auth related components
├── hooks/ # Custom React hooks
├── lib/ # Utilities and configurations
├── graphql/ # GraphQL operations and types
├── models/ # TypeScript interfaces
└── pages/ # Application routes

## Key Components

### Chat Interface

-   Split view with messages and tools panels
-   Resizable panels for desktop
-   Mobile-optimized view with tabs
-   Real-time message updates

### Task System

-   Real-time task tracking
-   Subtask management
-   Progress monitoring
-   Status updates

### Terminal

-   Command output display
-   Real-time updates
-   Scrollable history
-   Syntax highlighting

### Vector Store

-   Knowledge base integration
-   Search capabilities
-   Data management

### Agent System

-   Multi-agent support
-   Agent status monitoring
-   Agent communication logs

## Development

### Prerequisites

-   Node.js 18+
-   pnpm 10+

### Installation

1. Clone the repository.
2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Start the development server:

   ```bash
   pnpm run dev
   ```

### Building for Production

```bash
pnpm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```bash
VITE_API_URL=your_api_url
```

## Contributing

Follow the root `CONTRIBUTING.md` workflow:

1. Branch from `develop`.
2. Keep the change to one coherent unit.
3. Push the branch.
4. Open a pull request against `develop`.
5. Include verification evidence and manual QA for user-visible frontend changes.
