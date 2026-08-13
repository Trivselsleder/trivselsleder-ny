const { parse } = require('@babel/parser')
const fs = require('fs')
const code = fs.readFileSync('src/pages/AdminKursplanlegger.jsx', 'utf8')
try {
  parse(code, { sourceType: 'module', plugins: ['jsx'] })
  console.log('PARSE OK — ingen syntaksfeil')
} catch (e) {
  console.error('SYNTAKSFEIL:', e.message)
  process.exit(1)
}
