"""
Body-diagram generator.

Given a list of detected injuries (with body-region labels), produces an SVG
that mirrors the visual style of a forensic body-chart: an anterior human
silhouette on a dark grid background, with red markers placed at
anatomically plausible coordinates for each injury.

Outputs a self-contained SVG string, base64-encoded if requested.
"""
from __future__ import annotations
import base64
import math
import random
from xml.sax.saxutils import escape as xml_escape  # VULN-011 fix
from typing import Optional


# Normalized (x%, y%) anchor points on an anterior body silhouette, viewBox 400x800
# x=200 is the body's vertical centerline
_ANCHORS = {
    # head
    "head": (200, 70),
    "forehead": (200, 50),
    "face": (200, 80),
    "left_eye": (185, 75),
    "right_eye": (215, 75),
    "mouth": (200, 100),
    # neck
    "neck": (200, 130),
    "throat": (200, 135),
    "hyoid": (200, 138),
    "trachea": (200, 142),
    "larynx": (200, 138),
    # torso
    "chest": (200, 220),
    "left_chest": (170, 220),
    "right_chest": (230, 220),
    "thorax": (200, 230),
    "left_breast": (172, 230),
    "right_breast": (228, 230),
    "sternum": (200, 240),
    "rib": (175, 260),
    "left_rib": (170, 265),
    "right_rib": (230, 265),
    # abdomen
    "abdomen": (200, 320),
    "stomach": (200, 320),
    "left_flank": (165, 330),
    "right_flank": (235, 330),
    "navel": (200, 340),
    "pelvis": (200, 400),
    "groin": (200, 410),
    # back / spine
    "back": (200, 270),
    "spine": (200, 280),
    "lower_back": (200, 340),
    # arms
    "left_shoulder": (135, 175),
    "right_shoulder": (265, 175),
    "left_upper_arm": (115, 230),
    "right_upper_arm": (285, 230),
    "left_elbow": (110, 290),
    "right_elbow": (290, 290),
    "left_forearm": (105, 340),
    "right_forearm": (295, 340),
    "left_wrist": (100, 400),
    "right_wrist": (300, 400),
    "left_hand": (95, 430),
    "right_hand": (305, 430),
    "left_arm": (110, 280),
    "right_arm": (290, 280),
    "arm": (110, 280),
    "hand": (95, 430),
    # legs
    "left_thigh": (175, 480),
    "right_thigh": (225, 480),
    "left_knee": (175, 580),
    "right_knee": (225, 580),
    "left_shin": (175, 660),
    "right_shin": (225, 660),
    "left_ankle": (175, 730),
    "right_ankle": (225, 730),
    "left_foot": (175, 760),
    "right_foot": (225, 760),
    "left_leg": (175, 600),
    "right_leg": (225, 600),
    "leg": (200, 600),
    "limb": (110, 280),
    "foot": (200, 760),
    # general/unknown
    "scalp": (200, 50),
    "skull": (200, 60),
    "brain": (200, 70),
}

# Severity → color/radius
_SEVERITY_STYLE = {
    "critical": {"color": "#ff003c", "radius": 14, "glow": "#ff003c"},
    "high":     {"color": "#ff3358", "radius": 11, "glow": "#ff3358"},
    "medium":   {"color": "#ffa033", "radius": 9,  "glow": "#ff9020"},
    "low":      {"color": "#ffd633", "radius": 7,  "glow": "#ffcc00"},
}


def _anchor_for_region(region: str) -> tuple[int, int]:
    """Resolve a free-text body region to an (x,y) anchor."""
    if not region:
        return (200, 280)
    key = region.lower().strip().replace(" ", "_").replace("-", "_")
    if key in _ANCHORS:
        return _ANCHORS[key]
    # try partial matches
    for anchor_key in _ANCHORS:
        if anchor_key in key or key in anchor_key:
            return _ANCHORS[anchor_key]
    return (200, 280)  # default to mid-torso


def _jitter(point: tuple[int, int], radius: int = 18, seed: int = 0) -> tuple[int, int]:
    """Slight random offset so multiple injuries on the same region don't overlap."""
    rng = random.Random(seed)
    angle = rng.uniform(0, 2 * math.pi)
    dist = rng.uniform(0, radius)
    return (point[0] + int(dist * math.cos(angle)),
            point[1] + int(dist * math.sin(angle)))


def _sanitize_for_svg(text: str, max_len: int = 80) -> str:
    """VULN-011 fix: sanitize user-derived text for safe SVG embedding."""
    # Truncate, then XML-escape to prevent injection
    truncated = text[:max_len] if text else ""
    return xml_escape(truncated, entities={"'": "&apos;", '"': "&quot;"})


def generate_body_diagram(
    injuries: list[dict],
    title: str = "Injury map · anterior view",
) -> dict:
    """
    Generate a forensic body diagram SVG.

    injuries: list of dicts with keys:
        - region: str (e.g. "chest", "left_arm", "neck")
        - severity: "critical" | "high" | "medium" | "low"
        - description: optional str shown in tooltip

    Returns:
        {
            "svg":         str  (raw SVG markup),
            "svg_base64":  str  (data: URI ready for <img>),
            "marker_count": int,
        }
    """
    markers_svg = []
    legend_items = []
    seen_regions: dict[str, int] = {}

    for idx, inj in enumerate(injuries or []):
        region = (inj.get("region") or "torso").lower()
        severity = (inj.get("severity") or "medium").lower()
        description = inj.get("description") or inj.get("note") or region.title()

        # VULN-011 fix: sanitize all user-derived values
        safe_region = _sanitize_for_svg(region, 40)
        safe_severity = _sanitize_for_svg(severity, 20)

        base = _anchor_for_region(region)
        count = seen_regions.get(region, 0)
        seen_regions[region] = count + 1
        pt = _jitter(base, radius=20, seed=idx + count * 7) if count > 0 else base

        style = _SEVERITY_STYLE.get(severity, _SEVERITY_STYLE["medium"])
        x, y = pt

        # Marker: pulsing circle with cross-hair
        markers_svg.append(f'''
        <g class="injury injury-{safe_severity}" data-region="{safe_region}">
            <circle cx="{x}" cy="{y}" r="{style['radius'] + 6}" fill="{style['color']}" opacity="0.15">
                <animate attributeName="r" values="{style['radius'] + 6};{style['radius'] + 12};{style['radius'] + 6}" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="{x}" cy="{y}" r="{style['radius']}" fill="{style['color']}" opacity="0.7" stroke="#ffffff" stroke-width="1.5"/>
            <line x1="{x - style['radius'] - 4}" y1="{y}" x2="{x + style['radius'] + 4}" y2="{y}" stroke="{style['color']}" stroke-width="1"/>
            <line x1="{x}" y1="{y - style['radius'] - 4}" x2="{x}" y2="{y + style['radius'] + 4}" stroke="{style['color']}" stroke-width="1"/>
            <text x="{x + style['radius'] + 8}" y="{y + 4}" fill="#ffffff" font-family="JetBrains Mono, monospace" font-size="10" font-weight="600">{idx + 1}</text>
        </g>''')
        legend_items.append({
            "n": idx + 1,
            "region": region,
            "severity": severity,
            "description": description,
            "color": style["color"],
            "x": x, "y": y,
        })

    # VULN-011 fix: sanitize title
    safe_title = _sanitize_for_svg(title, 60)

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid meet" style="background:#04080f">
    <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0e2030" stroke-width="0.5"/>
        </pattern>
        <pattern id="grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#1a3a55" stroke-width="0.7"/>
        </pattern>
        <linearGradient id="bodyFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0a2840" stop-opacity="0.6"/>
            <stop offset="50%" stop-color="#0e4060" stop-opacity="0.55"/>
            <stop offset="100%" stop-color="#082030" stop-opacity="0.7"/>
        </linearGradient>
        <filter id="cyanGlow">
            <feGaussianBlur stdDeviation="2" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
    </defs>

    <!-- Background grid -->
    <rect width="400" height="800" fill="url(#grid)"/>
    <rect width="400" height="800" fill="url(#grid-major)"/>

    <!-- Crosshair frames around the body, like the reference image -->
    <g stroke="#1a4a6e" stroke-width="0.6" fill="none">
        <path d="M 20 90 L 60 90 M 20 90 L 20 130"/>
        <path d="M 340 90 L 380 90 M 380 90 L 380 130"/>
        <path d="M 20 700 L 20 740 L 60 740"/>
        <path d="M 380 700 L 380 740 L 340 740"/>
    </g>

    <!-- Body silhouette: anterior view -->
    <g filter="url(#cyanGlow)" stroke="#5eddff" stroke-width="1.4" fill="url(#bodyFill)">
        <!-- Head -->
        <ellipse cx="200" cy="75" rx="38" ry="48"/>
        <!-- Neck -->
        <path d="M 182 118 L 178 140 L 222 140 L 218 118 Z"/>
        <!-- Torso -->
        <path d="M 145 142 Q 130 150 130 175 L 120 240 Q 115 280 122 320 L 130 380 Q 135 410 165 415 L 235 415 Q 265 410 270 380 L 278 320 Q 285 280 280 240 L 270 175 Q 270 150 255 142 Z"/>
        <!-- Arms (anterior, by sides) -->
        <path d="M 130 165 Q 110 175 105 200 L 95 280 Q 92 320 90 360 L 85 415 Q 84 430 90 440 L 100 440 Q 108 430 110 415 L 118 360 Q 122 320 125 280 L 135 200 Z"/>
        <path d="M 270 165 Q 290 175 295 200 L 305 280 Q 308 320 310 360 L 315 415 Q 316 430 310 440 L 300 440 Q 292 430 290 415 L 282 360 Q 278 320 275 280 L 265 200 Z"/>
        <!-- Hands -->
        <ellipse cx="95" cy="445" rx="12" ry="20"/>
        <ellipse cx="305" cy="445" rx="12" ry="20"/>
        <!-- Legs -->
        <path d="M 165 415 Q 158 440 160 480 L 158 580 Q 156 640 162 700 L 165 740 Q 168 750 178 750 L 192 750 Q 198 745 198 730 L 200 640 Q 202 580 200 520 L 198 460 Q 195 430 195 415 Z"/>
        <path d="M 235 415 Q 242 440 240 480 L 242 580 Q 244 640 238 700 L 235 740 Q 232 750 222 750 L 208 750 Q 202 745 202 730 L 200 640 Q 198 580 200 520 L 202 460 Q 205 430 205 415 Z"/>
        <!-- Feet -->
        <ellipse cx="180" cy="765" rx="18" ry="12"/>
        <ellipse cx="220" cy="765" rx="18" ry="12"/>
    </g>

    <!-- Body centerline + symmetry guides (subtle) -->
    <g stroke="#5eddff" stroke-width="0.4" stroke-dasharray="3 5" opacity="0.45">
        <line x1="200" y1="30" x2="200" y2="770"/>
        <line x1="20" y1="240" x2="380" y2="240"/>
        <line x1="20" y1="400" x2="380" y2="400"/>
    </g>

    <!-- Body internal landmark hints (chest, abdomen) -->
    <g stroke="#5eddff" stroke-width="0.6" fill="none" opacity="0.5">
        <path d="M 175 200 Q 200 195 225 200"/>
        <path d="M 175 260 Q 200 270 225 260"/>
        <path d="M 175 340 Q 200 355 225 340"/>
    </g>

    <!-- Injury markers -->
    {''.join(markers_svg)}

    <!-- Header text -->
    <text x="200" y="20" text-anchor="middle" fill="#5eddff" font-family="JetBrains Mono, monospace" font-size="9" letter-spacing="2">{safe_title.upper()}</text>
    <text x="200" y="790" text-anchor="middle" fill="#5eddff" opacity="0.6" font-family="JetBrains Mono, monospace" font-size="7">AIVENTRA · FORENSIC INJURY MAP · ANTERIOR VIEW</text>
</svg>'''

    svg_bytes = svg.encode("utf-8")
    return {
        "svg": svg,
        "svg_base64": "data:image/svg+xml;base64," + base64.b64encode(svg_bytes).decode("ascii"),
        "marker_count": len(legend_items),
        "legend": legend_items,
    }
