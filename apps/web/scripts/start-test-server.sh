#!/bin/bash
# Start the Next.js dev server with test environment variables

# Set all test env vars
export NEXT_PUBLIC_ENV=test
export NEXT_PUBLIC_PLAYWRIGHT_TEST=true
export NEXT_PUBLIC_ENABLE_TEST_AUTH=true
export NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
export NEXT_PUBLIC_AUTH_EMULATOR_PORT=9099
export NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT=8085

# Start Next.js dev server with these env vars in place
next dev --port 3100
