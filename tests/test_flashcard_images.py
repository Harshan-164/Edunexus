import asyncio

import httpx

from backend.media.image_search import search_commons_images
from backend.media.lesson_media import normalize_flashcards
from backend.memory.chat_memory import ChatMemory


def test_commons_search_normalizes_attribution_and_thumbnail():
    payload = {
        "pages": [{
            "key": "Insertion_sort",
            "title": "Insertion sort",
            "description": "Sorting algorithm",
            "thumbnail": {"url": "//upload.wikimedia.org/example.png", "mimetype": "image/png"},
        }],
    }

    def handler(request):
        assert "insertion+sort+diagram" in str(request.url)
        return httpx.Response(200, json=payload)

    async def run():
        async with httpx.AsyncClient(transport=httpx.MockTransport(handler)) as client:
            return await search_commons_images("insertion sort diagram", client)

    results = asyncio.run(run())
    assert results[0]["title"] == "Insertion sort"
    assert results[0]["attribution"] == "Wikipedia / Wikimedia Commons"
    assert results[0]["license"] == "See source"
    assert results[0]["alt"] == "Sorting algorithm"


def test_flashcard_image_query_and_document_reference_are_persisted(tmp_path):
    deck = normalize_flashcards({"cards": [{"title": "Sorted prefix", "image_query": "insertion sort sorted prefix"}]}, "Insertion sort")
    assert deck["cards"][0]["image_query"] == "insertion sort sorted prefix"

    memory = ChatMemory(str(tmp_path / "chat.db"))
    session = memory.create_session("student", "Algorithms", "Sorting")
    message = memory.add_message(session["id"], "tutor", "Deck", is_grounded=True, content_type="flashcards", content_data=deck, source_document="sorting.pdf")
    assert message["source_document"] == "sorting.pdf"
    assert memory.get_session(session["id"])["messages"][0]["source_document"] == "sorting.pdf"
