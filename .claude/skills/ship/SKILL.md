---
name: ship
description: Commit staged changes แล้ว deploy ขึ้น production
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(bash scripts/deploy.sh), Bash(test *), Read, Write, AskUserQuestion
---

## Preflight
- Branch: !`git branch --show-current`
- Staged file list: !`git status --short`
- Staged diff stat: !`git diff --staged --stat`
- Recent commits: !`git log --oneline -3`
- Deploy config: !`test -f scripts/.deploy.env && echo "configured" || echo "missing"`

## Task

1. **ถ้า deploy config = `missing`** → ใช้ `AskUserQuestion` ถาม 3 ค่า:
   - `SERVER_IP` — IP ของ production server
   - `DOMAIN` — โดเมนสำหรับ health check (เช่น `finance.example.com`)
   - `REMOTE_PATH` — path บน server ที่จะวาง compose stack (เช่น `/opt/finance-tracker`)

   แล้วเขียนลง `scripts/.deploy.env` รูปแบบ:
   ```
   SERVER_IP=<ค่า>
   DOMAIN=<ค่า>
   REMOTE_PATH=<ค่า>
   ```
   ไฟล์นี้ gitignored แล้ว — ครั้งหน้าจะไม่ถามอีก

2. **ถ้ามี staged changes** → ดู `git diff --staged` แล้ว commit ด้วย Conventional Commits message สั้น ตรงประเด็น (`feat:`, `fix:`, `chore:`, `refactor:`, ...) เน้น "why" มากกว่า "what" ห้าม `--no-verify` ห้าม `--amend`

   ถ้าไม่มี staged changes → ข้ามขั้นนี้ (deploy ของเดิม)

3. **รัน deploy:** `bash scripts/deploy.sh`
   (deploy.sh จะ auto-source `scripts/.deploy.env` เอง)

4. **ถ้า deploy fail** → หยุดทันที แสดง error ที่เจอ **อย่า retry, อย่า rollback, อย่าเดาแก้** — รอ user สั่งต่อ
