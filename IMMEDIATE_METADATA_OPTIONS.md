# Immediate Metadata Querying Options

Since S3 Tables inventory takes up to 48 hours for initial population, here are alternatives for immediate metadata access:

---

## Option 1: Direct S3 API Queries (Available NOW)

### Query all objects with metadata:
```bash
aws s3api list-objects-v2 --bucket jeff-poc-barg --region us-west-2

# Get metadata for specific object
aws s3api head-object --bucket jeff-poc-barg --key "myfile.txt" --region us-west-2
```

### Python script to query all metadata:
```python
import boto3
import json

s3 = boto3.client('s3')
bucket = 'jeff-poc-barg'

# List all objects
response = s3.list_objects_v2(Bucket=bucket)

for obj in response.get('Contents', []):
    key = obj['Key']

    # Get metadata for each object
    metadata = s3.head_object(Bucket=bucket, Key=key)

    print(f"Object: {key}")
    print(f"  Size: {metadata['ContentLength']}")
    print(f"  Modified: {metadata['LastModified']}")
    print(f"  Metadata: {metadata.get('Metadata', {})}")
    print()
```

**Pros:**
- ✅ Works immediately
- ✅ Always up-to-date
- ✅ No setup required

**Cons:**
- ❌ Not queryable with SQL
- ❌ Slower for large numbers of objects
- ❌ Requires iterating through objects

---

## Option 2: Lambda + DynamoDB (Real-time with SQL-like queries)

Set up event-driven metadata capture:

### Architecture:
```
S3 Upload Event → Lambda Function → DynamoDB Table → Athena Federated Query
```

### Benefits:
- ✅ Real-time updates (< 1 second)
- ✅ Can query with Athena using DynamoDB connector
- ✅ Fast queries on metadata
- ✅ Automatically captures new metadata fields

### Implementation (add to Terraform):

```hcl
# DynamoDB table for metadata
resource "aws_dynamodb_table" "object_metadata" {
  name           = "s3-object-metadata"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "bucket"
  range_key      = "key"

  attribute {
    name = "bucket"
    type = "S"
  }

  attribute {
    name = "key"
    type = "S"
  }

  # GSI for querying by metadata fields
  global_secondary_index {
    name            = "metadata-category-index"
    hash_key        = "category"
    projection_type = "ALL"
  }

  attribute {
    name = "category"
    type = "S"
  }
}

# Lambda function to capture metadata
resource "aws_lambda_function" "metadata_capture" {
  filename      = "lambda_function.zip"
  function_name = "s3-metadata-capture"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.object_metadata.name
    }
  }
}

# S3 event trigger
resource "aws_s3_bucket_notification" "object_created" {
  bucket = aws_s3_bucket.metadata_poc.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.metadata_capture.arn
    events              = ["s3:ObjectCreated:*"]
  }
}
```

### Lambda function code (Python):
```python
import boto3
import json
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('s3-object-metadata')

def handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Get object metadata
        response = s3.head_object(Bucket=bucket, Key=key)

        # Extract user metadata
        user_metadata = response.get('Metadata', {})

        # Store in DynamoDB
        item = {
            'bucket': bucket,
            'key': key,
            'size': response['ContentLength'],
            'last_modified': response['LastModified'].isoformat(),
            'etag': response['ETag'],
            **user_metadata  # Spread all metadata fields
        }

        table.put_item(Item=item)

    return {'statusCode': 200}
```

### Query with Athena:
```sql
-- Once you set up Athena DynamoDB connector
SELECT * FROM dynamodb.s3_object_metadata
WHERE category = 'documents'
  AND environment = 'production';
```

---

## Option 3: S3 Inventory (Daily reports)

Use traditional S3 Inventory instead of S3 Tables:

### Setup:
```hcl
resource "aws_s3_bucket_inventory" "metadata_inventory" {
  bucket = aws_s3_bucket.metadata_poc.id
  name   = "daily-inventory"

  included_object_versions = "Current"

  schedule {
    frequency = "Daily"
  }

  destination {
    bucket {
      bucket_arn = aws_s3_bucket.athena_results.arn
      format     = "Parquet"
      prefix     = "inventory/"
    }
  }

  optional_fields = [
    "Size",
    "LastModifiedDate",
    "ETag",
    "StorageClass",
    "IsMultipartUploaded",
    "ReplicationStatus",
    "EncryptionStatus",
    "ObjectLockRetainUntilDate",
    "ObjectLockMode",
    "ObjectLockLegalHoldStatus",
    "IntelligentTieringAccessTier",
    "BucketKeyStatus"
  ]
}
```

**Note:** Standard S3 Inventory doesn't include user metadata in the reports. For user metadata, you need Option 1 or 2.

---

## Option 4: API Gateway + Lambda (Query endpoint)

Create a REST API to query metadata:

```
GET /objects?category=documents&environment=production
```

Returns JSON with filtered objects based on metadata.

---

## Recommendation

**For immediate access:**
- Use **Option 1** (Direct S3 API) for simple cases
- Use **Option 2** (Lambda + DynamoDB) for production with SQL-like queries

**For historical tracking:**
- Keep S3 Tables inventory (works after 48 hours)
- Provides official AWS-managed metadata history

---

## Current Status

Your current setup:
- ✅ S3 Tables inventory configured (waiting for initial population)
- ✅ Athena queries ready
- ✅ One object with metadata: `1768512857333-corgi.jpg` (description: "CORGI!!!!")

Would you like me to implement Option 2 (Lambda + DynamoDB) for immediate real-time metadata querying?
