# Training Hub SaaS Platform

A modern training and quiz management platform built with React, TypeScript, and Supabase.

## Features

- 📚 Study Material Management
- 📝 Quiz Creation and Management
- 📊 Progress Tracking
- 👥 Multi-tenant Support
- 🔐 Role-based Access Control
- 📱 Responsive Design

## Tech Stack

- **Frontend**: React, TypeScript, Material-UI
- **Backend**: Supabase (PostgreSQL, Authentication)
- **State Management**: React Context API
- **Styling**: Material-UI + Emotion
- **Testing**: Jest + React Testing Library
- **Build Tool**: Create React App

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)
- Git
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/training-hub-saas.git
cd training-hub-saas
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Supabase credentials.

4. Start the development server:
```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

### Database Setup

1. Create a new Supabase project
2. Navigate to the SQL editor
3. Run the migration script from `supabase/migrations/00000000000000_initial_schema.sql`

## Development

### VSCode Setup

We recommend using VSCode with the following extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Material Icon Theme

Our repository includes VSCode settings for consistent development experience.

### Available Scripts

- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Create production build
- `npm run eject` - Eject from Create React App
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

### Project Structure

```
training-hub-saas/
├── src/
│   ├── components/     # Reusable components
│   ├── contexts/      # React contexts
│   ├── services/      # API and business logic
│   ├── pages/         # Page components
│   ├── layouts/       # Layout components
│   ├── types/         # TypeScript types
│   ├── config/        # Configuration
│   └── theme/         # MUI theme customization
├── public/            # Static files
└── supabase/          # Database migrations
```

## Architecture

### Authentication

- JWT-based authentication via Supabase Auth
- Role-based access control (RBAC)
- Protected routes
- User session management

### Data Flow

1. React Components
2. Service Layer
3. Supabase Client
4. PostgreSQL Database

### State Management

- React Context for global state
- Service layer for data fetching
- Local component state where appropriate

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## Documentation

- [Environment Setup](./environment-setup.md)
- [Development Plan](./development-plan.md)
- [Project Status](./project-status.md)

## License

[MIT License](LICENSE)

## Support

For support, please:
1. Check existing documentation
2. Review open/closed issues
3. Contact the development team

---

Built with ❤️ by Your Team
