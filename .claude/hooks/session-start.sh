#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

cd "$CLAUDE_PROJECT_DIR"

# Install npm dependencies
npm install

# Generate Prisma client
npm run db:generate

# Install Understand-Anything plugin
claude plugin marketplace add Egonex-AI/Understand-Anything --silent 2>/dev/null || true
claude plugin install understand-anything 2>/dev/null || true
