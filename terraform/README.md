# S3 Metadata POC - Terraform Configuration

This directory contains Terraform/OpenTofu configuration for provisioning the AWS S3 infrastructure for the metadata proof-of-concept.

## What Gets Created

- **S3 Bucket**: `jeff-meta-poc` in `us-west-2` region
- **Versioning**: Enabled on the bucket
- **CORS Configuration**: Configured for local development and production origins
- **IAM User**: `jeff-meta-poc-webapp-user` with programmatic access
- **IAM Policy**: Grants CRUD permissions on the S3 bucket
- **Access Keys**: Generated for the IAM user (output as sensitive values)

## Prerequisites

- [OpenTofu](https://opentofu.org/) >= 1.6.0 or [Terraform](https://www.terraform.io/) >= 1.6.0
- AWS Provider version ~> 6.0
- AWS CLI configured with appropriate credentials
- AWS account with permissions to create S3 buckets and IAM resources

## Usage

### Initialize Terraform

```bash
cd terraform
terraform init
```

### Review the Plan

```bash
terraform plan
```

### Apply the Configuration

```bash
terraform apply
```

### View Outputs

After applying, view the important outputs:

```bash
# View all outputs
terraform output

# View sensitive outputs (access keys)
terraform output iam_access_key_id
terraform output iam_secret_access_key
```

### Destroy Resources

When you're done with the POC:

```bash
terraform destroy
```

## Configuration Files

- `versions.tf`: Provider version constraints and AWS provider configuration
- `main.tf`: Main resource definitions (S3 bucket, IAM user, policies)
- `variables.tf`: Input variable definitions with defaults
- `terraform.tfvars`: Variable values (can be customized)
- `outputs.tf`: Output definitions for important resource attributes

## Security Notes

- The IAM access keys are marked as sensitive outputs
- Store the access keys securely (use environment variables or AWS Secrets Manager in production)
- The bucket has public access blocked by default
- Only the created IAM user has access to perform CRUD operations

## Customization

To customize the configuration, edit `terraform.tfvars`:

- `aws_region`: AWS region for resources
- `bucket_name`: S3 bucket name (must be globally unique)
- `environment`: Environment tag value
- `cors_allowed_origins`: List of allowed CORS origins

## Using the Access Keys in Your Application

After applying, you'll need to configure your web application with the access keys:

```bash
# Get the access key ID
terraform output iam_access_key_id

# Get the secret access key
terraform output iam_secret_access_key
```

Use these credentials in your application's AWS SDK configuration.
