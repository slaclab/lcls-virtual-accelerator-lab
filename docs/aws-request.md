# AWS Request for AI Lab Deployment

Hi,

I'm running a 2-hour AI/ML computer lab for high school students visiting SLAC as part of a STEM immersion program. I have a web application that needs to be publicly accessible (no SLAC login) for the duration of the lab.

## What we need

A single EC2 instance running Docker containers for approximately 4 hours on the day of the lab.

**Specs:**
- Instance type: `r6i.xlarge` (4 vCPU, 32GB RAM) or similar
- OS: Amazon Linux 2023 or Ubuntu 24.04
- Storage: 30GB gp3
- Docker and Docker Compose installed (or ability to install)
- **Public IP address accessible over HTTP (port 80) from the open internet** (students will connect from their own laptops on the visitor WiFi network; no VPN or SLAC credentials)

## What the application does

It serves a neural network surrogate model of the LCLS injector and FEL. Students interact with sliders in a web browser and observe predicted beam properties in real time. The app runs as 6 Docker containers (one per student group) behind an nginx reverse proxy, all on the single instance. The Docker image (~6GB) is pre-built and hosted on GitHub Container Registry (`ghcr.io/slaclab/lcls-surrogate-lab`).

## Deployment

Once the instance is running with Docker installed, setup is:

```bash
git clone https://github.com/slaclab/ai-lab.git
cd ai-lab
docker compose up -d
```

Students access `http://<public-ip>/g1/` through `/g6/`.

## Duration and scheduling

- Only needed for a single day (can be scheduled in advance)
- Instance runs for ~4 hours, then terminated
- Estimated cost: under $2

## Questions

1. Can we get an instance with a publicly routable IP that allows inbound HTTP from any source (no SLAC VPN requirement)?
2. Is there a process to request this for a specific date, or can I self-service launch and terminate?
3. Any restrictions on running Docker containers or pulling images from ghcr.io?

Thanks!
