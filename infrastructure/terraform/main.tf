# ══════════════════════════════════════════════════════════════════════════════
# PROVIDER
# ══════════════════════════════════════════════════════════════════════════════

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
      # ~> 5.0 means: use 5.x but not 6.0
      # Prevents breaking changes from major version upgrades
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

# ══════════════════════════════════════════════════════════════════════════════
# LOCALS
# Helper values computed from variables
# Use locals to avoid repeating the same expression
# ══════════════════════════════════════════════════════════════════════════════

locals {
  # Common tags applied to every resource
  # Makes it easy to find all resources for this project
  # and track costs by project/environment
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# NETWORKING
# ══════════════════════════════════════════════════════════════════════════════

# ── VPC ───────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  # enable_dns_hostnames = true is required for RDS
  # so instances can resolve RDS endpoint by hostname
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-vpc"
    # merge() combines two maps
    # local.common_tags + Name tag
  })
}

# ── Internet Gateway ──────────────────────────────────────────────────────────
# Allows resources in public subnet to reach the internet
# Without this: EC2 cannot download Docker, cannot reach ECR
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  # Reference another resource:
  # resource_type.local_name.attribute
  # aws_vpc.main.id = the ID of the VPC we just created above

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-igw"
  })
}

# ── Public Subnet ─────────────────────────────────────────────────────────────
# EC2 lives here — needs internet access
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone_1
  map_public_ip_on_launch = true
  # map_public_ip_on_launch = true means:
  # every EC2 launched here gets a public IP automatically

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-public-subnet"
    Type = "public"
  })
}

# ── Private Subnet 1 ──────────────────────────────────────────────────────────
# RDS lives here — no internet access needed or wanted
resource "aws_subnet" "private_1" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_1
  availability_zone = var.availability_zone_1

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-private-subnet-1"
    Type = "private"
  })
}

# ── Private Subnet 2 ──────────────────────────────────────────────────────────
# RDS requires subnets in 2 AZs minimum
resource "aws_subnet" "private_2" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr_2
  availability_zone = var.availability_zone_2

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-private-subnet-2"
    Type = "private"
  })
}

# ── Route Table ───────────────────────────────────────────────────────────────
# Tells public subnet: send internet traffic to internet gateway
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"          # all traffic
    gateway_id = aws_internet_gateway.main.id  # goes to internet gateway
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-public-rt"
  })
}

# ── Route Table Association ───────────────────────────────────────────────────
# Links the route table to the public subnet
# Without this: route table exists but is not used
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ══════════════════════════════════════════════════════════════════════════════
# SECURITY GROUPS
# ══════════════════════════════════════════════════════════════════════════════

# ── EC2 Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Security group for Resume Reviewer EC2"
  vpc_id      = aws_vpc.main.id

  # Inbound rules
  ingress {
    description = "SSH from anywhere (restrict to your IP in production)"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    # Note: for learning we allow all IPs
    # In production: use your specific IP
    # cidr_blocks = ["YOUR_IP/32"]
  }

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Outbound rules
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"        # -1 means ALL protocols
    cidr_blocks = ["0.0.0.0/0"]
  }
  # EC2 needs outbound to:
  # - Pull Docker images from ECR
  # - Call Gemini API
  # - Send responses to clients

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-ec2-sg"
  })
}

# ── RDS Security Group ────────────────────────────────────────────────────────
resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Security group for Resume Reviewer RDS"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2 only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
    # security_groups = [ec2_sg_id] means:
    # ONLY resources with the EC2 security group
    # can reach RDS on port 5432
    # Much more secure than cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-rds-sg"
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# EC2
# ══════════════════════════════════════════════════════════════════════════════

# ── Key Pair ──────────────────────────────────────────────────────────────────
# We reference the existing key pair we already created
# We do NOT create a new one (private key would be lost)
data "aws_key_pair" "main" {
  key_name   = var.key_pair_name
  # file() reads a local file
  # We need to generate the public key from our .pem file
  # See instructions below
}

# ── EC2 Instance ──────────────────────────────────────────────────────────────
resource "aws_instance" "server" {
  ami                    = var.ec2_ami
  instance_type          = var.ec2_instance_type
  key_name               = data.aws_key_pair.main.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]

  user_data = <<-EOF
    #!/bin/bash
    set -e

    # ── System update ────────────────────────────────────────────────────────
    apt-get update -y

    # ── Install Docker ───────────────────────────────────────────────────────
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker ubuntu
    systemctl enable docker
    systemctl start docker

    # ── Install Docker Compose plugin ────────────────────────────────────────
    apt-get install -y docker-compose-plugin

    # ── Install AWS CLI ──────────────────────────────────────────────────────
    apt-get install -y unzip curl
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf awscliv2.zip aws/

    # ── Configure AWS credentials ────────────────────────────────────────────
    mkdir -p /home/ubuntu/.aws
    cat > /home/ubuntu/.aws/credentials << 'AWSEOF'
    [default]
    aws_access_key_id = ${var.aws_access_key_id}
    aws_secret_access_key = ${var.aws_secret_access_key}
    AWSEOF

    cat > /home/ubuntu/.aws/config << 'AWSEOF'
    [default]
    region = ${var.aws_region}
    output = json
    AWSEOF

    chown -R ubuntu:ubuntu /home/ubuntu/.aws
    chmod 600 /home/ubuntu/.aws/credentials

    # ── Create app directory ─────────────────────────────────────────────────
    mkdir -p /home/ubuntu/app/nginx
    chown -R ubuntu:ubuntu /home/ubuntu/app

    # ── Create nginx.conf ────────────────────────────────────────────────────
    cat > /home/ubuntu/app/nginx/nginx.conf << 'NGINXEOF'
    events {
        worker_connections 1024;
    }

    http {
        upstream backend {
            server backend:8000;
        }

        upstream frontend {
            server frontend:80;
        }

        server {
            listen 80;
            server_name localhost;

            location ~ /\. {
                deny all;
                return 404;
            }

            location ~* \.(env|git|sql|log)$ {
                deny all;
                return 404;
            }

            location /api/ {
                proxy_pass         http://backend;
                proxy_http_version 1.1;
                proxy_set_header   Host              $host;
                proxy_set_header   X-Real-IP         $remote_addr;
                proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
                proxy_set_header   Connection        "";
                proxy_read_timeout 60s;
            }

            location /health {
                proxy_pass http://backend;
            }

            location / {
                proxy_pass         http://frontend;
                proxy_http_version 1.1;
                proxy_set_header   Host              $host;
                proxy_set_header   X-Real-IP         $remote_addr;
            }
        }
    }
    NGINXEOF

    # ── Create .env.production ───────────────────────────────────────────────
    cat > /home/ubuntu/app/.env.production << 'ENVEOF'
    DATABASE_URL=postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.endpoint}/resume_db?sslmode=require
    SECRET_KEY=${var.secret_key}
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=30
    AWS_ACCESS_KEY_ID=${var.aws_access_key_id}
    AWS_SECRET_ACCESS_KEY=${var.aws_secret_access_key}
    AWS_REGION=${var.aws_region}
    S3_BUCKET_NAME=${var.s3_bucket_name}
    GEMINI_API_KEY=${var.gemini_api_key}
    GEMINI_MODEL=${var.gemini_model}
    APP_ENV=production
    ENVEOF

    # ── Create docker-compose.prod.yml ───────────────────────────────────────
    cat > /home/ubuntu/app/docker-compose.prod.yml << 'COMPOSEEOF'
    services:
      backend:
        image: ${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/resume-reviewer/backend:latest
        container_name: resume_backend
        env_file:
          - .env.production
        restart: unless-stopped
        networks:
          - resume-network

      frontend:
        image: ${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/resume-reviewer/frontend:latest
        container_name: resume_frontend
        restart: unless-stopped
        networks:
          - resume-network

      nginx:
        image: nginx:alpine
        container_name: resume_nginx
        ports:
          - "80:80"
        volumes:
          - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
        depends_on:
          - backend
          - frontend
        restart: unless-stopped
        networks:
          - resume-network

    networks:
      resume-network:
        driver: bridge
    COMPOSEEOF

    # ── Login to ECR and deploy ──────────────────────────────────────────────
    # Wait for Docker to be fully ready
    sleep 10

    # Login to ECR
    /usr/local/bin/aws ecr get-login-password --region ${var.aws_region} | \
      docker login \
      --username AWS \
      --password-stdin \
      ${var.aws_account_id}.dkr.ecr.${var.aws_region}.amazonaws.com

    # Pull images
    cd /home/ubuntu/app
    docker compose -f docker-compose.prod.yml pull

    # Start containers
    docker compose -f docker-compose.prod.yml up -d

    # Set ownership
    chown -R ubuntu:ubuntu /home/ubuntu/app
  EOF

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-server"
  })
  depends_on = [aws_db_instance.postgres]
}
# ── Elastic IP ────────────────────────────────────────────────────────────────
# Static public IP that never changes
# Even after terraform destroy + apply
# The EIP stays the same (until you release it)
resource "aws_eip" "server" {
  domain   = "vpc"
  instance = aws_instance.server.id

  # depends_on ensures internet gateway exists
  # before we try to create the EIP
  depends_on = [aws_internet_gateway.main]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-eip"
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# RDS POSTGRESQL
# ══════════════════════════════════════════════════════════════════════════════

# ── DB Subnet Group ───────────────────────────────────────────────────────────
# Tells RDS which subnets it can use
# Must span at least 2 AZs
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = [
    aws_subnet.private_1.id,
    aws_subnet.private_2.id
  ]

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-db-subnet-group"
  })
}
# ── RDS Instance ──────────────────────────────────────────────────────────────
resource "aws_db_instance" "postgres" {
  identifier        = "${var.project_name}-db-tf"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = var.db_instance_class
  allocated_storage = 20

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible     = false
  multi_az                = false
  skip_final_snapshot     = true
  backup_retention_period = 0

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-postgres"
  })
}

# ══════════════════════════════════════════════════════════════════════════════
# S3
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "resumes" {
  bucket = var.s3_bucket_name

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-resumes"
  })
}

# Block all public access to S3
resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Enable versioning
resource "aws_s3_bucket_versioning" "resumes" {
  bucket = aws_s3_bucket.resumes.id

  versioning_configuration {
    status = "Enabled"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# ECR REPOSITORIES
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}/backend"
  image_tag_mutability = "MUTABLE"
  # MUTABLE = can overwrite the :latest tag
  # IMMUTABLE = each tag can only be pushed once
  # MUTABLE is fine for our setup

  image_scanning_configuration {
    scan_on_push = true
    # Automatically scans images for CVEs when pushed
    # Free security scanning
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-backend-ecr"
  })
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}/frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, {
    Name = "${var.project_name}-frontend-ecr"
  })
}
