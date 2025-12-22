output "backup_bucket_name" {
  description = "Name of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.id
}

output "backup_bucket_arn" {
  description = "ARN of the S3 bucket for backups"
  value       = aws_s3_bucket.backups.arn
}

output "lambda_function_name" {
  description = "Name of the backup Lambda function"
  value       = aws_lambda_function.backup.function_name
}

output "lambda_function_arn" {
  description = "ARN of the backup Lambda function"
  value       = aws_lambda_function.backup.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for backup alerts"
  value       = aws_sns_topic.backup_alerts.arn
}

output "backup_schedule" {
  description = "CloudWatch Events schedule for backups"
  value       = aws_cloudwatch_event_rule.backup_schedule.schedule_expression
}
