"""Fill the App Store product page from store/metadata/*.json (and store/screenshots/ when present).

What it sets (App Store Connect API, OpenAPI 4.x):
- App: primaryLocale, contentRightsDeclaration (no third-party content)
- App Info: name / subtitle / privacyPolicyUrl per locale, primary + secondary category, age rating (all "none")
- App Store Version (editable one; created when none exists): versionString, and per locale description / keywords /
  supportUrl / marketingUrl / promotionalText / whatsNew
- Screenshots: store/screenshots/<locale>/<DISPLAY_TYPE>/*.png|jpg, e.g. store/screenshots/ja/APP_IPHONE_67/01.png.
  A folder that exists replaces that set's screenshots (sorted by file name). Folders that don't exist are left alone.
App Privacy (the "nutrition label") has no public API and must be answered once in App Store Connect.

Usage: asc_metadata.py <bundle id> <version string> [metadata dir] [screenshots dir]
Environment: ASC_KEY_ID, ASC_ISSUER_ID, RUNNER_TEMP (key at $RUNNER_TEMP/keys/AuthKey_<id>.p8)
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

EDITABLE_STATES = {"PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY"}
PRIMARY_CATEGORY = "UTILITIES"
SECONDARY_CATEGORY = "PRODUCTIVITY"
AGE_RATING_NONE = {
    "alcoholTobaccoOrDrugUseOrReferences": "NONE",
    "contests": "NONE",
    "gamblingSimulated": "NONE",
    "horrorOrFearThemes": "NONE",
    "matureOrSuggestiveThemes": "NONE",
    "medicalOrTreatmentInformation": "NONE",
    "profanityOrCrudeHumor": "NONE",
    "sexualContentGraphicAndNudity": "NONE",
    "sexualContentOrNudity": "NONE",
    "violenceCartoonOrFantasy": "NONE",
    "violenceRealistic": "NONE",
    "violenceRealisticProlongedGraphicOrSadistic": "NONE",
    "gunsOrOtherWeapons": "NONE",
    "gambling": False,
    "unrestrictedWebAccess": False,
    "lootBox": False,
    "userGeneratedContent": False,
    "advertising": False,
    "ageAssurance": False,
    "healthOrWellnessTopics": False,
    "messagingAndChat": False,
    "parentalControls": False,
}


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


def rel(type_, id_):
    return {"data": {"type": type_, "id": id_}}


def find_app(bundle_id):
    _, res = api("GET", f"/v1/apps?{q(**{'filter[bundleId]': bundle_id, 'fields[apps]': 'bundleId,name,primaryLocale'})}")
    if not res["data"]:
        print(f"::error::No App Store Connect app with bundle ID {bundle_id}")
        sys.exit(1)
    return res["data"][0]


def set_app_attributes(app_id, primary_locale):
    api("PATCH", f"/v1/apps/{app_id}", {"data": {"type": "apps", "id": app_id, "attributes": {
        "primaryLocale": primary_locale, "contentRightsDeclaration": "DOES_NOT_USE_THIRD_PARTY_CONTENT"}}})
    print(f"app: primaryLocale={primary_locale}, contentRights=DOES_NOT_USE_THIRD_PARTY_CONTENT")


def editable_app_info(app_id):
    _, res = api("GET", f"/v1/apps/{app_id}/appInfos?{q(**{'fields[appInfos]': 'appStoreState,state'})}")
    infos = res["data"]
    for i in infos:
        st = i["attributes"].get("state") or i["attributes"].get("appStoreState")
        if st in EDITABLE_STATES:
            return i
    return infos[0] if infos else None


def upsert_app_info_localizations(info_id, metas):
    _, res = api("GET", f"/v1/appInfos/{info_id}/appInfoLocalizations?{q(**{'fields[appInfoLocalizations]': 'locale,name,subtitle,privacyPolicyUrl'})}")
    existing = {l["attributes"]["locale"]: l for l in res["data"]}
    for m in metas:
        attrs = {k: m[k] for k in ("name", "subtitle", "privacyPolicyUrl") if m.get(k)}
        if m["locale"] in existing:
            api("PATCH", f"/v1/appInfoLocalizations/{existing[m['locale']]['id']}", {"data": {
                "type": "appInfoLocalizations", "id": existing[m["locale"]]["id"], "attributes": attrs}})
            print(f"app info ({m['locale']}): updated")
        else:
            api("POST", "/v1/appInfoLocalizations", {"data": {
                "type": "appInfoLocalizations", "attributes": {"locale": m["locale"], **attrs},
                "relationships": {"appInfo": rel("appInfos", info_id)}}})
            print(f"app info ({m['locale']}): created")


def set_categories(info_id):
    api("PATCH", f"/v1/appInfos/{info_id}", {"data": {"type": "appInfos", "id": info_id, "relationships": {
        "primaryCategory": rel("appCategories", PRIMARY_CATEGORY),
        "secondaryCategory": rel("appCategories", SECONDARY_CATEGORY)}}})
    print(f"categories: {PRIMARY_CATEGORY} / {SECONDARY_CATEGORY}")


def set_age_rating(info_id):
    status, res = api("GET", f"/v1/appInfos/{info_id}/ageRatingDeclaration", ok=(200, 404))
    if status != 200 or not res.get("data"):
        print("age rating: declaration not available via API; set it in App Store Connect")
        return
    decl_id = res["data"]["id"]
    api("PATCH", f"/v1/ageRatingDeclarations/{decl_id}", {"data": {
        "type": "ageRatingDeclarations", "id": decl_id, "attributes": AGE_RATING_NONE}})
    print("age rating: all none (4+)")


def editable_version(app_id, version_string):
    _, res = api("GET", f"/v1/apps/{app_id}/appStoreVersions?{q(**{'filter[platform]': 'IOS', 'fields[appStoreVersions]': 'versionString,appStoreState,appVersionState', 'limit': 20})}")
    for v in res["data"]:
        st = v["attributes"].get("appVersionState") or v["attributes"].get("appStoreState")
        if st in EDITABLE_STATES:
            if v["attributes"].get("versionString") != version_string:
                api("PATCH", f"/v1/appStoreVersions/{v['id']}", {"data": {
                    "type": "appStoreVersions", "id": v["id"], "attributes": {"versionString": version_string}}})
                print(f"version: {v['attributes'].get('versionString')} -> {version_string} ({st})")
            else:
                print(f"version: {version_string} ({st})")
            return v
    _, res = api("POST", "/v1/appStoreVersions", {"data": {
        "type": "appStoreVersions", "attributes": {"platform": "IOS", "versionString": version_string},
        "relationships": {"app": rel("apps", app_id)}}})
    print(f"version: {version_string} created")
    return res["data"]


def upsert_version_localizations(version_id, metas):
    _, res = api("GET", f"/v1/appStoreVersions/{version_id}/appStoreVersionLocalizations?{q(**{'fields[appStoreVersionLocalizations]': 'locale'})}")
    existing = {l["attributes"]["locale"]: l for l in res["data"]}
    out = {}
    for m in metas:
        attrs = {k: m[k] for k in ("description", "keywords", "supportUrl", "marketingUrl", "promotionalText", "whatsNew") if m.get(k)}
        if m["locale"] in existing:
            loc = existing[m["locale"]]
            api("PATCH", f"/v1/appStoreVersionLocalizations/{loc['id']}", {"data": {
                "type": "appStoreVersionLocalizations", "id": loc["id"], "attributes": attrs}})
            print(f"version text ({m['locale']}): updated")
        else:
            _, res = api("POST", "/v1/appStoreVersionLocalizations", {"data": {
                "type": "appStoreVersionLocalizations", "attributes": {"locale": m["locale"], **attrs},
                "relationships": {"appStoreVersion": rel("appStoreVersions", version_id)}}})
            loc = res["data"]
            print(f"version text ({m['locale']}): created")
        out[m["locale"]] = loc["id"]
    return out


def upload_file(path, create_path, create_type, parent_rel_name, parent_type, parent_id):
    size = os.path.getsize(path)
    _, res = api("POST", create_path, {"data": {
        "type": create_type, "attributes": {"fileName": os.path.basename(path), "fileSize": size},
        "relationships": {parent_rel_name: rel(parent_type, parent_id)}}})
    item = res["data"]
    ops = item["attributes"].get("uploadOperations") or []
    with open(path, "rb") as f:
        blob = f.read()
    for op in ops:
        chunk = blob[op["offset"]:op["offset"] + op["length"]]
        req = urllib.request.Request(op["url"], data=chunk, method=op["method"],
                                     headers={h["name"]: h["value"] for h in op.get("requestHeaders", [])})
        with urllib.request.urlopen(req, timeout=120) as r:
            if r.status >= 300:
                print(f"::error::upload part failed HTTP {r.status}")
                sys.exit(1)
    api("PATCH", f"/v1/{create_type}/{item['id']}", {"data": {
        "type": create_type, "id": item["id"],
        "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(blob).hexdigest()}}})
    return item["id"]


def sync_screenshots(loc_ids, root):
    if not os.path.isdir(root):
        print("screenshots: no store/screenshots directory, skipped")
        return
    for locale, loc_id in loc_ids.items():
        ldir = os.path.join(root, locale)
        if not os.path.isdir(ldir):
            continue
        _, res = api("GET", f"/v1/appStoreVersionLocalizations/{loc_id}/appScreenshotSets?{q(**{'fields[appScreenshotSets]': 'screenshotDisplayType', 'limit': 50})}")
        sets = {s["attributes"]["screenshotDisplayType"]: s["id"] for s in res["data"]}
        for display in sorted(os.listdir(ldir)):
            ddir = os.path.join(ldir, display)
            if not os.path.isdir(ddir):
                continue
            files = sorted(f for f in os.listdir(ddir) if f.lower().endswith((".png", ".jpg", ".jpeg")))
            if not files:
                continue
            if display not in sets:
                _, res = api("POST", "/v1/appScreenshotSets", {"data": {
                    "type": "appScreenshotSets", "attributes": {"screenshotDisplayType": display},
                    "relationships": {"appStoreVersionLocalization": rel("appStoreVersionLocalizations", loc_id)}}})
                sets[display] = res["data"]["id"]
            set_id = sets[display]
            _, res = api("GET", f"/v1/appScreenshotSets/{set_id}/appScreenshots?{q(**{'fields[appScreenshots]': 'fileName', 'limit': 20})}")
            for shot in res["data"]:
                api("DELETE", f"/v1/appScreenshots/{shot['id']}")
            for f in files:
                upload_file(os.path.join(ddir, f), "/v1/appScreenshots", "appScreenshots", "appScreenshotSet", "appScreenshotSets", set_id)
            print(f"screenshots ({locale}/{display}): {len(files)} uploaded")


def main():
    bundle_id, version_string = sys.argv[1:3]
    meta_dir = sys.argv[3] if len(sys.argv) > 3 else "store/metadata"
    shots_dir = sys.argv[4] if len(sys.argv) > 4 else "store/screenshots"
    metas = [json.load(open(os.path.join(meta_dir, f), encoding="utf-8")) for f in sorted(os.listdir(meta_dir)) if f.endswith(".json")]
    if not metas:
        print(f"::error::No metadata json in {meta_dir}")
        sys.exit(1)
    primary = "ja" if any(m["locale"] == "ja" for m in metas) else metas[0]["locale"]

    app = find_app(bundle_id)
    app_id = app["id"]
    print("app:", app["attributes"].get("name"))
    set_app_attributes(app_id, primary)

    info = editable_app_info(app_id)
    if info is None:
        print("::error::No app info record")
        sys.exit(1)
    upsert_app_info_localizations(info["id"], metas)
    set_categories(info["id"])
    set_age_rating(info["id"])

    version = editable_version(app_id, version_string)
    loc_ids = upsert_version_localizations(version["id"], metas)
    sync_screenshots(loc_ids, shots_dir)
    print("Done. Remaining manual items in App Store Connect: App Privacy questionnaire, pricing, and attaching a build to the version.")


if __name__ == "__main__":
    main()
