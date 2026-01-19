variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-west-2"
}

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
  default     = "jeff-poc-barg"
}

variable "environment" {
  description = "Environment name for resource tagging"
  type        = string
  default     = "sandbox"
}

variable "cors_allowed_origins" {
  description = "List of allowed origins for CORS configuration"
  type        = list(string)
  default = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://localhost:3000",
    "https://s3upload.d1cusxywbulok7.amplifyapp.com"
  ]
}

variable "glue_tables_refresh_trigger" {
  description = "Change this value to force Glue tables to refresh metadata locations. Use timestamp or version number."
  type        = string
  default     = "1"
}
