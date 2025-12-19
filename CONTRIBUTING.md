# Contributing to Maintainer Brief Backend

Thank you for your interest in contributing!

## Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/yourusername/maintainer-brief-backend.git
   cd maintainer-brief-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Fill in your credentials
   ```

4. **Run migrations**
   ```bash
   npm run build
   npm run migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
src/
├── config/          # Environment configuration
├── db/              # Database client & migrations
├── auth/            # Authentication & authorization
├── github/          # GitHub API integration
├── ai/              # OpenAI integration & prompts
├── analysis/        # Analysis pipeline
├── queue/           # Job queue (BullMQ)
├── notifications/   # Email & Slack
├── scheduler/       # Automated runs
├── routes/          # API endpoints
├── utils/           # Utilities
└── __tests__/       # Unit tests
```

## Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check linting
npm run lint

# Format code
npm run format
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run specific test file
npm test -- auth.test.ts
```

## Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clean, readable code
   - Add tests for new features
   - Update documentation if needed

3. **Run tests**
   ```bash
   npm test
   npm run lint
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation changes
   - `test:` Test changes
   - `refactor:` Code refactoring
   - `chore:` Maintenance tasks

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Guidelines

- Keep PRs focused on a single feature/fix
- Write clear PR descriptions
- Link related issues
- Ensure all tests pass
- Request review from maintainers

## Adding New Features

### Adding a New API Endpoint

1. Create route handler in `src/routes/`
2. Add authentication with `requireAuth()`
3. Add input validation with Zod schema
4. Add ownership checks if needed
5. Write tests in `src/__tests__/`
6. Update `API_EXAMPLES.md`

Example:
```typescript
// src/routes/example.ts
import { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/middleware';
import { schemas } from '../utils/validation';

export default async function exampleRoutes(fastify: FastifyInstance) {
  fastify.get('/example', requireAuth(), async (request, reply) => {
    // Your logic here
    return reply.send({ success: true });
  });
}
```

### Adding a New Analysis Output Type

1. Add type to database schema
2. Create prompt builder in `src/ai/prompts.ts`
3. Update `generateAllOutputs()` in `src/ai/generator.ts`
4. Add tests for prompt structure
5. Update documentation

### Adding a New Queue

1. Create queue in `src/queue/jobs.ts`
2. Add processor in `src/queue/worker.ts`
3. Add enqueue function
4. Add error handling
5. Write tests

## Database Changes

1. Create new migration file in `src/db/migrations/`
2. Use sequential numbering (e.g., `002_add_feature.sql`)
3. Include both `UP` and `DOWN` migrations
4. Test on a copy of production data
5. Document breaking changes

## Security

- Never commit secrets or tokens
- Use encryption for sensitive data
- Validate all user input
- Implement proper authentication
- Follow principle of least privilege

## Performance

- Use database indexes appropriately
- Implement caching where beneficial
- Optimize GitHub API calls
- Monitor OpenAI token usage
- Profile slow endpoints

## Documentation

Update documentation when:
- Adding new features
- Changing API contracts
- Modifying configuration
- Adding new environment variables
- Changing deployment process

Files to update:
- `README.md` - Overview and quick start
- `API_EXAMPLES.md` - API usage examples
- `DEPLOYMENT.md` - Deployment instructions
- Code comments - Complex logic

## Questions?

- Open an issue for bugs
- Start a discussion for feature requests
- Join our Discord for chat

## License

By contributing, you agree that your contributions will be licensed under the MIT License.


