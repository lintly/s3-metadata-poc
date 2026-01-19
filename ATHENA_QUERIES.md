# Athena Query Examples for user_metadata

## Quick Start

Use these queries in AWS Athena Console or CLI to search your S3 object metadata.

---

## 1. Basic Queries

### View all objects with their metadata
```sql
SELECT
    bucket,
    key,
    size,
    last_modified_date,
    user_metadata
FROM "jeff-poc-barg-glue-db"."inventory"
LIMIT 100;
```

### Extract specific metadata fields
```sql
SELECT
    bucket,
    key,
    user_metadata['category'] as category,
    user_metadata['environment'] as environment,
    user_metadata['owner'] as owner
FROM "jeff-poc-barg-glue-db"."inventory";
```

---

## 2. Filter by Metadata

### Find all production files
```sql
SELECT bucket, key, size, last_modified_date
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE user_metadata['environment'] = 'production';
```

### Find high-priority documents
```sql
SELECT bucket, key, user_metadata
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE user_metadata['category'] = 'documents'
  AND user_metadata['priority'] = 'high';
```

### Find files owned by specific person
```sql
SELECT bucket, key, size
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE user_metadata['owner'] LIKE '%john%';
```

---

## 3. Aggregate Queries

### Count files by category
```sql
SELECT
    user_metadata['category'] as category,
    COUNT(*) as file_count,
    SUM(size) as total_size
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE user_metadata['category'] IS NOT NULL
GROUP BY user_metadata['category']
ORDER BY file_count DESC;
```

### Count files by environment
```sql
SELECT
    user_metadata['environment'] as environment,
    COUNT(*) as object_count
FROM "jeff-poc-barg-glue-db"."inventory"
GROUP BY user_metadata['environment'];
```

---

## 4. Advanced Queries

### Find all unique metadata keys used
```sql
SELECT DISTINCT map_keys(user_metadata) as metadata_keys
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE cardinality(user_metadata) > 0;
```

### Get objects with specific metadata key present
```sql
SELECT bucket, key, user_metadata
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE element_at(user_metadata, 'owner') IS NOT NULL;
```

### Find large files with metadata
```sql
SELECT
    bucket,
    key,
    size,
    user_metadata['category'] as category,
    user_metadata['owner'] as owner
FROM "jeff-poc-barg-glue-db"."inventory"
WHERE size > 1048576  -- 1MB
ORDER BY size DESC
LIMIT 50;
```

---

## 5. Create Simplified View

Create a view with commonly used metadata fields for easier querying:

```sql
CREATE OR REPLACE VIEW jeff_poc_barg_glue_db.inventory_flat AS
SELECT
    bucket,
    key,
    size,
    last_modified_date,
    version_id,
    storage_class,
    e_tag,
    -- Flatten common metadata fields
    user_metadata['category'] as category,
    user_metadata['environment'] as environment,
    user_metadata['owner'] as owner,
    user_metadata['priority'] as priority,
    user_metadata['description'] as description,
    -- Keep original map for other fields
    user_metadata as all_metadata
FROM "jeff-poc-barg-glue-db"."inventory";
```

Then query the view simply:
```sql
SELECT * FROM jeff_poc_barg_glue_db.inventory_flat
WHERE category = 'documents'
  AND environment = 'production'
ORDER BY last_modified_date DESC;
```

---

## 6. How to Upload Files with Metadata

### Using AWS CLI:
```bash
aws s3 cp myfile.txt s3://jeff-poc-barg/myfile.txt \
  --metadata category=documents,environment=production,owner=john-doe,priority=high
```

### Using Python boto3:
```python
import boto3

s3 = boto3.client('s3')
s3.put_object(
    Bucket='jeff-poc-barg',
    Key='myfile.txt',
    Body=b'file content',
    Metadata={
        'category': 'documents',
        'environment': 'production',
        'owner': 'john-doe',
        'priority': 'high'
    }
)
```

---

## Notes

- **Inventory updates**: Within 48 hours of enabling, then periodically
- **New metadata keys**: Automatically appear in the map (no schema changes needed)
- **Query performance**: Map queries are efficient in Athena with Iceberg tables
- **Case sensitivity**: Metadata keys and values are case-sensitive

## Current Status

- ✅ Glue table configured with `user_metadata` column
- ✅ Athena queries working
- ⏳ Waiting for initial inventory population (created: 2026-01-15 19:05 UTC)
- 📍 Expected data: Within 48 hours

---

**Test file uploaded**: `test-metadata-example.txt` with metadata:
- category: documents
- environment: production
- owner: john-doe
- priority: high

This will appear in the inventory once it populates!
