package components

import (
	"fmt"
	"html/template"
	"strings"
)

// CardData represents data for a generic card component
type CardData struct {
	Title       string // Card title
	Content     string // Main content (HTML allowed)
	HeaderIcon  string // Icon for the header (optional)
	HeaderColor string // Custom header background color (optional)
	FooterHTML  string // Optional footer content (HTML allowed)
}

// CardOptions represents configuration options for cards
type CardOptions struct {
	CSSClasses  string // Additional CSS classes
	HeaderStyle string // Header style: "default", "colored", "gradient"
	ShowShadow  bool   // Whether to show shadow
	Rounded     bool   // Whether to use rounded corners
	DarkMode    bool   // Whether to include dark mode styles
}

// CardGenerator generates reusable card components
type CardGenerator struct{}

// NewCardGenerator creates a new card generator
func NewCardGenerator() *CardGenerator {
	return &CardGenerator{}
}

// GenerateCard generates a single card HTML
func (cg *CardGenerator) GenerateCard(data CardData, options CardOptions) string {
	tmpl := template.Must(template.New("card").Funcs(template.FuncMap{
		"getCardClasses": func() string {
			classes := "card"
			if options.ShowShadow {
				classes += " card-shadow"
			}
			if options.Rounded {
				classes += " card-rounded"
			}
			if options.CSSClasses != "" {
				classes += " " + options.CSSClasses
			}
			return classes
		},
		"getHeaderClasses": func() string {
			switch options.HeaderStyle {
			case "colored":
				return "card-header card-header-colored"
			case "gradient":
				return "card-header card-header-gradient"
			default:
				return "card-header"
			}
		},
		"getHeaderStyle": func() string {
			if data.HeaderColor != "" {
				return fmt.Sprintf("background-color: %s;", data.HeaderColor)
			}
			return ""
		},
		"hasHeader": func() bool {
			return data.Title != "" || data.HeaderIcon != ""
		},
		"hasFooter": func() bool {
			return data.FooterHTML != ""
		},
	}).Parse(cg.getCardTemplate()))

	var builder strings.Builder
	if err := tmpl.Execute(&builder, map[string]interface{}{
		"Data":    data,
		"Options": options,
	}); err != nil {
		return fmt.Sprintf("<!-- Error generating card: %v -->", err)
	}

	return builder.String()
}

// GenerateTableCard generates a card specifically designed for tables
func (cg *CardGenerator) GenerateTableCard(title string, headerIcon string, tableHTML string, options CardOptions) string {
	data := CardData{
		Title:      title,
		HeaderIcon: headerIcon,
		Content:    tableHTML,
	}

	// Add table-specific classes
	if options.CSSClasses == "" {
		options.CSSClasses = "table-container"
	} else {
		options.CSSClasses += " table-container"
	}

	return cg.GenerateCard(data, options)
}

// GenerateRecommendationsCard generates a card for recommendations
func (cg *CardGenerator) GenerateRecommendationsCard(recommendations []RecommendationItem) string {
	var recHTML strings.Builder

	for _, rec := range recommendations {
		recHTML.WriteString(fmt.Sprintf(`
            <div class="recommendation-item">
                <div class="recommendation-priority priority-%s">%s Priority</div>
                <div class="recommendation-title">%s</div>
                <div>%s</div>
            </div>`,
			strings.ToLower(rec.Priority),
			rec.Priority,
			rec.Title,
			rec.Description))
	}

	data := CardData{
		Title:      "💡 Recommendations",
		Content:    recHTML.String(),
		HeaderIcon: "💡",
	}

	options := CardOptions{
		CSSClasses:  "recommendations",
		HeaderStyle: "default",
		ShowShadow:  true,
		Rounded:     true,
		DarkMode:    true,
	}

	return cg.GenerateCard(data, options)
}

// RecommendationItem represents a single recommendation
type RecommendationItem struct {
	Title       string
	Description string
	Priority    string // "High", "Medium", "Low"
}

// GetCardCSS returns the CSS styles for cards
func (cg *CardGenerator) GetCardCSS() string {
	return `
        .card {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        }
        
        @media (prefers-color-scheme: dark) {
            .card {
                background: #1f2937;
                border-color: #374151;
            }
        }
        
        .card-shadow {
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .card-rounded {
            border-radius: 12px;
        }
        
        .card-header {
            background: #f9fafb;
            color: #111827;
            padding: 1rem;
            font-weight: bold;
            border-bottom: 1px solid #e5e7eb;
        }
        
        @media (prefers-color-scheme: dark) {
            .card-header {
                background: #374151;
                color: #f9fafb;
                border-bottom-color: #4b5563;
            }
        }
        
        .card-header-colored {
            background: #667eea;
            color: white;
        }
        
        .card-header-gradient {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        
        .card-content {
            padding: 1.5rem;
        }
        
        .card-footer {
            background: #f9fafb;
            padding: 1rem;
            border-top: 1px solid #e5e7eb;
        }
        
        @media (prefers-color-scheme: dark) {
            .card-footer {
                background: #374151;
                border-top-color: #4b5563;
            }
        }
        
        /* Table container specific styles */
        .table-container {
            overflow: hidden;
        }
        
        .table-container .card-content {
            padding: 0;
        }
        
        .table-container table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table-container th,
        .table-container td {
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        
        @media (prefers-color-scheme: dark) {
            .table-container th,
            .table-container td {
                border-bottom-color: #374151;
            }
        }
        
        .table-container th {
            background: #f9fafb;
            font-weight: 600;
            color: #111827;
        }
        
        @media (prefers-color-scheme: dark) {
            .table-container th {
                background: #374151;
                color: #f9fafb;
            }
        }
        
        /* Recommendations specific styles */
        .recommendations {
            padding: 1.5rem;
        }
        
        .recommendation-item {
            padding: 1rem;
            margin-bottom: 1rem;
            border-left: 4px solid #667eea;
            background: #f9fafb;
            border-radius: 0 8px 8px 0;
        }
        
        @media (prefers-color-scheme: dark) {
            .recommendation-item {
                background: #374151;
            }
        }
        
        .recommendation-item:last-child {
            margin-bottom: 0;
        }
        
        .recommendation-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .recommendation-priority {
            display: inline-block;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            color: white;
            margin-bottom: 0.5rem;
        }
        
        .priority-high { background: #F44336; }
        .priority-medium { background: #FF9800; }
        .priority-low { background: #4CAF50; }
        
        @media (max-width: 768px) {
            .card-content {
                padding: 1rem;
            }
            
            .card-header {
                padding: 0.75rem;
            }
            
            .recommendations {
                padding: 1rem;
            }
        }`
}

// getCardTemplate returns the HTML template for a card
func (cg *CardGenerator) getCardTemplate() string {
	return `
            <div class="{{getCardClasses}}">
                {{if hasHeader}}
                <div class="{{getHeaderClasses}}" {{if getHeaderStyle}}style="{{getHeaderStyle}}"{{end}}>
                    {{if .Data.HeaderIcon}}{{.Data.HeaderIcon}} {{end}}{{.Data.Title}}
                </div>
                {{end}}
                <div class="card-content">
                    {{.Data.Content}}
                </div>
                {{if hasFooter}}
                <div class="card-footer">
                    {{.Data.FooterHTML}}
                </div>
                {{end}}
            </div>`
}
