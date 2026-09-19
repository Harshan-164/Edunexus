import json
import os
import shutil
import subprocess
import tempfile
import textwrap
import uuid
from pathlib import Path
from typing import Any, Dict, List

from PIL import Image, ImageDraw, ImageFont


CANVAS_SIZE = (960, 540)


def parse_json_response(raw: str) -> Dict[str, Any]:
    cleaned = (raw or "").strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
        cleaned = cleaned.rsplit("```", 1)[0]
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("The model did not return a JSON object")
    return json.loads(cleaned[start:end + 1])


def normalize_flashcards(data: Dict[str, Any], topic: str) -> Dict[str, Any]:
    cards = []
    raw_cards = data.get("cards") if isinstance(data.get("cards"), list) else []
    for index, card in enumerate(raw_cards[:8]):
        if not isinstance(card, dict):
            continue
        raw_points = card.get("points") if isinstance(card.get("points"), list) else []
        points = [str(point).strip() for point in raw_points if str(point).strip()][:5]
        visual = card.get("visual") if isinstance(card.get("visual"), dict) else {"type": "none"}
        visual_type = visual.get("type", "none")
        if visual_type not in {"none", "bar", "line", "process"}:
            visual_type = "none"
        cards.append({
            "id": f"card-{index + 1}",
            "title": str(card.get("title") or f"{topic} — Part {index + 1}")[:100],
            "summary": str(card.get("summary") or "Key idea")[:280],
            "points": points,
            "prompt": str(card.get("prompt") or "Tap to reveal the key points")[:160],
            "visual": {
                "type": visual_type,
                "title": str(visual.get("title") or "")[:80],
                "labels": [str(value)[:30] for value in (visual.get("labels") if isinstance(visual.get("labels"), list) else [])[:7]],
                "values": [float(value) for value in (visual.get("values") if isinstance(visual.get("values"), list) else [])[:7] if isinstance(value, (int, float))],
                "steps": [str(value)[:50] for value in (visual.get("steps") if isinstance(visual.get("steps"), list) else [])[:6]],
            },
        })
    if not cards:
        cards = [{
            "id": "card-1", "title": topic, "summary": "Core concept",
            "points": ["Review the concept", "Connect it to an example", "Check your understanding"],
            "prompt": "Tap to reveal", "visual": {"type": "none", "title": "", "labels": [], "values": [], "steps": []},
        }]
    return {"title": str(data.get("title") or topic)[:120], "cards": cards}


def normalize_storyboard(data: Dict[str, Any], topic: str) -> Dict[str, Any]:
    scenes = []
    raw_scenes = data.get("scenes") if isinstance(data.get("scenes"), list) else []
    for scene in raw_scenes[:7]:
        if not isinstance(scene, dict):
            continue
        raw_points = scene.get("points") if isinstance(scene.get("points"), list) else []
        points = [str(point).strip() for point in raw_points if str(point).strip()][:4]
        scenes.append({
            "title": str(scene.get("title") or topic)[:80],
            "caption": str(scene.get("caption") or "")[:220],
            "points": points,
            "accent": str(scene.get("accent") or "teal") if scene.get("accent") in {"teal", "blue", "violet", "amber"} else "teal",
        })
    if not scenes:
        scenes = [
            {"title": topic, "caption": "A concise visual introduction", "points": ["Core idea", "How it works"], "accent": "teal"},
            {"title": "Put it together", "caption": "Connect the idea to a practical example", "points": ["Observe", "Apply", "Reflect"], "accent": "blue"},
        ]
    return {"title": str(data.get("title") or topic)[:120], "scenes": scenes}


def _font(size: int, bold: bool = False):
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def _wrapped(draw: ImageDraw.ImageDraw, text: str, box, font, fill, spacing=8):
    x, y, width = box
    approximate_chars = max(18, int(width / max(8, getattr(font, "size", 18) * .56)))
    lines = textwrap.wrap(text, width=approximate_chars) or [""]
    draw.multiline_text((x, y), "\n".join(lines), font=font, fill=fill, spacing=spacing)
    return len(lines)


def _draw_frame(storyboard: Dict[str, Any], scene_index: int, reveal: int) -> Image.Image:
    image = Image.new("RGB", CANVAS_SIZE, "#07101d")
    draw = ImageDraw.Draw(image)
    accent_map = {"teal": "#2dd4bf", "blue": "#60a5fa", "violet": "#a78bfa", "amber": "#fbbf24"}
    scene = storyboard["scenes"][scene_index]
    accent = accent_map[scene["accent"]]
    draw.ellipse((680, -190, 1100, 230), fill="#0d2634")
    draw.rounded_rectangle((54, 44, 906, 496), radius=24, fill="#0e1b2c", outline="#26384d", width=2)
    draw.rounded_rectangle((80, 72, 128, 120), radius=12, fill=accent)
    draw.text((95, 77), str(scene_index + 1), font=_font(25, True), fill="#07101d")
    draw.text((148, 74), "EDUNEXUS · ANIMATED LESSON", font=_font(16, True), fill="#8291a6")
    _wrapped(draw, scene["title"], (80, 145, 780), _font(39, True), "#f1f5f9", 6)
    _wrapped(draw, scene["caption"], (82, 214, 750), _font(22), "#9eacc0", 6)
    y = 310
    for point_index, point in enumerate(scene["points"][:reveal]):
        draw.ellipse((84, y + 7, 94, y + 17), fill=accent)
        _wrapped(draw, point, (112, y, 700), _font(21), "#dbe5f1", 5)
        y += 55
    progress_width = int(780 * ((scene_index + 1) / len(storyboard["scenes"])))
    draw.rounded_rectangle((82, 464, 862, 470), radius=3, fill="#223247")
    draw.rounded_rectangle((82, 464, 82 + progress_width, 470), radius=3, fill=accent)
    return image


def _frames(storyboard: Dict[str, Any]) -> List[Image.Image]:
    frames = []
    for scene_index, scene in enumerate(storyboard["scenes"]):
        reveal_count = max(1, len(scene["points"]))
        for reveal in range(1, reveal_count + 1):
            frames.append(_draw_frame(storyboard, scene_index, reveal))
        frames.append(_draw_frame(storyboard, scene_index, reveal_count))
    return frames


def _safe_manim_script(storyboard: Dict[str, Any]) -> str:
    payload = json.dumps(storyboard, ensure_ascii=True)
    return f'''from manim import *
import json

STORYBOARD = json.loads({json.dumps(payload)})

class LessonScene(Scene):
    def construct(self):
        self.camera.background_color = "#07101d"
        for index, scene in enumerate(STORYBOARD["scenes"]):
            title = Text(scene["title"], font_size=42, color="#5eead4").to_edge(UP)
            caption = Text(scene["caption"], font_size=24, color="#cbd5e1").next_to(title, DOWN, buff=.55)
            self.play(FadeIn(title, shift=UP * .2), Write(caption), run_time=.8)
            previous = caption
            for point in scene["points"]:
                item = Text("• " + point, font_size=22, color=WHITE).next_to(previous, DOWN, buff=.32).align_to(caption, LEFT)
                self.play(FadeIn(item, shift=RIGHT * .2), run_time=.55)
                previous = item
            self.wait(.8)
            self.play(*[FadeOut(mob) for mob in self.mobjects], run_time=.45)
'''


def _find_manim_executable() -> str | None:
    configured = os.getenv("MANIM_EXECUTABLE")
    candidates = [
        configured,
        shutil.which("manim"),
        str(Path(__file__).resolve().parents[2] / ".venv-manim" / "Scripts" / "manim.exe"),
        str(Path(__file__).resolve().parents[2] / ".venv-manim" / "bin" / "manim"),
    ]
    return next((candidate for candidate in candidates if candidate and os.path.isfile(candidate)), None)


def _render_manim(storyboard: Dict[str, Any], output_dir: Path, stem: str) -> Path | None:
    executable = _find_manim_executable()
    if not executable:
        return None
    with tempfile.TemporaryDirectory() as temp_dir:
        script = Path(temp_dir) / "lesson_scene.py"
        script.write_text(_safe_manim_script(storyboard), encoding="utf-8")
        try:
            subprocess.run(
                [executable, "-ql", str(script), "LessonScene", "--media_dir", str(output_dir), "-o", f"{stem}.mp4"],
                check=True, capture_output=True, text=True, timeout=150,
            )
        except (subprocess.SubprocessError, OSError):
            return None
    matches = list(output_dir.rglob(f"{stem}.mp4"))
    if not matches:
        return None
    destination = output_dir / f"{stem}.mp4"
    if matches[0] != destination:
        shutil.copy2(matches[0], destination)
    return destination


def _render_ffmpeg(storyboard: Dict[str, Any], output_dir: Path, stem: str) -> Path | None:
    executable = shutil.which("ffmpeg")
    if not executable:
        try:
            import imageio_ffmpeg
            executable = imageio_ffmpeg.get_ffmpeg_exe()
        except (ImportError, RuntimeError, OSError):
            executable = None
    if not executable:
        return None
    frames = _frames(storyboard)
    with tempfile.TemporaryDirectory() as temp_dir:
        for index, frame in enumerate(frames):
            frame.save(Path(temp_dir) / f"frame_{index:03d}.png")
        destination = output_dir / f"{stem}.mp4"
        try:
            subprocess.run(
                [executable, "-y", "-framerate", "1", "-i", str(Path(temp_dir) / "frame_%03d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(destination)],
                check=True, capture_output=True, text=True, timeout=120,
            )
            return destination
        except (subprocess.SubprocessError, OSError):
            return None


def _render_gif(storyboard: Dict[str, Any], output_dir: Path, stem: str) -> Path:
    frames = _frames(storyboard)
    destination = output_dir / f"{stem}.gif"
    durations = [900] * len(frames)
    durations[-1] = 1800
    frames[0].save(destination, save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=True)
    return destination


def render_animated_lesson(storyboard: Dict[str, Any], output_dir: str) -> Dict[str, Any]:
    directory = Path(output_dir)
    directory.mkdir(parents=True, exist_ok=True)
    stem = f"lesson_{uuid.uuid4().hex}"
    rendered = _render_manim(storyboard, directory, stem)
    renderer = "manim"
    if rendered is None:
        rendered = _render_ffmpeg(storyboard, directory, stem)
        renderer = "ffmpeg"
    if rendered is None:
        rendered = _render_gif(storyboard, directory, stem)
        renderer = "pillow"
    mime_type = "video/mp4" if rendered.suffix == ".mp4" else "image/gif"
    return {
        "title": storyboard["title"],
        "media_url": f"/api/learn/media/{rendered.name}",
        "mime_type": mime_type,
        "renderer": renderer,
        "storyboard": storyboard,
    }
