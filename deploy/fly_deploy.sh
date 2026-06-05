#!/bin/bash
set -e

APP_PREFIX="lcls-lab"
REGION="sjc"
NUM_GROUPS="${1:-6}"
VM_SIZE="shared-cpu-4x"
VM_MEMORY="4096"

echo "Deploying ${NUM_GROUPS} groups to Fly.io (region: ${REGION})"
echo ""

for i in $(seq 1 "$NUM_GROUPS"); do
  APP="${APP_PREFIX}-g${i}"
  echo "=== Group ${i}: ${APP} ==="

  if fly apps list | grep -q "$APP"; then
    echo "  App exists, deploying update..."
  else
    echo "  Creating app..."
    fly apps create "$APP" --org personal
  fi

  fly deploy \
    --app "$APP" \
    --primary-region "$REGION" \
    --vm-size "$VM_SIZE" \
    --vm-memory "$VM_MEMORY" \
    --ha=false \
    --yes

  echo "  Live at: https://${APP}.fly.dev/"
  echo ""
done

echo "=== All ${NUM_GROUPS} groups deployed ==="
echo ""
echo "Student URLs:"
for i in $(seq 1 "$NUM_GROUPS"); do
  echo "  Group ${i}: https://${APP_PREFIX}-g${i}.fly.dev/"
done
