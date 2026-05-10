import os
import re

ROOT = "/Users/gustavo/Downloads/auctionos"

def replace_in_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except UnicodeDecodeError:
        return False

    orig_content = content
    # Replace consultant -> realtor, case-preserving but catching underscores
    content = content.replace('realtor_', 'realtor_')
    content = content.replace('_realtor', '_realtor')
    content = content.replace('Realtor_', 'Realtor_')
    content = content.replace('realtorProfile', 'realtorProfile')
    content = content.replace('realtorService', 'realtorService')
    content = content.replace('RealtorProfile', 'RealtorProfile')
    content = content.replace('RealtorService', 'RealtorService')

    if orig_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    modified_files = []
    
    for dirpath, dirnames, filenames in os.walk(ROOT):
        if any(exc in dirpath for exc in ['node_modules', '.git', 'venv', '__pycache__', 'alembic/versions']):
            continue

        for filename in filenames:
            if filename.endswith(('.py', '.ts', '.tsx', '.json', '.html', '.md', '.css')):
                filepath = os.path.join(dirpath, filename)
                if replace_in_file(filepath):
                    modified_files.append(filepath)

    print(f"Modified {len(modified_files)} files")

if __name__ == "__main__":
    main()
