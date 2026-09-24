# ══════════════════════════════════════════════════════════════════════════════
# OUTPUTS
# Printed after terraform apply
# Useful values you need to configure your application
# ══════════════════════════════════════════════════════════════════════════════

output "ec2_public_ip" {
  description = "Static Elastic IP of the EC2 instance"
  value       = aws_eip.server.public_ip
}
output "rds_endpoint" {
  description = "RDS PostgreSQL connection endpoint"
  value       = aws_db_instance.postgres.endpoint
}

output "s3_bucket_name" {
  description = "S3 bucket name for resume storage"
  value       = aws_s3_bucket.resumes.bucket
}

output "ecr_backend_url" {
  description = "ECR URL for backend Docker image"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_url" {
  description = "ECR URL for frontend Docker image"
  value       = aws_ecr_repository.frontend.repository_url
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i ~/.ssh/resume-reviewer-key.pem ubuntu@${aws_eip.server.public_ip}"
}
