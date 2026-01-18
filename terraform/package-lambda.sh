#!/bin/bash

# Package Lambda function for deployment

cd "$(dirname "$0")"

echo "Packaging Lambda function for Glue metadata refresh..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)
cp lambda-glue-refresh.py "$TEMP_DIR/index.py"

# Create zip file
cd "$TEMP_DIR"
zip -q lambda-glue-refresh.zip index.py

# Move to terraform directory
mv lambda-glue-refresh.zip "$(dirname "$0")/"

# Cleanup
cd ..
rm -rf "$TEMP_DIR"

echo "✅ Lambda package created: lambda-glue-refresh.zip"
echo ""
echo "To enable automated refresh:"
echo "  1. mv lambda-glue-refresh.tf.optional lambda-glue-refresh.tf"
echo "  2. tofu apply"
