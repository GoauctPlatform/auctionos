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
    content = content.replace('RealtorTask', 'RealtorTask')
    content = content.replace('RealtorCommission', 'RealtorCommission')
    content = content.replace('RealtorWallet', 'RealtorWallet')

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
