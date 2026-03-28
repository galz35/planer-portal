const fs = require('fs');
const path = require('path');

const basePath = 'D:/planificacion/rustsistema/backendrust/src/handlers';
const filesToFix = ['acceso.rs', 'admin.rs', 'proyectos.rs'];

filesToFix.forEach(filename => {
    const filepath = path.join(basePath, filename);
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.match(/^    match client\.(query|execute)\(/)) {
            // Find closing brace at same indent
            const indent = line.length - line.trimLeft().length;
            const prefix = ' '.repeat(indent);
            let closeLineIdx = -1;
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j] === prefix + '}') {
                    // Check if next non-empty line is the function closing brace
                    let k = j + 1;
                    while (k < lines.length && lines[k].trim() === '') k++;
                    if (k < lines.length && lines[k] === '}') {
                        closeLineIdx = j;
                    }
                    else if (k < lines.length && lines[k] === '    }') { // Inside nested block
                        closeLineIdx = j;
                    }
                    break;
                }
            }
            if (closeLineIdx !== -1) {
                lines[i] = prefix + 'let __ret = ' + lines[i].trimLeft();
                lines[closeLineIdx] = prefix + '};\n' + prefix + '__ret';
                i = closeLineIdx;
            }
        }
        i++;
    }
    fs.writeFileSync(filepath, lines.join('\n'));
});
console.log('Done');
