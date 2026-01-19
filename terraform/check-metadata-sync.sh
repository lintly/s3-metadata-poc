#!/bin/bash

# Check if Glue table metadata locations are in sync with S3 Tables

set -e

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="${AWS_REGION:-us-west-2}"
BUCKET_NAME="${BUCKET_NAME:-jeff-poc-barg}"
GLUE_DATABASE="${GLUE_DATABASE:-${BUCKET_NAME}-glue-db}"

echo "=========================================="
echo "Glue Metadata Sync Check"
echo "=========================================="
echo ""

NEEDS_REFRESH=false

check_table() {
  TABLE=$1

  echo "Checking: $TABLE"

  # Get S3 Tables metadata location
  S3_LOC=$(aws s3tables get-table-metadata-location \
    --table-bucket-arn "arn:aws:s3tables:${REGION}:${ACCOUNT_ID}:bucket/aws-s3" \
    --namespace "b_${BUCKET_NAME}" \
    --name "$TABLE" \
    --region "$REGION" \
    --query 'metadataLocation' \
    --output text 2>&1)

  if [ $? -ne 0 ]; then
    echo "  ⚠️  Could not get S3 Tables metadata location"
    echo "  $S3_LOC"
    echo ""
    return
  fi

  # Get Glue table metadata location
  GLUE_LOC=$(aws glue get-table \
    --database-name "$GLUE_DATABASE" \
    --name "$TABLE" \
    --region "$REGION" \
    --query 'Table.Parameters.metadata_location' \
    --output text 2>&1)

  if [ $? -ne 0 ]; then
    echo "  ⚠️  Could not get Glue table metadata location"
    echo "  $GLUE_LOC"
    echo ""
    return
  fi

  echo "  S3 Tables:  ${S3_LOC:0:80}..."
  echo "  Glue Table: ${GLUE_LOC:0:80}..."

  if [ "$S3_LOC" = "$GLUE_LOC" ]; then
    echo "  ✅ IN SYNC"
  else
    echo "  ❌ OUT OF SYNC - REFRESH NEEDED!"
    NEEDS_REFRESH=true
  fi

  echo ""
}

# Check both tables
check_table "inventory"
check_table "journal"

echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""

if [ "$NEEDS_REFRESH" = true ]; then
  echo "❌ One or more tables are out of sync!"
  echo ""
  echo "To refresh, run:"
  echo ""
  echo "  cd terraform"
  echo "  tofu apply -var='glue_tables_refresh_trigger=$(date +%s)'"
  echo ""
  echo "Or update the default value in variables.tf:"
  echo ""
  echo "  variable \"glue_tables_refresh_trigger\" {"
  echo "    default = \"$(date +%s)\"  # Change this value"
  echo "  }"
  echo ""
  exit 1
else
  echo "✅ All tables are in sync!"
  echo ""
  echo "No action needed."
  exit 0
fi
