#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Train2Play..."
exec npx next start -H 0.0.0.0 -p "${PORT:-43123}"
