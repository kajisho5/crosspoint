"""Upload an .ipa to App Store Connect (TestFlight) with the Build Uploads API.

Endpoints and fields follow Apple's App Store Connect OpenAPI specification (4.5.1):
POST /v1/buildUploads, POST /v1/buildUploadFiles, PATCH /v1/buildUploadFiles/{id},
GET /v1/buildUploads/{id}.

Usage: asc_upload.py <ipa> <bundle id> <version> <build number>
Environment: ASC_KEY_ID, ASC_ISSUER_ID, RUNNER_TEMP (the key is $RUNNER_TEMP/keys/AuthKey_<id>.p8).
"""

import hashlib
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt

API = "https://api.appstoreconnect.apple.com"
KEY_ID = os.environ["ASC_KEY_ID"]
ISSUER_ID = os.environ["ASC_ISSUER_ID"]
KEY = open(os.path.join(os.environ["RUNNER_TEMP"], "keys", f"AuthKey_{KEY_ID}.p8")).read()


def token():
    # Tokens may live at most 20 minutes; a fresh one per request keeps long polls valid.
    now = int(time.time())
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
                      KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


class Duplicate(Exception):
    """同じビルド番号が既に送られている（前回の試行でアップロード自体は通っていた）"""


# App Store Connect は混雑時に 5xx やタイムアウトを返すことがある（2026-10-16 夜に連発）。
# 一時的な失敗は間隔を空けて再試行し、4xx（鍵・内容の誤り）だけを即失敗にする
RETRIES = 5


def api(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    for attempt in range(1, RETRIES + 1):
        req = urllib.request.Request(API + path, data=data, method=method,
                                     headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=90) as res:
                raw = res.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            text = e.read().decode(errors="replace")
            print(f"{method} {path} -> HTTP {e.code} (attempt {attempt}/{RETRIES})")
            print(text[:4000])
            if e.code == 409 and "DUPLICATE" in text:
                raise Duplicate(text)
            if e.code < 500 or attempt == RETRIES:
                sys.exit(1)
        except (TimeoutError, urllib.error.URLError, ConnectionError) as e:
            print(f"{method} {path} -> {type(e).__name__}: {e} (attempt {attempt}/{RETRIES})")
            if attempt == RETRIES:
                sys.exit(1)
        time.sleep(min(120, 15 * 2 ** (attempt - 1)))
    sys.exit(1)


def main():
    ipa, bundle_id, version, build = sys.argv[1:5]
    size = os.path.getsize(ipa)
    print(f"{os.path.basename(ipa)}: {size} bytes, version {version} ({build})")

    query = urllib.parse.urlencode({"filter[bundleId]": bundle_id, "fields[apps]": "bundleId"})
    apps = api("GET", f"/v1/apps?{query}")["data"]
    if not apps:
        print(f"::error::No App Store Connect app with bundle ID {bundle_id}")
        sys.exit(1)
    app_id = apps[0]["id"]

    try:
        upload = api("POST", "/v1/buildUploads", {"data": {
            "type": "buildUploads",
            "attributes": {"cfBundleShortVersionString": version, "cfBundleVersion": build, "platform": "IOS"},
            "relationships": {"app": {"data": {"type": "apps", "id": app_id}}},
        }})["data"]
    except Duplicate:
        # 再実行（rerun --failed）で同じ番号を送り直した場合。前回の試行で送信済みなので成功扱いにする
        print(f"::warning::Build {version} ({build}) was already uploaded by an earlier attempt; check the TestFlight tab")
        return
    print("build upload:", upload["id"])

    file = api("POST", "/v1/buildUploadFiles", {"data": {
        "type": "buildUploadFiles",
        "attributes": {"fileName": os.path.basename(ipa), "fileSize": size, "uti": "com.apple.ipa", "assetType": "ASSET"},
        "relationships": {"buildUpload": {"data": {"type": "buildUploads", "id": upload["id"]}}},
    }})["data"]
    operations = file["attributes"].get("uploadOperations") or []
    print(f"build upload file: {file['id']}, {len(operations)} part(s)")

    md5 = hashlib.md5()
    with open(ipa, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            md5.update(chunk)
        for n, op in enumerate(operations, 1):
            f.seek(op["offset"])
            part = f.read(op["length"])
            headers = {h["name"]: h["value"] for h in op.get("requestHeaders") or []}
            req = urllib.request.Request(op["url"], data=part, method=op["method"], headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=300) as res:
                    print(f"part {n}/{len(operations)}: HTTP {res.status}")
            except urllib.error.HTTPError as e:
                print(f"part {n}/{len(operations)}: HTTP {e.code}")
                print(e.read().decode(errors="replace")[:2000])
                sys.exit(1)

    api("PATCH", f"/v1/buildUploadFiles/{file['id']}", {"data": {
        "type": "buildUploadFiles",
        "id": file["id"],
        "attributes": {"uploaded": True, "sourceFileChecksums": {"file": {"hash": md5.hexdigest(), "algorithm": "MD5"}}},
    }})
    print("upload committed; waiting for App Store Connect")

    deadline = time.time() + 30 * 60
    last = None
    while time.time() < deadline:
        state = api("GET", f"/v1/buildUploads/{upload['id']}")["data"]["attributes"].get("state") or {}
        if state.get("state") != last:
            last = state.get("state")
            print("state:", last)
        for kind in ("errors", "warnings", "infos"):
            for d in state.get(kind) or []:
                print(f"  {kind[:-1]}: {d.get('code')}: {d.get('description')}")
        if last == "COMPLETE":
            print("Uploaded. The build appears in the TestFlight tab of App Store Connect after processing.")
            return
        if last == "FAILED":
            print("::error::App Store Connect rejected the build (see the errors above)")
            sys.exit(1)
        time.sleep(20)
    print("::warning::Still processing after 30 minutes; check the TestFlight tab of App Store Connect")


if __name__ == "__main__":
    main()
