"""
Timeline reconstructor.

Merges multi-source events (CCTV, telephony, GPS, social signals) and runs
temporal anomaly detection. In production this consumes real evidence
collections; here we synthesize a representative reconstruction so the
frontend's React Flow graph and chronological stream stay populated.
"""
from __future__ import annotations
import hashlib
from typing import Optional


_TEMPLATE_EVENTS = [
    {
        "time": "21:42",
        "title": "Suspect vehicle entered Sector C",
        "source": "cctv",
        "severity": "info",
        "location": "Sector C - Junction CAM-04",
        "description": "Black hatchback matching APB description recorded entering Sector C at 21:42:14.",
        "evidence_ids": ["EV-2018"],
    },
    {
        "time": "21:58",
        "title": "Outbound call to unknown number",
        "source": "phone",
        "severity": "medium",
        "location": "Cell tower CT-219",
        "description": "67-second outbound call from victim's handset to +91-XXX-2487 (prepaid, unregistered).",
        "evidence_ids": ["EV-2025"],
    },
    {
        "time": "22:11",
        "title": "GPS waypoint deviation",
        "source": "gps",
        "severity": "high",
        "location": "Eastern access road",
        "description": "Suspect device veered 240m off baseline route. No prior trips logged here.",
        "evidence_ids": ["GPS-009"],
    },
    {
        "time": "22:18",
        "title": "CCTV coverage interruption",
        "source": "anomaly",
        "severity": "critical",
        "location": "CAM-07, CAM-09, CAM-11",
        "description": "27-minute synchronized blackout across 3 cameras. Hardware diagnostics show no fault logs.",
        "evidence_ids": ["EV-2018", "EV-2044"],
    },
    {
        "time": "22:31",
        "title": "Final ping of victim device",
        "source": "phone",
        "severity": "critical",
        "location": "Cell tower CT-219",
        "description": "Last signal received before device went offline. Battery telemetry was nominal.",
        "evidence_ids": ["EV-2025"],
    },
    {
        "time": "22:42",
        "title": "CCTV feeds restored",
        "source": "cctv",
        "severity": "info",
        "location": "CAM-07, CAM-09, CAM-11",
        "description": "Feeds came back online; no record of suspect vehicle exiting the area.",
        "evidence_ids": ["EV-2018"],
    },
    {
        "time": "23:04",
        "title": "Witness 911 call",
        "source": "call",
        "severity": "high",
        "location": "Resident — Block 14",
        "description": "Caller reports shouting from inside the property. Two voices, one male, one female.",
        "evidence_ids": ["WIT-A12"],
    },
    {
        "time": "23:18",
        "title": "Patrol unit on-scene",
        "source": "gps",
        "severity": "info",
        "location": "Scene perimeter",
        "description": "Responding unit arrives, secures perimeter, requests forensic team.",
        "evidence_ids": ["GPS-PATROL-3"],
    },
]


def reconstruct(case_id: Optional[str]) -> list[dict]:
    """Return per-case deterministic timeline events."""
    suffix = ""
    if case_id:
        # VULN-028 fix: use SHA256 instead of MD5
        suffix = hashlib.sha256(case_id.encode()).hexdigest()[:4]
    return [
        {
            "id": f"evt-{i+1}-{suffix}",
            "case_id": case_id or "",
            **e,
        }
        for i, e in enumerate(_TEMPLATE_EVENTS)
    ]
