"""
Enhanced Classification Service with Topic Model Integration

拡張トピックモデルを統合した高精度分類サービス
- Few-shot学習サポート
- 多言語プロンプト最適化
- 分類精度評価
- レスポンス時間最適化
"""

import asyncio
import time
import psutil
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

import structlog
from langchain_openai import ChatOpenAI
from langchain.schema import BaseMessage

from config import Settings
from models.classification import Issue, ClassificationConfig, ClassificationResult
from models.topic_model import EnhancedTopicModel, ClassificationMetrics, get_enhanced_topic_model


logger = structlog.get_logger()


class EnhancedClassificationService:
    """拡張AI分類サービス（トピックモデル統合）"""
    
    def __init__(self, settings: Settings):
        self.settings = settings
        self.llm: Optional[ChatOpenAI] = None
        self.start_time = time.time()
        self._model_loaded = False
        self._api_accessible = False
        
        # 拡張トピックモデルの初期化
        self.topic_model = get_enhanced_topic_model()
        self.topic_model.create_few_shot_examples()
        
        # 分類履歴とメトリクス
        self.classification_history: List[Tuple[Issue, ClassificationResult]] = []
        self.performance_metrics: Dict[str, Any] = {}
        
        logger.info("Enhanced Classification Service initialized with topic model")
    
    async def initialize(self) -> None:
        """拡張分類サービスの初期化"""
        try:
            logger.info("Initializing Enhanced ClassificationService...")
            
            # OpenAI API key検証
            if not self.settings.openai_api_key:
                raise ValueError("OpenAI API key is required")
            
            # LangChain ChatOpenAI初期化（最適化されたパラメータ）
            recommendations = self.topic_model.get_optimization_recommendations()
            model_config = recommendations["model_configuration"]
            
            self.llm = ChatOpenAI(
                model=self.settings.openai_model,
                temperature=model_config["temperature"],
                max_tokens=model_config["max_tokens"],
                openai_api_key=self.settings.openai_api_key,
                request_timeout=self.settings.request_timeout,
                model_kwargs={
                    "top_p": model_config["top_p"],
                    "frequency_penalty": model_config["frequency_penalty"]
                }
            )
            
            # API接続テスト
            await self._test_api_connection()
            
            self._model_loaded = True
            self._api_accessible = True
            
            logger.info(
                "Enhanced ClassificationService initialized successfully",
                model=self.settings.openai_model,
                few_shot_examples=len(self.topic_model.few_shot_examples),
                optimization_enabled=True
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize Enhanced ClassificationService: {e}")
            raise
    
    async def _test_api_connection(self) -> None:
        """API接続テスト"""
        try:
            test_messages = [
                {"role": "system", "content": "You are a test assistant."},
                {"role": "user", "content": "Say 'Hello' if you can respond."}
            ]
            
            response = await self.llm.ainvoke(test_messages)
            logger.info("Enhanced API connection test successful")
            
        except Exception as e:
            logger.error(f"Enhanced API connection test failed: {e}")
            raise
    
    async def classify_issue_enhanced(
        self, 
        issue: Issue, 
        config: Optional[ClassificationConfig] = None,
        use_few_shot: bool = True
    ) -> ClassificationResult:
        """拡張トピックモデルを使用したIssue分類"""
        start_time = time.time()
        
        try:
            # 拡張プロンプト作成
            messages = self.topic_model.create_enhanced_prompt(issue, use_few_shot)
            
            logger.debug(
                f"Sending enhanced classification request for issue {issue.id}",
                use_few_shot=use_few_shot,
                prompt_length=len(str(messages))
            )
            
            # OpenAI API呼び出し
            response = await self.llm.ainvoke(messages)
            
            # 拡張レスポンス解析
            result = self.topic_model.parse_enhanced_response(response.content, issue.id)
            
            processing_time = int((time.time() - start_time) * 1000)
            result.processing_time_ms = processing_time
            
            # 信頼度閾値チェック
            if config and result.confidence < config.confidence_threshold:
                logger.warning(
                    f"Low confidence enhanced classification for issue {issue.id}",
                    confidence=result.confidence,
                    threshold=config.confidence_threshold,
                    category=result.category
                )
            
            # 分類履歴に追加
            self.classification_history.append((issue, result))
            
            # 性能メトリクス更新
            self._update_performance_metrics(processing_time, result.confidence)
            
            return result
            
        except Exception as e:
            logger.error(f"Enhanced classification failed for issue {issue.id}: {e}")
            
            # フォールバック結果
            fallback_result = ClassificationResult(
                issue_id=issue.id,
                category="troubleshooting",
                confidence=0.0,
                reasoning=f"Enhanced classification error: {str(e)}",
                suggested_tags=["error", "fallback"],
                processing_time_ms=int((time.time() - start_time) * 1000)
            )
            
            self.classification_history.append((issue, fallback_result))
            return fallback_result
    
    async def batch_classify_issues_enhanced(
        self,
        issues: List[Issue],
        config: Optional[ClassificationConfig] = None,
        parallel: bool = True,
        use_few_shot: bool = True
    ) -> List[ClassificationResult]:
        """拡張バッチ分類処理"""
        
        if not issues:
            return []
        
        logger.info(
            f"Starting enhanced batch classification for {len(issues)} issues",
            parallel=parallel,
            use_few_shot=use_few_shot
        )
        
        batch_start_time = time.time()
        
        if parallel:
            # 並列処理（最適化されたセマフォ）
            semaphore = asyncio.Semaphore(3)  # API制限を考慮して調整
            
            async def classify_with_semaphore(issue: Issue) -> ClassificationResult:
                async with semaphore:
                    return await self.classify_issue_enhanced(issue, config, use_few_shot)
            
            tasks = [classify_with_semaphore(issue) for issue in issues]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 例外処理
            processed_results = []
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"Failed to classify issue {issues[i].id}: {result}")
                    processed_results.append(None)
                else:
                    processed_results.append(result)
            
        else:
            # 逐次処理
            processed_results = []
            for issue in issues:
                try:
                    result = await self.classify_issue_enhanced(issue, config, use_few_shot)
                    processed_results.append(result)
                except Exception as e:
                    logger.error(f"Failed to classify issue {issue.id}: {e}")
                    processed_results.append(None)
        
        batch_processing_time = int((time.time() - batch_start_time) * 1000)
        
        # バッチ処理メトリクス
        successful_results = [r for r in processed_results if r is not None]
        logger.info(
            "Enhanced batch classification completed",
            total_issues=len(issues),
            successful=len(successful_results),
            failed=len(processed_results) - len(successful_results),
            batch_processing_time_ms=batch_processing_time,
            average_per_issue_ms=batch_processing_time // max(len(issues), 1)
        )
        
        return processed_results
    
    def _update_performance_metrics(self, processing_time_ms: int, confidence: float) -> None:
        """性能メトリクスの更新"""
        if "response_times" not in self.performance_metrics:
            self.performance_metrics["response_times"] = []
        if "confidences" not in self.performance_metrics:
            self.performance_metrics["confidences"] = []
        
        self.performance_metrics["response_times"].append(processing_time_ms)
        self.performance_metrics["confidences"].append(confidence)
        
        # 直近100件のみ保持
        if len(self.performance_metrics["response_times"]) > 100:
            self.performance_metrics["response_times"] = self.performance_metrics["response_times"][-100:]
            self.performance_metrics["confidences"] = self.performance_metrics["confidences"][-100:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """性能サマリーの取得"""
        if not self.performance_metrics.get("response_times"):
            return {"status": "no_data"}
        
        response_times = self.performance_metrics["response_times"]
        confidences = self.performance_metrics["confidences"]
        
        return {
            "total_classifications": len(response_times),
            "average_response_time_ms": sum(response_times) / len(response_times),
            "min_response_time_ms": min(response_times),
            "max_response_time_ms": max(response_times),
            "average_confidence": sum(confidences) / len(confidences),
            "high_confidence_ratio": len([c for c in confidences if c >= 0.8]) / len(confidences),
            "low_confidence_ratio": len([c for c in confidences if c < 0.5]) / len(confidences),
            "target_response_time_met": sum(1 for t in response_times if t <= 3000) / len(response_times),
            "last_updated": datetime.now().isoformat()
        }
    
    async def evaluate_classification_accuracy(
        self, 
        test_issues: List[Issue], 
        expected_categories: List[str]
    ) -> ClassificationMetrics:
        """分類精度の評価"""
        
        if len(test_issues) != len(expected_categories):
            raise ValueError("Test issues and expected categories must have same length")
        
        logger.info(f"Starting classification accuracy evaluation with {len(test_issues)} test cases")
        
        # テストケースの分類実行
        test_results = await self.batch_classify_issues_enhanced(test_issues, use_few_shot=True)
        
        # 精度計算
        correct_predictions = 0
        category_stats = {}
        
        for expected_cat in set(expected_categories):
            category_stats[expected_cat] = {
                "true_positive": 0,
                "false_positive": 0,
                "false_negative": 0
            }
        
        for i, (expected, result) in enumerate(zip(expected_categories, test_results)):
            if result is None:
                continue
                
            predicted = result.category
            
            if predicted == expected:
                correct_predictions += 1
                category_stats[expected]["true_positive"] += 1
            else:
                category_stats[expected]["false_negative"] += 1
                if predicted in category_stats:
                    category_stats[predicted]["false_positive"] += 1
        
        # メトリクス計算
        total_valid = len([r for r in test_results if r is not None])
        accuracy = correct_predictions / total_valid if total_valid > 0 else 0.0
        
        precision_per_category = {}
        recall_per_category = {}
        f1_score_per_category = {}
        
        for category, stats in category_stats.items():
            tp = stats["true_positive"]
            fp = stats["false_positive"]
            fn = stats["false_negative"]
            
            precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
            
            precision_per_category[category] = precision
            recall_per_category[category] = recall
            f1_score_per_category[category] = f1
        
        average_f1_score = sum(f1_score_per_category.values()) / len(f1_score_per_category) if f1_score_per_category else 0.0
        
        response_times = [r.processing_time_ms for r in test_results if r is not None]
        average_response_time = sum(response_times) / len(response_times) if response_times else 0.0
        
        metrics = ClassificationMetrics(
            accuracy=accuracy,
            precision_per_category=precision_per_category,
            recall_per_category=recall_per_category,
            f1_score_per_category=f1_score_per_category,
            average_f1_score=average_f1_score,
            average_response_time_ms=average_response_time,
            total_classified=total_valid,
            timestamp=datetime.now()
        )
        
        logger.info(
            "Classification accuracy evaluation completed",
            accuracy=accuracy,
            average_f1_score=average_f1_score,
            average_response_time_ms=average_response_time,
            total_classified=total_valid
        )
        
        return metrics
    
    async def health_check_enhanced(self) -> Dict[str, Any]:
        """拡張ヘルスチェック"""
        try:
            base_health = await self._basic_health_check()
            performance_summary = self.get_performance_summary()
            
            # 性能目標との比較
            recommendations = self.topic_model.get_optimization_recommendations()
            targets = recommendations["evaluation_strategy"]["performance_targets"]
            
            health_status = {
                "api_accessible": base_health,
                "model_loaded": self._model_loaded,
                "few_shot_examples": len(self.topic_model.few_shot_examples),
                "classification_history": len(self.classification_history),
                "performance": performance_summary,
                "targets": targets,
                "status": "healthy" if base_health and self._model_loaded else "unhealthy",
                "timestamp": datetime.now().isoformat()
            }
            
            # 性能目標達成チェック
            if performance_summary.get("status") != "no_data":
                meets_accuracy = performance_summary.get("high_confidence_ratio", 0) >= 0.8
                meets_response_time = performance_summary.get("target_response_time_met", 0) >= 0.95
                
                health_status["performance_targets_met"] = {
                    "accuracy": meets_accuracy,
                    "response_time": meets_response_time,
                    "overall": meets_accuracy and meets_response_time
                }
            
            return health_status
            
        except Exception as e:
            logger.error(f"Enhanced health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def _basic_health_check(self) -> bool:
        """基本ヘルスチェック"""
        try:
            if not self.llm:
                return False
            
            test_messages = [{"role": "user", "content": "Health check"}]
            await self.llm.ainvoke(test_messages)
            return True
            
        except Exception as e:
            logger.error(f"Basic health check failed: {e}")
            return False
    
    def get_memory_usage(self) -> Optional[float]:
        """メモリ使用量の取得"""
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            return round(memory_mb, 2)
        except Exception:
            return None
    
    async def cleanup(self) -> None:
        """リソースクリーンアップ"""
        logger.info("Cleaning up Enhanced ClassificationService...")
        self.llm = None
        self._model_loaded = False
        self._api_accessible = False
        self.classification_history.clear()
        self.performance_metrics.clear()