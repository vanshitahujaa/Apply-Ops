#!/bin/sh

# Push database schema to production DB
npx prisma db push

# Start the application
exec node dist/index.js
