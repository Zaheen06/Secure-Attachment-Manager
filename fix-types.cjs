const fs = require('fs');
const files = [
    'server/db.ts',
    'server/index.ts',
    'server/seed.ts',
    'server/routes.ts',
    'server/vite.ts',
    'client/src/main.tsx',
    'client/src/components/StudentScanner.tsx'
];

files.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/"@types\/([^"]+)"/g, '"$1"');
        fs.writeFileSync(file, content);
        console.log(`Fixed ${file}`);
    }
});
