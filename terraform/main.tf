# S3 Bucket
resource "aws_s3_bucket" "metadata_poc" {
  bucket        = var.bucket_name
  force_destroy = true

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
    expose_headers  = [
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
      },
      {
        Effect = "Allow"
        Action = [
          "athena:StartQueryExecution",
          "athena:GetQueryExecution",
          "athena:GetQueryResults",
          "athena:StopQueryExecution"
        ]
        Resource = [
          aws_athena_workgroup.metadata_workgroup.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "glue:GetDatabase",
          "glue:GetTable",
          "glue:GetPartitions"
        ]
        Resource = [
          "arn:aws:glue:${var.aws_region}:*:catalog",
          "arn:aws:glue:${var.aws_region}:*:database/${aws_glue_catalog_database.metadata_db.name}",
          "arn:aws:glue:${var.aws_region}:*:table/${aws_glue_catalog_database.metadata_db.name}/${aws_glue_catalog_table.inventory_metadata.name}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.athena_results.arn,
          "${aws_s3_bucket.athena_results.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::aws-s3-metadata-table-*",
          "arn:aws:s3:::aws-s3-metadata-table-*/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "arn:aws:s3:${var.aws_region}:*:accesspoint/*",
          "arn:aws:s3:${var.aws_region}:*:accesspoint/*/object/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetObjectVersion"
        ]
        Resource = [
          "arn:aws:s3:::*--table-s3",
          "arn:aws:s3:::*--table-s3/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3tables:GetTableBucket",
          "s3tables:GetTable",
          "s3tables:GetTableMetadataLocation",
          "s3tables:ListTables",
          "s3tables:GetNamespace",
          "s3tables:ListNamespaces",
          "s3tables:GetTablePolicy",
          "s3tables:GetTableData"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "lakeformation:GetDataAccess"
        ]
        Resource = "*"
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
  bucket        = "${var.bucket_name}-athena-results"
  force_destroy = true

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
  name        = "jeff-poc"
  description = "Glue database for S3 metadata tables"
}

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

# Data source to get S3 Tables inventory warehouse location
data "external" "inventory_table_location" {
  program = ["bash", "-c", <<-EOF
    RESULT=$(aws s3tables get-table-metadata-location \
      --table-bucket-arn "arn:aws:s3tables:${var.aws_region}:$(aws sts get-caller-identity --query Account --output text):bucket/aws-s3" \
      --namespace "b_${var.bucket_name}" \
      --name "inventory" \
      --region ${var.aws_region} \
      --output json)
    echo $RESULT | jq '{warehouse_location: .warehouseLocation}'
  EOF
  ]

  depends_on = [aws_s3_bucket_metadata_configuration.upload]
}

# AWS Glue Catalog Table for Inventory
resource "aws_glue_catalog_table" "inventory_metadata" {
  name          = "inventory_metadata"
  database_name = aws_glue_catalog_database.metadata_db.name
  description   = "S3 bucket inventory metadata table"

  table_type = "EXTERNAL_TABLE"

  parameters = {
    "table_type"        = "ICEBERG"
    "EXTERNAL"          = "TRUE"
    "iceberg.catalog"   = "glue"
  }

  storage_descriptor {
    location      = data.external.inventory_table_location.result.warehouse_location
    input_format  = "org.apache.iceberg.mr.hive.HiveIcebergInputFormat"
    output_format = "org.apache.iceberg.mr.hive.HiveIcebergOutputFormat"

    ser_de_info {
      name                  = "icebergSerde"
      serialization_library = "org.apache.iceberg.mr.hive.HiveIcebergSerDe"
    }

    columns {
      name = "bucket"
      type = "string"
    }

    columns {
      name = "key"
      type = "string"
    }

    columns {
      name = "version_id"
      type = "string"
    }

    columns {
      name = "is_latest"
      type = "boolean"
    }

    columns {
      name = "is_delete_marker"
      type = "boolean"
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
      name = "size"
      type = "bigint"
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
      name = "bucket_key_enabled"
      type = "boolean"
    }

    columns {
      name = "checksum_algorithm"
      type = "string"
    }

    columns {
      name = "owner"
      type = "string"
    }

    columns {
      name = "user_metadata"
      type = "string"
      comment = "JSON string containing user-defined metadata"
    }
  }
}

# Athena Workgroup
resource "aws_athena_workgroup" "metadata_workgroup" {
  name        = "jeff-poc-metadata-workgroup"
  description = "Workgroup for querying S3 metadata tables"

  configuration {
    result_configuration {
      output_location = "s3://${aws_s3_bucket.athena_results.bucket}/query-results/"
    }

    enforce_workgroup_configuration    = true
    publish_cloudwatch_metrics_enabled = true
  }

  tags = {
    Name = "jeff-poc-metadata-workgroup"
  }
}

