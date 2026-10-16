"""Put a processed TestFlight build in front of external testers via a public link.

Steps (App Store Connect API, OpenAPI 4.x):
1. Find the app (bundle id) and the build (version + build number); wait until processingState == VALID.
2. Make sure export compliance is answered (usesNonExemptEncryption = false; the app only uses HTTPS/TCP without custom crypto).
3. Find or create the external beta group (default name "External"), enable its public link, print the link.
4. Beta App Review prerequisites: beta app localization (ja: description + feedback email) and beta app review detail
   (contact + notes). Contact fields come from env BETA_CONTACT_EMAIL / _FIRST / _LAST / _PHONE; when absent and the
   detail is empty on App Store Connect, the script says so and stops before submitting.
5. "What to test" for the build (ja), add the build to the group, submit for Beta App Review when not yet submitted.

Usage: asc_external.py <bundle id> <version> <build number> [group name]
Environment: ASC_KEY_ID, ASC_ISSUER_ID, RUNNER_TEMP (key at $RUNNER_TEMP/keys/AuthKey_<id>.p8),
             optional BETA_CONTACT_EMAIL, BETA_CONTACT_FIRST, BETA_CONTACT_LAST, BETA_CONTACT_PHONE, BETA_WHATS_NEW
"""

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

REVIEW_NOTES = (
    "This app remotely controls Roland video switchers over LAN, USB or Bluetooth MIDI. "
    "No hardware is needed for review: on the first screen choose \"Try demo mode\" (デモモードで試す) "
    "to exercise every screen with a simulated switcher. "
    "The app is not affiliated with Roland Corporation."
)
BETA_DESCRIPTION = (
    "Roland ビデオスイッチャー（V-160HD / V-80HD / VR-120HD ほか）を iPhone から LAN / USB / Bluetooth で操作する非公式アプリのベータ版です。"
    "実機が無くても起動画面の「デモモードで試す」で全画面を確認できます。"
)
DEFAULT_WHATS_NEW = (
    "実機確認用ビルド。接続 → 操作 → 「その他」→「診断」→「レポート」で共有したテキストをフィードバックに添えてください。"
)


def token():
    now = int(time.time())
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
                      KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def api(method, path, body=None, ok=(200, 201, 204)):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read()
            return res.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode(errors="replace")
        try:
            body = json.loads(raw)
        except ValueError:
            body = {"raw": raw[:2000]}
        if e.code not in ok:
            print(f"{method} {path} -> HTTP {e.code}")
            print(json.dumps(body, ensure_ascii=False, indent=2)[:3000])
            sys.exit(1)
        return e.code, body


def q(**params):
    return urllib.parse.urlencode(params)


def find_app(bundle_id):
    _, res = api("GET", f"/v1/apps?{q(**{'filter[bundleId]': bundle_id, 'fields[apps]': 'bundleId,name'})}")
    if not res["data"]:
        print(f"::error::No App Store Connect app with bundle ID {bundle_id}")
        sys.exit(1)
    return res["data"][0]


def wait_build(app_id, version, build, timeout_s=1800):
    deadline = time.time() + timeout_s
    last = None
    while True:
        _, res = api("GET", "/v1/builds?" + q(**{
            "filter[app]": app_id, "filter[version]": build, "filter[preReleaseVersion.version]": version,
            "fields[builds]": "version,processingState,usesNonExemptEncryption,expired", "limit": 5,
        }))
        for b in res["data"]:
            st = b["attributes"].get("processingState")
            if st != last:
                print(f"build {version} ({build}): {st}")
                last = st
            if st == "VALID":
                return b
            if st in ("FAILED", "INVALID"):
                print(f"::error::Build processing ended in {st}")
                sys.exit(1)
        if time.time() > deadline:
            print("::error::Timed out waiting for the build to finish processing")
            sys.exit(1)
        time.sleep(30)


def ensure_compliance(build):
    if build["attributes"].get("usesNonExemptEncryption") is None:
        api("PATCH", f"/v1/builds/{build['id']}", {"data": {
            "type": "builds", "id": build["id"], "attributes": {"usesNonExemptEncryption": False}}})
        print("export compliance: set usesNonExemptEncryption=false")
    else:
        print(f"export compliance: usesNonExemptEncryption={build['attributes']['usesNonExemptEncryption']}")


def ensure_group(app_id, name):
    _, res = api("GET", f"/v1/apps/{app_id}/betaGroups?{q(**{'fields[betaGroups]': 'name,isInternalGroup,publicLinkEnabled,publicLink,publicLinkLimit,publicLinkLimitEnabled', 'limit': 50})}")
    group = next((g for g in res["data"] if g["attributes"]["name"] == name and not g["attributes"]["isInternalGroup"]), None)
    if group is None:
        _, res = api("POST", "/v1/betaGroups", {"data": {
            "type": "betaGroups",
            "attributes": {"name": name, "isInternalGroup": False, "publicLinkEnabled": True,
                           "publicLinkLimitEnabled": True, "publicLinkLimit": 1000, "feedbackEnabled": True},
            "relationships": {"app": {"data": {"type": "apps", "id": app_id}}},
        }})
        group = res["data"]
        print(f"beta group created: {name}")
    elif not group["attributes"].get("publicLinkEnabled"):
        _, res = api("PATCH", f"/v1/betaGroups/{group['id']}", {"data": {
            "type": "betaGroups", "id": group["id"],
            "attributes": {"publicLinkEnabled": True, "publicLinkLimitEnabled": True, "publicLinkLimit": 1000, "feedbackEnabled": True}}})
        group = res["data"]
        print(f"beta group public link enabled: {name}")
    link = group["attributes"].get("publicLink")
    print(f"PUBLIC LINK: {link or '(not issued yet; check App Store Connect → TestFlight → ' + name + ')'}")
    return group, link


def ensure_beta_localization(app_id, email):
    _, res = api("GET", f"/v1/apps/{app_id}/betaAppLocalizations?{q(**{'fields[betaAppLocalizations]': 'locale,feedbackEmail,description'})}")
    ja = next((l for l in res["data"] if l["attributes"]["locale"] == "ja"), None)
    attrs = {"description": BETA_DESCRIPTION}
    if email:
        attrs["feedbackEmail"] = email
    if ja is None:
        attrs["locale"] = "ja"
        api("POST", "/v1/betaAppLocalizations", {"data": {
            "type": "betaAppLocalizations", "attributes": attrs,
            "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})
        print("beta app localization (ja): created")
    else:
        api("PATCH", f"/v1/betaAppLocalizations/{ja['id']}", {"data": {
            "type": "betaAppLocalizations", "id": ja["id"], "attributes": attrs}})
        print("beta app localization (ja): updated")


def ensure_review_detail(app_id):
    _, res = api("GET", f"/v1/apps/{app_id}/betaAppReviewDetail")
    detail = res["data"]
    cur = detail["attributes"]
    env = {k: os.environ.get(f"BETA_CONTACT_{k.upper()}", "").strip() for k in ("email", "first", "last", "phone")}
    attrs = {"demoAccountRequired": False, "notes": REVIEW_NOTES}
    if env["email"]:
        attrs["contactEmail"] = env["email"]
    if env["first"]:
        attrs["contactFirstName"] = env["first"]
    if env["last"]:
        attrs["contactLastName"] = env["last"]
    if env["phone"]:
        attrs["contactPhone"] = env["phone"]
    merged = {**cur, **attrs}
    missing = [k for k in ("contactEmail", "contactFirstName", "contactLastName", "contactPhone") if not merged.get(k)]
    if missing:
        # App Store Connect は連絡先が揃っていない PATCH を 409 で拒否する。欠けていれば触らずに警告だけ出す
        print(f"beta app review detail: not updated; missing contact fields: {', '.join(missing)}")
        return missing
    api("PATCH", f"/v1/betaAppReviewDetails/{detail['id']}", {"data": {
        "type": "betaAppReviewDetails", "id": detail["id"], "attributes": attrs}})
    print("beta app review detail: contact + notes set")
    return missing


def ensure_whats_new(build_id, text):
    _, res = api("GET", f"/v1/builds/{build_id}/betaBuildLocalizations?{q(**{'fields[betaBuildLocalizations]': 'locale,whatsNew'})}")
    ja = next((l for l in res["data"] if l["attributes"]["locale"] == "ja"), None)
    if ja is None:
        api("POST", "/v1/betaBuildLocalizations", {"data": {
            "type": "betaBuildLocalizations", "attributes": {"locale": "ja", "whatsNew": text},
            "relationships": {"build": {"data": {"type": "builds", "id": build_id}}}}})
    else:
        api("PATCH", f"/v1/betaBuildLocalizations/{ja['id']}", {"data": {
            "type": "betaBuildLocalizations", "id": ja["id"], "attributes": {"whatsNew": text}}})
    print("what to test (ja): set")


def add_to_group(group_id, build_id):
    # 409 = already in the group
    status, _ = api("POST", f"/v1/betaGroups/{group_id}/relationships/builds",
                    {"data": [{"type": "builds", "id": build_id}]}, ok=(200, 201, 204, 409))
    print("build added to group" if status != 409 else "build already in group")


def submit_review(build_id):
    status, res = api("GET", f"/v1/builds/{build_id}/betaAppReviewSubmission", ok=(200, 404))
    if status == 200 and res.get("data"):
        print(f"beta app review: already submitted ({res['data']['attributes'].get('betaReviewState')})")
        return
    _, res = api("POST", "/v1/betaAppReviewSubmissions", {"data": {
        "type": "betaAppReviewSubmissions",
        "relationships": {"build": {"data": {"type": "builds", "id": build_id}}}}})
    print(f"beta app review: submitted ({res['data']['attributes'].get('betaReviewState')})")


def main():
    bundle_id, version, build = sys.argv[1:4]
    group_name = sys.argv[4] if len(sys.argv) > 4 else "External"
    app = find_app(bundle_id)
    app_id = app["id"]
    print("app:", app["attributes"].get("name"))

    b = wait_build(app_id, version, build)
    ensure_compliance(b)
    group, link = ensure_group(app_id, group_name)
    ensure_beta_localization(app_id, os.environ.get("BETA_CONTACT_EMAIL", "").strip())
    missing = ensure_review_detail(app_id)
    ensure_whats_new(b["id"], os.environ.get("BETA_WHATS_NEW", "").strip() or DEFAULT_WHATS_NEW)
    add_to_group(group["id"], b["id"])
    if missing:
        print("::warning::Beta App Review needs contact info. Set repository variables BETA_CONTACT_EMAIL / BETA_CONTACT_FIRST / "
              "BETA_CONTACT_LAST / BETA_CONTACT_PHONE (or fill App Store Connect → TestFlight → Test Information) and re-run.")
        print("The build is in the group; the public link works once the build passes Beta App Review.")
        return
    submit_review(b["id"])
    if link:
        print(f"Done. Share this link after approval: {link}")


if __name__ == "__main__":
    main()
