"""Steam co-op vs singleplayer winner-take-all study — data collection pipeline.

Stages (all checkpointed in data/collect.sqlite, safe to interrupt/resume):
  master  — SteamSpy request=all paging -> master game list (owners-sorted, price prefilter source)
  enrich  — 3 worker threads:
              S: SteamSpy appdetails (tags) -> cohort candidate classification
              T: Steam official appdetails (release date, type, categories) for candidates
              R: Steam appreviews total_reviews for fully-qualified games
  build   — join + final filters -> data/games.csv

Usage:
  python collect/pipeline.py master [--max-pages N]
  python collect/pipeline.py enrich [--target-per-cohort N] [--max-seconds N]
  python collect/pipeline.py build
  python collect/pipeline.py status
"""
import argparse
import json
import random
import re
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "collect.sqlite"
CSV_PATH = ROOT / "data" / "games.csv"
UA = "insight1-research/0.1 (academic distribution study; dev@concode.co)"

RELEASE_MIN = "2022-01-01"
RELEASE_MAX = "2025-06-30"
MAX_PRICE_CENTS = 3999  # exclude >= $40 (AAA proxy)

TAGS_A_COOP = {"Online Co-Op", "Co-op"}
TAG_MULTI = "Multiplayer"
TAGS_B_NARRATIVE = {"Story Rich", "Adventure", "Puzzle"}
TAGS_R_ROGUE = {"Rogue-like", "Rogue-lite", "Action Roguelike",
                "Roguelike Deckbuilder", "Roguevania", "Traditional Roguelike"}
TAG_SINGLE = "Singleplayer"
TAGS_B_EXCLUDE = {
    "Co-op", "Online Co-Op", "Local Co-Op", "Co-op Campaign",
    "Multiplayer", "Massively Multiplayer",
}
# modest AAA publisher blocklist (lowercase substring match)
BIG_PUBLISHERS = [
    "electronic arts", "ubisoft", "activision", "bethesda", "2k ", "2k games",
    "square enix", "capcom", "bandai namco", "sega", "warner bros", "xbox game studios",
    "sony interactive", "rockstar", "take-two", "cd projekt red", "blizzard",
]

STOP = threading.Event()
SS_FINISHED = threading.Event()


# ---------------------------------------------------------------- db helpers

def db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=60)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db(conn):
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS games(
        appid INTEGER PRIMARY KEY,
        name TEXT, src_page INTEGER, publisher TEXT,
        m_positive INTEGER, m_negative INTEGER, m_owners TEXT,
        m_price INTEGER, m_initialprice INTEGER,
        rnd INTEGER,
        ss_status TEXT DEFAULT 'pending',
        ss_tags TEXT, ss_positive INTEGER, ss_negative INTEGER,
        ss_price INTEGER, ss_initialprice INTEGER, ss_fetched_at TEXT,
        cand TEXT,
        st_status TEXT,
        st_type TEXT, st_release_date TEXT, st_coming_soon INTEGER,
        st_is_free INTEGER, st_price_initial INTEGER, st_currency TEXT,
        st_categories TEXT, st_genres TEXT, st_publishers TEXT, st_fetched_at TEXT,
        qualified INTEGER,
        ar_status TEXT, ar_total_reviews INTEGER, ar_fetched_at TEXT
    );
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS skiplist(appid INTEGER, stage TEXT, reason TEXT,
        ts TEXT, PRIMARY KEY(appid, stage));
    CREATE INDEX IF NOT EXISTS idx_ss ON games(ss_status, rnd);
    CREATE INDEX IF NOT EXISTS idx_st ON games(st_status);
    CREATE INDEX IF NOT EXISTS idx_ar ON games(ar_status);
    """)
    conn.commit()


def meta_get(conn, key, default=None):
    row = conn.execute("SELECT value FROM meta WHERE key=?", (key,)).fetchone()
    return row[0] if row else default


def meta_set(conn, key, value):
    conn.execute("INSERT OR REPLACE INTO meta(key,value) VALUES(?,?)", (key, str(value)))
    conn.commit()


# ---------------------------------------------------------------- http helpers

def make_session():
    s = requests.Session()
    s.headers["User-Agent"] = UA
    return s


def get_json(session, url, params, min_interval_holder, lock, tries=3, base_backoff=10):
    """GET with per-caller pacing + 429/5xx exponential backoff. Returns (json|None, reason)."""
    for attempt in range(tries):
        if STOP.is_set():
            return None, "stopped"
        with lock:
            wait = min_interval_holder["next_at"] - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            min_interval_holder["next_at"] = time.monotonic() + min_interval_holder["interval"]
        try:
            r = session.get(url, params=params, timeout=30)
        except requests.RequestException as e:
            time.sleep(base_backoff * (2 ** attempt))
            last = f"exc:{type(e).__name__}"
            continue
        if r.status_code == 200:
            try:
                return r.json(), None
            except ValueError:
                last = "badjson"
                time.sleep(base_backoff * (2 ** attempt))
                continue
        if r.status_code in (429, 500, 502, 503):
            # server asks to slow down: back off, and stretch pacing a bit
            time.sleep(base_backoff * (2 ** attempt) * (3 if r.status_code == 429 else 1))
            with lock:
                min_interval_holder["interval"] = min(min_interval_holder["interval"] * 1.15, 6.0)
            last = f"http{r.status_code}"
            continue
        return None, f"http{r.status_code}"
    return None, last


# ---------------------------------------------------------------- stage: master

def stage_master(max_pages):
    conn = db()
    init_db(conn)
    session = make_session()
    page = int(meta_get(conn, "master_next_page", 0))
    if meta_get(conn, "master_done") == "1":
        print("master already complete")
        return
    while page < max_pages and not STOP.is_set():
        if page > 0 or meta_get(conn, "master_started"):
            time.sleep(61)  # request=all: 1 per 60s
        meta_set(conn, "master_started", "1")
        try:
            r = session.get("https://steamspy.com/api.php",
                            params={"request": "all", "page": page}, timeout=60)
            data = r.json() if r.status_code == 200 else None
        except (requests.RequestException, ValueError):
            data = None
        if data is None:
            print(f"[master] page {page}: fetch failed, retrying once after 90s", flush=True)
            time.sleep(90)
            try:
                r = session.get("https://steamspy.com/api.php",
                                params={"request": "all", "page": page}, timeout=60)
                data = r.json() if r.status_code == 200 else None
            except (requests.RequestException, ValueError):
                data = None
            if data is None:
                print(f"[master] page {page}: failed twice, aborting (resume later)", flush=True)
                return
        if not data:
            meta_set(conn, "master_done", "1")
            print(f"[master] page {page} empty -> master list complete", flush=True)
            break
        rows = []
        for k, g in data.items():
            appid = int(g["appid"])
            rnd = (appid * 2654435761) % (2 ** 32)  # deterministic shuffle key
            rows.append((appid, g.get("name"), page, g.get("publisher"),
                         g.get("positive"), g.get("negative"), g.get("owners"),
                         int(g.get("price") or 0), int(g.get("initialprice") or 0), rnd))
        conn.executemany("""INSERT INTO games(appid,name,src_page,publisher,m_positive,
            m_negative,m_owners,m_price,m_initialprice,rnd) VALUES(?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(appid) DO UPDATE SET name=excluded.name, src_page=excluded.src_page,
            publisher=excluded.publisher, m_positive=excluded.m_positive,
            m_negative=excluded.m_negative, m_owners=excluded.m_owners,
            m_price=excluded.m_price, m_initialprice=excluded.m_initialprice""", rows)
        conn.commit()
        page += 1
        meta_set(conn, "master_next_page", page)
        n = conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]
        print(f"[master] page {page - 1}: +{len(rows)} games (total {n})", flush=True)
    conn.close()


# ---------------------------------------------------------------- classification

def is_big_publisher(pub):
    p = (pub or "").lower()
    return any(b in p for b in BIG_PUBLISHERS)


def classify(tags):
    """Disjoint cohorts, priority A (co-op) > R (roguelike) > B (narrative single)."""
    tagset = set(tags)
    if (tagset & TAGS_A_COOP) and TAG_MULTI in tagset:
        return "A"
    if (tagset & TAGS_R_ROGUE) and not (tagset & TAGS_B_EXCLUDE):
        return "R"
    if (TAG_SINGLE in tagset and (tagset & TAGS_B_NARRATIVE)
            and not (tagset & TAGS_B_EXCLUDE)):
        return "B"
    return "none"


def parse_release(rd):
    """Steam release_date.date (english) -> ISO date or None."""
    if not rd:
        return None
    rd = rd.strip()
    for fmt in ("%d %b, %Y", "%b %d, %Y", "%d %B, %Y", "%B %d, %Y", "%b %Y", "%B %Y", "%Y"):
        try:
            return datetime.strptime(rd, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    m = re.search(r"(19|20)\d\d", rd)
    return f"{m.group(0)}-06-15" if m else None


# ---------------------------------------------------------------- stage: enrich

def worker_steamspy(conn_factory, target_per_cohort):
    conn = conn_factory()
    session = make_session()
    pace = {"interval": 1.1, "next_at": 0.0}
    lock = threading.Lock()
    while not STOP.is_set():
        if target_per_cohort:
            counts = dict(conn.execute(
                "SELECT cand, COUNT(*) FROM games WHERE cand IN ('A','B') GROUP BY cand"))
            if counts.get("A", 0) >= target_per_cohort and counts.get("B", 0) >= target_per_cohort:
                print("[ss] pilot targets reached", flush=True)
                break
        row = conn.execute("""SELECT appid FROM games WHERE ss_status='pending'
            AND m_initialprice > 0 AND m_initialprice <= ?
            ORDER BY rnd LIMIT 1""", (MAX_PRICE_CENTS,)).fetchone()
        if not row:
            print("[ss] pool exhausted", flush=True)
            break
        appid = row[0]
        data, reason = get_json(session, "https://steamspy.com/api.php",
                                {"request": "appdetails", "appid": appid}, pace, lock)
        if data is None or "appid" not in data:
            conn.execute("UPDATE games SET ss_status='error' WHERE appid=?", (appid,))
            conn.execute("INSERT OR REPLACE INTO skiplist VALUES(?,?,?,?)",
                         (appid, "steamspy", reason or "noappid",
                          datetime.now(timezone.utc).isoformat()))
            conn.commit()
            continue
        tags = data.get("tags") or {}
        tags = list(tags.keys()) if isinstance(tags, dict) else []
        cand = classify(tags)
        if is_big_publisher(data.get("publisher")):
            cand = "none"
        conn.execute("""UPDATE games SET ss_status='done', ss_tags=?, ss_positive=?,
            ss_negative=?, ss_price=?, ss_initialprice=?, ss_fetched_at=?, cand=?,
            st_status=CASE WHEN ?='none' THEN NULL ELSE 'pending' END
            WHERE appid=?""",
            (json.dumps(tags), data.get("positive"), data.get("negative"),
             int(data.get("price") or 0), int(data.get("initialprice") or 0),
             datetime.now(timezone.utc).isoformat(), cand, cand, appid))
        conn.commit()
    SS_FINISHED.set()
    conn.close()


def worker_store(conn_factory):
    """Steam official appdetails for cohort candidates."""
    conn = conn_factory()
    session = make_session()
    pace = {"interval": 1.6, "next_at": 0.0}
    lock = threading.Lock()
    idle = 0
    while not STOP.is_set():
        row = conn.execute(
            """SELECT appid FROM games WHERE st_status='pending'
               ORDER BY CASE WHEN cand='R' THEN 1 ELSE 0 END, rnd LIMIT 1""").fetchone()
        if not row:
            idle += 1
            if idle > 12 and SS_FINISHED.is_set():
                print("[st] queue drained and steamspy worker finished", flush=True)
                break
            time.sleep(5)
            continue
        idle = 0
        appid = row[0]
        data, reason = get_json(session, "https://store.steampowered.com/api/appdetails",
                                {"appids": appid, "cc": "us", "l": "english",
                                 "filters": "basic,release_date,genres,categories,price_overview"},
                                pace, lock, base_backoff=20)
        entry = (data or {}).get(str(appid)) or {}
        if data is None or not entry:
            conn.execute("UPDATE games SET st_status='error' WHERE appid=?", (appid,))
            conn.execute("INSERT OR REPLACE INTO skiplist VALUES(?,?,?,?)",
                         (appid, "store", reason or "empty",
                          datetime.now(timezone.utc).isoformat()))
            conn.commit()
            continue
        if not entry.get("success"):
            # delisted / region-locked: no store data available
            conn.execute("UPDATE games SET st_status='nodata', qualified=0 WHERE appid=?",
                         (appid,))
            conn.commit()
            continue
        d = entry["data"]
        rel = d.get("release_date") or {}
        po = d.get("price_overview") or {}
        cats = [c.get("description") for c in d.get("categories") or []]
        genres = [g.get("description") for g in d.get("genres") or []]
        release = parse_release(rel.get("date"))
        qualified = int(
            d.get("type") == "game"
            and not rel.get("coming_soon")
            and not d.get("is_free")
            and release is not None
            and RELEASE_MIN <= release <= RELEASE_MAX
            and (po.get("initial") is None or po.get("initial") <= MAX_PRICE_CENTS
                 or po.get("currency") != "USD")
        )
        conn.execute("""UPDATE games SET st_status='done', st_type=?, st_release_date=?,
            st_coming_soon=?, st_is_free=?, st_price_initial=?, st_currency=?,
            st_categories=?, st_genres=?, st_publishers=?, st_fetched_at=?,
            qualified=?, ar_status=CASE WHEN ?=1 THEN 'pending' ELSE NULL END
            WHERE appid=?""",
            (d.get("type"), release, int(bool(rel.get("coming_soon"))),
             int(bool(d.get("is_free"))), po.get("initial"), po.get("currency"),
             json.dumps(cats), json.dumps(genres),
             json.dumps(d.get("publishers") or []),
             datetime.now(timezone.utc).isoformat(), qualified, qualified, appid))
        conn.commit()
    conn.close()


def worker_reviews(conn_factory):
    """Authoritative review totals via appreviews for qualified games."""
    conn = conn_factory()
    session = make_session()
    pace = {"interval": 1.1, "next_at": 0.0}
    lock = threading.Lock()
    idle = 0
    while not STOP.is_set():
        row = conn.execute(
            """SELECT appid FROM games WHERE ar_status='pending'
               ORDER BY CASE WHEN cand='R' THEN 1 ELSE 0 END, rnd LIMIT 1""").fetchone()
        if not row:
            idle += 1
            if idle > 12 and SS_FINISHED.is_set() and not conn.execute(
                    "SELECT 1 FROM games WHERE st_status='pending' LIMIT 1").fetchone():
                print("[ar] queue drained", flush=True)
                break
            time.sleep(5)
            continue
        idle = 0
        appid = row[0]
        data, reason = get_json(session,
                                f"https://store.steampowered.com/appreviews/{appid}",
                                {"json": 1, "num_per_page": 0, "language": "all",
                                 "purchase_type": "all"}, pace, lock, base_backoff=15)
        qs = (data or {}).get("query_summary") or {}
        if data is None or "total_reviews" not in qs:
            conn.execute("UPDATE games SET ar_status='error' WHERE appid=?", (appid,))
            conn.execute("INSERT OR REPLACE INTO skiplist VALUES(?,?,?,?)",
                         (appid, "appreviews", reason or "nosummary",
                          datetime.now(timezone.utc).isoformat()))
        else:
            conn.execute("""UPDATE games SET ar_status='done', ar_total_reviews=?,
                ar_fetched_at=? WHERE appid=?""",
                (qs["total_reviews"], datetime.now(timezone.utc).isoformat(), appid))
        conn.commit()
    conn.close()


def stage_enrich(target_per_cohort, max_seconds):
    conn = db()
    init_db(conn)
    conn.close()
    threads = [
        threading.Thread(target=worker_steamspy, args=(db, target_per_cohort), name="ss"),
        threading.Thread(target=worker_store, args=(db,), name="st"),
        threading.Thread(target=worker_reviews, args=(db,), name="ar"),
    ]
    for t in threads:
        t.start()
    start = time.time()
    try:
        while any(t.is_alive() for t in threads):
            time.sleep(30)
            print_status(prefix="[enrich] ")
            if max_seconds and time.time() - start > max_seconds:
                print("[enrich] time budget reached, stopping (resumable)", flush=True)
                STOP.set()
    except KeyboardInterrupt:
        STOP.set()
    for t in threads:
        t.join()


# ---------------------------------------------------------------- stage: build

def stage_build():
    import pandas as pd
    conn = db()
    q = """SELECT appid, name, cand AS cohort, st_release_date AS release_date,
                  st_price_initial, ss_initialprice, m_initialprice,
                  ss_tags, ss_positive, ss_negative, ar_total_reviews, ar_status,
                  st_publishers
           FROM games WHERE qualified=1 AND cand IN ('A','B','R')"""
    df = pd.read_sql(q, conn)
    # authoritative review count: appreviews; fallback steamspy positive+negative
    ss_total = df.ss_positive.fillna(0) + df.ss_negative.fillna(0)
    df["total_reviews"] = df.ar_total_reviews.where(df.ar_status == "done", ss_total)
    df["review_source"] = (df.ar_status == "done").map({True: "appreviews", False: "steamspy"})
    df["price"] = (df.st_price_initial.fillna(df.ss_initialprice)
                     .fillna(df.m_initialprice) / 100.0)
    df["tags"] = df.ss_tags
    out = df[["appid", "name", "release_date", "price", "tags",
              "total_reviews", "review_source", "cohort"]].copy()
    out["total_reviews"] = out.total_reviews.astype(int)
    CSV_PATH.parent.mkdir(exist_ok=True)
    out.to_csv(CSV_PATH, index=False)
    print(f"wrote {CSV_PATH}: {len(out)} games "
          f"(A={len(out[out.cohort == 'A'])}, B={len(out[out.cohort == 'B'])}, "
          f"R={len(out[out.cohort == 'R'])})")
    conn.close()


# ---------------------------------------------------------------- status

def print_status(prefix=""):
    conn = db()
    init_db(conn)
    n = conn.execute("SELECT COUNT(*) FROM games").fetchone()[0]
    pool = conn.execute("""SELECT COUNT(*) FROM games WHERE m_initialprice > 0
        AND m_initialprice <= ?""", (MAX_PRICE_CENTS,)).fetchone()[0]
    ss = dict(conn.execute("""SELECT ss_status, COUNT(*) FROM games
        WHERE m_initialprice > 0 AND m_initialprice <= ? GROUP BY ss_status""",
        (MAX_PRICE_CENTS,)))
    cand = dict(conn.execute(
        "SELECT cand, COUNT(*) FROM games WHERE cand IN ('A','B','R') GROUP BY cand"))
    st = dict(conn.execute(
        "SELECT st_status, COUNT(*) FROM games WHERE st_status IS NOT NULL GROUP BY st_status"))
    qual = dict(conn.execute("""SELECT cand, COUNT(*) FROM games WHERE qualified=1
        AND cand IN ('A','B','R') GROUP BY cand"""))
    ar = dict(conn.execute(
        "SELECT ar_status, COUNT(*) FROM games WHERE ar_status IS NOT NULL GROUP BY ar_status"))
    print(f"{prefix}master={n} pool={pool} ss_done={ss.get('done', 0)} "
          f"ss_pending={ss.get('pending', 0)} cand A={cand.get('A', 0)} B={cand.get('B', 0)} R={cand.get('R', 0)} | "
          f"store done={st.get('done', 0)} pend={st.get('pending', 0)} "
          f"nodata={st.get('nodata', 0)} | qualified A={qual.get('A', 0)} B={qual.get('B', 0)} R={qual.get('R', 0)} | "
          f"reviews done={ar.get('done', 0)} pend={ar.get('pending', 0)}", flush=True)
    conn.close()


# ---------------------------------------------------------------- retry-errors

def stage_retry_errors():
    conn = db()
    init_db(conn)
    n_ss = conn.execute(
        "UPDATE games SET ss_status='pending' WHERE ss_status='error'").rowcount
    n_st = conn.execute(
        "UPDATE games SET st_status='pending' WHERE st_status='error'").rowcount
    n_ar = conn.execute(
        "UPDATE games SET ar_status='pending' WHERE ar_status='error'").rowcount
    conn.commit()
    conn.close()
    print(f"reset to pending: steamspy={n_ss} store={n_st} appreviews={n_ar}")


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["master", "enrich", "build", "status",
                                      "retry-errors"])
    ap.add_argument("--max-pages", type=int, default=200)
    ap.add_argument("--target-per-cohort", type=int, default=None)
    ap.add_argument("--max-seconds", type=int, default=None)
    args = ap.parse_args()
    random.seed(42)
    if args.stage == "master":
        stage_master(args.max_pages)
    elif args.stage == "enrich":
        stage_enrich(args.target_per_cohort, args.max_seconds)
    elif args.stage == "build":
        stage_build()
    elif args.stage == "retry-errors":
        stage_retry_errors()
    else:
        print_status()


if __name__ == "__main__":
    main()
