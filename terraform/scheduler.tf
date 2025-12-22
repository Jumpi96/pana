# CloudWatch Event Rule for scheduled backups
resource "aws_cloudwatch_event_rule" "backup_schedule" {
  name                = "${var.project_name}_db_backup_schedule"
  description         = "Trigger database backup Lambda function on schedule"
  schedule_expression = var.backup_schedule
}

# CloudWatch Event Target
resource "aws_cloudwatch_event_target" "backup_lambda" {
  rule      = aws_cloudwatch_event_rule.backup_schedule.name
  target_id = "BackupLambda"
  arn       = aws_lambda_function.backup.arn
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.backup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.backup_schedule.arn
}
