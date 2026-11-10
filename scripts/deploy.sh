#!/usr/bin/env bash
# GitHub 공개 저장소 만들기 + 푸시 + Vercel 배포를 한 번에 한다.
# 토큰은 .env에서 읽고 화면에 출력하지 않는다. (원격 주소에도 남기지 않는다)
#
# 사용법 (프로젝트 폴더에서):
#   bash scripts/deploy.sh <저장소이름> "<저장소 설명>" [github|vercel|all]
# 예:
#   bash scripts/deploy.sh my-tool "내 도구 설명" all
set -euo pipefail

NAME="${1:?저장소 이름을 적어 주세요 (영문 소문자·숫자·하이픈)}"
DESC="${2:-}"
MODE="${3:-all}"

cd "$(dirname "$0")/.."

# .env에서 값 읽기 (따옴표·줄바꿈 제거). 값은 출력하지 않는다.
read_env() {
  grep -E "^$1=" .env 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true
}
# 출력에서 토큰을 가린다
mask() { sed -e "s/${GH_TOKEN:-__none__}/[숨김]/g" -e "s/${VC_TOKEN:-__none__}/[숨김]/g"; }

GH_TOKEN="$(read_env GITHUB_TOKEN)"
VC_TOKEN="$(read_env VERCEL_TOKEN)"

# --- 1) 커밋 전 안전 점검 ---------------------------------------------------
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main >/dev/null
git add -A
BAD="$(git ls-files | grep -E '(^|/)\.env|node_modules/|^\.next/|^\.vercel/|^trash-can/|\.pem$' || true)"
if [ -n "$BAD" ]; then
  echo "올리면 안 되는 파일이 포함되어 있습니다. .gitignore를 확인해 주세요:"
  echo "$BAD"
  exit 1
fi
if git grep -nEI '(ghp_|github_pat_|vcp_|sk-[A-Za-z0-9]{20,}|sbp_)' -- . ':!package-lock.json' ':!scripts/deploy.sh' >/dev/null 2>&1; then
  echo "코드 안에 토큰처럼 보이는 문자열이 있습니다. 확인해 주세요."
  exit 1
fi
echo "안전 점검 통과 (올라갈 파일 $(git ls-files | wc -l)개)"

# --- 2) GitHub ------------------------------------------------------------
if [ "$MODE" = "github" ] || [ "$MODE" = "all" ]; then
  [ -n "$GH_TOKEN" ] || { echo ".env에 GITHUB_TOKEN이 없습니다."; exit 1; }

  USER_JSON="$(curl -s -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" https://api.github.com/user)"
  LOGIN="$(printf '%s' "$USER_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).login||"")}catch(e){console.log("")}})')"
  UID_="$(printf '%s' "$USER_JSON" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).id||"")}catch(e){console.log("")}})')"
  [ -n "$LOGIN" ] || { echo "GitHub 토큰이 올바르지 않습니다."; exit 1; }

  # 커밋 작성자는 GitHub noreply 주소로 (이메일 공개 방지)
  git config user.name "$LOGIN"
  git config user.email "${UID_}+${LOGIN}@users.noreply.github.com"

  if ! git diff --cached --quiet || ! git rev-parse HEAD >/dev/null 2>&1; then
    git commit -q -m "${COMMIT_MSG:-배포: 변경 사항 반영}" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
  fi

  # 저장소가 없으면 공개(public)로 만든다. 한글 설명이 깨지지 않게 JSON을 파일로 저장해 보낸다.
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GH_TOKEN" "https://api.github.com/repos/${LOGIN}/${NAME}")"
  if [ "$CODE" != "200" ]; then
    TMP="$(mktemp)"
    NAME_="$NAME" DESC_="$DESC" node -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify({name:process.env.NAME_, description:process.env.DESC_, private:false, has_wiki:false}), "utf8")' "$TMP"
    curl -s -X POST -H "Authorization: Bearer $GH_TOKEN" -H "Accept: application/vnd.github+json" \
      -H "Content-Type: application/json; charset=utf-8" --data-binary @"$TMP" https://api.github.com/user/repos >/dev/null
    rm -f "$TMP"
    echo "GitHub 공개 저장소를 만들었습니다: https://github.com/${LOGIN}/${NAME}"
  fi

  git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/${LOGIN}/${NAME}.git"
  B64="$(printf 'x-access-token:%s' "$GH_TOKEN" | base64 | tr -d '\n')"
  git -c http.extraheader="Authorization: Basic $B64" push -u origin main 2>&1 | mask | sed "s/$B64/[숨김]/g" | tail -3
  echo "GitHub: https://github.com/${LOGIN}/${NAME}"
fi

# --- 3) Vercel -------------------------------------------------------------
if [ "$MODE" = "vercel" ] || [ "$MODE" = "all" ]; then
  [ -n "$VC_TOKEN" ] || { echo ".env에 VERCEL_TOKEN이 없습니다."; exit 1; }
  export VERCEL_TOKEN="$VC_TOKEN"
  # 처음 한 번만 프로젝트를 연결한다 (GitHub 연결 실패 안내가 나와도 배포는 된다)
  [ -f .vercel/project.json ] || npx.cmd --yes vercel@latest link --yes --project "$NAME" 2>&1 | mask | tail -3
  npx.cmd --yes vercel@latest deploy --prod --yes 2>&1 | mask | grep -E '"message"|"status"|Error|error|Production' | head -5
  echo "(배포 직후 실제 주소로 핵심 기능을 직접 호출해 확인해 주세요)"
fi
