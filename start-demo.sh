#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'
BOLD='\033[1m'

echo ""
echo -e "${CYAN}VisionPIP — Property Intelligence Platform${NC}"
echo -e "${GREEN}Interactive Sales Demo${NC} · Team Vision LLC · Bristol, TN"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}Node.js is not installed. Please install Node.js 18+ from https://nodejs.org${NC}"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${YELLOW}Node.js 18+ required (found v$(node -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v) detected"

if [ ! -d "node_modules" ]; then
  echo -e "${CYAN}Installing dependencies (first run only)...${NC}"
  npm install --silent
  echo -e "${GREEN}✓${NC} Dependencies installed"
else
  echo -e "${GREEN}✓${NC} Dependencies ready"
fi

PORT=3000
while lsof -i :$PORT &>/dev/null 2>&1; do
  PORT=$((PORT + 1))
done
echo -e "${GREEN}✓${NC} Using port ${BOLD}$PORT${NC}"

if [ -f ".env.local" ]; then
  sed -i.bak "s|http://localhost:[0-9]*/api/mock-supabase|http://localhost:$PORT/api/mock-supabase|g" .env.local
  rm -f .env.local.bak
  echo -e "${GREEN}✓${NC} Updated .env.local with port $PORT"
else
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    sed -i.bak "s|http://localhost:[0-9]*/api/mock-supabase|http://localhost:$PORT/api/mock-supabase|g" .env.local
    rm -f .env.local.bak
    echo -e "${GREEN}✓${NC} Created .env.local from template"
    echo -e "${YELLOW}⚠ Add your GEMINI_API_KEY to .env.local for AI features${NC}"
  else
    echo -e "${YELLOW}No .env.example found. Please create .env.local manually.${NC}"
    exit 1
  fi
fi

if [ -f "supabase/mock-db-seed.json" ]; then
  cp supabase/mock-db-seed.json supabase/mock-db.json
  echo -e "${GREEN}✓${NC} Demo data reset to factory state"
fi

echo ""
echo -e "${CYAN}🚀 Starting VisionPIP Demo...${NC}"
echo -e "   Dashboard: ${BOLD}http://localhost:$PORT/admin${NC}"
echo -e "   Website:   ${BOLD}http://localhost:$PORT${NC}"
echo ""
echo -e "   ${GREEN}Press Ctrl+C to stop${NC}"
echo ""

(sleep 3 && open "http://localhost:$PORT/admin" 2>/dev/null || true) &

npx next dev --port $PORT
