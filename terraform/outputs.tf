output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.metadata_poc.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.metadata_poc.arn
}

output "bucket_region" {
  description = "AWS region of the S3 bucket"
  value       = aws_s3_bucket.metadata_poc.region
}

output "iam_user_name" {
  description = "Name of the IAM user for web application"
  value       = aws_iam_user.s3_webapp_user.name
}

output "iam_access_key_id" {
  description = "Access key ID for the IAM user"
  value       = aws_iam_access_key.s3_webapp_user.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "Secret access key for the IAM user"
  value       = aws_iam_access_key.s3_webapp_user.secret
  sensitive   = true
}

output "bucket_endpoint" {
  description = "S3 bucket endpoint URL"
  value       = "https://${aws_s3_bucket.metadata_poc.bucket}.s3.${aws_s3_bucket.metadata_poc.region}.amazonaws.com"
}

output "glue_database_name" {
  description = "Name of the Glue database"
  value       = aws_glue_catalog_database.metadata_db.name
}

output "glue_table_name" {
  description = "Name of the Glue inventory table"
  value       = aws_glue_catalog_table.inventory_metadata.name
}

output "athena_workgroup_name" {
  description = "Name of the Athena workgroup"
  value       = aws_athena_workgroup.metadata_workgroup.name
}

output "athena_results_bucket" {
  description = "S3 bucket for Athena query results"
  value       = aws_s3_bucket.athena_results.bucket
}

output "inventory_table_location" {
  description = "Warehouse location of the S3 Tables inventory"
  value       = data.external.inventory_table_location.result.warehouse_location
}
