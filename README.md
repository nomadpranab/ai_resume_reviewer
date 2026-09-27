# AI Resume Reviewer

An AI-powered resume analysis platform that provides instant ATS scores, skill gap analysis, and actionable improvement suggestions using Google Gemini.

**Live:** http://3.228.110.182

---

## What it does

Upload a PDF or DOCX resume and get:
- ATS compatibility score (0-100)
- Overall AI feedback
- Missing ATS keywords
- Skill gaps to address
- Section-by-section improvement suggestions
- Full review history to track improvement over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| Backend | FastAPI (Python 3.11) |
| AI | Google Gemini API |
| Database | PostgreSQL (Amazon RDS) |
| File Storage | Amazon S3 |
| Auth | JWT with bcrypt |
| Containers | Docker + Docker Compose |
| Proxy | Nginx |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Registry | Amazon ECR |
| Cloud | AWS (EC2, RDS, S3, ECR, VPC) |

---

## Architecture Evolution

This project was built in 3 phases. Each phase solved real problems identified in the previous one.

---

### Phase 1 — Local Development

**Goal:** Build and validate the full application stack locally before touching any cloud infrastructure.

**What was built:**
- FastAPI backend with JWT authentication and bcrypt password hashing
- PostgreSQL running in Docker container
- React + TypeScript frontend with Glassmorphism UI
- Google Gemini AI integration for resume analysis
- AWS S3 for resume file storage
- Full Docker Compose setup for local development

**Architecture:**
Developer Machine
|
|-- Frontend Vite dev server :5173
|-- Backend uvicorn :8000
|-- Database PostgreSQL Docker :5432
|-- File Storage AWS S3 (cloud)
**Request flow — user uploads a resume:**
cat > /mnt/d/new/ai-resume-reviewer/ai-resume-reviewer/README.md << 'READMEEOF'
# AI Resume Reviewer

An AI-powered resume analysis platform that provides instant ATS scores, skill gap analysis, and actionable improvement suggestions using Google Gemini.

**Live:** http://3.228.110.182

---

## What it does

Upload a PDF or DOCX resume and get:
- ATS compatibility score (0-100)
- Overall AI feedback
- Missing ATS keywords
- Skill gaps to address
- Section-by-section improvement suggestions
- Full review history to track improvement over time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion |
| Backend | FastAPI (Python 3.11) |
| AI | Google Gemini API |
| Database | PostgreSQL (Amazon RDS) |
| File Storage | Amazon S3 |
| Auth | JWT with bcrypt |
| Containers | Docker + Docker Compose |
| Proxy | Nginx |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Registry | Amazon ECR |
| Cloud | AWS (EC2, RDS, S3, ECR, VPC) |

---

## Architecture Evolution

This project was built in 3 phases. Each phase solved real problems identified in the previous one.

---

### Phase 1 — Local Development

**Goal:** Build and validate the full application stack locally before touching any cloud infrastructure.

**What was built:**
- FastAPI backend with JWT authentication and bcrypt password hashing
- PostgreSQL running in Docker container
- React + TypeScript frontend with Glassmorphism UI
- Google Gemini AI integration for resume analysis
- AWS S3 for resume file storage
- Full Docker Compose setup for local development

**Architecture:**
Developer Machine
|
|-- Frontend Vite dev server :5173
|-- Backend uvicorn :8000
|-- Database PostgreSQL Docker :5432
|-- File Storage AWS S3 (cloud)
**Request flow — user uploads a resume:**
1-User selects PDF in browser (localhost:5173)
2-React sends POST /api/resume/upload
Authorization: Bearer JWT_TOKEN
Content-Type: multipart/form-data
3-FastAPI extracts token from header
Verifies signature using SECRET_KEY
Identifies user from token payload
4-FastAPI reads file bytes into memory
5-Validates file type (PDF/DOCX) and size (max 5MB)
6-boto3 uploads bytes to S3
7-FastAPI saves metadata to PostgreSQL
filename, s3_key, user_id, uploaded_at
8-Returns { resume_id, filename } to React
9-React navigates to /processing/{resumeId}
**Request flow — AI analysis:**


1. React sends a POST request to `/api/review/{resumeId}/analyze`.

2. FastAPI verifies the JWT token.

3. FastAPI fetches the resume record from PostgreSQL.

4. FastAPI downloads the PDF from S3 using the `s3_key`.

5. PyMuPDF extracts plain text from PDF files, while python-docx is used for DOCX files.

6. The extracted text is sent to Google Gemini with a structured prompt requesting only valid JSON containing:

   * `ats_score`
   * `overall_feedback`
   * `skill_gaps`
   * `improvements`
   * `keywords_missing`
   * `strengths`

7. Gemini returns the analysis as a JSON response.

8. FastAPI parses and validates the JSON response.

9. The review is saved to the PostgreSQL `reviews` table.

10. FastAPI returns the complete analysis to React.

11. React displays the analysis in an animated ATS score dashboard.




**Problems identified in Phase 1:**
- Application only runs on developer machine
- No public access
- PostgreSQL data lost if Docker container removed
- Manual process to start 3 services every time
- No HTTPS, no domain name

---

### Phase 2 — Manual Cloud Deployment

**Goal:** Deploy to AWS. Make the application publicly accessible with proper security.

**What was added:**
- AWS EC2 (t3.small) running Docker Compose
- AWS RDS PostgreSQL in a private subnet (no internet access)
- Nginx reverse proxy as single entry point on port 80
- S3 bucket with versioning and all public access blocked
- Security groups with least-privilege rules
- Manual deployments via SSH

**Architecture:**
### Application Architecture

1. Internet traffic enters through HTTP port 80.

2. Traffic reaches the EC2 instance (`t3.small`) in the public subnet.

3. Nginx acts as the reverse proxy and routes requests internally:

   * `/api/*` → Backend container (FastAPI :8000)
   * `/*` → Frontend container (React + Nginx)
   * `/.env` → Blocked with 404
   * `/.git` → Blocked with 404

4. The Backend container (FastAPI :8000):

   * Communicates with RDS PostgreSQL through the internal VPC network.
   * Uploads files to S3.
   * Communicates with the Google Gemini API.

5. The Frontend container runs Nginx and serves the React production build.

6. RDS PostgreSQL runs in a private subnet with no direct internet access and accepts connections only from the EC2 security group.

### What Nginx Solved

**Before Nginx:**

1. Browser → React on port `5173`.
2. Browser → FastAPI on port `8000`.
3. Different origins caused CORS issues.
4. FastAPI port `8000` was directly exposed to the internet.

**After Nginx:**

1. Browser communicates only with port `80`.
2. Nginx routes requests internally based on the URL path.
3. `/api/*` → FastAPI.
4. `/*` → React.
5. Both frontend and backend share the same origin, eliminating browser CORS issues.
6. FastAPI is no longer directly reachable from the internet.

### Security Model

**Layer 1 — Nginx**

1. Blocks sensitive paths such as `/.env` and `/.git`.
2. Blocks access to `*.sql` and `*.log` files.
3. Returns `404` for blocked sensitive paths.

**Layer 2 — EC2 Security Group**

1. Port `80` → Open to `0.0.0.0/0` for public web traffic.
2. Port `443` → Open to `0.0.0.0/0` for HTTPS.
3. Port `22` → Restricted to the developer's IP address.

**Layer 3 — RDS Security Group**

1. Port `5432` → Allows connections only from the EC2 security group.
2. RDS is not directly accessible from the internet.
3. External attackers cannot connect directly to PostgreSQL even if they know the RDS endpoint.

**Layer 4 — S3**

1. Public access is completely blocked.
2. Files are accessed through presigned URLs.
3. Presigned URLs are generated only by the authenticated backend.
4. Each URL expires after 15 minutes.



**Request flow — full production path:**
1. The browser sends `POST /api/resume/upload` to the EC2 instance.

2. The request reaches the EC2 Elastic IP on port `80`.

3. The Nginx container receives the request.

4. Nginx detects that the path starts with `/api/` and forwards the request to the FastAPI backend on port `8000`.

5. The FastAPI container:

   * Validates the JWT token.
   * Reads the uploaded file from the request.
   * Uploads the file to S3.
   * Saves the resume information to RDS.
   * Returns a JSON response.

6. Nginx forwards the FastAPI response back to the browser.




**Problems identified in Phase 2:**
- EC2 public IP changes every time instance stops and starts
- All infrastructure created manually via AWS CLI
  No record of exact commands used
  Cannot recreate identically if something breaks
- Deployment requires manual SSH every time
  Build image locally, push to registry, SSH in, pull, restart
- No automated testing before deployment goes live
- If EC2 is terminated, entire manual setup must be repeated

---

### Phase 3 — Production Grade

**Goal:** Automate everything. Infrastructure as code. Zero manual steps from code to deployment.

**What was added:**
- Terraform IaC managing the entire AWS infrastructure
- Elastic IP (static IP address that never changes)
- Amazon ECR (private Docker image registry in AWS)
- GitHub Actions CI/CD pipeline
- Custom VPC with proper public and private subnets
- Docker images tagged with git commit SHA for traceability
- Automated health check after every deployment

**Terraform manages:**
### Networking

1. **VPC:** `10.0.0.0/16`

2. **Public Subnet:** `10.0.1.0/24`

   * Availability Zone: `us-east-1a`
   * Hosts the EC2 instance.

3. **Private Subnet 1:** `10.0.2.0/24`

   * Availability Zone: `us-east-1a`
   * Used by RDS.

4. **Private Subnet 2:** `10.0.3.0/24`

   * Availability Zone: `us-east-1b`
   * Used as the RDS standby AZ.

5. **Internet Gateway and Route Table**

   * Provides internet connectivity for resources in the public subnet.

### Security Groups

**EC2 Security Group**

* Port `80` → Open to the internet.
* Port `443` → Open to the internet.
* Port `22` → Restricted to the developer's IP.

**RDS Security Group**

* Port `5432` → Allows connections only from the EC2 security group.

### Compute

1. EC2 instance: `t3.small`.
2. User data bootstrap script configures the instance during startup.
3. An Elastic IP is attached to the EC2 instance.

### Database

1. RDS PostgreSQL runs in private subnets.
2. RDS uses a DB subnet group spanning two Availability Zones:

   * `us-east-1a`
   * `us-east-1b`

### Storage

1. S3 bucket with versioning enabled.
2. Public access is blocked using all four S3 Block Public Access settings.

### Container Registry

1. ECR repository: `resume-reviewer/backend`
2. ECR repository: `resume-reviewer/frontend`
3. Image scanning on push is enabled.

### CI/CD Pipeline

The pipeline is triggered on every Git push to `main`.

**Job 1 — Build and Push**

1. GitHub Actions checks out the code.
2. Sets `IMAGE_TAG` to the first 8 characters of the Git commit SHA.
3. Logs in to Amazon ECR.
4. Builds the backend Docker image.
5. Tags the backend image as `:IMAGE_TAG` and `:latest`.
6. Pushes both tags to ECR.
7. Builds the frontend Docker image.
8. Tags the frontend image as `:IMAGE_TAG` and `:latest`.
9. Pushes both tags to ECR.

**Job 2 — Deploy**

Runs after the Build and Push job succeeds.

1. SSHs into EC2 using `appleboy/ssh-action`.
2. Logs in to ECR from EC2.
3. Runs `docker compose pull` to retrieve the latest images.
4. Runs `docker compose up --force-recreate` to recreate the containers.
5. Waits 15 seconds for the services to start.
6. Sends a request to `http://localhost/health`.
7. If the response is `{"status":"healthy"}`, deployment succeeds.
8. If the health check fails:

   * Alerts the engineer.
   * Exits with status `1`.
9. Runs `docker image prune` to clean up unused images.



### Image Tagging Strategy

Each deployment creates two image tags:

1. `:latest` — Always points to the newest image.
2. `:abc123f` — Identifies the specific Git commit.

ECR keeps the last 10 images using a lifecycle policy.

This provides:

* Exact traceability of the code running in production.
* Visibility into changes through Git history.
* Previous image versions available in ECR for manual rollback.

### What Terraform Solved

**Before Terraform:**

1. More than 20 manual AWS CLI commands were required to set up the infrastructure.
2. No consistent record of the exact infrastructure configuration.
3. Infrastructure could differ between deployments.
4. If EC2 was terminated, the infrastructure had to be recreated manually.
5. Migrating to another AWS account could take days.

**After Terraform:**

1. `terraform apply` creates the complete infrastructure stack.
2. `terraform destroy` removes the infrastructure cleanly.
3. `terraform.tfvars` allows configuration values to be changed for another AWS account.
4. Git history provides an audit trail of infrastructure changes.
5. A new developer can clone the repository, configure `tfvars`, and run `terraform apply`.

### What CI/CD Solved

**Before CI/CD — Manual Deployment:**

1. Build the Docker image locally.
2. Tag the image.
3. Log in to Amazon ECR.
4. Push the image to ECR.
5. SSH into the EC2 instance.
6. Run `docker compose pull`.
7. Run `docker compose up -d`.
8. Run the health check.

**Total:** Approximately 15–20 minutes with manual intervention.

**After CI/CD:**

1. Developer runs `git push`.
2. GitHub Actions automatically builds and pushes the images.
3. GitHub Actions deploys the latest images to EC2.
4. The health check runs automatically.
5. The pipeline fails and alerts the engineer if deployment or health checks fail.

**Total:** Approximately 8–10 minutes with no manual deployment steps.



### Full Request Flow — Phase 3

1. **User opens the application**

   * User navigates to `http://3.228.110.182`.
   * Request reaches the Elastic IP, which remains static across EC2 stop/start operations.
   * Traffic reaches the EC2 `t3.small` instance.
   * Nginx container receives the request on port `80`.

2. **GET `/` — Load Frontend**

   * Nginx forwards the request to the frontend container.
   * Frontend Nginx serves the React `index.html` and JavaScript/CSS bundles.
   * React Router handles routes such as `/login`, `/upload`, and `/dashboard`.

3. **POST `/api/auth/login` — User Login**

   * Browser sends `{ email, password }`.
   * Request is forwarded by Nginx to the FastAPI backend on port `8000`.
   * FastAPI looks up the user in RDS PostgreSQL by email.
   * `bcrypt.checkpw()` verifies the password against the stored hash.
   * FastAPI creates a JWT containing `user_id`, `email`, and `exp`.
   * JWT is signed using `SECRET_KEY`.
   * Backend returns `{ access_token, token_type }`.

4. **POST `/api/resume/upload` — Resume Upload**

   * Browser sends the resume as `multipart/form-data`.
   * JWT is provided as `Authorization: Bearer <JWT>`.
   * FastAPI verifies the JWT signature.
   * File bytes are read and validated.
   * Only PDF/DOCX files up to 5 MB are accepted.
   * File is uploaded to S3 using the path:
     `resumes/{user_id}/{uuid}.pdf`
   * Resume metadata is inserted into the `resumes` table in RDS.
   * Backend returns `{ resume_id, filename }`.

5. **POST `/api/review/{id}/analyze` — Resume Analysis**

   * Browser sends the request with a valid JWT.
   * FastAPI verifies the JWT and confirms resume ownership.
   * Resume metadata is fetched from RDS.
   * PDF is downloaded from S3 using `s3_key`.
   * PyMuPDF extracts the resume text.
   * Extracted text is sent to the Google Gemini API using a structured prompt.
   * Gemini returns the analysis as JSON.
   * FastAPI parses and validates the response.
   * Review is inserted into the `reviews` table in RDS.
   * Backend returns the complete analysis JSON.

6. **GET `/api/resume/history` — Resume History**

   * Browser sends the request with a valid JWT.
   * FastAPI verifies the JWT.
   * Backend joins the `resumes` and `reviews` tables for the authenticated user.
   * Returns the resume history with the latest score for each resume.

7. **Response**

   * Backend responses travel through Nginx.
   * Nginx returns the responses to the browser.
   * React receives the data and renders it in the UI.




---

## Features

- JWT authentication (register, login, token refresh)
- Resume upload — PDF and DOCX, max 5MB
- AI analysis via Google Gemini with structured JSON output
- ATS score displayed as animated circular gauge (0-100)
- Skill gap identification
- Missing ATS keywords
- Section-by-section improvement suggestions
- Strengths highlighting
- Review history page — see all past analyses
- Re-analyse existing resumes with one click
- Glassmorphism UI with Framer Motion micro-animations
- Fully responsive design

---

## Local Setup

**Prerequisites:**
- Docker and Docker Compose installed
- AWS account with S3 bucket created
- Google Gemini API key from aistudio.google.com

**1. Clone:**

```bash
git clone https://github.com/YOUR_USERNAME/ai-resume-reviewer.git
cd ai-resume-reviewer
```

**2. Create backend environment file:**

```bash
cd backend
```

Create `.env` with these values:


DATABASE_URL=postgresql://admin:admin123@localhost:5432/resume_db
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3-flash-preview
APP_ENV=development





**3. Start everything:**

```bash
cd ..
docker compose up --build
```

**4. Open:**



http://localhost:80





---

## AWS Deployment with Terraform

**Prerequisites:**
- Terraform >= 1.0 installed
- AWS CLI configured with IAM user credentials
- SSH key pair: ~/.ssh/resume-reviewer-key.pem and .pub

**1. Configure values:**

```bash
cd infrastructure/terraform
```

Create `terraform.tfvars`:

```hcl
aws_account_id        = "YOUR_ACCOUNT_ID"
aws_region            = "us-east-1"
project_name          = "resume-reviewer"
environment           = "prod"
ec2_ami               = "ami-0d7f022123f8ff19d"
ec2_instance_type     = "t3.small"
key_pair_name         = "resume-reviewer-key"
db_instance_class     = "db.t3.micro"
db_name               = "resume_db"
db_username           = "your_db_user"
db_password           = "your_db_password"
s3_bucket_name        = "your-unique-bucket-name"
aws_access_key_id     = "your_iam_key"
aws_secret_access_key = "your_iam_secret"
secret_key            = "your_jwt_secret_key"
gemini_api_key        = "your_gemini_key"
gemini_model          = "gemini-3-flash-preview"
```

**2. Deploy:**

```bash
terraform init
terraform plan
terraform apply
```

**3. Push Docker images to ECR:**

```bash
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

docker build -t resume-reviewer/backend ./backend
docker tag resume-reviewer/backend:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/resume-reviewer/backend:latest
docker push \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/resume-reviewer/backend:latest

docker build -t resume-reviewer/frontend ./frontend
docker tag resume-reviewer/frontend:latest \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/resume-reviewer/frontend:latest
docker push \
  YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/resume-reviewer/frontend:latest
```

**4. Destroy when not in use:**

```bash
terraform destroy
```

---

## CI/CD Pipeline

Every push to `main` triggers the pipeline automatically.

**Required GitHub Secrets:**

| Secret | Value |
|---|---|
| AWS_ACCESS_KEY_ID | IAM user access key |
| AWS_SECRET_ACCESS_KEY | IAM user secret key |
| AWS_REGION | us-east-1 |
| ECR_REGISTRY | ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com |
| EC2_HOST | EC2 public IP (Elastic IP) |
| EC2_USERNAME | ubuntu |
| EC2_SSH_KEY | Contents of resume-reviewer-key.pem |

**Pipeline stages:**
### CI/CD Deployment Flow

1. **Push to `main`**
   ↓

2. **Job 1: Build and Push** (~5–7 minutes)

   * Build backend Docker image.
   * Push to ECR as `:latest` and `:SHA`.
   * Build frontend Docker image.
   * Push to ECR as `:latest` and `:SHA`.

3. **Job 2: Deploy** (~2–3 minutes)

   * Runs only if Job 1 succeeds.
   * SSH into the EC2 instance.
   * Pull new images from ECR.
   * Restart all containers.
   * Run health check: `GET /health`.

4. **Result**

   * **Pass:** Health check succeeds → Pipeline is green.
   * **Fail:** Health check fails → Pipeline is red and the engineer is alerted.





---

## Known Limitations and Planned Improvements

### Database Migrations
**Current:** Schema changes applied via `ALTER TABLE IF NOT EXISTS` in the startup function. Safe but not versioned.
**Planned:** Implement Alembic for versioned, reversible schema migrations with full history.

### Deployment Rollback
**Current:** Health check after deploy alerts on failure. Manual rollback required: SSH in and restart previous image.
**Planned:** Migrate to AWS EKS with ArgoCD. Kubernetes rolling updates with readiness probes provide automatic rollback via `kubectl rollout undo` without any manual intervention.

### High Availability
**Current:** Single EC2 instance. If the instance goes down, the application is unavailable.
**Planned:** Auto Scaling Group behind an Application Load Balancer. Minimum 2 instances across 2 Availability Zones.

### HTTPS
**Current:** HTTP only on port 80.
**Planned:** AWS Certificate Manager for free SSL certificate + ALB for HTTPS termination. HTTP redirects to HTTPS.

### Secrets Management
**Current:** Credentials stored in `.env.production` file on EC2 and in GitHub Secrets.
**Planned:** AWS Secrets Manager for runtime secret injection. No credentials stored on disk.

---

## Project Structure


ai-resume-reviewer/
|
|-- backend/
| |-- main.py FastAPI app entry point and startup
| |-- auth.py JWT creation, verification, bcrypt hashing
| |-- database.py SQLAlchemy engine and session factory
| |-- models.py User, Resume, Review table definitions
| |-- schemas.py Pydantic request and response models
| |-- s3_service.py S3 upload, download, presigned URL generation
| |-- ai_service.py Gemini API integration, PDF and DOCX text extraction
| |-- requirements.txt
| |-- Dockerfile Multi-stage: python:3.11-slim
| |-- routes/
| |-- auth.py POST /api/auth/register, /login GET /api/auth/me
| |-- resume.py POST /api/resume/upload GET /api/resume/list, /history
| |-- review.py POST /api/review/{id}/analyze GET /api/review/{id}/history
|
|-- frontend/
| |-- src/
| | |-- pages/ Landing Login Register Upload Processing Dashboard History
| | |-- context/ AuthContext.tsx JWT state management
| | |-- services/ api.ts axios client with interceptors
| | |-- types/ TypeScript interfaces
| |-- nginx.conf SPA fallback: try_files $uri /index.html
| |-- Dockerfile Multi-stage: node:20-alpine then nginx:alpine
|
|-- nginx/
| |-- nginx.conf Reverse proxy: /api/* to backend, /* to frontend
|
|-- infrastructure/
| |-- terraform/
| |-- main.tf VPC, EC2, RDS, S3, ECR, Security Groups, EIP
| |-- variables.tf Variable definitions with types and descriptions
| |-- outputs.tf EC2 IP, RDS endpoint, ECR URLs, SSH command
| |-- terraform.tfvars Actual values (gitignored, never committed)
|
|-- .github/
| |-- workflows/
| |-- deploy.yml Build push deploy pipeline
|
|-- docker-compose.yml Local development: postgres backend frontend nginx


