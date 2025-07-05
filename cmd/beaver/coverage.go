package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/nyasuto/beaver/pkg/coverage"
	"github.com/spf13/cobra"
)

// createCoverageCommand creates the coverage analysis command
func createCoverageCommand() *cobra.Command {
	var (
		outputFormat   string
		outputFile     string
		configFile     string
		packageFilter  string
		generateReport bool
		htmlReport     bool
		minCoverage    float64
	)

	cmd := &cobra.Command{
		Use:   "coverage",
		Short: "📊 コードカバレッジ分析とレポート生成",
		Long: `Beaverのコードカバレッジ分析機能

このコマンドはGoプロジェクトのテストカバレッジを分析し、
詳細なレポートとダッシュボード用データを生成します。

使用例:
  # 基本的なカバレッジ分析
  beaver coverage

  # HTMLレポート生成
  beaver coverage --html

  # 特定パッケージのみ分析
  beaver coverage --package "./pkg/..."

  # カスタム出力ファイル
  beaver coverage --output coverage-report.json

  # 最小カバレッジ閾値設定
  beaver coverage --min-coverage 80`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCoverageAnalysis(coverageOptions{
				outputFormat:   outputFormat,
				outputFile:     outputFile,
				configFile:     configFile,
				packageFilter:  packageFilter,
				generateReport: generateReport,
				htmlReport:     htmlReport,
				minCoverage:    minCoverage,
			})
		},
	}

	// Add flags
	cmd.Flags().StringVarP(&outputFormat, "format", "f", "json", "出力形式 (json, console, html)")
	cmd.Flags().StringVarP(&outputFile, "output", "o", "", "出力ファイルパス (未指定の場合は標準出力)")
	cmd.Flags().StringVarP(&configFile, "config", "c", "", "カバレッジ設定ファイル")
	cmd.Flags().StringVarP(&packageFilter, "package", "p", "", "分析対象パッケージ (例: ./pkg/...)")
	cmd.Flags().BoolVarP(&generateReport, "report", "r", false, "詳細レポート生成")
	cmd.Flags().BoolVar(&htmlReport, "html", false, "HTMLレポート生成")
	cmd.Flags().Float64Var(&minCoverage, "min-coverage", 0, "最小カバレッジ閾値 (0-100)")

	// Add subcommands
	cmd.AddCommand(createCoverageCollectCommand())
	cmd.AddCommand(createCoverageReportCommand())
	cmd.AddCommand(createCoverageValidateCommand())

	return cmd
}

// coverageOptions contains options for coverage analysis
type coverageOptions struct {
	outputFormat   string
	outputFile     string
	configFile     string
	packageFilter  string
	generateReport bool
	htmlReport     bool
	minCoverage    float64
}

// runCoverageAnalysis performs comprehensive coverage analysis
func runCoverageAnalysis(opts coverageOptions) error {
	fmt.Println("📊 コードカバレッジ分析を開始中...")

	// Get current working directory
	projectRoot, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	// Load or create coverage configuration
	config, err := loadCoverageConfig(opts.configFile)
	if err != nil {
		fmt.Printf("⚠️ 設定ファイル読み込み失敗、デフォルト設定を使用: %v\n", err)
		config = coverage.DefaultCoverageConfig()
	}

	// Override config with command line options
	if opts.minCoverage > 0 {
		config.MinimumCoverage = opts.minCoverage
	}
	if opts.packageFilter != "" {
		config.IncludePackages = []string{opts.packageFilter}
	}
	if opts.outputFormat != "" {
		config.OutputFormat = opts.outputFormat
	}

	// Create collector and validate environment
	collector := coverage.NewCollector(projectRoot, config)

	fmt.Println("🔍 Go環境の検証中...")
	err = collector.ValidateGoEnvironment()
	if err != nil {
		return fmt.Errorf("go環境検証失敗: %w", err)
	}

	// Collect coverage data
	fmt.Println("🧪 テスト実行とカバレッジ収集中...")
	coverageData, err := collector.CollectCoverage()
	if err != nil {
		return fmt.Errorf("カバレッジ収集失敗: %w", err)
	}

	// Output results
	err = outputCoverageData(coverageData, opts)
	if err != nil {
		return fmt.Errorf("結果出力失敗: %w", err)
	}

	// Generate HTML report if requested
	if opts.htmlReport || opts.generateReport {
		err = generateHTMLCoverageReport(collector, coverageData, opts)
		if err != nil {
			fmt.Printf("⚠️ HTMLレポート生成失敗: %v\n", err)
		}
	}

	// Print summary
	printCoverageSummary(coverageData)

	return nil
}

// loadCoverageConfig loads coverage configuration from file
func loadCoverageConfig(configFile string) (*coverage.CoverageConfig, error) {
	if configFile == "" {
		// Try default locations
		candidates := []string{
			"coverage.yml",
			"config/coverage.yml",
			".beaver/coverage.yml",
		}

		for _, candidate := range candidates {
			if _, err := os.Stat(candidate); err == nil {
				configFile = candidate
				break
			}
		}

		if configFile == "" {
			return nil, fmt.Errorf("no coverage config file found")
		}
	}

	// For now, return default config
	// In a real implementation, we would parse the YAML file
	return coverage.DefaultCoverageConfig(), nil
}

// outputCoverageData outputs coverage data in the specified format
func outputCoverageData(data *coverage.CoverageData, opts coverageOptions) error {
	switch opts.outputFormat {
	case "json":
		return outputCoverageJSON(data, opts.outputFile)
	case "console":
		return outputCoverageConsole(data)
	case "html":
		// This will be handled by generateHTMLCoverageReport
		return nil
	default:
		return fmt.Errorf("unsupported output format: %s", opts.outputFormat)
	}
}

// outputCoverageJSON outputs coverage data as JSON
func outputCoverageJSON(data *coverage.CoverageData, outputFile string) error {
	jsonData, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal JSON: %w", err)
	}

	if outputFile == "" {
		fmt.Println(string(jsonData))
		return nil
	}

	err = os.WriteFile(outputFile, jsonData, 0600)
	if err != nil {
		return fmt.Errorf("failed to write JSON file: %w", err)
	}

	fmt.Printf("✅ JSONレポート保存完了: %s\n", outputFile)
	return nil
}

// outputCoverageConsole outputs coverage data to console
func outputCoverageConsole(data *coverage.CoverageData) error {
	fmt.Printf("\n📊 === カバレッジレポート: %s ===\n", data.ProjectName)
	fmt.Printf("生成日時: %s\n", data.GeneratedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("総合カバレッジ: %.1f%% (評価: %s)\n", data.TotalCoverage, data.QualityRating.OverallGrade)

	fmt.Printf("\n📈 サマリー:\n")
	fmt.Printf("  総パッケージ数: %d\n", data.Summary.TotalPackages)
	fmt.Printf("  テスト済み: %d\n", data.Summary.TestedPackages)
	fmt.Printf("  未テスト: %d\n", data.Summary.UntestedPackages)
	fmt.Printf("  総ファイル数: %d\n", data.Summary.TotalFiles)

	if len(data.PackageStats) > 0 {
		fmt.Printf("\n📦 パッケージ別カバレッジ:\n")
		for _, pkg := range data.PackageStats {
			fmt.Printf("  %s: %.1f%% (%s) - %d/%d statements\n",
				pkg.PackageName,
				pkg.Coverage,
				pkg.QualityGrade,
				pkg.CoveredStatements,
				pkg.TotalStatements,
			)
		}
	}

	if len(data.Recommendations) > 0 {
		fmt.Printf("\n💡 改善提案:\n")
		for i, rec := range data.Recommendations {
			if i >= 5 { // Limit to 5 recommendations in console output
				break
			}
			fmt.Printf("  %s: %s\n", rec.Priority, rec.Description)
		}
	}

	return nil
}

// generateHTMLCoverageReport generates an HTML coverage report
func generateHTMLCoverageReport(collector *coverage.Collector, data *coverage.CoverageData, opts coverageOptions) error {
	outputPath := "coverage-report.html"
	if opts.outputFile != "" && opts.outputFormat == "html" {
		outputPath = opts.outputFile
	}

	err := collector.GenerateHTMLReport(data, outputPath)
	if err != nil {
		return err
	}

	fmt.Printf("✅ HTMLレポート生成完了: %s\n", outputPath)
	return nil
}

// printCoverageSummary prints a brief coverage summary
func printCoverageSummary(data *coverage.CoverageData) {
	fmt.Printf("\n🎯 === 分析完了 ===\n")
	fmt.Printf("総合カバレッジ: %.1f%%\n", data.TotalCoverage)
	fmt.Printf("品質評価: %s (%s)\n", data.QualityRating.OverallGrade, data.QualityRating.Description)

	if data.QualityRating.NextTarget > data.TotalCoverage {
		fmt.Printf("次の目標: %.1f%%\n", data.QualityRating.NextTarget)
	}

	if len(data.Recommendations) > 0 {
		fmt.Printf("改善提案: %d件\n", len(data.Recommendations))
	}
}

// createCoverageCollectCommand creates the coverage collect subcommand
func createCoverageCollectCommand() *cobra.Command {
	var (
		outputFile  string
		packagePath string
	)

	cmd := &cobra.Command{
		Use:   "collect",
		Short: "カバレッジデータ収集のみ実行",
		Long:  "テストを実行してカバレッジデータを収集し、coverage.outファイルを生成します。",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCoverageCollect(outputFile, packagePath)
		},
	}

	cmd.Flags().StringVarP(&outputFile, "output", "o", "coverage.out", "カバレッジファイル出力パス")
	cmd.Flags().StringVarP(&packagePath, "package", "p", "./...", "対象パッケージパス")

	return cmd
}

// runCoverageCollect runs coverage collection only
func runCoverageCollect(outputFile, packagePath string) error {
	fmt.Println("🧪 カバレッジデータ収集中...")

	projectRoot, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	config := coverage.DefaultCoverageConfig()
	if packagePath != "./..." {
		config.IncludePackages = []string{packagePath}
	}

	collector := coverage.NewCollector(projectRoot, config)
	if outputFile != "" {
		collector.SetOutputPath(outputFile)
	}

	err = collector.ValidateGoEnvironment()
	if err != nil {
		return fmt.Errorf("go環境検証失敗: %w", err)
	}

	_, err = collector.CollectCoverage()
	if err != nil {
		return fmt.Errorf("カバレッジ収集失敗: %w", err)
	}

	fmt.Printf("✅ カバレッジデータ収集完了: %s\n", outputFile)
	return nil
}

// createCoverageReportCommand creates the coverage report subcommand
func createCoverageReportCommand() *cobra.Command {
	var (
		inputFile  string
		outputFile string
		format     string
	)

	cmd := &cobra.Command{
		Use:   "report",
		Short: "既存カバレッジファイルからレポート生成",
		Long:  "既存のcoverage.outファイルを解析してレポートを生成します。",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCoverageReport(inputFile, outputFile, format)
		},
	}

	cmd.Flags().StringVarP(&inputFile, "input", "i", "coverage.out", "入力カバレッジファイル")
	cmd.Flags().StringVarP(&outputFile, "output", "o", "", "出力ファイルパス")
	cmd.Flags().StringVarP(&format, "format", "f", "console", "出力形式 (json, console, html)")

	return cmd
}

// runCoverageReport generates a report from existing coverage file
func runCoverageReport(inputFile, outputFile, format string) error {
	fmt.Printf("📊 カバレッジレポート生成中: %s\n", inputFile)

	if _, err := os.Stat(inputFile); os.IsNotExist(err) {
		return fmt.Errorf("カバレッジファイルが見つかりません: %s", inputFile)
	}

	projectRoot, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	analyzer := coverage.NewAnalyzer(projectRoot, coverage.DefaultCoverageConfig())
	data, err := analyzer.AnalyzeCoverageFile(inputFile)
	if err != nil {
		return fmt.Errorf("カバレッジ分析失敗: %w", err)
	}

	opts := coverageOptions{
		outputFormat: format,
		outputFile:   outputFile,
		htmlReport:   format == "html",
	}

	return outputCoverageData(data, opts)
}

// createCoverageValidateCommand creates the coverage validate subcommand
func createCoverageValidateCommand() *cobra.Command {
	var (
		minCoverage   float64
		failOnLow     bool
		checkPackages bool
	)

	cmd := &cobra.Command{
		Use:   "validate",
		Short: "カバレッジ品質検証",
		Long:  "カバレッジが指定された品質基準を満たしているかを検証します。",
		RunE: func(cmd *cobra.Command, args []string) error {
			return runCoverageValidate(minCoverage, failOnLow, checkPackages)
		},
	}

	cmd.Flags().Float64Var(&minCoverage, "min-coverage", 70.0, "最小カバレッジ要求 (%)")
	cmd.Flags().BoolVar(&failOnLow, "fail-on-low", false, "低カバレッジの場合にエラー終了")
	cmd.Flags().BoolVar(&checkPackages, "check-packages", true, "パッケージ別チェック実行")

	return cmd
}

// runCoverageValidate validates coverage quality
func runCoverageValidate(minCoverage float64, failOnLow, checkPackages bool) error {
	fmt.Printf("🔍 カバレッジ品質検証中 (最小要求: %.1f%%)\n", minCoverage)

	projectRoot, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %w", err)
	}

	config := coverage.DefaultCoverageConfig()
	config.MinimumCoverage = minCoverage

	collector := coverage.NewCollector(projectRoot, config)
	data, err := collector.CollectCoverage()
	if err != nil {
		return fmt.Errorf("カバレッジ収集失敗: %w", err)
	}

	// Check overall coverage
	fmt.Printf("総合カバレッジ: %.1f%%\n", data.TotalCoverage)

	passed := true
	if data.TotalCoverage < minCoverage {
		fmt.Printf("❌ 総合カバレッジが最小要求を下回っています (%.1f%% < %.1f%%)\n", data.TotalCoverage, minCoverage)
		passed = false
	} else {
		fmt.Printf("✅ 総合カバレッジが要求を満たしています\n")
	}

	// Check package-level coverage if requested
	if checkPackages {
		fmt.Println("\n📦 パッケージ別検証:")
		for _, pkg := range data.PackageStats {
			if pkg.Coverage < minCoverage {
				fmt.Printf("❌ %s: %.1f%% (要求: %.1f%%)\n", pkg.PackageName, pkg.Coverage, minCoverage)
				passed = false
			} else {
				fmt.Printf("✅ %s: %.1f%%\n", pkg.PackageName, pkg.Coverage)
			}
		}
	}

	if !passed && failOnLow {
		return fmt.Errorf("カバレッジ検証失敗")
	}

	if passed {
		fmt.Println("\n🎉 すべてのカバレッジ検証に合格しました!")
	} else {
		fmt.Println("\n⚠️ 一部のカバレッジ検証で問題が見つかりました")
	}

	return nil
}
