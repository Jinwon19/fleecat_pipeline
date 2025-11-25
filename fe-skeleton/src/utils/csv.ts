/**
 * CSV Utility Functions
 *
 * Provides functions for generating and downloading CSV files
 * with proper Korean character encoding (BOM support)
 */

/**
 * Generate CSV string from data array
 *
 * @param data - Array of data objects
 * @param columns - Column definitions with key and label
 * @returns CSV formatted string
 */
export function generateCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; label: string }[]
): string {
  // Generate headers
  const headers = columns.map(col => col.label).join(',')

  // Generate data rows
  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key]
      // Escape values containing commas or newlines with quotes
      const stringValue = String(value ?? '')
      return stringValue.includes(',') || stringValue.includes('\n')
        ? `"${stringValue.replace(/"/g, '""')}"`
        : stringValue
    }).join(',')
  )

  return [headers, ...rows].join('\n')
}

/**
 * Download CSV file with proper encoding
 *
 * @param csvContent - CSV formatted string
 * @param filename - Desired filename (without extension)
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Korean character support
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', `${filename}.csv`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up
  URL.revokeObjectURL(url)
}
