const {parse}=require('@babel/parser');const fs=require('fs');
try{parse(fs.readFileSync('api/_vakt.js','utf8'),{sourceType:'module',plugins:[]});console.log('PARSE OK');}catch(e){console.error(e.message);process.exit(1);}
