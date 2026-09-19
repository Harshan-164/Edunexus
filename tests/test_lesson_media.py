from backend.media.lesson_media import normalize_flashcards, normalize_storyboard, render_animated_lesson


def test_flashcard_normalization_keeps_graph_data():
    deck = normalize_flashcards({
        "title": "Complexity",
        "cards": [{
            "title": "Growth", "summary": "Compare rates", "points": ["Linear", "Quadratic"],
            "visual": {"type": "line", "labels": ["1", "2"], "values": [1, 4]},
        }],
    }, "Complexity")
    assert deck["cards"][0]["visual"]["type"] == "line"
    assert deck["cards"][0]["visual"]["values"] == [1.0, 4.0]


def test_animated_lesson_has_a_local_fallback(tmp_path, monkeypatch):
    monkeypatch.setattr("backend.media.lesson_media._find_manim_executable", lambda: None)
    monkeypatch.setattr("backend.media.lesson_media.shutil.which", lambda _: None)
    monkeypatch.setitem(__import__('sys').modules, "imageio_ffmpeg", None)
    storyboard = normalize_storyboard({
        "title": "Vectors",
        "scenes": [{"title": "Direction", "caption": "A vector points somewhere", "points": ["Magnitude", "Direction"], "accent": "teal"}],
    }, "Vectors")

    result = render_animated_lesson(storyboard, str(tmp_path))

    assert result["renderer"] == "pillow"
    assert result["mime_type"] == "image/gif"
    assert (tmp_path / result["media_url"].split("/")[-1]).is_file()
