import os
import re

directories = ["D:\\planificacion\\rustsistema\\backendrust\\src\\handlers"]

def fix_match_returns(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # We look for a pattern where a match client.query(...) or match client.execute(...) 
    # is the last statement of a function block.
    # regex matches: "match client\.(query|execute)\b[^{]+(?:\{[^{}]*\}|(?R))*\s*\}[\s\n]*\}$"
    # To be safer, we can just replace cases manually or use a simpler pattern if we know exactly where it happens.
    
    # Actually, the problem is with any `match client.query(...)` or `match client.execute(...)` that is the *last* expression before `}`.
    # Let's match `\n( {4})match client\.(query|execute)\b(.*?)\n\1\}\n\}` with dotall, 
    # but that's hard to get nested braces right.
    
    lines = content.split('\n')
    out_lines = []
    
    # Since there are only a handful, I can just find lines that say `match client.query(` or `match client.execute(` 
    # and if they end the block, wrap them.
    # The compiler errors gave exact line numbers!
    pass

if __name__ == '__main__':
    # We will just write a simple replacement for the exact files given by cargo check
    files_to_fix = [
        "acceso.rs",
        "admin.rs",
        "proyectos.rs"
    ]
    for filename in files_to_fix:
        path = os.path.join(directories[0], filename)
        with open(path, 'r', encoding='utf-8') as f:
            text = f.read()
            
        # Regex to capture `match client.query... { ... }` when it is the trailing expression of the function and followed by `\n}`.
        # This occurs when we see `match client\.(query|execute)\b.*?\n    \}` followed by `\n}`.
        # Actually doing this with regex for nested blocks is fragile. Let's do it manually via replace_file_content where possible,
        # or just make a script that relies on indentation levels:
        
        lines = text.split('\n')
        i = 0
        while i < len(lines):
            line = lines[i]
            if re.match(r'^    match client\.(query|execute)\(', line) or re.match(r'^      match client\.(query|execute)\(', line):
                # Find the matching closing brace at the same indentation
                indent = len(line) - len(line.lstrip())
                prefix = ' ' * indent
                close_line_idx = -1
                for j in range(i + 1, len(lines)):
                    if lines[j] == f"{prefix}}}":
                        # Check if the next non-empty line is `}`
                        k = j + 1
                        while k < len(lines) and lines[k].strip() == '':
                            k += 1
                        if k < len(lines) and lines[k] == (' ' * (indent - 4)) + "}":
                            close_line_idx = j
                        break
                if close_line_idx != -1:
                    lines[i] = f"{prefix}let __ret = " + lines[i].lstrip()
                    lines[close_line_idx] = f"{prefix}}};\n{prefix}__ret"
                    i = close_line_idx
            i += 1
            
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
    print("Done")
