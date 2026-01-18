# Auto-Refreshing Glue Tables for S3 Metadata

## The Problem

S3 Tables metadata locations can change when:
- Integration with AWS analytics services is enabled/disabled
- S3 Tables service makes internal changes
- Table configurations are modified

When this happens, Glue tables pointing to old metadata locations will show stale data.

## Solution 1: Manual Trigger (Implemented)

I've added a `glue_tables_refresh_trigger` variable. Change it to force Glue tables to refresh.

### How to Use

```bash
cd terraform

# Method A: Change via command line
tofu apply -var="glue_tables_refresh_trigger=$(date +%s)"

# Method B: Edit variables.tf and change default value
# Change: default = "1"
# To:     default = "2" (or any different value)
# Then run: tofu apply

# Method C: Create terraform.tfvars
echo 'glue_tables_refresh_trigger = "'$(date +%s)'"' > terraform.tfvars
tofu apply
```

**When to use:** Whenever you notice Athena queries showing stale data.

### Check if Refresh is Needed

```bash
# Compare S3 Tables vs Glue metadata locations
./check-metadata-sync.sh
```

## Solution 2: Automated Lambda Function (Optional)

For fully automated refreshes, deploy a Lambda function that runs hourly:

### Deploy Lambda (CloudFormation)

```bash
cd terraform
tofu apply -target=module.glue_refresh_lambda
```

### What It Does

- Runs every hour via EventBridge
- Compares S3 Tables metadata locations with Glue tables
- Updates Glue tables if metadata locations changed
- Sends SNS notification on errors

### Lambda Code Location

`lambda/glue-refresh/index.py`

### Monitoring

```bash
# Check Lambda logs
aws logs tail /aws/lambda/glue-metadata-refresh --follow

# Check last execution
aws lambda get-function --function-name glue-metadata-refresh
```

## Solution 3: GitHub Actions / CI/CD (Optional)

For teams using CI/CD, add a scheduled workflow:

```yaml
# .github/workflows/refresh-glue-tables.yml
name: Refresh Glue Tables
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-west-2
      - name: Refresh Glue tables
        run: |
          cd terraform
          terraform apply -auto-approve \
            -var="glue_tables_refresh_trigger=$(date +%s)"
```

## Solution 4: Athena Maintenance View (Workaround)

Create Athena views that check both locations:

```sql
-- Create a view that always uses latest data
CREATE OR REPLACE VIEW journal_latest AS
SELECT * FROM "jeff-poc-barg-glue-db"."journal"
UNION ALL
SELECT * FROM "jeff-poc-barg-glue-db"."journal_backup"
WHERE record_timestamp > (
  SELECT MAX(record_timestamp) FROM "jeff-poc-barg-glue-db"."journal"
);
```

## Comparison

| Method | Automation Level | Complexity | Cost | Recommended For |
|--------|-----------------|------------|------|-----------------|
| **Manual Trigger** | Semi-automatic | Low | Free | Most users ✅ |
| **Lambda Function** | Fully automatic | Medium | ~$1/month | Production systems |
| **GitHub Actions** | Fully automatic | Medium | Free | Teams with CI/CD |
| **Athena Views** | Workaround | Low | Query cost | Quick fixes |

## Monitoring Metadata Drift

Add this script to check if refresh is needed:

```bash
#!/bin/bash
# check-metadata-sync.sh

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION="us-west-2"

check_table() {
  TABLE=$1

  S3_LOC=$(aws s3tables get-table-metadata-location \
    --table-bucket-arn "arn:aws:s3tables:${REGION}:${ACCOUNT_ID}:bucket/aws-s3" \
    --namespace "b_jeff-poc-barg" \
    --name "$TABLE" \
    --region "$REGION" \
    --query 'metadataLocation' \
    --output text)

  GLUE_LOC=$(aws glue get-table \
    --database-name jeff-poc-barg-glue-db \
    --name "$TABLE" \
    --region "$REGION" \
    --query 'Table.Parameters.metadata_location' \
    --output text)

  if [ "$S3_LOC" = "$GLUE_LOC" ]; then
    echo "✅ $TABLE: In sync"
    return 0
  else
    echo "❌ $TABLE: OUT OF SYNC - refresh needed!"
    return 1
  fi
}

echo "Checking metadata synchronization..."
check_table "inventory"
check_table "journal"

if [ $? -ne 0 ]; then
  echo ""
  echo "Run: tofu apply -var='glue_tables_refresh_trigger=$(date +%s)'"
  exit 1
fi
```

## Best Practice Recommendation

**For your POC:** Use **Manual Trigger** (Solution 1)
- Simple, no extra infrastructure
- Run when you notice issues
- Can be automated later if needed

**For production:** Add **Lambda Function** (Solution 2)
- Automatic monitoring and refresh
- Low cost, fully managed
- Handles edge cases automatically

## Quick Reference

```bash
# Check if refresh needed
./check-metadata-sync.sh

# Trigger refresh
tofu apply -var="glue_tables_refresh_trigger=$(date +%s)"

# Verify it worked
aws glue get-table \
  --database-name jeff-poc-barg-glue-db \
  --name journal \
  --query 'Table.Parameters.metadata_location'
```
