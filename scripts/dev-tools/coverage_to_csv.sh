#!/usr/bin/env bash

# coverage_to_csv.sh
# Goのカバレッジレポートをファイル単位・パッケージ単位にCSV化してExcelで分析しやすくする

set -e

PROFILE="coverage.out"
OUTPUT="coverage.csv"
TMP_FILE="coverage_tmp.csv"

echo "Package,File,Coverage" > "$OUTPUT"

# === 1. 関数単位の結果をファイル単位に整理 ===
# 関数単位の行を読み取り、ファイル名・パッケージ名・カバレッジを取り出して一時ファイルに保存

go tool cover -func="$PROFILE" | grep -v "total:" | while read -r line; do
  file_and_line=$(echo "$line" | awk '{print $1}')
  # function=$(echo "$line" | awk '{print $2}')  # Unused variable removed
  coverage=$(echo "$line" | awk '{print $3}' | tr -d '%')

  file=$(echo "$file_and_line" | cut -d':' -f1)
  package=$(dirname "$file")

  echo "$package,$file,$coverage"
done > "$TMP_FILE"

# === 2. ファイル単位の平均カバレッジを計算 ===

awk -F',' '{
  count[$2] += 1
  sum[$2] += $3
  pkg[$2] = $1
}
END {
  for (file in sum) {
    avg = sum[file] / count[file]
    printf "%s,%s,%.1f\n", pkg[file], file, avg
  }
}' "$TMP_FILE" >> "$OUTPUT"

# === 3. パッケージ単位の平均を計算 ===

echo "" >> "$OUTPUT"
echo "Package,,Coverage" >> "$OUTPUT"

awk -F',' 'NR>1 && NF==3 && $1!="" {
  count[$1] += 1
  sum[$1] += $3
}
END {
  for (pkg in sum) {
    avg = sum[pkg] / count[pkg]
    printf "%s,,%.1f\n", pkg, avg
  }
}' "$OUTPUT" >> "$OUTPUT"

# === 4. プロジェクト総平均も表示 ===

echo "" >> "$OUTPUT"
echo "Project Total,," >> "$OUTPUT"

awk -F',' 'NR>1 && NF==3 && $1!="" {
  sum += $3
  n++
}
END {
  avg = sum / n
  printf "Total,,%.1f\n", avg
}' "$OUTPUT" >> "$OUTPUT"

rm "$TMP_FILE"

echo "✅ カバレッジCSVを生成しました: $OUTPUT"