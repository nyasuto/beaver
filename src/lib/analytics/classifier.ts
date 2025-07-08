/**
 * Issue Classification Engine
 *
 * This module provides intelligent classification of GitHub issues based on title,
 * body content, labels, and other metadata. It uses rule-based classification
 * with configurable weights and confidence scoring.
 *
 * @module IssueClassifier
 */

import type { Issue } from '../schemas/github';
import {
  IssueClassificationSchema,
  ClassificationCategorySchema,
  type IssueClassification,
  type CategoryClassification,
  type ClassificationCategory,
  type PriorityLevel,
  type ClassificationRule,
  type ClassificationConfig,
} from '../schemas/classification';

/**
 * Default classification rules
 */
const DEFAULT_RULES: ClassificationRule[] = [
  {
    id: 'bug-detection',
    name: 'Bug Detection',
    description: 'Detects bug reports based on common keywords and patterns',
    category: 'bug',
    priority: 'high',
    conditions: {
      titleKeywords: ['bug', 'error', 'issue', 'problem', 'broken', 'fix', 'crash'],
      bodyKeywords: ['error', 'exception', 'stack trace', 'reproduce', 'expected', 'actual'],
      labels: ['bug', 'error', 'defect', 'issue'],
      titlePatterns: ['/\\b(bug|error|issue)\\b/i', '/\\bfix\\b/i'],
      bodyPatterns: ['/steps to reproduce/i', '/expected behavior/i', '/actual behavior/i'],
    },
    weight: 0.9,
    enabled: true,
  },
  {
    id: 'feature-request',
    name: 'Feature Request',
    description: 'Identifies feature requests and new functionality proposals',
    category: 'feature',
    priority: 'medium',
    conditions: {
      titleKeywords: ['feature', 'add', 'implement', 'support', 'request', 'proposal'],
      bodyKeywords: ['would like', 'could we', 'suggestion', 'proposal', 'feature'],
      labels: ['feature', 'enhancement', 'request'],
      titlePatterns: ['/\\b(add|implement|support)\\b/i', '/\\bfeature\\b/i'],
    },
    weight: 0.8,
    enabled: true,
  },
  {
    id: 'enhancement',
    name: 'Enhancement',
    description: 'Identifies improvements to existing functionality',
    category: 'enhancement',
    priority: 'medium',
    conditions: {
      titleKeywords: ['improve', 'enhance', 'better', 'optimize', 'update', 'upgrade'],
      bodyKeywords: ['improvement', 'enhancement', 'optimization', 'performance'],
      titlePatterns: ['/\\b(improve|enhance|better|optimize)\\b/i'],
    },
    weight: 0.7,
    enabled: true,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Identifies documentation-related issues',
    category: 'documentation',
    priority: 'low',
    conditions: {
      titleKeywords: ['docs', 'documentation', 'readme', 'guide', 'tutorial', 'example'],
      bodyKeywords: ['documentation', 'docs', 'readme', 'guide', 'tutorial'],
      titlePatterns: ['/\\b(docs?|documentation|readme)\\b/i'],
    },
    weight: 0.8,
    enabled: true,
  },
  {
    id: 'question',
    name: 'Question',
    description: 'Identifies questions and help requests',
    category: 'question',
    priority: 'low',
    conditions: {
      titleKeywords: ['how', 'why', 'what', 'question', 'help', 'clarification'],
      bodyKeywords: ['question', 'help', 'how do i', 'how can i', 'clarification'],
      titlePatterns: ['/\\?$/', '/\\bhow\\b/i', '/\\bwhy\\b/i', '/\\bwhat\\b/i'],
    },
    weight: 0.6,
    enabled: true,
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Identifies security-related issues',
    category: 'security',
    priority: 'critical',
    conditions: {
      titleKeywords: ['security', 'vulnerability', 'exploit', 'xss', 'csrf', 'injection'],
      bodyKeywords: ['security', 'vulnerability', 'exploit', 'attack', 'malicious'],
      titlePatterns: ['/\\b(security|vulnerability|exploit)\\b/i'],
    },
    weight: 1.0,
    enabled: true,
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'Identifies performance-related issues',
    category: 'performance',
    priority: 'medium',
    conditions: {
      titleKeywords: ['performance', 'slow', 'fast', 'speed', 'optimization', 'memory'],
      bodyKeywords: ['performance', 'slow', 'fast', 'optimization', 'memory', 'cpu'],
      titlePatterns: ['/\\b(slow|fast|performance|optimization)\\b/i'],
    },
    weight: 0.8,
    enabled: true,
  },
];

/**
 * Default classification configuration
 */
const DEFAULT_CONFIG: ClassificationConfig = {
  version: '1.0.0',
  minConfidence: 0.3,
  maxCategories: 3,
  enableAutoClassification: true,
  enablePriorityEstimation: true,
  rules: DEFAULT_RULES,
  categoryWeights: {
    bug: 1.0,
    security: 1.0,
    feature: 0.8,
    enhancement: 0.7,
    performance: 0.8,
    documentation: 0.5,
    question: 0.4,
    duplicate: 0.3,
    invalid: 0.3,
    wontfix: 0.3,
    'help-wanted': 0.6,
    'good-first-issue': 0.5,
    refactor: 0.6,
    test: 0.5,
    'ci-cd': 0.6,
    dependencies: 0.5,
  },
  priorityWeights: {
    critical: 1.0,
    high: 0.8,
    medium: 0.6,
    low: 0.4,
    backlog: 0.2,
  },
};

/**
 * Issue Classification Engine
 */
export class IssueClassifier {
  private config: ClassificationConfig;

  constructor(config?: Partial<ClassificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Classify a single issue
   */
  async classifyIssue(issue: Issue): Promise<IssueClassification> {
    const startTime = Date.now();

    try {
      // Extract features from the issue
      const features = this.extractFeatures(issue);

      // Apply classification rules
      const classifications = this.applyRules(features);

      // Determine primary category
      const primaryClassification = this.getPrimaryClassification(classifications);

      // Estimate priority
      const priorityEstimation = this.estimatePriority(features, primaryClassification);

      // Build classification result
      const result: IssueClassification = {
        issueId: issue.id,
        issueNumber: issue.number,
        classifications: classifications.slice(0, this.config.maxCategories),
        primaryCategory: primaryClassification.category,
        primaryConfidence: primaryClassification.confidence,
        estimatedPriority: priorityEstimation.priority,
        priorityConfidence: priorityEstimation.confidence,
        processingTimeMs: Date.now() - startTime,
        version: this.config.version,
        metadata: features.metadata,
      };

      // Validate the result
      return IssueClassificationSchema.parse(result);
    } catch (error) {
      throw new Error(
        `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Extract features from an issue for classification
   */
  private extractFeatures(issue: Issue) {
    const title = issue.title?.toLowerCase() || '';
    const body = issue.body?.toLowerCase() || '';
    const labels =
      issue.labels?.map(label => (typeof label === 'string' ? label : label.name || '')) || [];

    return {
      title,
      body,
      labels,
      metadata: {
        titleLength: issue.title?.length || 0,
        bodyLength: issue.body?.length || 0,
        hasCodeBlocks: /```/.test(issue.body || ''),
        hasStepsToReproduce: /steps to reproduce/i.test(issue.body || ''),
        hasExpectedBehavior: /expected behavior/i.test(issue.body || ''),
        labelCount: labels.length,
        existingLabels: labels,
      },
    };
  }

  /**
   * Apply classification rules to extracted features
   */
  private applyRules(features: ReturnType<typeof this.extractFeatures>): CategoryClassification[] {
    const scores = new Map<
      ClassificationCategory,
      { score: number; reasons: string[]; keywords: string[] }
    >();

    // Initialize scores for all categories
    ClassificationCategorySchema.options.forEach(category => {
      scores.set(category, { score: 0, reasons: [], keywords: [] });
    });

    // Apply each rule
    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      const ruleScore = this.evaluateRule(rule, features);
      if (ruleScore.score > 0) {
        const current = scores.get(rule.category);
        if (!current) continue;
        current.score +=
          ruleScore.score * rule.weight * (this.config.categoryWeights?.[rule.category] ?? 1);
        current.reasons.push(...ruleScore.reasons);
        current.keywords.push(...ruleScore.keywords);
      }
    }

    // Convert scores to classifications
    const classifications: CategoryClassification[] = [];
    for (const [category, data] of scores) {
      if (data.score > 0) {
        classifications.push({
          category,
          confidence: Math.min(data.score, 1.0),
          reasons: [...new Set(data.reasons)], // Remove duplicates
          keywords: [...new Set(data.keywords)], // Remove duplicates
        });
      }
    }

    // Sort by confidence
    return classifications.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Evaluate a single classification rule
   */
  private evaluateRule(
    rule: ClassificationRule,
    features: ReturnType<typeof this.extractFeatures>
  ) {
    let score = 0;
    const reasons: string[] = [];
    const keywords: string[] = [];

    // Check title keywords (higher weight)
    if (rule.conditions.titleKeywords) {
      for (const keyword of rule.conditions.titleKeywords) {
        if (features.title.includes(keyword.toLowerCase())) {
          score += 0.4; // Increased from 0.3
          reasons.push(`Title contains "${keyword}"`);
          keywords.push(keyword);
        }
      }
    }

    // Check body keywords
    if (rule.conditions.bodyKeywords) {
      for (const keyword of rule.conditions.bodyKeywords) {
        if (features.body.includes(keyword.toLowerCase())) {
          score += 0.3; // Increased from 0.2
          reasons.push(`Body contains "${keyword}"`);
          keywords.push(keyword);
        }
      }
    }

    // Check labels (highest weight)
    if (rule.conditions.labels) {
      for (const label of rule.conditions.labels) {
        if (features.labels.some(l => l.toLowerCase().includes(label.toLowerCase()))) {
          score += 0.5; // Increased from 0.4
          reasons.push(`Has label matching "${label}"`);
        }
      }
    }

    // Check title patterns (regex)
    if (rule.conditions.titlePatterns) {
      for (const pattern of rule.conditions.titlePatterns) {
        try {
          // Extract regex from string format '/pattern/flags'
          const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
          if (match) {
            const flags = (match[2] || '') as string;
            const regex = new RegExp(match[1]!, flags);
            if (regex.test(features.title)) {
              score += 0.4; // Increased from 0.3
              reasons.push(`Title matches pattern "${pattern}"`);
            }
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    // Check body patterns (regex)
    if (rule.conditions.bodyPatterns) {
      for (const pattern of rule.conditions.bodyPatterns) {
        try {
          const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
          if (match) {
            const flags = (match[2] || '') as string;
            const regex = new RegExp(match[1]!, flags);
            if (regex.test(features.body)) {
              score += 0.3; // Increased from 0.2
              reasons.push(`Body matches pattern "${pattern}"`);
            }
          }
        } catch {
          // Invalid regex, skip
        }
      }
    }

    // Check exclude keywords
    if (rule.conditions.excludeKeywords) {
      for (const keyword of rule.conditions.excludeKeywords) {
        if (features.title.includes(keyword) || features.body.includes(keyword)) {
          score = 0; // Exclude completely
          reasons.length = 0;
          keywords.length = 0;
          break;
        }
      }
    }

    return { score: Math.min(score, 1.0), reasons, keywords };
  }

  /**
   * Get the primary classification (highest confidence)
   */
  private getPrimaryClassification(
    classifications: CategoryClassification[]
  ): CategoryClassification {
    const primary = classifications[0];
    if (!primary || primary.confidence < this.config.minConfidence) {
      // Default to 'question' with low confidence if no clear classification
      return {
        category: 'question',
        confidence: 0.3,
        reasons: ['No clear classification found'],
        keywords: [],
      };
    }
    return primary;
  }

  /**
   * Estimate issue priority based on classification and features
   */
  private estimatePriority(
    features: ReturnType<typeof this.extractFeatures>,
    primaryClassification: CategoryClassification
  ): { priority: PriorityLevel; confidence: number } {
    let priority: PriorityLevel = 'medium';
    let confidence = 0.5;

    // Priority based on category
    const categoryPriorityMap: Record<ClassificationCategory, PriorityLevel> = {
      security: 'critical',
      bug: 'high',
      performance: 'high',
      feature: 'medium',
      enhancement: 'medium',
      refactor: 'medium',
      test: 'low',
      documentation: 'low',
      question: 'low',
      'ci-cd': 'medium',
      dependencies: 'low',
      duplicate: 'low',
      invalid: 'low',
      wontfix: 'low',
      'help-wanted': 'medium',
      'good-first-issue': 'low',
    };

    priority = categoryPriorityMap[primaryClassification.category];
    confidence = primaryClassification.confidence * 0.7;

    // Adjust based on keywords indicating urgency
    const criticalKeywords = [
      'critical',
      'urgent',
      'blocking',
      'production',
      'crash',
      'data loss',
      'security',
    ];
    const hasCriticalKeywords = criticalKeywords.some(
      keyword =>
        features.title.includes(keyword.toLowerCase()) ||
        features.body.includes(keyword.toLowerCase())
    );

    if (hasCriticalKeywords) {
      priority = 'critical';
      confidence = Math.min(confidence + 0.3, 1.0);
    } else {
      // Check for high priority keywords
      const highKeywords = ['urgent', 'important', 'asap'];
      const hasHighKeywords = highKeywords.some(
        keyword =>
          features.title.includes(keyword.toLowerCase()) ||
          features.body.includes(keyword.toLowerCase())
      );

      if (hasHighKeywords && priority !== 'critical') {
        priority = priority === 'medium' || priority === 'low' ? 'high' : priority;
        confidence = Math.min(confidence + 0.2, 1.0);
      }
    }

    // Adjust based on existing labels
    const priorityLabels = features.labels.filter(label =>
      /priority|urgent|critical|high|medium|low/i.test(label)
    );

    if (priorityLabels.length > 0) {
      confidence = Math.min(confidence + 0.1, 1.0);

      // Extract priority from labels
      const criticalLabels = priorityLabels.filter(label => /critical|urgent|p0|p1/i.test(label));
      if (criticalLabels.length > 0) {
        priority = 'critical';
      }
    }

    return { priority, confidence };
  }

  /**
   * Get current configuration
   */
  getConfig(): ClassificationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ClassificationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}
