#!/bin/bash
# Create and activate virtual environment, then install dependencies
set -e

echo "Creating Python virtual environment..."
python3 -m venv venv

echo "Activating virtual environment..."
source venv/bin/activate

echo "Upgrading pip..."
pip install --upgrade pip

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Virtual environment setup complete."
echo "To activate: source venv/bin/activate"
