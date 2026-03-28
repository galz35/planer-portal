import os
import re
import sys

def parse_rust_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    blocks = []
    current_block = []
    block_type = None
    open_braces = 0
    in_block = False
    block_name = None
    
    imports = []
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Collect top-level imports and attributes
        if not in_block and (line.startswith('use ') or line.startswith('#![')):
            imports.append(line)
            i += 1
            continue
            
        # Detect start of a block
        if not in_block:
            # Struct / Enum
            match = re.match(r'^(?:pub\s+)?(?:struct|enum)\s+(\w+)', line)
            if match or (line.startswith('#[derive(') and re.match(r'^(?:pub\s+)?(?:struct|enum)\s+(\w+)', lines[i+1])):
                in_block = True
                block_type = 'struct_enum'
                # block_name is in current line or next
                if match:
                    block_name = match.group(1)
                else:
                    block_name = re.match(r'^(?:pub\s+)?(?:struct|enum)\s+(\w+)', lines[i+1]).group(1)
                
            # Function
            elif re.match(r'^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)', line):
                in_block = True
                block_type = 'fn'
                block_name = re.match(r'^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)', line).group(1)
                
            if in_block:
                current_block = []
                open_braces = 0
                
        if in_block:
            current_block.append(line)
            open_braces += line.count('{') - line.count('}')
            
            if open_braces == 0 and '{' in ''.join(current_block):
                in_block = False
                blocks.append({
                    'type': block_type,
                    'name': block_name,
                    'content': ''.join(current_block)
                })
        else:
            if line.strip() and not line.startswith('//'):
                pass # Unhandled top level statement
                
        i += 1

    return imports, blocks

def group_blocks(blocks):
    groups = {
        'state': [],
        'models': [],
        'handlers': {},
        'router': []
    }
    
    for b in blocks:
        if b['name'] == 'ApiState':
            groups['state'].append(b)
        elif b['type'] == 'struct_enum' or b['name'] == 'NotImplementedPayload':
            groups['models'].append(b)
        elif b['type'] == 'fn' and b['name'] == 'api_router':
            groups['router'].append(b)
        elif b['type'] == 'fn' and b['name'].startswith('generic_manifest'):
            groups['router'].append(b)
        elif b['type'] == 'fn':
            prefix = b['name'].split('_')[0]
            if prefix not in groups['handlers']:
                groups['handlers'][prefix] = []
            groups['handlers'][prefix].append(b)
            
    return groups

def main():
    filepath = 'src/modules.rs'
    if not os.path.exists(filepath):
        print('Error: not found')
        return

    imports, blocks = parse_rust_file(filepath)
    groups = group_blocks(blocks)
    
    # Save the split
    os.makedirs('src/handlers', exist_ok=True)
    
    header = """#![allow(dead_code)]
use std::{collections::HashMap, sync::Arc, time::Instant};
use jsonwebtoken::{encode, Header, EncodingKey};
use axum::{
    extract::{Path, State},
    http::{Method, StatusCode},
    response::IntoResponse,
    routing::{any, delete, get, patch, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

use crate::db::Pool;
use crate::state::ApiState;
use crate::models::*;
"""
    
    # Write models
    with open('src/models.rs', 'w', encoding='utf-8') as f:
        f.write("#![allow(dead_code)]\nuse serde::{Deserialize, Serialize};\nuse chrono::Utc;\n\n")
        f.write("\n\n".join([b['content'] for b in groups['models']]))
        
    # Write state
    with open('src/state.rs', 'w', encoding='utf-8') as f:
        f.write("use std::{collections::HashMap, sync::Arc, time::Instant};\n")
        f.write("use tokio::sync::RwLock;\n")
        f.write("use crate::db::Pool;\n")
        f.write("use crate::migration::{EndpointManifest, RouteMatcher};\n\n")
        f.write("\n\n".join([b['content'] for b in groups['state']]))
        
    # Write handlers
    handler_names = list(groups['handlers'].keys())
    for hname, hblocks in groups['handlers'].items():
        with open(f'src/handlers/{hname}.rs', 'w', encoding='utf-8') as f:
            f.write(header)
            f.write("\n\n")
            f.write("\n\n".join([b['content'].replace('async fn', 'pub async fn') for b in hblocks]))
            
    # Write handlers/mod.rs
    with open('src/handlers/mod.rs', 'w', encoding='utf-8') as f:
        for hname in handler_names:
            f.write(f"pub mod {hname};\n")
            
    # Write router
    with open('src/router.rs', 'w', encoding='utf-8') as f:
        f.write(header)
        f.write("use crate::migration::{by_controller, by_module, progress, ControllerProgress, EndpointManifest, ModuleProgress, RouteMatcher};\n\n")
        # import handlers
        for hname in handler_names:
            f.write(f"use crate::handlers::{hname}::*;\n")
        f.write("\n\n")
        f.write("\n\n".join([b['content'] for b in groups['router']]))
        
    print("Split completed successfully")

if __name__ == '__main__':
    main()
