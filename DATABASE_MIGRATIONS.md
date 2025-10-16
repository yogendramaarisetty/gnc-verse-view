# 🗄️ Database Migrations Guide

## Overview

This project now includes automated database migrations that run during deployment. This ensures that your Supabase database schema stays in sync with your codebase automatically.

## 🚀 **Quick Start**

### **Run Migrations Locally**
```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status

# Deploy with migrations
npm run deploy
```

### **Environment Variables Required**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 📁 **Migration Structure**

```
supabase/
├── config.toml              # Supabase configuration
├── migrations/              # Migration files
│   └── 20241201000001_initial_schema.sql
└── schema.sql              # Current schema (for reference)

scripts/
├── migrate-database.ts     # Migration runner
└── deploy-with-migrations.sh # Deployment script
```

## 🔧 **How It Works**

### **1. Migration Files**
- Located in `supabase/migrations/`
- Named with timestamp: `YYYYMMDDHHMMSS_description.sql`
- Applied in chronological order
- Tracked in `supabase_migrations` table

### **2. Migration Runner**
- `scripts/migrate-database.ts` handles migration execution
- Creates `supabase_migrations` table to track applied migrations
- Only runs pending migrations
- Provides status checking

### **3. Deployment Integration**
- GitHub Actions workflow runs migrations before deployment
- Vercel deployment includes migration step
- Local deployment script includes migrations

## 📋 **Creating New Migrations**

### **1. Create Migration File**
```bash
# Create new migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_your_migration_name.sql
```

### **2. Write Migration SQL**
```sql
-- Example: Add new column
ALTER TABLE songs ADD COLUMN new_field VARCHAR(255);

-- Example: Create new table
CREATE TABLE new_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- Example: Add index
CREATE INDEX idx_songs_new_field ON songs(new_field);
```

### **3. Test Migration**
```bash
# Test locally
npm run migrate:status
npm run migrate
```

## 🚀 **Deployment Options**

### **Option 1: GitHub Actions (Recommended)**
- Automatic migrations on push to main/enhance branches
- Runs migrations before deployment
- Includes environment variable secrets

### **Option 2: Vercel Integration**
- Add migration step to Vercel build process
- Use environment variables in Vercel dashboard
- Run migrations during build

### **Option 3: Manual Deployment**
```bash
# Full deployment with migrations
npm run deploy

# Skip migrations (if needed)
npm run deploy:skip-migrations
```

## 🔍 **Migration Commands**

### **Check Status**
```bash
npm run migrate:status
```
Shows:
- Total migration files
- Applied migrations
- Pending migrations
- Detailed status for each migration

### **Run Migrations**
```bash
npm run migrate
```
- Applies all pending migrations
- Records applied migrations in database
- Provides detailed output

### **Deploy with Migrations**
```bash
npm run deploy
```
- Installs dependencies
- Runs migrations
- Builds application
- Optional: Deploys to Vercel

## 🛠️ **Troubleshooting**

### **Common Issues**

#### **1. Migration Fails**
```bash
# Check migration status
npm run migrate:status

# Check Supabase logs
# Go to Supabase dashboard > Logs
```

#### **2. Environment Variables Missing**
```bash
# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### **3. Migration Already Applied**
- Migrations are tracked in `supabase_migrations` table
- Only pending migrations are applied
- Check status before running

### **Manual Migration Management**

#### **Reset Migrations (DANGER)**
```sql
-- Only if you need to reset migration tracking
DELETE FROM supabase_migrations;
```

#### **Check Applied Migrations**
```sql
SELECT * FROM supabase_migrations ORDER BY version;
```

## 📊 **Migration Best Practices**

### **1. Always Test Locally**
```bash
# Test migration before committing
npm run migrate:status
npm run migrate
```

### **2. Use Descriptive Names**
```bash
# Good
20241201120000_add_user_preferences.sql

# Bad
20241201120000_update.sql
```

### **3. Include Rollback Information**
```sql
-- Migration: Add user preferences
ALTER TABLE users ADD COLUMN preferences JSONB;

-- Rollback (if needed):
-- ALTER TABLE users DROP COLUMN preferences;
```

### **4. Test with Sample Data**
- Test migrations with realistic data
- Verify indexes and constraints
- Check performance impact

## 🔐 **Security Considerations**

### **Environment Variables**
- Never commit service role keys to git
- Use GitHub Secrets for CI/CD
- Rotate keys regularly

### **Migration Permissions**
- Service role key has full database access
- Migrations run with elevated privileges
- Review all migration SQL before applying

## 📈 **Monitoring**

### **Migration Logs**
- Check Supabase logs for migration execution
- Monitor deployment logs for migration status
- Set up alerts for migration failures

### **Database Health**
- Monitor database performance after migrations
- Check for failed migrations
- Verify schema consistency

## 🎯 **Next Steps**

1. **Set up environment variables** in your deployment platform
2. **Test migrations locally** with your Supabase instance
3. **Configure GitHub Secrets** for automated deployment
4. **Create your first custom migration** when needed
5. **Monitor deployment logs** to ensure migrations run successfully

---

**🎉 Your database migrations are now automated!** 

Every deployment will automatically apply pending migrations, ensuring your database schema stays in sync with your codebase. 🚀
