# Environment Setup Guide

## Prerequisites

1. Node.js and npm
   - Install Node.js (LTS version) from [nodejs.org](https://nodejs.org/)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. Git
   - Install Git from [git-scm.com](https://git-scm.com/)
   - Verify installation:
     ```bash
     git --version
     ```

3. Code Editor
   - Install Visual Studio Code from [code.visualstudio.com](https://code.visualstudio.com/)
   - Recommended Extensions:
     - ESLint
     - Prettier
     - GitLens
     - Material Icon Theme
     - React Developer Tools

## Project Setup

1. Clone the Repository
   ```bash
   git clone [repository-url]
   cd training-hub-saas
   ```

2. Install Dependencies
   ```bash
   npm install
   ```

3. Supabase Setup
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project's URL and anon key
   - Create a `.env` file based on `.env.example`
   - Add your Supabase credentials to the `.env` file

4. Initialize Database
   - Run the database initialization scripts (to be provided)
   - Set up Row Level Security (RLS) policies
   - Create initial admin user

5. Start Development Server
   ```bash
   npm run dev
   ```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```plaintext
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
REACT_APP_API_URL=your_api_url
```

## Development Workflow

1. Create Feature Branch
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make Changes
   - Follow coding standards (ESLint + Prettier)
   - Write tests for new features
   - Update documentation as needed

3. Test Changes
   ```bash
   npm run test      # Run unit tests
   npm run lint      # Check code style
   npm run build     # Verify production build
   ```

4. Commit Changes
   ```bash
   git add .
   git commit -m "descriptive commit message"
   git push origin feature/your-feature-name
   ```

## Common Tasks

### Database Migrations
- Location: `supabase/migrations`
- To create a new migration:
  ```bash
  supabase migration new your_migration_name
  ```
- To apply migrations:
  ```bash
  supabase db reset
  ```

### Working with Supabase

1. Database Access
   ```javascript
   import { supabase } from '../utils/supabaseClient'
   
   // Query example
   const { data, error } = await supabase
     .from('your_table')
     .select('*')
   ```

2. Authentication
   ```javascript
   // Sign up
   const { user, error } = await supabase.auth.signUp({
     email: 'user@example.com',
     password: 'password123'
   })

   // Sign in
   const { user, error } = await supabase.auth.signIn({
     email: 'user@example.com',
     password: 'password123'
   })
   ```

### Code Style Guide

- Use functional components with hooks
- Follow ESLint and Prettier configurations
- Use TypeScript for type safety
- Follow Material-UI best practices
- Implement responsive design
- Write meaningful comments
- Create reusable components

## Troubleshooting

1. Node Modules Issues
   ```bash
   rm -rf node_modules
   npm install
   ```

2. Supabase Connection Issues
   - Verify environment variables
   - Check Supabase project status
   - Verify network connectivity

3. Build Issues
   ```bash
   npm run clean   # Clear build cache
   npm run build   # Rebuild project
   ```

## Deployment

1. Production Build
   ```bash
   npm run build
   ```

2. Environment Variables
   - Set up production environment variables
   - Verify Supabase production credentials

3. Deploy
   - Follow platform-specific deployment instructions
   - Verify production environment
   - Monitor for any issues

## Support

For issues or questions:
1. Check the project documentation
2. Review existing GitHub issues
3. Create a new issue with detailed information
4. Contact the development team

Remember to never commit sensitive information or environment variables to the repository.
