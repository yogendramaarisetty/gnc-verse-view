#!/bin/bash

# Deployment script with database migrations
# This script handles the complete deployment process including database migrations

set -e  # Exit on any error

echo "🚀 Starting deployment with database migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_error "NEXT_PUBLIC_SUPABASE_URL is not set"
        exit 1
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        print_error "SUPABASE_SERVICE_ROLE_KEY is not set"
        exit 1
    fi
    
    print_success "Environment variables are set"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Clean install
    rm -rf node_modules package-lock.json
    npm install
    
    print_success "Dependencies installed"
}

# Run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if migration script exists
    if [ ! -f "scripts/migrate-database.ts" ]; then
        print_error "Migration script not found: scripts/migrate-database.ts"
        exit 1
    fi
    
    # Run migrations
    npx tsx scripts/migrate-database.ts migrate
    
    print_success "Database migrations completed"
}

# Build the application
build_application() {
    print_status "Building application..."
    
    npm run build
    
    print_success "Application built successfully"
}

# Run tests (if available)
run_tests() {
    print_status "Running tests..."
    
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        npm test
        print_success "Tests passed"
    else
        print_warning "No tests found, skipping..."
    fi
}

# Deploy to Vercel (if Vercel CLI is available)
deploy_vercel() {
    if command -v vercel &> /dev/null; then
        print_status "Deploying to Vercel..."
        vercel --prod
        print_success "Deployed to Vercel"
    else
        print_warning "Vercel CLI not found, skipping Vercel deployment"
    fi
}

# Main deployment function
main() {
    echo "🎯 GNC Verse View Deployment Script"
    echo "=================================="
    
    # Parse command line arguments
    SKIP_MIGRATIONS=false
    SKIP_BUILD=false
    SKIP_TESTS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-migrations)
                SKIP_MIGRATIONS=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --skip-tests)
                SKIP_TESTS=true
                shift
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo "Options:"
                echo "  --skip-migrations    Skip database migrations"
                echo "  --skip-build        Skip application build"
                echo "  --skip-tests        Skip running tests"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run deployment steps
    check_env_vars
    install_dependencies
    
    if [ "$SKIP_MIGRATIONS" = false ]; then
        run_migrations
    else
        print_warning "Skipping database migrations"
    fi
    
    if [ "$SKIP_TESTS" = false ]; then
        run_tests
    else
        print_warning "Skipping tests"
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_application
    else
        print_warning "Skipping build"
    fi
    
    # Optional: Deploy to Vercel
    if [ "$1" = "--deploy" ]; then
        deploy_vercel
    fi
    
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Deploy your application to your hosting platform"
    echo "2. Verify the deployment works correctly"
    echo "3. Check that database migrations were applied"
    echo ""
    echo "To check migration status: npx tsx scripts/migrate-database.ts status"
}

# Run main function with all arguments
main "$@"
