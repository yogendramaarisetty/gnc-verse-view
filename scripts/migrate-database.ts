#!/usr/bin/env tsx

/**
 * Database Migration Script for GNC Verse View
 * 
 * This script applies database migrations to Supabase during deployment.
 * It reads migration files from supabase/migrations/ and applies them in order.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface MigrationFile {
  filename: string
  version: string
  name: string
  path: string
}

interface MigrationRecord {
  version: string
  name: string
  applied_at: string
}

class DatabaseMigrator {
  private supabase: any
  private migrationsPath: string

  constructor() {
    // Get Supabase credentials from environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey)
    this.migrationsPath = join(process.cwd(), 'supabase', 'migrations')
  }

  /**
   * Get all migration files from the migrations directory
   */
  private getMigrationFiles(): MigrationFile[] {
    try {
      const files = readdirSync(this.migrationsPath)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
          const match = file.match(/^(\d{14})_(.+)\.sql$/)
          if (!match) {
            throw new Error(`Invalid migration filename format: ${file}`)
          }
          return {
            filename: file,
            version: match[1],
            name: match[2],
            path: join(this.migrationsPath, file)
          }
        })
        .sort((a, b) => a.version.localeCompare(b.version))

      return files
    } catch (error) {
      console.error('Error reading migration files:', error)
      return []
    }
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS supabase_migrations (
        version VARCHAR(14) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL })
      if (error) {
        console.error('Error creating migrations table:', error)
        throw error
      }
      console.log('✅ Migrations table created/verified')
    } catch (error) {
      console.error('Failed to create migrations table:', error)
      throw error
    }
  }

  /**
   * Get applied migrations from the database
   */
  private async getAppliedMigrations(): Promise<MigrationRecord[]> {
    try {
      const { data, error } = await this.supabase
        .from('supabase_migrations')
        .select('*')
        .order('version')

      if (error) {
        console.error('Error fetching applied migrations:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Failed to fetch applied migrations:', error)
      return []
    }
  }

  /**
   * Apply a single migration
   */
  private async applyMigration(migration: MigrationFile): Promise<void> {
    console.log(`🔄 Applying migration: ${migration.filename}`)
    
    try {
      const sql = readFileSync(migration.path, 'utf8')
      
      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0)

      // Execute each statement
      for (const statement of statements) {
        if (statement.trim()) {
          const { error } = await this.supabase.rpc('exec_sql', { sql: statement })
          if (error) {
            console.error(`Error executing statement: ${statement}`)
            throw error
          }
        }
      }

      // Record the migration as applied
      const { error: insertError } = await this.supabase
        .from('supabase_migrations')
        .insert({
          version: migration.version,
          name: migration.name,
          applied_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error recording migration:', insertError)
        throw insertError
      }

      console.log(`✅ Migration applied: ${migration.filename}`)
    } catch (error) {
      console.error(`❌ Failed to apply migration ${migration.filename}:`, error)
      throw error
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    console.log('🚀 Starting database migration...')

    try {
      // Create migrations table
      await this.createMigrationsTable()

      // Get migration files and applied migrations
      const migrationFiles = this.getMigrationFiles()
      const appliedMigrations = await this.getAppliedMigrations()
      const appliedVersions = new Set(appliedMigrations.map(m => m.version))

      console.log(`📁 Found ${migrationFiles.length} migration files`)
      console.log(`📊 Applied ${appliedMigrations.length} migrations`)

      // Find pending migrations
      const pendingMigrations = migrationFiles.filter(
        migration => !appliedVersions.has(migration.version)
      )

      if (pendingMigrations.length === 0) {
        console.log('✅ No pending migrations')
        return
      }

      console.log(`🔄 Found ${pendingMigrations.length} pending migrations`)

      // Apply each pending migration
      for (const migration of pendingMigrations) {
        await this.applyMigration(migration)
      }

      console.log('🎉 All migrations completed successfully!')
    } catch (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
  }

  /**
   * Check migration status
   */
  async status(): Promise<void> {
    console.log('📊 Migration Status:')
    
    try {
      await this.createMigrationsTable()
      
      const migrationFiles = this.getMigrationFiles()
      const appliedMigrations = await this.getAppliedMigrations()
      const appliedVersions = new Set(appliedMigrations.map(m => m.version))

      console.log(`📁 Total migration files: ${migrationFiles.length}`)
      console.log(`✅ Applied migrations: ${appliedMigrations.length}`)
      console.log(`⏳ Pending migrations: ${migrationFiles.length - appliedMigrations.length}`)

      console.log('\n📋 Migration Details:')
      for (const migration of migrationFiles) {
        const status = appliedVersions.has(migration.version) ? '✅ Applied' : '⏳ Pending'
        console.log(`  ${status} ${migration.filename}`)
      }
    } catch (error) {
      console.error('❌ Failed to check migration status:', error)
      process.exit(1)
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'migrate'
  const migrator = new DatabaseMigrator()

  switch (command) {
    case 'migrate':
      await migrator.migrate()
      break
    case 'status':
      await migrator.status()
      break
    default:
      console.log('Usage: tsx scripts/migrate-database.ts [migrate|status]')
      process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { DatabaseMigrator }
