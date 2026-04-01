# @suraksha/db-schema

Prisma schema and database migrations for Suraksha Weekly.

## Setup

1. Set DATABASE_URL in your .env file:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/suraksha_db"
   ```

2. Generate Prisma Client:
   ```bash
   npm run prisma:generate
   ```

3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

4. Seed sample data:
   ```bash
   npm run prisma:seed
   ```

## Available Scripts

- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Create and apply migrations
- `npm run prisma:migrate:deploy` - Apply migrations in production
- `npm run prisma:studio` - Open Prisma Studio GUI
- `npm run prisma:reset` - Reset database (WARNING: deletes all data)
- `npm run prisma:seed` - Seed deterministic demo data

## Usage in Services

```python
# In Python FastAPI services, use raw SQL or an ORM like SQLAlchemy
# The schema serves as the source of truth
```

```typescript
// In TypeScript/Node services
import { PrismaClient } from '@suraksha/db-schema/generated/client';
const prisma = new PrismaClient();
```

For append-only audit log enforcement, use the wrapped client in `prisma-client.js`.

```javascript
const { prisma } = require('@suraksha/db-schema/prisma-client');
```
