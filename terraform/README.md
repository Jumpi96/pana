# Pana Database Backup Infrastructure

This Terraform configuration sets up automated weekly backups of the Supabase PostgreSQL database to AWS S3.

## Architecture

- **S3 Bucket**: Stores database backups with 30-day retention
- **Lambda Function**: Python function that dumps the database and uploads to S3
- **CloudWatch Events**: Triggers the Lambda function weekly
- **SNS**: Sends email alerts on backup failures
- **CloudWatch Alarms**: Monitors Lambda errors and throttles

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **AWS CLI** configured with credentials
4. **Python 3.11** and **pip** installed (for building Lambda package)
5. **Supabase database URL** (Session pooler for IPv4 compatibility)

## Setup

### 1. Create S3 Backend Bucket

First, create the S3 bucket for Terraform state (one-time setup):

```bash
aws s3 mb s3://pana-terraform-state --region us-east-1
aws s3api put-bucket-versioning \
  --bucket pana-terraform-state \
  --versioning-configuration Status=Enabled
```

### 2. Configure Variables

Create a `terraform.tfvars` file (never commit this!):

```hcl
supabase_db_url = "postgres://postgres.xxxxx:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
alert_email     = "your-email@example.com"
aws_region      = "us-east-1"
```

Or use environment variables:

```bash
export TF_VAR_supabase_db_url="postgres://..."
export TF_VAR_alert_email="your-email@example.com"
```

### 3. Get Supabase Database URL

To get the pooler database URL (required for IPv4 from Lambda):

1. Go to Supabase Dashboard → Settings → Database
2. Copy the **Session pooler** connection string (port 6543)
   - Important: Use **Session mode**, NOT Transaction mode
   - Session mode supports the `COPY` commands needed for backups
3. Format: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

**Note**: Session pooler (port 6543) is required because:
- Lambda functions use IPv4 addresses
- Direct connection requires IPv6 or IP whitelisting
- Session pooler supports all PostgreSQL commands needed for backups

### 4. Initialize and Apply

```bash
cd terraform

# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 5. Confirm SNS Subscription

After applying, check your email for an SNS subscription confirmation and click the link to activate alerts.

## Testing

To manually trigger a backup:

```bash
aws lambda invoke \
  --function-name pana_db_backup \
  --payload '{}' \
  response.json

cat response.json
```

Check the S3 bucket for the backup file:

```bash
aws s3 ls s3://pana-db-backups/backups/
```

## Backup Schedule

- **Default**: Weekly (every 7 days)
- **Retention**: 30 days
- **Location**: `s3://pana-db-backups/backups/backup_YYYYMMDD_HHMMSS.sql`

To change the schedule, modify `backup_schedule` in `terraform.tfvars`:

```hcl
backup_schedule = "rate(1 day)"  # Daily
backup_schedule = "cron(0 2 * * ? *)"  # 2 AM UTC daily
```

## Monitoring

- **CloudWatch Logs**: `/aws/lambda/pana_db_backup`
- **CloudWatch Alarms**: Trigger on Lambda errors or throttles
- **SNS Alerts**: Email notifications on failures

## Cost Estimate

- **S3 Storage**: ~$0.023/GB/month (standard storage)
- **Lambda**: Free tier covers weekly backups
- **CloudWatch**: Minimal (logs + alarms)
- **Estimated monthly cost**: < $1 for typical database size

## Restore from Backup

To restore a backup:

```bash
# Download backup
aws s3 cp s3://pana-db-backups/backups/backup_20240101_120000.sql ./restore.sql

# Restore to Supabase (use session pooler URL)
psql "postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres" < restore.sql
```

**Warning**: This will overwrite existing data. Test in a staging environment first!

**Note**: If you have IPv6 access, you can also use the direct connection URL (port 5432) for potentially faster restore.

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Troubleshooting

### Lambda timeout

If backups are taking too long (> 5 minutes), increase the timeout in `lambda.tf`:

```hcl
timeout = 600  # 10 minutes
```

### Out of memory

If Lambda runs out of memory, increase in `lambda.tf`:

```hcl
memory_size = 1024  # 1GB
```

### Connection issues

- Ensure you're using the **Session pooler URL** (port 6543), not the Transaction pooler or Direct connection
- Verify the database password is correct
- Confirm the pooler URL format: `postgres://...@aws-0-[region].pooler.supabase.com:6543/postgres`
- If you see "operation not supported" errors, ensure you're using Session mode (6543), not Transaction mode

## Security Notes

- Database credentials are stored as encrypted Lambda environment variables
- S3 bucket has encryption at rest enabled
- Public access to S3 bucket is blocked
- Follow principle of least privilege for IAM roles

## Maintenance

- Backups are automatically cleaned up after 30 days (S3 lifecycle policy)
- Monitor CloudWatch alarms for failures
- Periodically test restore process
- Review AWS costs monthly
