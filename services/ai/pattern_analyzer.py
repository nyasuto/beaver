#!/usr/bin/env python3
"""
Pattern Analysis Service for Beaver
学習パターン認識のためのAIサービス

Usage: python pattern_analyzer.py < input.json > output.json
"""

import json

# Configure structlog to write to stderr to avoid mixing with JSON output
import logging
import sys
import traceback
from datetime import datetime
from typing import Any, Dict, List

import structlog

logging.basicConfig(
    stream=sys.stderr, level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
structlog.configure(
    logger_factory=lambda: logging.getLogger(),
    cache_logger_on_first_use=True,
)

# Import our pattern recognition modules
from analytics import DevelopmentAnalytics
from patterns import (
    DevelopmentEvent,
    PatternRecognitionEngine,
)


def convert_input_to_development_events(input_data: Dict[str, Any]) -> List[DevelopmentEvent]:
    """Convert input JSON to DevelopmentEvent objects"""
    events = []

    for event_data in input_data.get("events", []):
        try:
            # Parse timestamp
            timestamp = datetime.fromisoformat(event_data["timestamp"].replace("Z", "+00:00"))

            # Create DevelopmentEvent
            event = DevelopmentEvent(
                id=event_data["id"],
                type=event_data["type"],
                timestamp=timestamp,
                title=event_data["title"],
                description=event_data["description"],
                author=event_data["author"],
                metadata=event_data.get("metadata", {}),
                labels=event_data.get("labels", []),
                related_events=event_data.get("related_events", []),
            )
            events.append(event)

        except Exception as e:
            print(
                f"Warning: Failed to parse event {event_data.get('id', 'unknown')}: {e}",
                file=sys.stderr,
            )
            continue

    return events


def analyze_patterns(input_data: Dict[str, Any]) -> Dict[str, Any]:
    """Main pattern analysis function"""
    try:
        # Convert input to development events
        events = convert_input_to_development_events(input_data)

        if not events:
            return {
                "patterns": [],
                "analytics": {
                    "total_events": 0,
                    "unique_patterns": 0,
                    "success_rate": 0.0,
                    "learning_velocity": 0.0,
                    "pattern_diversity": 0.0,
                    "consistency_score": 0.0,
                    "trend_direction": "stable",
                    "confidence_interval": [0.0, 0.0],
                },
                "trajectory": {
                    "person": input_data.get("author", "unknown"),
                    "domain": "general",
                    "start_date": datetime.now().isoformat(),
                    "end_date": datetime.now().isoformat(),
                    "stages": [],
                    "patterns": [],
                    "progress_score": 0.0,
                    "key_milestones": [],
                },
                "predictive_insights": {
                    "next_learning_opportunities": [],
                    "risk_areas": [],
                    "recommended_focus": [],
                    "predicted_trajectory": "exploration",
                    "confidence": 0.0,
                },
                "visualization_data": {
                    "timeline_chart": {
                        "events": [],
                        "patterns": [],
                        "timeline": {"start": "", "end": ""},
                    },
                    "pattern_distribution": {},
                    "learning_curve": [],
                    "success_trend": [],
                    "skill_radar": {},
                    "heatmap_data": [],
                },
            }

        # Initialize AI services
        pattern_engine = PatternRecognitionEngine()
        analytics = DevelopmentAnalytics()

        # Analyze patterns
        patterns = pattern_engine.analyze_development_patterns(events)

        # Generate analytics metrics
        analytics_metrics = analytics.analyze_patterns(patterns)

        # Generate learning trajectory
        author = input_data.get("author", "unknown")
        trajectory = analytics.generate_learning_trajectory(author, patterns, events)

        # Generate predictive insights
        recent_patterns = patterns[-5:]  # Last 5 patterns
        predictive_insights = analytics.generate_predictive_insights(trajectory, recent_patterns)

        # Generate visualization data
        visualization_data = analytics.generate_visualization_data(patterns, events, trajectory)

        # Convert to JSON-serializable format
        result = {
            "patterns": [pattern.to_dict() for pattern in patterns],
            "analytics": analytics_metrics.to_dict(),
            "trajectory": trajectory.to_dict(),
            "predictive_insights": predictive_insights.to_dict(),
            "visualization_data": visualization_data.to_dict(),
        }

        return result

    except Exception as e:
        error_msg = f"Pattern analysis failed: {str(e)}\n{traceback.format_exc()}"
        print(error_msg, file=sys.stderr)
        return {
            "error_message": error_msg,
            "patterns": [],
            "analytics": {
                "total_events": 0,
                "unique_patterns": 0,
                "success_rate": 0.0,
                "learning_velocity": 0.0,
                "pattern_diversity": 0.0,
                "consistency_score": 0.0,
                "trend_direction": "stable",
                "confidence_interval": [0.0, 0.0],
            },
            "trajectory": {
                "person": input_data.get("author", "unknown"),
                "domain": "general",
                "start_date": datetime.now().isoformat(),
                "end_date": datetime.now().isoformat(),
                "stages": [],
                "patterns": [],
                "progress_score": 0.0,
                "key_milestones": [],
            },
            "predictive_insights": {
                "next_learning_opportunities": [],
                "risk_areas": [],
                "recommended_focus": [],
                "predicted_trajectory": "exploration",
                "confidence": 0.0,
            },
            "visualization_data": {
                "timeline_chart": {
                    "events": [],
                    "patterns": [],
                    "timeline": {"start": "", "end": ""},
                },
                "pattern_distribution": {},
                "learning_curve": [],
                "success_trend": [],
                "skill_radar": {},
                "heatmap_data": [],
            },
        }


def main():
    """Main entry point"""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        # Perform analysis
        result = analyze_patterns(input_data)

        # Output result as JSON
        print(json.dumps(result, ensure_ascii=False, indent=2))

    except Exception as e:
        error_result = {
            "error_message": f"Failed to process input: {str(e)}",
            "patterns": [],
            "analytics": {
                "total_events": 0,
                "unique_patterns": 0,
                "success_rate": 0.0,
                "learning_velocity": 0.0,
                "pattern_diversity": 0.0,
                "consistency_score": 0.0,
                "trend_direction": "stable",
                "confidence_interval": [0.0, 0.0],
            },
            "trajectory": {
                "person": "unknown",
                "domain": "general",
                "start_date": datetime.now().isoformat(),
                "end_date": datetime.now().isoformat(),
                "stages": [],
                "patterns": [],
                "progress_score": 0.0,
                "key_milestones": [],
            },
            "predictive_insights": {
                "next_learning_opportunities": [],
                "risk_areas": [],
                "recommended_focus": [],
                "predicted_trajectory": "exploration",
                "confidence": 0.0,
            },
            "visualization_data": {
                "timeline_chart": {
                    "events": [],
                    "patterns": [],
                    "timeline": {"start": "", "end": ""},
                },
                "pattern_distribution": {},
                "learning_curve": [],
                "success_trend": [],
                "skill_radar": {},
                "heatmap_data": [],
            },
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
