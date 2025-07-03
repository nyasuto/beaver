package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/spf13/cobra"
)

// Version information - set during build
var (
	version   = "dev"
	buildTime = "unknown"
	gitCommit = "unknown"
)

var rootCmd = &cobra.Command{
	Use:     "beaver",
	Short:   "🦫 Beaver - GitHub Pages サーバー",
	Version: version,
	Long: `Beaver は GitHub Pages の開発用ローカルサーバーです。
	
生成された HTML ファイルをローカルでプレビューできます。`,
	Run: runRootCommand,
}

func runRootCommand(cmd *cobra.Command, args []string) {
	fmt.Println("🦫 Beaver - GitHub Pages サーバー")
	fmt.Println("使用方法: beaver pages serve")
	fmt.Println("詳細なヘルプ: beaver --help")
}

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "バージョン情報を表示",
	Long:  "Beaverのバージョン、ビルド時刻、Git commit情報を表示します。",
	Run:   runVersionCommand,
}

func runVersionCommand(cmd *cobra.Command, args []string) {
	fmt.Printf("🦫 Beaver バージョン: %s\n", version)
	fmt.Printf("📅 ビルド時刻: %s\n", buildTime)
	fmt.Printf("📝 Git commit: %s\n", gitCommit)
}

func init() {
	rootCmd.AddCommand(versionCmd)
	rootCmd.AddCommand(pagesCmd)
}

// mainLogic contains the core logic of main() without os.Exit for testing
func mainLogic() error {
	mainLogger := slog.Default()
	mainLogger.Info("Starting beaver CLI application")
	if err := rootCmd.Execute(); err != nil {
		mainLogger.Error("Command execution failed", "error", err)
		fmt.Fprintf(os.Stderr, "エラー: %v\n", err)
		return err
	}
	mainLogger.Info("Beaver CLI application completed successfully")
	return nil
}

func main() {
	if err := mainLogic(); err != nil {
		os.Exit(1)
	}
}
