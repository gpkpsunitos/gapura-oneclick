#!/usr/bin/env bash
set -Eeuo pipefail

repo_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_dir"

production_env="${PRODUCTION_ENV_FILE:-.env.production}"
build_env="${WEB_BUILD_ENV_FILE:-.env.web-build}"
service_name="gapura-oneclick"
image_name="gapura-oneclick:web"
test_container="gapura-oneclick-web-test"
test_port="${WEB_TEST_PORT:-3002}"

for required_file in "$production_env" "$build_env" Dockerfile.web docker-compose.yml; do
  if [[ ! -f "$required_file" ]]; then
    printf 'Required deployment file is missing: %s\n' "$required_file" >&2
    exit 1
  fi
done

found_build_supabase_placeholder=false
found_build_jwt_placeholder=false

while IFS= read -r line || [[ -n "$line" ]]; do
  line="${line%$'\r'}"
  line="${line#"${line%%[![:space:]]*}"}"
  case "$line" in
    ""|\#*)
      continue
      ;;
  esac

  key="${line%%=*}"
  value="${line#*=}"
  if [[ "$key" == "$line" ]]; then
    printf 'Invalid assignment in %s (found: %s)\n' "$build_env" "$key" >&2
    exit 1
  fi

  case "$key" in
    NEXT_PUBLIC_*)
      if [[ ! "$key" =~ ^NEXT_PUBLIC_[A-Z0-9_]+$ ]]; then
        printf 'Invalid public build variable name in %s (found: %s)\n' \
          "$build_env" "$key" >&2
        exit 1
      fi
      ;;
    SUPABASE_SERVICE_ROLE_KEY)
      if [[ "$value" != "build-time-placeholder-not-a-real-key" ]]; then
        printf 'SUPABASE_SERVICE_ROLE_KEY must use the fixed build placeholder in %s.\n' \
          "$build_env" >&2
        exit 1
      fi
      found_build_supabase_placeholder=true
      ;;
    JWT_SECRET)
      if [[ "$value" != "build-time-placeholder-not-a-real-secret" ]]; then
        printf 'JWT_SECRET must use the fixed build placeholder in %s.\n' \
          "$build_env" >&2
        exit 1
      fi
      found_build_jwt_placeholder=true
      ;;
    *)
      printf 'Disallowed build variable in %s (found: %s)\n' \
        "$build_env" "$key" >&2
      exit 1
      ;;
  esac
done < "$build_env"

required_public_variables=(
  NEXT_PUBLIC_APP_URL
  NEXT_PUBLIC_AI_SERVICE_URL
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  NEXT_PUBLIC_GOOGLE_SHEET_ID
)

for required_public_variable in "${required_public_variables[@]}"; do
  if ! grep -Eq "^${required_public_variable}=.+$" "$build_env"; then
    printf 'Required public build variable is missing or empty in %s: %s\n' \
      "$build_env" "$required_public_variable" >&2
    exit 1
  fi
done

if [[ "$found_build_supabase_placeholder" != "true" || "$found_build_jwt_placeholder" != "true" ]]; then
  printf 'Required nonfunctional build placeholders are missing from %s.\n' \
    "$build_env" >&2
  exit 1
fi

export WEB_BUILD_ENV_FILE="$build_env"
export WEB_BUILD_ENV_REV
export PRODUCTION_ENV_FILE="$production_env"
WEB_BUILD_ENV_REV="$(sha256sum "$build_env" | awk '{print $1}')"

compose() {
  sudo env \
    PRODUCTION_ENV_FILE="$PRODUCTION_ENV_FILE" \
    WEB_BUILD_ENV_FILE="$WEB_BUILD_ENV_FILE" \
    WEB_BUILD_ENV_REV="$WEB_BUILD_ENV_REV" \
    docker compose "$@"
}

compose config --quiet

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
current_image_id="$(
  sudo docker inspect --format '{{.Image}}' "$service_name" 2>/dev/null || true
)"
rollback_tag=""

if [[ -n "$current_image_id" ]]; then
  rollback_tag="gapura-oneclick:rollback-$timestamp"
  sudo docker tag "$current_image_id" "$rollback_tag"
  printf 'Preserved current production image as %s\n' "$rollback_tag"
fi

rollback_production() {
  if [[ -z "$rollback_tag" ]]; then
    printf 'No previous production image is available for automatic rollback.\n' >&2
    return 1
  fi

  printf 'Restoring %s.\n' "$rollback_tag" >&2
  sudo docker tag "$rollback_tag" "$image_name"
  compose up -d --no-build --force-recreate "$service_name"
}

compose build "$service_name"

cleanup_test_container() {
  sudo docker rm -f "$test_container" >/dev/null 2>&1 || true
}
trap cleanup_test_container EXIT

cleanup_test_container
sudo docker run -d \
  --name "$test_container" \
  --env-file "$production_env" \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e PORT=3000 \
  -e HOSTNAME=0.0.0.0 \
  -p "127.0.0.1:${test_port}:3000" \
  "$image_name" >/dev/null

candidate_ready=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --output /dev/null \
    "http://127.0.0.1:${test_port}/auth/login"; then
    candidate_ready=true
    break
  fi

  if [[ "$(sudo docker inspect --format '{{.State.Running}}' "$test_container" 2>/dev/null || true)" != "true" ]]; then
    break
  fi

  sleep 2
done

if [[ "$candidate_ready" != "true" ]]; then
  printf 'Candidate container did not become ready. Recent logs:\n' >&2
  sudo docker logs --tail=100 "$test_container" >&2 || true
  exit 1
fi

printf 'Candidate passed the local HTTP test on port %s.\n' "$test_port"
cleanup_test_container
trap - EXIT

if ! compose up -d --no-build --force-recreate "$service_name"; then
  printf 'Compose failed while recreating production.\n' >&2
  rollback_production || true
  exit 1
fi

production_ready=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --output /dev/null \
    "http://127.0.0.1:3001/auth/login"; then
    production_ready=true
    break
  fi
  sleep 2
done

if [[ "$production_ready" != "true" ]]; then
  printf 'Production did not become ready after deployment.\n' >&2
  compose logs --tail=100 "$service_name" >&2 || true

  rollback_production || true

  exit 1
fi

compose ps "$service_name"
printf 'Web deployment completed successfully.\n'
