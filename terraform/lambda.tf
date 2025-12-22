# IAM Role for Lambda
resource "aws_iam_role" "backup_lambda" {
  name = "${var.project_name}_db_backup_lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for S3 access
resource "aws_iam_role_policy" "backup_lambda_s3" {
  name = "${var.project_name}_backup_s3_policy"
  role = aws_iam_role.backup_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.backups.arn,
          "${aws_s3_bucket.backups.arn}/*"
        ]
      }
    ]
  })
}

# Attach AWS managed policy for Lambda basic execution
resource "aws_iam_role_policy_attachment" "backup_lambda_logs" {
  role       = aws_iam_role.backup_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Build Lambda package with dependencies
resource "null_resource" "build_backup_lambda" {
  triggers = {
    requirements = filemd5("${path.module}/lambdas/backup/requirements.txt")
    lambda_code  = filemd5("${path.module}/lambdas/backup/lambda_function.py")
  }

  provisioner "local-exec" {
    command = <<EOF
      set -e
      cd ${path.module}/lambdas/backup
      rm -rf package package.zip
      mkdir -p package
      python3 -m pip install -r requirements.txt -t package/ --platform manylinux2014_x86_64 --only-binary=:all: --python-version 3.11
      cp lambda_function.py package/
      cd package
      zip -r ../package.zip . -x "*.pyc" -x "__pycache__/*"
    EOF
  }

  provisioner "local-exec" {
    when    = destroy
    command = "rm -f ${path.module}/lambdas/backup/package.zip"
  }
}

# Lambda Function
resource "aws_lambda_function" "backup" {
  filename         = "${path.module}/lambdas/backup/package.zip"
  function_name    = "${var.project_name}_db_backup"
  role            = aws_iam_role.backup_lambda.arn
  handler         = "lambda_function.lambda_handler"
  source_code_hash = null_resource.build_backup_lambda.id
  runtime         = "python3.11"
  timeout         = 300
  memory_size     = 512

  environment {
    variables = {
      SUPABASE_DB_URL = var.supabase_db_url
      BACKUP_BUCKET   = aws_s3_bucket.backups.id
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.backup_lambda_logs,
    aws_iam_role_policy.backup_lambda_s3,
    null_resource.build_backup_lambda
  ]
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "backup_lambda" {
  name              = "/aws/lambda/${aws_lambda_function.backup.function_name}"
  retention_in_days = 14
}
