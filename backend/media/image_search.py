"""Relevant, attributed flashcard imagery from Wikimedia Commons."""

import asyncio
import html
import re
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote, urlparse

import httpx

WIKIPEDIA_SEARCH_API = "https://en.wikipedia.org/w/rest.php/v1/search/page"
WIKIPEDIA_SUMMARY_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{page_key}"
USER_AGENT = "EduNexus/2.0 (local educational flashcards)"


def _plain(value: Any, limit: int = 160) -> str:
    text = re.sub(r"<[^>]+>", " ", html.unescape(str(value or "")))
    return re.sub(r"\s+", " ", text).strip()[:limit]


async def search_commons_images(query: str, client: httpx.AsyncClient) -> List[Dict[str, str]]:
    if not query.strip():
        return []
    response = await client.get(WIKIPEDIA_SEARCH_API, params={"q": query.strip(), "limit": "5"})
    response.raise_for_status()
    results = []
    for page in response.json().get("pages", []):
        thumbnail = page.get("thumbnail") or {}
        image_url = thumbnail.get("url")
        if not image_url or not str(thumbnail.get("mimetype", "")).startswith("image/"):
            continue
        if image_url.startswith("//"):
            image_url = f"https:{image_url}"
        title = _plain(page.get("title", ""), 100)
        results.append({
            "remote_url": image_url,
            "page_key": str(page.get("key") or title).replace(" ", "_"),
            "source_url": f"https://en.wikipedia.org/wiki/{quote(str(page.get('key') or title).replace(' ', '_'))}",
            "title": title,
            "alt": _plain(page.get("description") or page.get("excerpt") or title, 140),
            "attribution": "Wikipedia / Wikimedia Commons",
            "license": "See source",
        })
    return results


async def _download_image(image: Dict[str, str], media_dir: str, client: httpx.AsyncClient) -> Optional[Dict[str, str]]:
    image_url = image["remote_url"]
    page_key = image.get("page_key")
    if page_key:
        try:
            summary = await client.get(WIKIPEDIA_SUMMARY_API.format(page_key=quote(page_key, safe="")))
            summary.raise_for_status()
            summary_data = summary.json()
            full_image = summary_data.get("originalimage") or summary_data.get("thumbnail") or {}
            image_url = full_image.get("source") or image_url
        except (httpx.HTTPError, ValueError):
            pass
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith("wikimedia.org"):
        return None
    response = await client.get(image_url)
    response.raise_for_status()
    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
    extension = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}.get(content_type)
    if not extension or len(response.content) > 6 * 1024 * 1024:
        return None
    Path(media_dir).mkdir(parents=True, exist_ok=True)
    filename = f"flashcard_{uuid.uuid4().hex}{extension}"
    (Path(media_dir) / filename).write_bytes(response.content)
    return {key: value for key, value in image.items() if key not in {"remote_url", "page_key"}} | {"url": f"/api/learn/media/{filename}"}


async def enrich_flashcards_with_images(deck: Dict[str, Any], topic: str, media_dir: str) -> Dict[str, Any]:
    cards = deck.get("cards") or []
    if not cards:
        return deck
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(7.0, connect=4.0), follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
            queries = [str(card.get("image_query") or f"{card.get('title', topic)} {topic}")[:180] for card in cards]
            searches = await asyncio.gather(*(search_commons_images(query, client) for query in queries), return_exceptions=True)
            used = set()
            selections = []
            for result in searches:
                candidates = result if isinstance(result, list) else []
                selection = next((item for item in candidates if item["remote_url"] not in used), None)
                if selection:
                    used.add(selection["remote_url"])
                selections.append(selection)
            downloads = await asyncio.gather(*(
                _download_image(selection, media_dir, client) if selection else asyncio.sleep(0, result=None)
                for selection in selections
            ), return_exceptions=True)
            for card, downloaded in zip(cards, downloads):
                if isinstance(downloaded, dict):
                    card["image"] = downloaded
    except (httpx.HTTPError, OSError, ValueError):
        return deck
    return deck
