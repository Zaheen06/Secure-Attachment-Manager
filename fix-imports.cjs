const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./client/src').concat(walk('./server')).concat(walk('./shared'));
files.push('./vite.config.ts');

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('script/node_modules/')) {

        // 1) Fix React typings mapping to actual React modules (e.g. script/node_modules/@types/react-dom/client -> react-dom/client)
        content = content.replace(/script\/node_modules\/@types\/react-dom(\/[^"]*)?/g, 'react-dom$1');
        content = content.replace(/script\/node_modules\/@types\/react(\/[^"]*)?/g, 'react$1');

        // 2) Strip the deeply nested dist/esm/src paths to get bare package imports
        content = content.replace(/script\/node_modules\/(@[^\/]+\/[^\/]+|[^\/]+)(\/[^"]*)?/g, '$1');

        fs.writeFileSync(file, content);
        console.log(`Fixed imports in: ${file}`);
    }
});
