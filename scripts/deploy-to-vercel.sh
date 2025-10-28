#!/bin/bash

# Manual Vercel Deployment Script
# This script helps you deploy to Vercel manually

set -e  # Exit on any error

echo "🚀 Manual Vercel Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if Vercel CLI is installed
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed"
        echo "Install it with: npm i -g vercel"
        exit 1
    fi
    print_success "Vercel CLI is installed"
}

# Check environment variables
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        print_warning "NEXT_PUBLIC_SUPABASE_URL is not set"
        echo "Set it with: export NEXT_PUBLIC_SUPABASE_URL=your_url"
    else
        print_success "NEXT_PUBLIC_SUPABASE_URL is set"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
        print_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
        echo "Set it with: export NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key"
    else
        print_success "NEXT_PUBLIC_SUPABASE_ANON_KEY is set"
    fi
}

# Build the project
build_project() {
    print_status "Building project..."
    npm run build
    print_success "Build completed"
}

# Deploy to Vercel
deploy_to_vercel() {
    print_status "Deploying to Vercel..."
    
    # Check if user is logged in
    if ! vercel whoami &> /dev/null; then
        print_warning "Not logged in to Vercel"
        echo "Run: vercel login"
        exit 1
    fi
    
    # Deploy
    vercel --prod
    
    print_success "Deployment completed!"
}

# Main function
main() {
    echo "🎯 GNC Verse View - Manual Vercel Deployment"
    echo "============================================="
    
    check_vercel_cli
    check_env_vars
    build_project
    deploy_to_vercel
    
    print_success "🎉 Deployment completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Check your Vercel dashboard for the deployment"
    echo "2. Configure environment variables in Vercel if not set locally"
    echo "3. Test your deployed application"
}

# Run main function
main "$@"
