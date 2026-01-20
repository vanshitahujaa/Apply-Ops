#!/bin/sh

# Push database schema to production DB
npx prisma db push

# Start the application
npm start
