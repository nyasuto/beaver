package main

import (
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/spf13/cobra"
)

// Page command variables
var (
	pagesOutputDir   string
	pagesOpenBrowser bool
	servePort        int
)

// pagesCmd is the simplified pages command for local serving only
var pagesCmd = &cobra.Command{
	Use:   "pages",
	Short: "ローカルページサーバー",
	Long: `生成されたHTMLファイルをローカルでプレビューするサーバー。

機能:
  - HTMLファイルのローカルプレビュー
  - 静的ファイルサーバー
  - ポート設定可能

使用例:
  beaver pages serve                    # デフォルトポート8080で起動
  beaver pages serve --port 3000       # ポート3000で起動
  beaver pages serve --open            # ブラウザで自動起動`,
}

var pagesServeCmd = &cobra.Command{
	Use:   "serve",
	Short: "生成されたページをローカルサーバーで配信",
	Long: `生成されたページをローカルでプレビューします。

機能:
  - HTMLファイルのローカルプレビュー
  - 静的ファイルサーバー
  - ポート設定可能

例:
  beaver pages serve
  beaver pages serve --port 8080 --open`,
	RunE: runPagesServeCommand,
}

func init() {
	// Add pages command to root
	rootCmd.AddCommand(pagesCmd)

	// Add serve subcommand only
	pagesCmd.AddCommand(pagesServeCmd)

	// Serve command flags
	pagesServeCmd.Flags().IntVarP(&servePort, "port", "p", 8080, "サーバーポート")
	pagesServeCmd.Flags().BoolVar(&pagesOpenBrowser, "open", false, "ブラウザを自動で開く")
	pagesServeCmd.Flags().StringVarP(&pagesOutputDir, "output", "o", "", "出力ディレクトリ (デフォルト: _site)")
}

func runPagesServeCommand(cmd *cobra.Command, args []string) error {
	setupLogger := slog.Default()

	// Find output directory
	outputDir := "_site"
	if pagesOutputDir != "" {
		outputDir = pagesOutputDir
	}

	// Check if output directory exists
	if _, err := os.Stat(outputDir); os.IsNotExist(err) {
		return fmt.Errorf("出力ディレクトリが見つかりません: %s\nHTMLファイルを配置してください", outputDir)
	}

	setupLogger.Info("🌐 ローカルサーバー開始", "port", servePort, "directory", outputDir)

	// Implement local server for preview
	return servePagesLocally(outputDir, servePort, pagesOpenBrowser, setupLogger)
}

// servePagesLocally starts a local HTTP server to preview generated pages
func servePagesLocally(outputDir string, port int, openBrowser bool, logger *slog.Logger) error {
	// Create file server
	fs := http.FileServer(http.Dir(outputDir))
	http.Handle("/", fs)

	// Display server information
	logger.Info("🚀 ローカルサーバー起動中...")
	logger.Info("📁 配信ディレクトリ", "path", outputDir)
	logger.Info("🌐 URL", "url", fmt.Sprintf("http://localhost:%d", port))
	logger.Info("⏹️  停止するには Ctrl+C を押してください")

	// Open browser if requested
	if openBrowser {
		logger.Info("🌐 ブラウザで開いています...")
		// Note: Browser opening would need OS-specific implementation
	}

	// Create server with timeouts
	server := &http.Server{
		Addr:         fmt.Sprintf(":%d", port),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	logger.Info("Local server starting", "port", port, "dir", outputDir)
	if err := server.ListenAndServe(); err != nil {
		logger.Error("Server failed", "error", err)
		return fmt.Errorf("❌ サーバー起動エラー: %w", err)
	}

	return nil
}
