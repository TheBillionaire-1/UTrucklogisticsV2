#!/bin/bash

# Initialize Git repository if not already initialized
git init

# Add all files to Git
git add .

# Create initial commit if it doesn't exist
git commit -m "Initial commit for cargo transport platform"

# Create and switch to Phase2 branch
git checkout -b Phase2

# Add all recent changes
git add .

# Commit changes with descriptive message
git commit -m "Phase 2: Add GPS tracking and delivery confirmation features

- Added GPS tracking activation for accepted bookings
- Implemented driver delivery confirmation
- Added WebSocket disconnection on delivery completion
- Updated tracking page with conditional rendering"

echo "Phase2 branch has been created and changes have been committed"
