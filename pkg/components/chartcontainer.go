package components

import (
	"fmt"
	"html/template"
	"strings"
)

// ChartData represents data for chart visualization
type ChartData struct {
	ChartID     string      // Unique ID for the chart canvas
	Title       string      // Chart title
	TitleIcon   string      // Icon for the title (optional)
	ChartType   string      // Chart type: "bar", "line", "pie", "doughnut", "scatter"
	Data        interface{} // Chart data (will be JSON serialized)
	Options     interface{} // Chart.js options (will be JSON serialized)
	Height      string      // Chart height (e.g., "400px")
	Description string      // Optional description below title
}

// ChartContainerOptions represents configuration options for chart containers
type ChartContainerOptions struct {
	CSSClasses       string // Additional CSS classes
	ShowDescription  bool   // Whether to show description
	ResponsiveHeight bool   // Whether to use responsive height
	DarkMode         bool   // Whether to include dark mode styles
	GridColumns      int    // For grid layouts (1, 2, 3, etc.)
}

// ChartContainerGenerator generates reusable chart containers
type ChartContainerGenerator struct{}

// NewChartContainerGenerator creates a new chart container generator
func NewChartContainerGenerator() *ChartContainerGenerator {
	return &ChartContainerGenerator{}
}

// GenerateChartContainer generates a single chart container HTML
func (ccg *ChartContainerGenerator) GenerateChartContainer(data ChartData, options ChartContainerOptions) string {
	tmpl := template.Must(template.New("chartcontainer").Funcs(template.FuncMap{
		"getContainerClasses": func() string {
			classes := "chart-container"
			if options.ResponsiveHeight {
				classes += " chart-responsive"
			}
			if options.CSSClasses != "" {
				classes += " " + options.CSSClasses
			}
			return classes
		},
		"getCanvasHeight": func() string {
			if data.Height != "" {
				return data.Height
			}
			return "400px"
		},
		"hasDescription": func() bool {
			return options.ShowDescription && data.Description != ""
		},
		"getChartScript": func() string {
			return ccg.generateChartJSScript(data)
		},
	}).Parse(ccg.getChartContainerTemplate()))

	var builder strings.Builder
	if err := tmpl.Execute(&builder, map[string]interface{}{
		"Data":    data,
		"Options": options,
	}); err != nil {
		return fmt.Sprintf("<!-- Error generating chart container: %v -->", err)
	}

	return builder.String()
}

// GenerateChartsGrid generates a grid of chart containers
func (ccg *ChartContainerGenerator) GenerateChartsGrid(charts []ChartData, options ChartContainerOptions) string {
	var chartsHTML strings.Builder

	for _, chart := range charts {
		chartsHTML.WriteString(ccg.GenerateChartContainer(chart, options))
	}

	gridClass := "charts-grid"
	if options.GridColumns > 0 {
		gridClass = fmt.Sprintf("charts-grid charts-grid-%d", options.GridColumns)
	}

	return fmt.Sprintf(`
        <div class="%s">
            %s
        </div>`, gridClass, chartsHTML.String())
}

// GeneratePackageCoverageChart generates a specific bar chart for package coverage
func (ccg *ChartContainerGenerator) GeneratePackageCoverageChart(chartID string, labels []string, coverages []float64, grades []string) string {
	data := ChartData{
		ChartID:   chartID,
		Title:     "📊 Package Coverage",
		TitleIcon: "📊",
		ChartType: "bar",
		Height:    "400px",
	}

	chartConfig := map[string]interface{}{
		"type": "bar",
		"data": map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"label":           "Coverage %",
					"data":            coverages,
					"backgroundColor": "function(context) { /* Grade-based coloring */ }",
					"borderWidth":     1,
				},
			},
		},
		"options": map[string]interface{}{
			"responsive":          true,
			"maintainAspectRatio": false,
			"scales": map[string]interface{}{
				"y": map[string]interface{}{
					"beginAtZero": true,
					"max":         100,
				},
			},
			"plugins": map[string]interface{}{
				"legend": map[string]interface{}{
					"display": false,
				},
			},
		},
	}

	data.Data = chartConfig

	options := ChartContainerOptions{
		ResponsiveHeight: true,
		DarkMode:         true,
	}

	return ccg.GenerateChartContainer(data, options)
}

// GenerateDistributionChart generates a doughnut chart for coverage distribution
func (ccg *ChartContainerGenerator) GenerateDistributionChart(chartID string, distribution map[string]int) string {
	labels := []string{"A (90%+)", "B (80-89%)", "C (70-79%)", "D (50-69%)", "F (<50%)"}
	values := []int{distribution["A"], distribution["B"], distribution["C"], distribution["D"], distribution["F"]}
	colors := []string{"#4CAF50", "#8BC34A", "#FF9800", "#FF5722", "#F44336"}

	data := ChartData{
		ChartID:   chartID,
		Title:     "🎯 Coverage Distribution",
		TitleIcon: "🎯",
		ChartType: "doughnut",
		Height:    "400px",
	}

	chartConfig := map[string]interface{}{
		"type": "doughnut",
		"data": map[string]interface{}{
			"labels": labels,
			"datasets": []map[string]interface{}{
				{
					"data":            values,
					"backgroundColor": colors,
					"borderWidth":     2,
					"borderColor":     "#fff",
				},
			},
		},
		"options": map[string]interface{}{
			"responsive":          true,
			"maintainAspectRatio": false,
			"plugins": map[string]interface{}{
				"legend": map[string]interface{}{
					"position": "bottom",
				},
			},
		},
	}

	data.Data = chartConfig

	options := ChartContainerOptions{
		ResponsiveHeight: true,
		DarkMode:         true,
	}

	return ccg.GenerateChartContainer(data, options)
}

// generateChartJSScript generates the Chart.js initialization script
func (ccg *ChartContainerGenerator) generateChartJSScript(data ChartData) string {
	// For now, return placeholder script - in real implementation,
	// this would properly serialize the chart config to JSON
	return fmt.Sprintf(`
        const %sCtx = document.getElementById('%s').getContext('2d');
        // Chart configuration will be inserted here based on data
        console.log('Chart %s initialized');
    `, data.ChartID, data.ChartID, data.ChartID)
}

// GetChartContainerCSS returns the CSS styles for chart containers
func (ccg *ChartContainerGenerator) GetChartContainerCSS() string {
	return `
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .charts-grid-1 {
            grid-template-columns: 1fr;
        }
        
        .charts-grid-2 {
            grid-template-columns: 1fr 1fr;
        }
        
        .charts-grid-3 {
            grid-template-columns: repeat(3, 1fr);
        }
        
        .chart-container {
            background: #ffffff;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
        }
        
        @media (prefers-color-scheme: dark) {
            .chart-container {
                background: #1f2937;
                border-color: #374151;
            }
        }
        
        .chart-title {
            font-size: 1.2rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #111827;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        @media (prefers-color-scheme: dark) {
            .chart-title {
                color: #f9fafb;
            }
        }
        
        .chart-description {
            color: #6b7280;
            font-size: 0.9rem;
            margin-bottom: 1rem;
            line-height: 1.5;
        }
        
        @media (prefers-color-scheme: dark) {
            .chart-description {
                color: #9ca3af;
            }
        }
        
        .chart-canvas {
            max-height: 400px;
            width: 100%;
        }
        
        .chart-responsive .chart-canvas {
            height: 400px;
        }
        
        @media (max-width: 1024px) {
            .charts-grid,
            .charts-grid-2,
            .charts-grid-3 {
                grid-template-columns: 1fr;
            }
        }
        
        @media (max-width: 768px) {
            .chart-container {
                padding: 1rem;
            }
            
            .chart-title {
                font-size: 1.1rem;
            }
            
            .chart-canvas {
                max-height: 300px;
            }
            
            .chart-responsive .chart-canvas {
                height: 300px;
            }
        }`
}

// GetChartJSCDN returns the Chart.js CDN script tag
func (ccg *ChartContainerGenerator) GetChartJSCDN() string {
	return `<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>`
}

// getChartContainerTemplate returns the HTML template for a chart container
func (ccg *ChartContainerGenerator) getChartContainerTemplate() string {
	return `
            <div class="{{getContainerClasses}}">
                <div class="chart-title">{{if .Data.TitleIcon}}{{.Data.TitleIcon}} {{end}}{{.Data.Title}}</div>
                {{if hasDescription}}
                <div class="chart-description">{{.Data.Description}}</div>
                {{end}}
                <canvas id="{{.Data.ChartID}}" class="chart-canvas" style="max-height: {{getCanvasHeight}};"></canvas>
            </div>`
}
