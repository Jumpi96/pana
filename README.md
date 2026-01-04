# Pana - AI-Powered Macro Tracker

A lightweight, intelligent macro and calorie tracker that uses AI to estimate nutritional content from simple meal descriptions. Track your daily nutrition with minimal effort and smart autocomplete suggestions powered by vector similarity search.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Database Schema](#database-schema)
- [License](#license)

## Features

- **AI-Powered Meal Estimation**: Describe your meal in plain text (e.g., "2 eggs and toast") and OpenAI estimates calories, protein, carbs, fat, and alcohol content
- **Smart Autocomplete**: Vector similarity search suggests similar meals from your history as you type
- **Portion Control**: Adjust portions with Light/OK/Heavy buttons to fine-tune macro ranges
- **Multi-Day Tracking**: Navigate between days with daily macro summaries vs. targets
- **Weekly Rebalancing**: See how many calories/day to adjust for the rest of the week to stay on track
- **Uncertainty Detection**: AI flags vague descriptions (e.g., "pasta", "snack") for better accuracy awareness
- **Alcohol Tracking**: Separate tracking for alcohol grams and calories (7 cal/g)
- **Offline Support**: Read-only mode when offline with subtle banner
- **User Settings**: Customize daily calorie target and macro percentage split (protein/carbs/fat)
- **Onboarding Flow**: First-time users guided through setting up nutrition goals
- **Secure Authentication**: Email/password authentication via Supabase
- **Automated Backups**: Weekly database backups to AWS S3 with 30-day retention
- **Real-time Sync**: Instant data synchronization across devices

## Architecture

Pana follows a modern serverless architecture:

```
┌─────────────────────────────────────────┐
│         Frontend (React SPA)            │
│  - React 19 + TypeScript                │
│  - Vite build tool                      │
│  - Tailwind CSS                         │
│  - Deployed on GitHub Pages             │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      Backend (Supabase)                 │
│  - PostgreSQL + pgvector                │
│  - Row Level Security (RLS)             │
│  - Authentication                       │
│  - Edge Functions (Deno)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         AI Services (OpenAI)            │
│  - GPT-4o-mini: Meal estimation         │
│  - text-embedding-3-small: Similarity   │
└─────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│   AWS Infrastructure (Terraform)        │
│  - Lambda: Database backups (weekly)    │
│  - S3: Backup storage (30-day retention)│
│  - SNS: Failure alerts                  │
│  - CloudWatch: Event scheduling         │
└─────────────────────────────────────────┘
```

### Key Components

**Frontend (`/src/`)**
- **Pages**: Daily tracking, weekly summary, settings, login
- **Components**: Meal entry form, autocomplete, macro summary, onboarding
- **Libraries**: API client, macro calculations, date utilities

**Backend (`/supabase/`)**
- **Tables**: meal_entries, meal_embeddings (pgvector), user_settings
- **Edge Functions**:
  - `estimate_meal`: Calls OpenAI GPT-4o-mini for nutritional estimation
  - `search_similar_meals`: Generates embeddings and performs vector similarity search
  - `update_meal_embedding`: Updates embeddings when meal descriptions change
- **RPCs**: `get_daily_totals()`, `get_weekly_totals()`, `search_similar_meals_vector()`
- **Security**: Row Level Security policies ensuring users only access their own data

**Infrastructure (`/terraform/`)**
- **Lambda Functions**: Automated weekly database backups to S3
- **Storage**: S3 bucket with 30-day lifecycle policies
- **Monitoring**: CloudWatch alarms and SNS notifications

## Tech Stack

### Frontend
- **React** 19.2.0 - UI framework
- **TypeScript** 5.9 - Type safety
- **Vite** 7.2.4 - Build tool and dev server
- **React Router** 7.10.1 - Client-side routing
- **Tailwind CSS** 4.1.18 - Utility-first styling
- **Lucide React** 0.561.0 - Icon library

### Backend & Database
- **Supabase** 2.88.0 - Backend-as-a-Service
- **PostgreSQL** - Relational database
- **pgvector** - Vector similarity search extension
- **Deno** - Edge Function runtime

### AI & ML
- **OpenAI GPT-4o-mini** - Meal nutritional estimation
- **OpenAI text-embedding-3-small** - Embedding generation (1536 dimensions)

### Infrastructure & DevOps
- **AWS Lambda** - Serverless functions (Python 3.11)
- **AWS S3** - Backup storage
- **AWS CloudWatch** - Event scheduling
- **AWS SNS** - Alert notifications
- **Terraform** 1.6.0 - Infrastructure as Code
- **GitHub Actions** - CI/CD pipeline

### Development Tools
- **ESLint** 9.39.1 - Code linting
- **Vitest** 3.2.4 - Unit testing
- **TypeScript** - Static type checking

## Prerequisites

Before you begin, ensure you have the following:

- **Node.js** 18+ and npm
- **Git** for version control
- **Supabase Account** - [Sign up here](https://supabase.com/)
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)
- **AWS Account** (optional, for automated backups)
- **Terraform** 1.6.0+ (optional, for AWS infrastructure)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/pana.git
cd pana
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com/)
2. Go to Project Settings > API to find your project URL and anon key
3. Enable the pgvector extension:
   - Go to Database > Extensions
   - Search for "vector" and enable it
4. In the SQL Editor, run the following scripts in order:
   - `supabase/schema.sql` - Creates tables, indexes, and RLS policies
   - `supabase/rpcs.sql` - Creates stored procedures

### 4. Deploy Supabase Edge Functions

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-id

# Deploy Edge Functions
supabase functions deploy estimate_meal
supabase functions deploy search_similar_meals
supabase functions deploy update_meal_embedding

# Set OpenAI API key
supabase secrets set GOOGLE_API_KEY=your-google-api-key
```

### 5. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 6. Run the Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app running.

### 7. Set Up AWS Infrastructure (Optional)

The AWS infrastructure provides automated weekly database backups.

#### Prerequisites
- AWS account with appropriate permissions
- AWS CLI configured with credentials
- Python 3.11 and pip installed
- Terraform installed

#### Get Supabase Database URL

You need the **Session Pooler** URL (port 6543) for IPv4 compatibility:

1. Go to Supabase Dashboard → Settings → Database
2. Copy the **Session pooler** connection string (port 6543)
3. Format: `postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

**Important**: Use Session mode (6543), NOT Transaction mode or Direct connection.

#### Setup Steps

1. Create S3 backend bucket (one-time):
```bash
aws s3 mb s3://pana-terraform-state --region us-east-1
```

2. Navigate to the terraform directory:
```bash
cd terraform
```

3. Create a `terraform.tfvars` file:
```hcl
supabase_db_url = "postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres"
alert_email     = "your-email@example.com"
```

4. Initialize and apply Terraform:
```bash
terraform init
terraform plan
terraform apply
```

This will create:
- Lambda function for weekly database backups (runs every 7 days)
- S3 bucket for backups with 30-day retention and encryption
- CloudWatch Event Rule for scheduling
- SNS topic for failure alerts
- CloudWatch alarms for Lambda errors and throttles

5. Confirm SNS subscription:
   - Check your email for SNS confirmation
   - Click the confirmation link

6. Test the backup:
```bash
aws lambda invoke --function-name pana_db_backup --payload '{}' response.json
cat response.json
```

## Development

### Project Structure

```
pana/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── AddMealForm.tsx        # Meal entry with autocomplete
│   │   ├── MealEntryRow.tsx       # Individual meal display
│   │   ├── MacrosSummary.tsx      # Daily totals vs targets
│   │   └── Onboarding.tsx         # First-time setup wizard
│   ├── pages/           # Page-level components
│   │   ├── DailyTracking.tsx      # Main daily view
│   │   ├── WeeklyView.tsx         # Weekly summary + rebalancing
│   │   ├── Settings.tsx           # User settings
│   │   └── Login.tsx              # Authentication
│   ├── lib/             # Utilities and API clients
│   │   ├── api.ts                 # Supabase API calls
│   │   ├── macros.ts              # Macro calculations
│   │   └── utils.ts               # Date utilities
│   ├── hooks/           # Custom React hooks
│   │   └── useDebounce.ts         # Debouncing for autocomplete
│   └── types/           # TypeScript type definitions
├── supabase/
│   ├── schema.sql       # Database schema + RLS + pgvector
│   ├── rpcs.sql         # Stored procedures
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge Functions
│       ├── estimate_meal/
│       ├── search_similar_meals/
│       └── update_meal_embedding/
├── terraform/
│   ├── *.tf             # Infrastructure definitions
│   └── lambdas/backup/  # Lambda function code
└── .github/workflows/   # CI/CD pipelines
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run unit tests
npm run test:coverage # Run tests with coverage
npm run lint         # Run ESLint
```

### Code Style

- TypeScript strict mode enabled
- ESLint for code quality
- Consistent file naming (PascalCase for components, camelCase for utilities)
- Tailwind CSS for styling

### Key Business Logic

#### Macro Calculations

**Expected Macros** (from user settings):
```typescript
protein_g = (daily_calories * protein_pct / 100) / 4  // 4 cal/g
carbs_g = (daily_calories * carbs_pct / 100) / 4      // 4 cal/g
fat_g = (daily_calories * fat_pct / 100) / 9          // 9 cal/g
```

**Portion Levels**:
- `light`: Use minimum values from range
- `ok`: Use average of min/max
- `heavy`: Use maximum values from range

**Total Calories**:
```typescript
total_calories = resolved_food_calories + alcohol_calories
```

**Weekly Rebalance**:
```typescript
expected_so_far = (daily_target * 7) * (days_elapsed / 7)
delta = actual - expected_so_far
rebalance_per_day = -delta / days_remaining
```

#### AI Prompt Engineering

The `estimate_meal` Edge Function uses a carefully crafted prompt:
- Explicit instruction that `calories_min/max` should ONLY include food macros (P/C/F)
- Alcohol tracked separately in `alcohol_g` and `alcohol_calories`
- Example for "light beer" to clarify calorie splitting
- Uncertainty guidelines to flag vague descriptions
- Range sizing: ±20% for specific meals, ±40% for vague meals

#### Vector Similarity Search

1. User types meal description (e.g., "chicken salad")
2. Debounced (300ms) call to `search_similar_meals`
3. Edge Function generates embedding using OpenAI text-embedding-3-small
4. pgvector performs cosine similarity search
5. Recency bias applied: `similarity * (0.7 + 0.3 * 0.99^days_ago)`
6. Top 5 results returned with similarity percentage
7. User can click to auto-fill with previous estimates

## Testing

Run the test suite:

```bash
npm test
```

Tests cover:
- **Macro calculations**: Expected macros, portion resolution, weekly rebalancing
- **Date utilities**: Local date formatting, week calculations, date arithmetic
- **Component behavior**: Rendering and interactions

### Test Coverage

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory.

## Deployment

### Automated Deployment (Recommended)

The project uses GitHub Actions for automatic deployment on releases.

#### Setup

1. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Set Source to "GitHub Actions"

2. **Configure Repository Secrets**:

   **Frontend** (required):
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

   **Supabase** (required for Edge Functions):
   - `SUPABASE_ACCESS_TOKEN` - Generate at https://supabase.com/dashboard/account/tokens
   - `SUPABASE_PROJECT_ID` - From Supabase Dashboard → Settings → General
   - `SUPABASE_DB_PASSWORD` - Your database password
   - `GOOGLE_API_KEY` - Your Google API key

   **AWS/Terraform** (optional, for backups):
   - `AWS_ACCESS_KEY_ID` - AWS credentials
   - `AWS_SECRET_ACCESS_KEY` - AWS credentials
   - `AWS_REGION` - AWS region (default: us-east-1)
   - `SUPABASE_DB_URL` - Session pooler URL (port 6543)
   - `ALERT_EMAIL` - Email for backup failure alerts

3. **Create a Release**:
   ```bash
   # Commit your changes
   git add .
   git commit -m "Your changes"
   git push origin main

   # Create and push a tag
   git tag v1.0.0
   git push origin v1.0.0

   # Create release from GitHub UI
   # Go to Releases → Draft a new release → Choose tag → Publish
   ```

4. **Deployment Process**:
   - Tests run automatically
   - Frontend builds and deploys to GitHub Pages
   - Supabase migrations apply automatically
   - Edge Functions redeploy
   - Terraform applies infrastructure changes
   - Deployment summary appears in Actions tab

#### Workflows

**Test Workflow** (`.github/workflows/test.yml`):
- Runs on every push and pull request
- Executes linter, tests, and coverage

**Deploy Workflow** (`.github/workflows/deploy.yml`):
- Runs on published releases
- Deploys to:
  1. GitHub Pages (frontend)
  2. Supabase (migrations + Edge Functions)
  3. AWS (Terraform infrastructure)

### Manual Deployment

To build and deploy manually:

```bash
# Build the app
npm run build

# The dist/ folder contains the static files
# Deploy to any static hosting service

# Deploy Supabase manually
supabase db push
supabase functions deploy --no-verify-jwt

# Deploy Terraform manually
cd terraform
terraform apply
```

### Rollback

If a deployment has issues:

```bash
# Create new release from previous tag
git checkout v1.0.0
git tag v1.0.1
git push origin v1.0.1
# Create release from GitHub UI
```

## Database Schema

### Core Tables

#### **meal_entries**
Main table for tracking meals:
- `id` (UUID) - Primary key
- `user_id` (UUID) - Foreign key to auth.users
- `date_local` (DATE) - Browser local date
- `meal_group` (TEXT) - breakfast | lunch | snack | dinner
- `position` (INT) - Ordering within group
- `description` (TEXT) - Meal description (max 140 chars)
- Macro ranges: `calories_min`, `calories_max`, `protein_g_min/max`, `carbs_g_min/max`, `fat_g_min/max`
- `alcohol_g`, `alcohol_calories` (NUMERIC) - Separate alcohol tracking
- `uncertainty` (BOOLEAN) - AI confidence flag
- `portion_level` (TEXT) - light | ok | heavy (default: ok)
- `last_estimated_at` (TIMESTAMPTZ) - When AI last estimated

Constraints:
- Description length ≤ 140 characters
- Unique: `(user_id, date_local, meal_group, position)`
- All macro mins ≤ maxs

#### **meal_embeddings**
Vector embeddings for similarity search:
- `meal_entry_id` (UUID) - Primary key, cascades on delete
- `user_id` (UUID) - For efficient filtering
- `embedding` (VECTOR(1536)) - OpenAI text-embedding-3-small
- HNSW index with cosine similarity for fast vector search

#### **user_settings**
User preferences:
- `user_id` (UUID) - Primary key
- `daily_calories_target` (INT) - Default: 2000
- `protein_pct`, `carbs_pct`, `fat_pct` (NUMERIC) - Default: 30/40/30
- Constraint: `protein_pct + carbs_pct + fat_pct = 100`

### Key Database Functions (RPCs)

**`get_daily_totals(target_date DATE)`**:
- Calculates daily totals with portion-level resolution
- Returns: `{ calories, protein_g, carbs_g, fat_g }`
- Includes alcohol calories in total

**`get_weekly_totals(week_start_date DATE)`**:
- Sums totals for Mon-Sun week
- Same return format as daily totals

**`search_similar_meals_vector(query_embedding VECTOR(1536), match_limit INT)`**:
- Performs cosine similarity search using pgvector
- Filters by user_id for security
- Minimum 50% similarity threshold
- Returns meal details with similarity score

### Row Level Security (RLS)

All tables have RLS enabled with policies:
- Users can only SELECT/INSERT/UPDATE/DELETE their own rows
- Enforced using `auth.uid()` check
- Applies to: meal_entries, meal_embeddings, user_settings

### Database Migrations

Migrations are stored in `supabase/migrations/` and applied automatically via CI/CD.

Current migrations:
- `fix_numeric_types.sql`: Changes calorie columns from integer to numeric for decimal support

## License

MIT License - feel free to use this project for personal or commercial purposes.

---

**Note**: This is a nutrition tracking tool. AI estimates are approximate and should not replace professional dietary advice. Always consult a healthcare professional for medical or nutritional guidance.
