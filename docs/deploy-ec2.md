# Deploy on AWS EC2

Step-by-step instructions to deploy the lab on a single EC2 instance for public access.

## 1. Launch an EC2 instance

- **AMI**: Amazon Linux 2023 (or Ubuntu 24.04)
- **Instance type**: `r6i.xlarge` (4 vCPU, 32GB RAM) or `r6i.large` (2 vCPU, 16GB RAM, tighter but works)
- **Storage**: 30GB gp3 (the Docker image is ~6GB)
- **Security group**: Allow inbound TCP port 80 from `0.0.0.0/0` (public HTTP)
- **Key pair**: Create or select one for SSH access

## 2. SSH into the instance

```bash
ssh -i your-key.pem ec2-user@<public-ip>
```

## 3. Install Docker

```bash
# Amazon Linux 2023
sudo dnf update -y
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Log out and back in for group change to take effect
exit
```

```bash
ssh -i your-key.pem ec2-user@<public-ip>
docker --version
docker compose version
```

## 4. Clone the repo and start

```bash
git clone https://github.com/slaclab/ai-lab.git
cd ai-lab
docker compose up -d
```

This pulls the pre-built image from `ghcr.io/slaclab/lcls-surrogate-lab:latest` and starts 6 worker containers + nginx.

## 5. Wait for startup (~60s)

```bash
# Watch logs until you see "Application startup complete" from all workers
docker compose logs -f --tail=5
```

## 6. Verify

```bash
curl -s http://localhost/g1/api/config | head -c 100
```

Should return JSON with slider configs.

## 7. Share the URL with students

```
http://<ec2-public-ip>/g1/
http://<ec2-public-ip>/g2/
...
http://<ec2-public-ip>/g6/
```

Assign one URL per group at the start of the lab.

## 8. Tear down after the lab

```bash
docker compose down
```

Then terminate the EC2 instance in the AWS console to stop billing.

## Cost estimate

| Instance | RAM | Cost/hour | 4-hour lab |
|----------|-----|-----------|-----------|
| r6i.large | 16GB | $0.126 | $0.50 |
| r6i.xlarge | 32GB | $0.252 | $1.01 |

Plus ~$0.10 for storage and data transfer. Total: under $2.

## Optional: HTTPS with a domain

If you want HTTPS (not required for a single lab session):

1. Register a domain or use a free subdomain (e.g., nip.io: `<ip>.nip.io`)
2. Install certbot in the nginx container or use AWS Certificate Manager + ALB
3. For a one-time 2-hour lab, plain HTTP is fine

## Troubleshooting

### Containers exit immediately

Check logs: `docker compose logs g1`. Likely OOM. Use a larger instance.

### Port 80 not reachable

Check the EC2 security group allows inbound TCP 80 from 0.0.0.0/0.

### Slow first response

Normal. Models take ~30s to load on first startup. After that, responses are < 1s.

### One group's container crashed

```bash
docker compose restart g3  # restart just that group
```
Other groups are unaffected.
