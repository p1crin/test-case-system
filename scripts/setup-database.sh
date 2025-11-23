#!/bin/bash

# Database setup script for Test Case Management System

echo "🗄️  Test Case Management System - Database Setup"
echo "================================================="
echo ""

# Configuration
DB_NAME="testcase_db"
DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-localhost}"

echo "Database Name: $DB_NAME"
echo "Database User: $DB_USER"
echo "Database Host: $DB_HOST"
echo ""

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! psql -U "$DB_USER" -h "$DB_HOST" -c '\q' 2>/dev/null; then
    echo "❌ Error: Cannot connect to PostgreSQL"
    echo "Please make sure PostgreSQL is running and you have the correct credentials"
    exit 1
fi

echo "✅ PostgreSQL connection successful"
echo ""

# Create database
echo "Creating database '$DB_NAME'..."
if psql -U "$DB_USER" -h "$DB_HOST" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database '$DB_NAME' already exists. Skipping creation."
else
    createdb -U "$DB_USER" -h "$DB_HOST" "$DB_NAME"
    if [ $? -eq 0 ]; then
        echo "✅ Database '$DB_NAME' created successfully"
    else
        echo "❌ Error: Failed to create database"
        exit 1
    fi
fi
echo ""

# Apply schema
echo "Applying database schema..."
psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -f ../database/schema.sql
if [ $? -eq 0 ]; then
    echo "✅ Schema applied successfully"
else
    echo "❌ Error: Failed to apply schema"
    exit 1
fi
echo ""

# Create admin user
echo "Creating default admin user..."
psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -f create-admin.sql
if [ $? -eq 0 ]; then
    echo "✅ Admin user created successfully"
    echo ""
    echo "📝 Default login credentials:"
    echo "   Email: admin@example.com"
    echo "   Password: admin123"
else
    echo "❌ Error: Failed to create admin user"
    exit 1
fi
echo ""

# Verify tables
echo "Verifying tables..."
TABLE_COUNT=$(psql -U "$DB_USER" -h "$DB_HOST" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo "✅ Found $TABLE_COUNT tables"
echo ""

echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env"
echo "2. Update DATABASE_URL in .env with your connection string"
echo "3. Run 'npm install' to install dependencies"
echo "4. Run 'npm run dev' to start the development server"
echo ""
