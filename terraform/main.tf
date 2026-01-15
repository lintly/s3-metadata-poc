# S3 Bucket
resource "aws_s3_bucket" "metadata_poc" {
  bucket = var.bucket_name

  tags = {
    Name        = var.bucket_name
    Description = "S3 bucket for metadata proof of concept"
  }
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "metadata_poc" {
  bucket = aws_s3_bucket.metadata_poc.id

  versioning_configuration {
    status = "Enabled"
  }
}

# S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "metadata_poc" {
  bucket = aws_s3_bucket.metadata_poc.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.cors_allowed_origins
    expose_headers = [
      "ETag",
      "x-amz-server-side-encryption",
      "x-amz-request-id",
      "x-amz-id-2",
      "x-amz-meta-description",
      "x-amz-meta-category",
      "x-amz-meta-environment",
      "x-amz-meta-test",
      "x-amz-meta-timestamp"
    ]
    max_age_seconds = 3000
  }
}

# S3 Bucket Metadata Configuration
resource "aws_s3_bucket_metadata_configuration" "upload" {
  bucket = aws_s3_bucket.metadata_poc.bucket

  metadata_configuration {
    inventory_table_configuration {
      configuration_state = "ENABLED"
    }

    journal_table_configuration {
      record_expiration {
        days       = 7
        expiration = "ENABLED"
      }
    }
  }
}

# S3 Bucket Public Access Block (disable to allow IAM user access)
resource "aws_s3_bucket_public_access_block" "metadata_poc" {
  bucket = aws_s3_bucket.metadata_poc.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# IAM User for Web Application
resource "aws_iam_user" "s3_webapp_user" {
  name = "${var.bucket_name}-webapp-user"

  tags = {
    Description = "IAM user for web application to access S3 bucket"
  }
}

# IAM Access Key for Web Application User
resource "aws_iam_access_key" "s3_webapp_user" {
  user = aws_iam_user.s3_webapp_user.name
}

# IAM Policy for S3 Bucket Access
resource "aws_iam_policy" "s3_webapp_policy" {
  name        = "${var.bucket_name}-webapp-policy"
  description = "Policy for web application to perform CRUD operations on S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:ListBucketVersions",
          "s3:GetObjectVersion",
          "s3:DeleteObjectVersion",
          "s3:PutObjectTagging",
          "s3:GetObjectTagging",
          "s3:DeleteObjectTagging"
        ]
        Resource = [
          aws_s3_bucket.metadata_poc.arn,
          "${aws_s3_bucket.metadata_poc.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:TagResource",
          "s3:UntagResource",
          "s3:ListTagsForResource"
        ]
        Resource = aws_s3_bucket.metadata_poc.arn
      }
    ]
  })
}

# Attach Policy to IAM User
resource "aws_iam_user_policy_attachment" "s3_webapp_user" {
  user       = aws_iam_user.s3_webapp_user.name
  policy_arn = aws_iam_policy.s3_webapp_policy.arn
}

# S3 Bucket for Athena Query Results
resource "aws_s3_bucket" "athena_results" {
  bucket = "${var.bucket_name}-athena-results"

  tags = {
    Name        = "${var.bucket_name}-athena-results"
    Description = "S3 bucket for Athena query results"
  }
}

# S3 Bucket Lifecycle for Athena Results (cleanup old queries)
resource "aws_s3_bucket_lifecycle_configuration" "athena_results" {
  bucket = aws_s3_bucket.athena_results.id

  rule {
    id     = "delete-old-queries"
    status = "Enabled"

    expiration {
      days = 7
    }
  }
}

# AWS Glue Database
resource "aws_glue_catalog_database" "metadata_db" {
  name        = "${var.bucket_name}-glue-db"
  description = "Glue database for S3 metadata tables"
}

# Lake Formation Permissions for Glue Crawler - Database access
resource "aws_lakeformation_permissions" "crawler_database" {
  principal   = aws_iam_role.glue_crawler_role.arn
  permissions = ["CREATE_TABLE", "ALTER", "DROP"]

  database {
    name = aws_glue_catalog_database.metadata_db.name
  }

  depends_on = [
    aws_glue_catalog_database.metadata_db,
    aws_iam_role.glue_crawler_role
  ]
}

# Note: Lake Formation permissions for the inventory table are handled at the
# database level via aws_lakeformation_permissions.crawler_database resource

# Data source for current AWS account ID
data "aws_caller_identity" "current" {}

# IAM Role for Glue Crawler
resource "aws_iam_role" "glue_crawler_role" {
  name = "${var.bucket_name}-glue-crawler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "glue.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.bucket_name}-glue-crawler-role"
  }
}

# IAM Policy for Glue Crawler
resource "aws_iam_policy" "glue_crawler_policy" {
  name        = "${var.bucket_name}-glue-crawler-policy"
  description = "Policy for Glue Crawler to access S3 Tables and metadata"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.metadata_poc.arn,
          "${aws_s3_bucket.metadata_poc.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3tables:GetTable",
          "s3tables:GetTableMetadataLocation",
          "s3tables:ListTables",
          "s3tables:GetTableBucket"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "glue:*"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# Attach Glue Service Policy to Crawler Role
resource "aws_iam_role_policy_attachment" "glue_service_policy" {
  role       = aws_iam_role.glue_crawler_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSGlueServiceRole"
}

# Attach Custom Crawler Policy
resource "aws_iam_role_policy_attachment" "glue_crawler_policy_attachment" {
  role       = aws_iam_role.glue_crawler_role.name
  policy_arn = aws_iam_policy.glue_crawler_policy.arn
}

# Data source to get S3 Tables inventory metadata and warehouse location
data "external" "inventory_table_location" {
  program = ["bash", "-c", <<-EOF
    RESULT=$(aws s3tables get-table-metadata-location \
      --table-bucket-arn "arn:aws:s3tables:${var.aws_region}:$(aws sts get-caller-identity --query Account --output text):bucket/aws-s3" \
      --namespace "b_${var.bucket_name}" \
      --name "inventory" \
      --region ${var.aws_region} \
      --output json)
    # Extract both warehouse location and metadata location
    WAREHOUSE=$(echo $RESULT | jq -r '.warehouseLocation')
    METADATA=$(echo $RESULT | jq -r '.metadataLocation')
    echo "{\"warehouse_location\": \"$WAREHOUSE\", \"metadata_location\": \"$METADATA\"}"
  EOF
  ]

  depends_on = [aws_s3_bucket_metadata_configuration.upload]
}

# Note: For AWS-managed S3 Tables (type=aws), we create the Glue table manually
# pointing to the metadata location instead of using a crawler. The crawler
# doesn't properly discover AWS-managed Iceberg tables in S3 Tables buckets.

# Glue Catalog Table for S3 Tables Inventory
# For AWS-managed S3 Tables, we need to use a different approach
resource "aws_glue_catalog_table" "inventory" {
  name          = "inventory"
  database_name = aws_glue_catalog_database.metadata_db.name

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "table_type"            = "ICEBERG"
    "metadata_location"     = data.external.inventory_table_location.result.metadata_location
    "EXTERNAL"              = "TRUE"
    "iceberg.catalog"       = "glue"
    "bucketing_version"     = "2"
  }

  storage_descriptor {
    location      = data.external.inventory_table_location.result.warehouse_location
    input_format  = "org.apache.iceberg.mr.hive.HiveIcebergInputFormat"
    output_format = "org.apache.iceberg.mr.hive.HiveIcebergOutputFormat"

    # Define columns from Iceberg schema
    columns {
      name = "bucket"
      type = "string"
    }
    columns {
      name = "key"
      type = "string"
    }
    columns {
      name = "sequence_number"
      type = "string"
    }
    columns {
      name = "version_id"
      type = "string"
    }
    columns {
      name = "is_delete_marker"
      type = "boolean"
    }
    columns {
      name = "size"
      type = "bigint"
    }
    columns {
      name = "last_modified_date"
      type = "timestamp"
    }
    columns {
      name = "e_tag"
      type = "string"
    }
    columns {
      name = "storage_class"
      type = "string"
    }
    columns {
      name = "is_multipart_uploaded"
      type = "boolean"
    }
    columns {
      name = "replication_status"
      type = "string"
    }
    columns {
      name = "encryption_status"
      type = "string"
    }
    columns {
      name = "object_lock_retain_until_date"
      type = "timestamp"
    }
    columns {
      name = "object_lock_mode"
      type = "string"
    }
    columns {
      name = "object_lock_legal_hold_status"
      type = "string"
    }
    columns {
      name = "intelligent_tiering_access_tier"
      type = "string"
    }
    columns {
      name = "bucket_key_status"
      type = "string"
    }
    columns {
      name = "checksum_algorithm"
      type = "string"
    }
    columns {
      name = "object_access_control_list"
      type = "string"
    }
    columns {
      name = "object_owner"
      type = "string"
    }
    columns {
      name = "user_metadata"
      type = "map<string,string>"
      comment = "User-defined metadata key-value pairs (x-amz-meta-* headers)"
    }

    ser_de_info {
      serialization_library = "org.apache.iceberg.mr.hive.HiveIcebergSerDe"
    }
  }

  depends_on = [
    aws_glue_catalog_database.metadata_db,
    aws_lakeformation_permissions.crawler_database,
    data.external.inventory_table_location
  ]
}

# Note: Crawler removed - AWS-managed S3 Tables cannot be crawled using Glue Iceberg crawler.
# The crawler fails with "Internal Service Exception" when trying to process the S3 Tables bucket.
# Instead, we manage the table definition manually via aws_glue_catalog_table.inventory above.

# Athena Workgroup
resource "aws_athena_workgroup" "metadata_workgroup" {
  name        = "${var.bucket_name}-workgroup"
  description = "Workgroup for querying S3 metadata tables"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/query-results/"
    }

    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true
  }

  tags = {
    Name = "${var.bucket_name}-metadata-workgroup"
  }
}
