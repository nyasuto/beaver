#!/usr/bin/env python3
"""
AI-powered troubleshooting guide generator for Beaver.

This module analyzes GitHub Issues to extract troubleshooting patterns,
root causes, and solution strategies using advanced NLP and machine learning.
"""

import hashlib
import json
import logging
import re
import sys
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class IssueData:
    """Represents a GitHub Issue for analysis."""

    id: int
    number: int
    title: str
    body: str
    state: str
    labels: list[str]
    author: str
    created_at: str
    updated_at: str
    closed_at: Optional[str] = None
    comments_count: int = 0


@dataclass
class AIDetectedPattern:
    """AI-detected error pattern."""

    pattern_id: str
    description: str
    confidence: float
    frequency: int
    severity: str
    category: str
    indicators: list[str]
    correlations: list[str]


@dataclass
class AISolutionStrategy:
    """AI-suggested solution strategy."""

    strategy_id: str
    title: str
    description: str
    approach: str
    steps: list[str]
    effectiveness: float
    complexity: str


@dataclass
class AIRootCause:
    """AI analysis of root causes."""

    cause_id: str
    description: str
    category: str
    likelihood: float
    evidence: list[str]
    mitigation: list[str]


@dataclass
class AIPreventionSuggestion:
    """AI prevention suggestion."""

    suggestion_id: str
    title: str
    description: str
    actions: list[str]
    frequency: str
    impact: str
    effort: str


@dataclass
class AIInsight:
    """AI-generated insight."""

    insight_id: str
    type: str
    title: str
    description: str
    significance: float
    actionable: bool


@dataclass
class AITroubleshootingResult:
    """Complete AI troubleshooting analysis result."""

    analyzed_at: str
    processing_time_seconds: float
    patterns_detected: list[AIDetectedPattern]
    solution_strategies: list[AISolutionStrategy]
    root_cause_analysis: list[AIRootCause]
    prevention_suggestions: list[AIPreventionSuggestion]
    insights: list[AIInsight]
    confidence: float
    recommendations: list[str]


class TroubleshootingAnalyzer:
    """AI-powered troubleshooting analyzer."""

    def __init__(self):
        """Initialize the analyzer with pattern databases."""
        self.error_patterns = self._initialize_error_patterns()
        self.solution_templates = self._initialize_solution_templates()
        self.root_cause_patterns = self._initialize_root_cause_patterns()

    def _initialize_error_patterns(self) -> dict[str, dict[str, Any]]:
        """Initialize error pattern recognition database."""
        return {
            "api_errors": {
                "patterns": [
                    r"(?i)(api|http|request).*(error|failed|timeout|401|403|404|500|502|503)",
                    r"(?i)(rest|graphql|endpoint).*(error|failed|unavailable)",
                    r"(?i)(authentication|authorization).*(failed|denied|invalid)",
                ],
                "severity": "high",
                "category": "Integration",
                "symptoms": ["Connection failures", "Timeout errors", "Authentication issues"],
                "common_causes": [
                    "Network issues",
                    "API changes",
                    "Rate limiting",
                    "Invalid tokens",
                ],
            },
            "configuration_errors": {
                "patterns": [
                    r"(?i)(config|configuration|setting).*(error|invalid|missing|not found)",
                    r"(?i)(env|environment|variable).*(missing|undefined|invalid)",
                    r"(?i)(yaml|json|toml|ini).*(parse|syntax|invalid)",
                ],
                "severity": "medium",
                "category": "Configuration",
                "symptoms": ["Startup failures", "Parse errors", "Missing variables"],
                "common_causes": [
                    "Typos in config",
                    "Missing files",
                    "Invalid syntax",
                    "Environment mismatch",
                ],
            },
            "dependency_errors": {
                "patterns": [
                    r"(?i)(dependency|package|module|import).*(error|missing|not found|version)",
                    r"(?i)(npm|pip|cargo|go mod).*(install|update|resolve).*(failed|error)",
                    r"(?i)(version|compatibility).*(conflict|mismatch|incompatible)",
                ],
                "severity": "medium",
                "category": "Dependencies",
                "symptoms": ["Import errors", "Version conflicts", "Build failures"],
                "common_causes": [
                    "Missing packages",
                    "Version conflicts",
                    "Deprecated APIs",
                    "Platform differences",
                ],
            },
            "performance_issues": {
                "patterns": [
                    r"(?i)(slow|performance|latency|timeout).*(issue|problem|degradation)",
                    r"(?i)(memory|cpu|disk).*(usage|leak|high|exhausted)",
                    r"(?i)(deadlock|hanging|freeze|stuck)",
                ],
                "severity": "high",
                "category": "Performance",
                "symptoms": ["Slow responses", "High resource usage", "System hangs"],
                "common_causes": [
                    "Resource leaks",
                    "Inefficient algorithms",
                    "Hardware limits",
                    "Bottlenecks",
                ],
            },
            "security_issues": {
                "patterns": [
                    r"(?i)(security|vulnerability|exploit|attack)",
                    r"(?i)(permission|access|denied|unauthorized)",
                    r"(?i)(ssl|tls|certificate).*(error|expired|invalid)",
                ],
                "severity": "critical",
                "category": "Security",
                "symptoms": ["Access denied", "Certificate errors", "Authentication failures"],
                "common_causes": [
                    "Expired certificates",
                    "Insufficient permissions",
                    "Security policies",
                    "Credential issues",
                ],
            },
        }

    def _initialize_solution_templates(self) -> dict[str, dict[str, Any]]:
        """Initialize solution strategy templates."""
        return {
            "api_errors": {
                "strategies": [
                    {
                        "title": "API Connection Troubleshooting",
                        "approach": "systematic_diagnosis",
                        "steps": [
                            "Verify API endpoint URL and availability",
                            "Check authentication credentials and tokens",
                            "Validate request format and parameters",
                            "Test with minimal request payload",
                            "Implement proper error handling and retries",
                        ],
                        "effectiveness": 0.85,
                        "complexity": "medium",
                    }
                ]
            },
            "configuration_errors": {
                "strategies": [
                    {
                        "title": "Configuration Validation",
                        "approach": "systematic_validation",
                        "steps": [
                            "Validate configuration file syntax",
                            "Check all required fields are present",
                            "Verify environment-specific values",
                            "Test configuration in isolation",
                            "Implement configuration schema validation",
                        ],
                        "effectiveness": 0.90,
                        "complexity": "easy",
                    }
                ]
            },
            "dependency_errors": {
                "strategies": [
                    {
                        "title": "Dependency Resolution",
                        "approach": "incremental_resolution",
                        "steps": [
                            "Identify conflicting dependencies",
                            "Update to compatible versions",
                            "Clear package cache and reinstall",
                            "Check for platform-specific issues",
                            "Pin stable versions in lock files",
                        ],
                        "effectiveness": 0.80,
                        "complexity": "medium",
                    }
                ]
            },
        }

    def _initialize_root_cause_patterns(self) -> dict[str, list[str]]:
        """Initialize root cause analysis patterns."""
        return {
            "timing_issues": [
                "Race conditions in concurrent operations",
                "Timing-dependent initialization order",
                "Insufficient wait times for external services",
            ],
            "resource_issues": [
                "Memory leaks in long-running processes",
                "File descriptor exhaustion",
                "Database connection pool exhaustion",
            ],
            "integration_issues": [
                "API version mismatches",
                "Protocol incompatibilities",
                "Authentication token expiration",
            ],
            "environment_issues": [
                "Environment-specific configuration differences",
                "Platform or OS-specific behaviors",
                "Network connectivity restrictions",
            ],
        }

    def analyze_issues(self, issues: list[IssueData]) -> AITroubleshootingResult:
        """Perform comprehensive AI analysis of troubleshooting patterns."""
        start_time = datetime.now()

        logger.info(f"Starting AI troubleshooting analysis of {len(issues)} issues")

        # Detect patterns
        patterns_detected = self._detect_patterns(issues)

        # Generate solution strategies
        solution_strategies = self._generate_solution_strategies(patterns_detected, issues)

        # Perform root cause analysis
        root_cause_analysis = self._perform_root_cause_analysis(issues, patterns_detected)

        # Generate prevention suggestions
        prevention_suggestions = self._generate_prevention_suggestions(
            patterns_detected, root_cause_analysis
        )

        # Generate insights
        insights = self._generate_insights(issues, patterns_detected, solution_strategies)

        # Calculate overall confidence
        confidence = self._calculate_confidence(patterns_detected, solution_strategies)

        # Generate recommendations
        recommendations = self._generate_recommendations(
            patterns_detected, solution_strategies, insights
        )

        processing_time = (datetime.now() - start_time).total_seconds()

        logger.info(f"AI analysis completed in {processing_time:.2f} seconds")

        return AITroubleshootingResult(
            analyzed_at=datetime.now(timezone.utc).isoformat(),
            processing_time_seconds=processing_time,
            patterns_detected=patterns_detected,
            solution_strategies=solution_strategies,
            root_cause_analysis=root_cause_analysis,
            prevention_suggestions=prevention_suggestions,
            insights=insights,
            confidence=confidence,
            recommendations=recommendations,
        )

    def _detect_patterns(self, issues: list[IssueData]) -> list[AIDetectedPattern]:
        """Detect error patterns in issues using NLP and pattern matching."""
        patterns = []
        pattern_counts = defaultdict(int)
        pattern_issues = defaultdict(list)

        for issue in issues:
            text = f"{issue.title} {issue.body}".lower()

            for pattern_name, pattern_config in self.error_patterns.items():
                for regex_pattern in pattern_config["patterns"]:
                    if re.search(regex_pattern, text, re.IGNORECASE):
                        pattern_counts[pattern_name] += 1
                        pattern_issues[pattern_name].append(issue)
                        break

        for pattern_name, count in pattern_counts.items():
            if count > 0:
                config = self.error_patterns[pattern_name]
                pattern_id = self._generate_pattern_id(pattern_name)

                # Calculate confidence based on pattern strength and frequency
                confidence = min(0.95, 0.5 + (count / len(issues)) * 0.4 + 0.1)

                # Extract correlations
                correlations = self._find_pattern_correlations(
                    pattern_name, pattern_issues[pattern_name]
                )

                # Extract specific indicators from issues
                indicators = self._extract_pattern_indicators(pattern_issues[pattern_name])

                pattern = AIDetectedPattern(
                    pattern_id=pattern_id,
                    description=f"Detected {pattern_name.replace('_', ' ')} pattern in {count} issues",
                    confidence=confidence,
                    frequency=count,
                    severity=config["severity"],
                    category=config["category"],
                    indicators=indicators,
                    correlations=correlations,
                )
                patterns.append(pattern)

        return sorted(patterns, key=lambda p: (p.confidence, p.frequency), reverse=True)

    def _generate_solution_strategies(
        self, patterns: list[AIDetectedPattern], issues: list[IssueData]
    ) -> list[AISolutionStrategy]:
        """Generate solution strategies based on detected patterns."""
        strategies = []

        for pattern in patterns:
            pattern_type = pattern.pattern_id.split("_")[0] + "_errors"

            if pattern_type in self.solution_templates:
                template_strategies = self.solution_templates[pattern_type]["strategies"]

                for template in template_strategies:
                    strategy_id = self._generate_strategy_id(pattern.pattern_id, template["title"])

                    # Customize strategy based on pattern specifics
                    customized_steps = self._customize_solution_steps(
                        template["steps"], pattern, issues
                    )

                    strategy = AISolutionStrategy(
                        strategy_id=strategy_id,
                        title=template["title"],
                        description=f"Targeted solution for {pattern.description.lower()}",
                        approach=template["approach"],
                        steps=customized_steps,
                        effectiveness=template["effectiveness"] * pattern.confidence,
                        complexity=template["complexity"],
                    )
                    strategies.append(strategy)

        return strategies

    def _perform_root_cause_analysis(
        self, issues: list[IssueData], patterns: list[AIDetectedPattern]
    ) -> list[AIRootCause]:
        """Perform root cause analysis based on patterns and issue content."""
        root_causes = []

        # Analyze temporal patterns
        closed_issues = [issue for issue in issues if issue.state == "closed" and issue.closed_at]
        if closed_issues:
            resolution_times = self._analyze_resolution_times(closed_issues)
            if resolution_times["avg_hours"] > 48:
                root_causes.append(
                    AIRootCause(
                        cause_id="slow_resolution",
                        description="Issues take longer than expected to resolve",
                        category="Process",
                        likelihood=0.8,
                        evidence=[
                            f"Average resolution time: {resolution_times['avg_hours']:.1f} hours"
                        ],
                        mitigation=[
                            "Improve debugging processes",
                            "Add better monitoring",
                            "Create troubleshooting guides",
                        ],
                    )
                )

        # Analyze pattern clustering
        category_counts = Counter([p.category for p in patterns])
        most_common_category = category_counts.most_common(1)

        if most_common_category and most_common_category[0][1] > len(patterns) * 0.4:
            category = most_common_category[0][0]
            root_causes.append(
                AIRootCause(
                    cause_id=f"systemic_{category.lower()}",
                    description=f"Systemic issues in {category} area",
                    category=category,
                    likelihood=0.7,
                    evidence=[
                        f"{most_common_category[0][1]} out of {len(patterns)} patterns are {category}-related"
                    ],
                    mitigation=[
                        f"Review {category} architecture",
                        f"Improve {category} testing",
                        f"Add {category} monitoring",
                    ],
                )
            )

        # Analyze recurring issues
        recurring_patterns = [p for p in patterns if p.frequency > 2]
        if recurring_patterns:
            root_causes.append(
                AIRootCause(
                    cause_id="recurring_issues",
                    description="Multiple recurring error patterns detected",
                    category="Quality",
                    likelihood=0.9,
                    evidence=[f"{len(recurring_patterns)} patterns occur multiple times"],
                    mitigation=[
                        "Implement preventive measures",
                        "Add automated testing",
                        "Improve error handling",
                    ],
                )
            )

        return root_causes

    def _generate_prevention_suggestions(
        self, patterns: list[AIDetectedPattern], root_causes: list[AIRootCause]
    ) -> list[AIPreventionSuggestion]:
        """Generate prevention suggestions based on analysis."""
        suggestions = []

        # Monitoring suggestions
        if any(p.category in ["Integration", "Performance"] for p in patterns):
            suggestions.append(
                AIPreventionSuggestion(
                    suggestion_id="monitoring_setup",
                    title="Enhanced Monitoring Implementation",
                    description="Implement comprehensive monitoring to catch issues early",
                    actions=[
                        "Set up application performance monitoring (APM)",
                        "Implement health checks for critical services",
                        "Add alerting for key metrics and error rates",
                        "Create dashboards for system visibility",
                    ],
                    frequency="continuous",
                    impact="high",
                    effort="medium",
                )
            )

        # Testing suggestions
        if any(rc.category in ["Quality", "Integration"] for rc in root_causes):
            suggestions.append(
                AIPreventionSuggestion(
                    suggestion_id="testing_enhancement",
                    title="Testing Strategy Enhancement",
                    description="Improve testing to catch issues before production",
                    actions=[
                        "Implement integration testing for external APIs",
                        "Add automated regression testing",
                        "Implement contract testing for API changes",
                        "Add chaos engineering practices",
                    ],
                    frequency="continuous",
                    impact="high",
                    effort="high",
                )
            )

        # Documentation suggestions
        suggestions.append(
            AIPreventionSuggestion(
                suggestion_id="documentation_improvement",
                title="Documentation and Knowledge Sharing",
                description="Improve documentation to prevent common issues",
                actions=[
                    "Create troubleshooting runbooks",
                    "Document common error scenarios",
                    "Maintain up-to-date setup guides",
                    "Create incident response procedures",
                ],
                frequency="monthly",
                impact="medium",
                effort="low",
            )
        )

        return suggestions

    def _generate_insights(
        self,
        issues: list[IssueData],
        patterns: list[AIDetectedPattern],
        strategies: list[AISolutionStrategy],
    ) -> list[AIInsight]:
        """Generate actionable insights from the analysis."""
        insights = []

        # Pattern frequency insight
        if patterns:
            most_frequent = max(patterns, key=lambda p: p.frequency)
            insights.append(
                AIInsight(
                    insight_id="frequent_pattern",
                    type="pattern_analysis",
                    title="Most Frequent Error Pattern",
                    description=f"'{most_frequent.pattern_id}' pattern appears in {most_frequent.frequency} issues, representing {(most_frequent.frequency / len(issues) * 100):.1f}% of all issues",
                    significance=0.8,
                    actionable=True,
                )
            )

        # Resolution efficiency insight
        closed_issues = [issue for issue in issues if issue.state == "closed"]
        if closed_issues and len(issues) > 0:
            resolution_rate = len(closed_issues) / len(issues)
            insights.append(
                AIInsight(
                    insight_id="resolution_efficiency",
                    type="process_analysis",
                    title="Issue Resolution Efficiency",
                    description=f"Resolution rate is {(resolution_rate * 100):.1f}% ({len(closed_issues)}/{len(issues)} issues resolved)",
                    significance=0.7,
                    actionable=resolution_rate < 0.8,
                )
            )

        # Strategy effectiveness insight
        if strategies:
            high_effectiveness = [s for s in strategies if s.effectiveness > 0.8]
            insights.append(
                AIInsight(
                    insight_id="strategy_effectiveness",
                    type="solution_analysis",
                    title="High-Effectiveness Solutions Available",
                    description=f"{len(high_effectiveness)} solution strategies show high effectiveness (>80%)",
                    significance=0.6,
                    actionable=True,
                )
            )

        return insights

    def _calculate_confidence(
        self, patterns: list[AIDetectedPattern], strategies: list[AISolutionStrategy]
    ) -> float:
        """Calculate overall confidence in the analysis."""
        if not patterns:
            return 0.0

        # Base confidence on pattern confidence and solution availability
        avg_pattern_confidence = sum(p.confidence for p in patterns) / len(patterns)
        strategy_coverage = min(1.0, len(strategies) / max(1, len(patterns)))

        overall_confidence = (avg_pattern_confidence * 0.7) + (strategy_coverage * 0.3)

        return min(0.95, overall_confidence)

    def _generate_recommendations(
        self,
        patterns: list[AIDetectedPattern],
        strategies: list[AISolutionStrategy],
        insights: list[AIInsight],
    ) -> list[str]:
        """Generate high-level recommendations based on analysis."""
        recommendations = []

        if patterns:
            # Priority-based recommendations
            critical_patterns = [p for p in patterns if p.severity == "critical"]
            if critical_patterns:
                recommendations.append(
                    f"🚨 Address {len(critical_patterns)} critical error patterns immediately"
                )

            high_frequency = [p for p in patterns if p.frequency > len(patterns) * 0.3]
            if high_frequency:
                recommendations.append(
                    f"📈 Focus on {len(high_frequency)} high-frequency patterns for maximum impact"
                )

        if strategies:
            easy_wins = [s for s in strategies if s.complexity == "easy" and s.effectiveness > 0.7]
            if easy_wins:
                recommendations.append(
                    f"⚡ Implement {len(easy_wins)} easy, high-impact solutions first"
                )

        actionable_insights = [i for i in insights if i.actionable]
        if actionable_insights:
            recommendations.append(
                f"💡 Act on {len(actionable_insights)} actionable insights to improve system reliability"
            )

        # General recommendations
        recommendations.extend(
            [
                "📊 Implement monitoring and alerting for early issue detection",
                "📚 Create and maintain troubleshooting documentation",
                "🔄 Establish regular review cycles for issue patterns",
                "🧪 Enhance testing coverage for identified problem areas",
            ]
        )

        return recommendations

    # Helper methods

    def _generate_pattern_id(self, pattern_name: str) -> str:
        """Generate a unique pattern ID."""
        return f"pattern_{pattern_name}_{hashlib.md5(pattern_name.encode()).hexdigest()[:8]}"

    def _generate_strategy_id(self, pattern_id: str, title: str) -> str:
        """Generate a unique strategy ID."""
        combined = f"{pattern_id}_{title}"
        return f"strategy_{hashlib.md5(combined.encode()).hexdigest()[:8]}"

    def _find_pattern_correlations(self, pattern_name: str, issues: list[IssueData]) -> list[str]:
        """Find correlations between patterns."""
        correlations = []

        # Simple correlation analysis based on co-occurrence
        labels = []
        for issue in issues:
            labels.extend(issue.labels)

        common_labels = [label for label, count in Counter(labels).most_common(3)]
        correlations.extend([f"Often occurs with '{label}' label" for label in common_labels])

        return correlations

    def _extract_pattern_indicators(self, issues: list[IssueData]) -> list[str]:
        """Extract specific indicators from issues."""
        indicators = []

        # Extract common error messages or symptoms
        text_samples = []
        for issue in issues:
            text_samples.append(issue.title)
            if len(issue.body) > 50:
                text_samples.append(issue.body[:100])

        # Find common phrases (simplified)
        common_phrases = set()
        for text in text_samples:
            words = text.lower().split()
            for i in range(len(words) - 1):
                phrase = f"{words[i]} {words[i + 1]}"
                if len(phrase) > 8:
                    common_phrases.add(phrase)

        # Return most relevant indicators
        indicators.extend(list(common_phrases)[:5])

        return indicators

    def _customize_solution_steps(
        self, template_steps: list[str], pattern: AIDetectedPattern, issues: list[IssueData]
    ) -> list[str]:
        """Customize solution steps based on specific pattern and issues."""
        customized = template_steps.copy()

        # Add pattern-specific steps
        if pattern.category == "Integration":
            customized.append("Monitor API response times and error rates")
        elif pattern.category == "Configuration":
            customized.append("Implement configuration validation tests")
        elif pattern.category == "Security":
            customized.append("Review and update security policies")

        return customized

    def _analyze_resolution_times(self, closed_issues: list[IssueData]) -> dict[str, float]:
        """Analyze resolution times for closed issues."""
        resolution_times = []

        for issue in closed_issues:
            if issue.closed_at:
                try:
                    created = datetime.fromisoformat(issue.created_at.replace("Z", "+00:00"))
                    closed = datetime.fromisoformat(issue.closed_at.replace("Z", "+00:00"))
                    resolution_time = (closed - created).total_seconds() / 3600  # hours
                    resolution_times.append(resolution_time)
                except ValueError:
                    continue

        if resolution_times:
            return {
                "avg_hours": sum(resolution_times) / len(resolution_times),
                "min_hours": min(resolution_times),
                "max_hours": max(resolution_times),
            }

        return {"avg_hours": 0, "min_hours": 0, "max_hours": 0}


def main():
    """Main function for command-line execution."""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        # Convert input to IssueData objects
        issues = []
        for issue_dict in input_data.get("issues", []):
            labels = []
            if "labels" in issue_dict and issue_dict["labels"]:
                labels = [
                    label.get("name", "") if isinstance(label, dict) else str(label)
                    for label in issue_dict["labels"]
                ]

            issue = IssueData(
                id=issue_dict.get("id", 0),
                number=issue_dict.get("number", 0),
                title=issue_dict.get("title", ""),
                body=issue_dict.get("body", ""),
                state=issue_dict.get("state", "open"),
                labels=labels,
                author=issue_dict.get("user", {}).get("login", "unknown"),
                created_at=issue_dict.get("created_at", ""),
                updated_at=issue_dict.get("updated_at", ""),
                closed_at=issue_dict.get("closed_at"),
                comments_count=issue_dict.get("comments", 0),
            )
            issues.append(issue)

        # Perform analysis
        analyzer = TroubleshootingAnalyzer()
        result = analyzer.analyze_issues(issues)

        # Output result as JSON
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))

    except Exception as e:
        logger.error(f"Error in troubleshooting analysis: {e}")
        # Return error response
        error_result = {
            "analyzed_at": datetime.now(timezone.utc).isoformat(),
            "processing_time_seconds": 0.0,
            "patterns_detected": [],
            "solution_strategies": [],
            "root_cause_analysis": [],
            "prevention_suggestions": [],
            "insights": [],
            "confidence": 0.0,
            "recommendations": [
                "Error occurred during analysis. Please check input data and try again."
            ],
            "error": str(e),
        }
        print(json.dumps(error_result, ensure_ascii=False, indent=2))
        sys.exit(1)


if __name__ == "__main__":
    main()
