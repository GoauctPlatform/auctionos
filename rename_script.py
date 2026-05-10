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
    # Replace realtor -> realtor
    content = re.sub(r'\bconsultant\b', 'realtor', content)
    content = re.sub(r'\bconsultants\b', 'realtors', content)
    content = re.sub(r'\bConsultant\b', 'Realtor', content)
    content = re.sub(r'\bConsultants\b', 'Realtors', content)
    content = re.sub(r'\bCONSULTANT\b', 'REALTOR', content)
    content = re.sub(r'\bCONSULTANTS\b', 'REALTORS', content)

    if orig_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    modified_files = []
    renamed_files = []

    # First pass: replace content
    for dirpath, dirnames, filenames in os.walk(ROOT):
        # exclude node_modules, .git, venv, pycache
        if any(exc in dirpath for exc in ['node_modules', '.git', 'venv', '__pycache__', 'alembic/versions']):
            continue

        for filename in filenames:
            if filename.endswith(('.py', '.ts', '.tsx', '.json', '.html', '.md', '.css')):
                filepath = os.path.join(dirpath, filename)
                if replace_in_file(filepath):
                    modified_files.append(filepath)

    # Second pass: rename files and directories
    for dirpath, dirnames, filenames in os.walk(ROOT, topdown=False):
        if any(exc in dirpath for exc in ['node_modules', '.git', 'venv', '__pycache__']):
            continue
        
        for filename in filenames:
            if 'realtor' in filename.lower():
                old_path = os.path.join(dirpath, filename)
                new_filename = filename.replace('realtor', 'realtor').replace('Realtor', 'Realtor')
                new_path = os.path.join(dirpath, new_filename)
                os.rename(old_path, new_path)
                renamed_files.append((old_path, new_path))
                
        for dirname in dirnames:
            if 'realtor' in dirname.lower():
                old_path = os.path.join(dirpath, dirname)
                new_dirname = dirname.replace('realtor', 'realtor').replace('Realtor', 'Realtor')
                new_path = os.path.join(dirpath, new_dirname)
                os.rename(old_path, new_path)
                renamed_files.append((old_path, new_path))

    print(f"Modified {len(modified_files)} files")
    print(f"Renamed {len(renamed_files)} files/directories")

if __name__ == "__main__":
    main()
