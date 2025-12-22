variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name for tagging"
  type        = string
  default     = "pana"
}

variable "supabase_db_url" {
  description = "Supabase database connection URL (postgres://...)"
  type        = string
  sensitive   = true
}

variable "alert_email" {
  description = "Email address for backup alerts"
  type        = string
}

variable "backup_retention_days" {
  description = "Number of days to retain backups"
  type        = number
  default     = 30
}

variable "backup_schedule" {
  description = "CloudWatch Events schedule expression for backups"
  type        = string
  default     = "rate(7 days)" # Weekly backups
}
