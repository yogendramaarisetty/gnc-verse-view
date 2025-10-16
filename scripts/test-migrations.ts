#!/usr/bin/env tsx

/**
 * Test Migration System
 * 
 * This script tests the migration system without requiring actual Supabase credentials.
 * It validates migration files and structure.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface MigrationFile {
  filename: string
  version: string
  name: string
  path: string
  size: number
}

class MigrationTester {
  private migrationsPath: string

  constructor() {
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
          const filePath = join(this.migrationsPath, file)
          const stats = statSync(filePath)
          
          return {
            filename: file,
            version: match[1],
            name: match[2],
            path: filePath,
            size: stats.size
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
   * Validate migration file content
   */
  private validateMigrationContent(migration: MigrationFile): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    try {
      const content = readFileSync(migration.path, 'utf8')
      
      // Check if file is empty
      if (content.trim().length === 0) {
        issues.push('Migration file is empty')
      }
      
      // Check for basic SQL syntax
      if (!content.includes(';')) {
        issues.push('Migration file should contain SQL statements ending with semicolons')
      }
      
      // Check for dangerous operations (warnings)
      const dangerousPatterns = [
        { pattern: /DROP\s+TABLE/i, message: 'Contains DROP TABLE - ensure this is intentional' },
        { pattern: /DELETE\s+FROM/i, message: 'Contains DELETE - ensure this is intentional' },
        { pattern: /TRUNCATE/i, message: 'Contains TRUNCATE - ensure this is intentional' }
      ]
      
      dangerousPatterns.forEach(({ pattern, message }) => {
        if (pattern.test(content)) {
          issues.push(message)
        }
      })
      
      return {
        valid: issues.length === 0,
        issues
      }
    } catch (error) {
      issues.push(`Error reading file: ${error}`)
      return { valid: false, issues }
    }
  }

  /**
   * Test migration system
   */
  async test(): Promise<void> {
    console.log('🧪 Testing Migration System')
    console.log('==========================')
    
    // Check if migrations directory exists
    try {
      statSync(this.migrationsPath)
      console.log('✅ Migrations directory exists')
    } catch (error) {
      console.error('❌ Migrations directory not found:', this.migrationsPath)
      return
    }
    
    // Get migration files
    const migrationFiles = this.getMigrationFiles()
    console.log(`📁 Found ${migrationFiles.length} migration files`)
    
    if (migrationFiles.length === 0) {
      console.log('⚠️  No migration files found')
      return
    }
    
    // Validate each migration
    console.log('\n📋 Migration Validation:')
    let validCount = 0
    let totalIssues = 0
    
    for (const migration of migrationFiles) {
      console.log(`\n🔍 Validating: ${migration.filename}`)
      console.log(`   Size: ${migration.size} bytes`)
      
      const validation = this.validateMigrationContent(migration)
      
      if (validation.valid) {
        console.log('   ✅ Valid')
        validCount++
      } else {
        console.log('   ❌ Issues found:')
        validation.issues.forEach(issue => {
          console.log(`      - ${issue}`)
          totalIssues++
        })
      }
    }
    
    // Summary
    console.log('\n📊 Test Summary:')
    console.log(`   Total migrations: ${migrationFiles.length}`)
    console.log(`   Valid migrations: ${validCount}`)
    console.log(`   Issues found: ${totalIssues}`)
    
    if (totalIssues === 0) {
      console.log('\n🎉 All migrations are valid!')
    } else {
      console.log('\n⚠️  Some migrations have issues that should be reviewed.')
    }
    
    // Show migration order
    console.log('\n📅 Migration Order:')
    migrationFiles.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration.filename}`)
    })
  }
}

// CLI interface
async function main() {
  const tester = new MigrationTester()
  await tester.test()
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error)
}

export { MigrationTester }
