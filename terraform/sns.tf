# SNS Topic for backup alerts
resource "aws_sns_topic" "backup_alerts" {
  name = "${var.project_name}_backup_alerts"

  tags = {
    Name        = "${var.project_name}_backup_alerts"
    Description = "Alerts for database backup failures"
  }
}

# SNS Topic Subscription
resource "aws_sns_topic_subscription" "backup_email" {
  topic_arn = aws_sns_topic.backup_alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# CloudWatch Alarm for Lambda errors
resource "aws_cloudwatch_metric_alarm" "backup_lambda_errors" {
  alarm_name          = "${var.project_name}_backup_lambda_errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when database backup Lambda function fails"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.backup.function_name
  }

  alarm_actions = [aws_sns_topic.backup_alerts.arn]
}

# CloudWatch Alarm for Lambda throttles
resource "aws_cloudwatch_metric_alarm" "backup_lambda_throttles" {
  alarm_name          = "${var.project_name}_backup_lambda_throttles"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Throttles"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "0"
  alarm_description   = "Alert when database backup Lambda function is throttled"
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = aws_lambda_function.backup.function_name
  }

  alarm_actions = [aws_sns_topic.backup_alerts.arn]
}
