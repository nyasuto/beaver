#!/bin/bash

# AI Classification Service Startup Script

set -e

echo "🤖 Starting AI Classification Service..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Please edit .env file with your OpenAI API key and restart"
    exit 1
fi

# Check if OpenAI API key is set
source .env
if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo "❌ OpenAI API key not configured in .env file"
    echo "   Please set OPENAI_API_KEY in .env file"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python -m venv venv
fi

source venv/bin/activate

echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run the service
echo "🚀 Starting FastAPI server..."
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload