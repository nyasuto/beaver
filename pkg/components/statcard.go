package components

import (
	"fmt"
	"html/template"
	"strings"
)

// StatCardData represents data for a statistics card
type StatCardData struct {
	Value     string // The main value to display (e.g., "85.5%" or "12")
	Label     string // The description label (e.g., "Total Coverage")
	Grade     string // Quality grade (A, B, C, D, F) - optional
	ValueType string // Type of value for styling: "percentage", "number", "grade", "fraction"
	Color     string // Custom color override - optional
}

// StatCardOptions represents configuration options for stat cards
type StatCardOptions struct {
	CSSClasses string // Additional CSS classes
	ShowGrade  bool   // Whether to show grade-based coloring
	DarkMode   bool   // Whether to include dark mode styles
}

// StatCardGenerator generates reusable statistics cards
type StatCardGenerator struct{}

// NewStatCardGenerator creates a new stat card generator
func NewStatCardGenerator() *StatCardGenerator {
	return &StatCardGenerator{}
}

// GenerateStatCard generates a single statistics card HTML
func (scg *StatCardGenerator) GenerateStatCard(data StatCardData, options StatCardOptions) string {
	tmpl := template.Must(template.New("statcard").Funcs(template.FuncMap{
		"getValueClass": func(data StatCardData) string {
			if data.Grade != "" && options.ShowGrade {
				return fmt.Sprintf("grade-%s", data.Grade)
			}
			if data.Color != "" {
				return ""
			}
			return "stat-value-default"
		},
		"getCustomStyle": func(data StatCardData) string {
			if data.Color != "" {
				return fmt.Sprintf("color: %s;", data.Color)
			}
			return ""
		},
		"getAdditionalClasses": func() string {
			if options.CSSClasses != "" {
				return " " + options.CSSClasses
			}
			return ""
		},
	}).Parse(scg.getStatCardTemplate()))

	var builder strings.Builder
	if err := tmpl.Execute(&builder, map[string]interface{}{
		"Data":    data,
		"Options": options,
	}); err != nil {
		return fmt.Sprintf("<!-- Error generating stat card: %v -->", err)
	}

	return builder.String()
}

// GenerateStatsGrid generates a grid of statistics cards
func (scg *StatCardGenerator) GenerateStatsGrid(cards []StatCardData, options StatCardOptions) string {
	var cardsHTML strings.Builder

	for _, card := range cards {
		cardsHTML.WriteString(scg.GenerateStatCard(card, options))
	}

	return fmt.Sprintf(`
        <div class="stats-grid">
            %s
        </div>`, cardsHTML.String())
}

// GetStatCardCSS returns the CSS styles for stat cards
func (scg *StatCardGenerator) GetStatCardCSS() string {
	return `
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 3rem;
        }
        
        .stat-card {
            background: #ffffff;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border: 1px solid #e5e7eb;
            text-align: center;
            transition: transform 0.2s ease;
        }
        
        @media (prefers-color-scheme: dark) {
            .stat-card {
                background: #1f2937;
                border-color: #374151;
            }
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #6b7280;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        @media (prefers-color-scheme: dark) {
            .stat-label {
                color: #9ca3af;
            }
        }
        
        /* Grade-based colors */
        .grade-A { color: #4CAF50; }
        .grade-B { color: #8BC34A; }
        .grade-C { color: #FF9800; }
        .grade-D { color: #FF5722; }
        .grade-F { color: #F44336; }
        
        .stat-value-default {
            color: #111827;
        }
        
        @media (prefers-color-scheme: dark) {
            .stat-value-default {
                color: #f9fafb;
            }
        }
        
        @media (max-width: 768px) {
            .stat-card {
                padding: 1rem;
            }
            
            .stat-value {
                font-size: 2rem;
            }
        }`
}

// getStatCardTemplate returns the HTML template for a single stat card
func (scg *StatCardGenerator) getStatCardTemplate() string {
	return `
            <div class="stat-card{{getAdditionalClasses}}">
                <div class="stat-value {{getValueClass .Data}}" {{if getCustomStyle .Data}}style="{{getCustomStyle .Data}}"{{end}}>{{.Data.Value}}</div>
                <div class="stat-label">{{.Data.Label}}</div>
            </div>`
}
