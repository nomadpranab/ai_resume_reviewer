# ── AWS Configuration ─────────────────────────────────────────────────────────

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  # no default — must be provided in tfvars
}

# ── Project ───────────────────────────────────────────────────────────────────

variable "project_name" {
  description = "Project name used for naming all resources"
  type        = string
  default     = "resume-reviewer"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# ── Networking ────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR block for public subnet"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr_1" {
  description = "CIDR block for first private subnet (RDS)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "private_subnet_cidr_2" {
  description = "CIDR block for second private subnet (RDS needs 2 AZs)"
  type        = string
  default     = "10.0.3.0/24"
}

variable "availability_zone_1" {
  description = "First availability zone"
  type        = string
  default     = "us-east-1a"
}

variable "availability_zone_2" {
  description = "Second availability zone"
  type        = string
  default     = "us-east-1b"
}

# ── EC2 ───────────────────────────────────────────────────────────────────────

variable "ec2_instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.small"
}

variable "ec2_ami" {
  description = "Ubuntu 24.04 AMI ID for us-east-1"
  type        = string
  default     = "ami-0d7f022123f8ff19d"
}

variable "key_pair_name" {
  description = "Name of the EC2 key pair for SSH access"
  type        = string
  default     = "resume-reviewer-key"
}

# ── RDS ───────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "resume_db"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "admin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
  # sensitive = true means Terraform will not print
  # this value in plan or apply output
  # no default — must be provided in tfvars
}

# ── S3 ────────────────────────────────────────────────────────────────────────

variable "s3_bucket_name" {
  description = "S3 bucket name for resume storage"
  type        = string
  # no default — bucket names must be globally unique
}
