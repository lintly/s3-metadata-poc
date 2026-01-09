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
    expose_headers  = ["ETag"]
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
