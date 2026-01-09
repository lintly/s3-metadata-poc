# S3 Metadata POC

A proof-of-concept application demonstrating AWS S3 with metadata tracking, AWS Glue cataloging, and Amazon Athena querying capabilities, built with React 19 + TypeScript + Vite.

## Overview

This project showcases how to:
- Store files in AWS S3 with custom metadata and tags
- Automatically catalog metadata using S3 Inventory and AWS Glue
- Query metadata using Amazon Athena
- Build a React web interface for file management

## Architecture

### Infrastructure Components

- **Main S3 Bucket**: Standard S3 bucket with versioning, CORS, and metadata tracking
- **S3 Inventory**: Daily Parquet-formatted inventory with comprehensive metadata fields
- **Inventory Destination Bucket**: Stores inventory data with 7-day expiration
- **AWS Glue Database**: Catalogs metadata schema from S3 inventory
- **AWS Glue Crawler**: Automatically discovers and updates metadata schema
- **Amazon Athena**: Provides SQL query interface for metadata analysis
- **IAM Roles**: Service roles for secure access control

> **Note**: This implementation uses standard S3 with S3 Inventory instead of S3 Table Buckets, as S3 Tables are not yet supported in Terraform AWS provider v5.x. This approach provides production-ready metadata tracking capabilities.

### Frontend Stack

- **React 19**: Latest React with improved rendering and hooks
- **TypeScript 5.9**: Strict type checking enabled
- **Vite 7**: Fast development server with HMR
- **ESLint**: Code quality with React Hooks and TypeScript rules

## Quick Start

### 1. Deploy Infrastructure

```bash
# Install OpenTofu (if not already installed)
brew install opentofu  # macOS

# Configure AWS credentials
aws configure

# Deploy infrastructure
cd terraform
tofu init
tofu apply
```

For detailed deployment instructions, see [terraform/QUICKSTART.md](terraform/QUICKSTART.md).

### 2. Run Frontend Application

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at http://localhost:5173

### 3. Upload Files with Metadata

```bash
# Get bucket name from Terraform outputs
cd terraform
BUCKET=$(tofu output -raw main_bucket_name)

# Upload a file with metadata headers
aws s3api put-object \
  --bucket $BUCKET \
  --key example.txt \
  --body example.txt \
  --metadata project=poc,owner=jeff,environment=dev

# Or upload with tags (recommended for querying)
aws s3api put-object \
  --bucket $BUCKET \
  --key example.txt \
  --body example.txt \
  --tagging "project=poc&owner=jeff&environment=dev"
```

### 4. Query Metadata with Athena

```bash
# Run Glue Crawler first
CRAWLER=$(tofu output -raw glue_crawler_name)
aws glue start-crawler --name $CRAWLER

# Wait for crawler to complete, then query with Athena
cd terraform
tofu output athena_console_url  # Open in browser
```

## Project Structure

```
s3-metadata-poc/
├── src/                    # React application source
│   ├── main.tsx           # Application entry point
│   ├── App.tsx            # Root component
│   └── ...
├── terraform/             # Infrastructure as Code
│   ├── main.tf           # S3 Table Bucket resources
│   ├── glue.tf           # AWS Glue configuration
│   ├── athena.tf         # Athena workgroup & queries
│   ├── iam.tf            # IAM roles and policies
│   ├── README.md         # Detailed infrastructure docs
│   └── QUICKSTART.md     # Quick deployment guide
├── public/               # Static assets
├── package.json          # Node dependencies
└── vite.config.ts       # Vite configuration
```

## Development

### Available Commands

```bash
# Frontend
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build
pnpm lint             # Run ESLint

# Infrastructure
cd terraform
tofu plan             # Preview infrastructure changes
tofu apply            # Deploy infrastructure
tofu destroy          # Remove all resources
tofu output           # Show deployment outputs
```

## Infrastructure Details

### S3 Bucket Configuration

- **Main Bucket Name**: `jeff-meta-poc`
- **Inventory Bucket**: `jeff-meta-poc-inventory`
- **Region**: `us-west-2`
- **Versioning**: Enabled on all buckets
- **Inventory Format**: Parquet (optimized for Athena queries)
- **Inventory Schedule**: Daily
- **Inventory Expiration**: 7 days
- **CORS Origins**:
  - `http://localhost:5173` (development)
  - `https://s3upload.d1cusxywbulok7.amplifyapp.com` (production)

### AWS Glue

- **Database**: `jeff_meta_poc_metadata_db`
- **Crawler Schedule**: Daily at 2 AM UTC (configurable)
- **Schema**: Automatically discovers user metadata fields

### Amazon Athena

- **Workgroup**: `jeff-meta-poc-workgroup`
- **Query Results**: Stored in `jeff-meta-poc-athena-results` bucket
- **Pre-configured Queries**:
  - `get_user_metadata`: Retrieve all objects with metadata
  - `search_by_metadata_key`: Find objects by specific metadata key
  - `metadata_statistics`: Get metadata usage statistics

## Example Athena Queries

```sql
-- Get all objects with specific metadata
SELECT key, size, last_modified_date, user_metadata
FROM user_metadata
WHERE user_metadata['project'] = 'poc';

-- Count objects by owner
SELECT
  user_metadata['owner'] as owner,
  COUNT(*) as file_count,
  SUM(size) as total_bytes
FROM user_metadata
GROUP BY user_metadata['owner'];

-- Find recent uploads
SELECT key, last_modified_date, user_metadata
FROM user_metadata
WHERE last_modified_date > CURRENT_TIMESTAMP - INTERVAL '7' DAY
ORDER BY last_modified_date DESC;
```

## Security Considerations

⚠️ **WARNING**: The current configuration uses **public read/write access** for POC purposes only.

**For production deployment:**
1. Remove public bucket policies
2. Implement IAM-based authentication
3. Use presigned URLs for uploads/downloads
4. Enable S3 bucket encryption (AES-256 or KMS)
5. Restrict CORS to specific domains
6. Enable AWS CloudTrail for audit logging
7. Implement least-privilege IAM policies

## Cost Estimation

Approximate monthly costs for moderate usage (us-west-2):
- S3 Table Bucket storage: ~$0.023/GB
- S3 standard storage: ~$0.023/GB
- Glue Crawler: ~$0.44/DPU-hour (daily runs)
- Athena: ~$5/TB scanned
- Data transfer: $0.09/GB (outbound)

## Troubleshooting

### Glue Crawler Not Finding Data
- Verify objects are uploaded to the inventory bucket
- Wait 24-48 hours for initial inventory generation
- Check CloudWatch logs for crawler errors

### CORS Errors
- Verify origin is in the allowed origins list
- Check browser console for specific errors
- Ensure public access block settings allow CORS

### Athena Query Errors
- Ensure Glue crawler has run successfully
- Verify Glue table schema exists
- Check Athena query results bucket permissions

## Documentation

- [Infrastructure README](terraform/README.md) - Detailed Terraform documentation
- [Quick Start Guide](terraform/QUICKSTART.md) - Fast deployment guide
- [CLAUDE.md](CLAUDE.md) - Claude Code development guide

## Resources

- [AWS S3 Table Buckets](https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-tables-buckets.html)
- [AWS Glue Documentation](https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html)
- [Amazon Athena Guide](https://docs.aws.amazon.com/athena/latest/ug/what-is.html)
- [React 19 Documentation](https://react.dev)
- [Vite Documentation](https://vite.dev)
- [OpenTofu Documentation](https://opentofu.org/docs/)

## License

This is a proof-of-concept project for demonstration purposes.
