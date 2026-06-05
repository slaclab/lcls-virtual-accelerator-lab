# Deploy on Fly.io

Step-by-step instructions to deploy the lab on Fly.io for public access.

## 1. Install the Fly CLI

```bash
# macOS
brew install flyctl

# Or from script
curl -L https://fly.io/install.sh | sh
```

## 2. Sign up / log in

```bash
fly auth signup   # first time
fly auth login    # returning user
```

You'll need a credit card on file (pay-as-you-go billing).

## 3. Create the Fly app

```bash
cd ai-lab
fly apps create lcls-surrogate-lab
```

## 4. Create a `fly.toml` config

```bash
cat > fly.toml << 'EOF'
app = "lcls-surrogate-lab"
primary_region = "sjc"  # San Jose (closest to SLAC)

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 6

[[vm]]
  size = "shared-cpu-4x"
  memory = "4gb"

[checks]
  [checks.health]
    type = "http"
    port = 8000
    path = "/api/config"
    interval = "30s"
    timeout = "5s"
    grace_period = "120s"
EOF
```

## 5. Deploy

```bash
fly deploy
```

This builds the Docker image remotely and deploys it. First deploy takes ~5-10 minutes (large image).

## 6. Scale to 6 machines (one per group)

```bash
fly scale count 6
```

## 7. Verify

```bash
fly status
curl https://lcls-surrogate-lab.fly.dev/api/config | head -c 100
```

## 8. Share the URL with students

With Fly.io's single-URL model, all 6 machines sit behind one load balancer. Since each machine has its own model instance, students can share the same URL:

```
https://lcls-surrogate-lab.fly.dev/?group=1
https://lcls-surrogate-lab.fly.dev/?group=2
...
https://lcls-surrogate-lab.fly.dev/?group=6
```

Note: Fly's load balancer routes any request to any machine. Since each machine runs `NUM_GROUPS=1`, the `?group=N` param doesn't provide isolation between groups. For true per-group isolation, use the multi-app approach below.

### Alternative: per-group isolation (recommended)

Create 6 separate Fly apps with a shared config:

```bash
for i in 1 2 3 4 5 6; do
  fly apps create lcls-lab-g${i}
  fly deploy --app lcls-lab-g${i} --vm-size shared-cpu-4x --vm-memory 4096
done
```

Students get dedicated URLs:
```
https://lcls-lab-g1.fly.dev/
https://lcls-lab-g2.fly.dev/
...
https://lcls-lab-g6.fly.dev/
```

Each app is fully isolated. If one crashes, others are unaffected.

## 9. Tear down after the lab

```bash
# Single app
fly apps destroy lcls-surrogate-lab

# Or per-group apps
for i in 1 2 3 4 5 6; do
  fly apps destroy lcls-lab-g${i} --yes
done
```

## Cost estimate

| Resource | Spec | Cost/hour |
|----------|------|-----------|
| Machine (shared-cpu-4x, 4GB) | per instance | ~$0.03 |
| 6 machines x 4 hours | | ~$0.72 |

Total for a 4-hour lab: under $1. Fly.io bills per second when machines are running.

## Troubleshooting

### Deploy fails with OOM during build

The remote builder may run out of memory building the large image. Fix:

```bash
fly deploy --remote-only --build-arg DOCKER_PLATFORM=linux/amd64
```

Or build locally and push:

```bash
fly deploy --local-only
```

### Machine won't start (health check failing)

The model takes ~30s to load. The `grace_period: 120s` in the health check config should handle this. Check logs:

```bash
fly logs --app lcls-surrogate-lab
```

### Students see different model state

With the single-app approach, Fly's load balancer may route different requests from the same student to different machines. Use the per-group multi-app approach for true isolation.

### Want a custom domain?

```bash
fly certs create lab.yourdomain.com
```

Then add a CNAME record: `lab.yourdomain.com -> lcls-surrogate-lab.fly.dev`
