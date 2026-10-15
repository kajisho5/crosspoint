"""Manage signing certificates with the App Store Connect API (Certificates resource).

Endpoints follow Apple's App Store Connect OpenAPI specification:
GET /v1/certificates, POST /v1/certificates, DELETE /v1/certificates/{id}.

Usage:
  asc_certs.py list
  asc_certs.py create <DEVELOPMENT|DISTRIBUTION> <csr.pem> <out.cer>
  asc_certs.py revoke <id>[,<id>...]
  asc_certs.py revoke-all            # revokes the DEVELOPMENT / DISTRIBUTION certificates created via API (displayName 'Created via API')
Environment: ASC_KEY_ID, ASC_ISSUER_ID, RUNNER_TEMP (the key is $RUNNER_TEMP/keys/AuthKey_<id>.p8).
"""

import base64
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
MANAGED_TYPES = {"DEVELOPMENT", "DISTRIBUTION", "IOS_DEVELOPMENT", "IOS_DISTRIBUTION"}


def token():
    now = int(time.time())
    return jwt.encode({"iss": ISSUER_ID, "iat": now, "exp": now + 600, "aud": "appstoreconnect-v1"},
                      KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"})


def api(method, path, body=None, tolerate=False):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(API + path, data=data, method=method,
                                 headers={"Authorization": f"Bearer {token()}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print(f"{method} {path} -> HTTP {e.code}")
        print(e.read().decode(errors="replace")[:2000])
        if tolerate:
            return None
        sys.exit(1)


def list_certs():
    out = []
    path = "/v1/certificates?" + urllib.parse.urlencode({"limit": 200, "fields[certificates]": "certificateType,displayName,name,expirationDate,serialNumber,platform"})
    while path:
        res = api("GET", path)
        out.extend(res.get("data", []))
        nxt = res.get("links", {}).get("next")
        path = nxt.replace(API, "") if nxt else None
    return out


def cmd_list():
    certs = list_certs()
    print(f"{len(certs)} certificate(s)")
    print(f"{'id':<12} {'type':<18} {'expires':<12} name")
    for c in certs:
        a = c["attributes"]
        print(f"{c['id']:<12} {a.get('certificateType', ''):<18} {(a.get('expirationDate') or '')[:10]:<12} {a.get('displayName') or a.get('name') or ''}")
    return certs


def cmd_create(cert_type, csr_path, out_path):
    csr = open(csr_path).read()
    res = api("POST", "/v1/certificates", {"data": {"type": "certificates", "attributes": {"certificateType": cert_type, "csrContent": csr}}})
    a = res["data"]["attributes"]
    open(out_path, "wb").write(base64.b64decode(a["certificateContent"]))
    print(f"created {cert_type} certificate {res['data']['id']} ({a.get('displayName') or a.get('name')}), expires {(a.get('expirationDate') or '')[:10]}")


def cmd_revoke(ids):
    for cid in ids:
        if api("DELETE", f"/v1/certificates/{cid}", tolerate=True) is None:
            print(f"::warning::could not revoke {cid} (Xcode-created certificates can only be revoked in the developer portal or by Apple support)")
        else:
            print(f"revoked {cid}")


def cmd_revoke_all():
    # CI（API）で作ったものだけ：displayName が "Created via API"。Xcode が作ったもの（人名）は API では失効できない
    targets = [c for c in list_certs()
               if c["attributes"].get("certificateType") in MANAGED_TYPES and (c["attributes"].get("displayName") or "") == "Created via API"]
    if not targets:
        print("nothing to revoke")
        return
    cmd_revoke([c["id"] for c in targets])


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "list"
    if cmd == "list":
        cmd_list()
    elif cmd == "create":
        cmd_create(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == "revoke":
        cmd_revoke([x for x in sys.argv[2].split(",") if x])
    elif cmd == "revoke-all":
        cmd_revoke_all()
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
