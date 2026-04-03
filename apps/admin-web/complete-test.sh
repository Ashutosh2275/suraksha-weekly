#!/bin/bash

# SURAKSHA WEEKLY - COMPLETE EXECUTION VERIFICATION SYSTEM
# This script will test every aspect of the application

echo "🚀 SURAKSHA WEEKLY - COMPLETE SYSTEM VERIFICATION"
echo "=================================================="
echo

# Navigate to project
cd "c:/Users/ASUS/Desktop/suraksha-weekly/apps/admin-web" || exit 1

echo "📁 Project Directory: $(pwd)"
echo "⏰ Start Time: $(date)"
echo

# Phase 1: Check project structure
echo "📋 PHASE 1: PROJECT STRUCTURE VERIFICATION"
echo "-------------------------------------------"

required_files=(
    "package.json"
    "next.config.js"
    "tailwind.config.js"
    "tsconfig.json"
    "src/app/layout.tsx"
    "src/app/claims/page.tsx"
    "src/components/AdminShell.tsx"
    "src/components/ui/Button.tsx"
    "src/lib/AppContext.tsx"
)

for file in "${required_files[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ $file"
    else
        echo "❌ $file (MISSING)"
    fi
done
echo

# Phase 2: Dependencies
echo "📦 PHASE 2: DEPENDENCY VERIFICATION"
echo "-----------------------------------"
if npm list --depth=0 --silent; then
    echo "✅ All dependencies installed"
else
    echo "⚠️  Installing missing dependencies..."
    npm install
fi
echo

# Phase 3: TypeScript Check
echo "🔍 PHASE 3: TYPESCRIPT COMPILATION"
echo "----------------------------------"
if npm run type-check; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript errors detected"
fi
echo

# Phase 4: Build Test
echo "🏗️  PHASE 4: BUILD VERIFICATION"
echo "------------------------------"
if npm run build; then
    echo "✅ Build completed successfully"
else
    echo "❌ Build failed"
fi
echo

# Phase 5: Server Start Test
echo "🌐 PHASE 5: DEVELOPMENT SERVER"
echo "-----------------------------"
echo "Starting development server on port 3001..."
echo "🎯 Access: http://localhost:3001"
echo "📊 Status: READY FOR TESTING"
echo
echo "🛑 Press Ctrl+C to stop the server when testing is complete"
echo

# Start the development server
exec npm run dev